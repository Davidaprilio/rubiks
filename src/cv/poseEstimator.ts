import type { Color } from '../solver/cube54';
import type { CubePose, FrameObservation, Intrinsics } from '../tracking/types';
import { choosePose, faceQuadHypotheses, mat3Vec, rotationAngle, trackFromPrediction, type PnpSolver } from './cubePose';
import { solvePnp } from './pnp';
import { detectFaceBlobs, detectStickers, type RgbaImage } from './stickerDetector';
import { groupStickers } from './stickerGrid';
import { alignToRegions, buildLabelMaps, cubeBounds, readStickerColors, regionScore, type LabelMaps } from './regionAlign';

/** Pinhole guess for a webcam (~60 degrees horizontal field of view). */
export function defaultIntrinsics(width: number, height: number): Intrinsics {
  const f = 0.87 * width;
  return { fx: f, fy: f, cx: width / 2, cy: height / 2, width, height };
}

export interface AnalyzeContext {
  cv: any;
  lut: Uint8Array;
  intrinsics: Intrinsics;
  /** expected sticker colors (virtual cube), null entries are unknown */
  known: readonly (Color | null)[] | null;
  /** smoothed pose of the previous frames */
  previous: Pick<CubePose, 'rotation' | 'translation'> | null;
  /** expected pose in this frame (from the last raw poses), enables frame to frame tracking */
  predicted?: Pick<CubePose, 'rotation' | 'translation'> | null;
  /**
   * cube states one move away from `known` (from the move detector): right after a twist the
   * colors already show the new state while `known` still has the old one
   */
  alternatives?: readonly (readonly (Color | null)[])[];
  /** last pose before a twist started: held on to while the twist goes on */
  anchor?: Pick<CubePose, 'rotation' | 'translation'> | null;
  pnp?: PnpSolver;
  labels?: Uint8Array;
}

/** Full per frame pipeline: stickers -> grids -> pose -> observation. */
export function analyzeFrame(image: RgbaImage, ctx: AnalyzeContext, time = performance.now()): FrameObservation {
  const labels = ctx.labels ?? new Uint8Array(image.width * image.height);
  const stickers = detectStickers(ctx.cv, image, ctx.lut, {}, labels);
  const { components, outliers } = groupStickers(stickers);
  const pnp = ctx.pnp ?? solvePnp;
  const choice = choosePose(components, ctx.known, ctx.intrinsics, pnp, { previous: ctx.previous ?? ctx.predicted });
  const searched = choice ? { pose: choice.pose, observed: choice.hypotheses.flatMap((h) => h.stickers) } : null;
  const knownUseful = !!ctx.known?.some((c) => c !== null);
  let result: { pose: CubePose; observed: FrameObservation['observed'] } | null = searched;
  let matchesKnown: boolean | null = choice ? choice.matchesKnown : null;
  let aligned: FrameObservation['aligned'] = null;
  let twisting = false;

  if (knownUseful) {
    const known = ctx.known!;
    const k = ctx.intrinsics;
    const predicted = ctx.predicted ?? null;
    type Candidate = { pose: CubePose; observed: FrameObservation['observed']; kind: 'stickers' | 'regions' | 'search' | 'faces'; partial?: boolean };
    type Judged = { c: Candidate; value: number; score: number };
    // score per degree away from the reference: a solved face looks the same after a quarter
    // turn, so without a strong preference for continuity the cube would flip between them
    const continuity = 0.006;
    const judge = (maps: LabelMaps, cands: Candidate[], reference: Pose | null, depthRef: Pose | null): Judged | null => {
      // every candidate is judged the same way: how well the expected colors cover the image,
      // with small preferences for staying close to the reference and for precise sticker fits
      let best: Judged | null = null;
      for (const c of cands) {
        if (depthRef && c.kind !== 'search' && Math.abs(c.pose.translation[2] / depthRef.translation[2] - 1) > 0.15) continue;
        const score = regionScore(maps, c.pose, known, k);
        let value = score
          + (c.kind === 'stickers' && c.observed.length >= 8 ? 0.03 : 0)
          + (c.kind === 'search' ? 0.03 : 0);
        if (reference) value -= continuity * rotationAngle(c.pose.rotation, reference.rotation);
        else value -= 0.05 * (1 + mat3Vec(c.pose.rotation, [0, 1, 0])[1]) / 2; // prefer U up in the image
        if (!best || value > best.value) best = { c, value, score };
      }
      return best;
    };

    let best: Judged | null = null;
    if (predicted) {
      // distance maps only around where the cube is expected (and where the search found it)
      const boxes = [cubeBounds(predicted, k), searched ? cubeBounds(searched.pose, k) : null]
        .filter((b): b is NonNullable<typeof b> => b !== null);
      const roi = boxes.length ? {
        x: Math.min(...boxes.map((b) => b.x)),
        y: Math.min(...boxes.map((b) => b.y)),
        width: Math.max(...boxes.map((b) => b.x + b.width)) - Math.min(...boxes.map((b) => b.x)),
        height: Math.max(...boxes.map((b) => b.y + b.height)) - Math.min(...boxes.map((b) => b.y)),
      } : undefined;
      const maps = buildLabelMaps(labels, image.width, image.height, 2, roi);
      const candidates: Candidate[] = [];
      // 1. pair detected stickers with the predicted ones
      const tracked = trackFromPrediction(stickers, predicted, known, k, pnp);
      if (tracked) candidates.push({ ...tracked, kind: 'stickers' });
      // 2. align the colored regions: survives motion blur (stickers melt together) and fixes a
      //    lock that slipped by one sticker on a uniform face; then pair the stickers again
      //    (skipped when the stickers alone already explain the image well: saves time)
      // (not when the stickers pulled the pose away from the prediction: that is how a twist
      // starts, and the regions are what keep the cube from following the turning layer)
      const confident = tracked && tracked.observed.length >= 12
        && rotationAngle(tracked.pose.rotation, predicted.rotation) < 3
        && regionScore(maps, tracked.pose, known, k) >= 0.85;
      // from the prediction (continuity), and from the sticker fit when that went elsewhere
      const starts = confident ? [] : [predicted];
      if (!confident && tracked && rotationAngle(tracked.pose.rotation, predicted.rotation) > 5) starts.push(tracked.pose);
      for (const start of starts) {
        const r = alignToRegions(maps, start, known, k, ctx.anchor ?? start);
        if (!r) continue;
        if (!aligned || r.score > aligned.score) aligned = { score: r.score, samples: r.samples };
        candidates.push({ pose: r.pose, observed: [], kind: 'regions', partial: r.skippedLayer !== null });
        const again = trackFromPrediction(stickers, r.pose, known, k, pnp, 5, [0.4, 0.3]);
        if (again) candidates.push({ ...again, kind: 'stickers' });
      }
      // 3. the fresh per frame search, when it matched the expected colors
      if (searched && choice!.matchesKnown) candidates.push({ ...searched, kind: 'search' });
      best = judge(maps, candidates, predicted, predicted);
      // the colors may already show the state after a twist: try the states one move away
      if (best && best.score < 0.92 && ctx.alternatives?.length) {
        const from = best.c.pose;
        const ranked = ctx.alternatives
          .map((state) => ({ state, score: regionScore(maps, from, state, k) }))
          .filter((a) => a.score > best!.score + 0.05)
          .sort((a, b) => b.score - a.score)
          .slice(0, 2);
        for (const alt of ranked) {
          const r2 = alignToRegions(maps, from, alt.state, k, ctx.anchor ?? from);
          if (!r2) continue;
          const score = regionScore(maps, r2.pose, alt.state, k);
          if (score > best.score + 0.05) best = { c: { pose: r2.pose, observed: [], kind: 'regions' }, value: score, score };
        }
      }
      if (best && best.score < 0.6) best = null;
    }

    if (!best) {
      // (re)acquire over the whole frame: grid search + whole faces of a stickerless cube
      const maps = buildLabelMaps(labels, image.width, image.height, 2);
      const candidates: Candidate[] = [];
      if (searched && choice!.matchesKnown) candidates.push({ ...searched, kind: 'search' });
      const faces = [...stickers, ...detectFaceBlobs(ctx.cv, labels, image.width, image.height)];
      for (const pose of faceQuadPoses(faces, known, k, pnp, maps, image.width * image.height)) {
        candidates.push({ pose, observed: [], kind: 'faces' });
      }
      const found = judge(maps, candidates, ctx.previous ?? null, null);
      if (found && found.score >= (found.c.kind === 'search' ? 0.6 : 0.72)) best = found;
    }

    if (best) {
      result = { pose: best.c.pose, observed: best.c.observed };
      twisting = !!best.c.partial;
      matchesKnown = true;
    } else if (searched && !choice!.matchesKnown) {
      result = searched; // the physical cube differs from the virtual one
    } else {
      result = null;
    }
  }
  const observed = result?.observed ?? [];
  // colors in cube coordinates: read at every well visible sticker of the pose
  const observedState: (Color | null)[] = result
    ? readStickerColors(labels, image.width, image.height, result.pose, ctx.intrinsics)
    : new Array(54).fill(null);
  return {
    time,
    intrinsics: ctx.intrinsics,
    stickers,
    components,
    outliers,
    pose: result?.pose ?? null,
    observed,
    observedState,
    matchesKnown: result ? matchesKnown : null,
    aligned,
    twisting,
  };
}

type Pose = Pick<CubePose, 'rotation' | 'translation'>;

/**
 * Cube poses from whole single colored faces (stickerless cube, solved faces): every face quad
 * hypothesis alone and every pair of them that agrees; the best few by color coverage are then
 * aligned to the color regions.
 */
function faceQuadPoses(
  stickers: FrameObservation['stickers'],
  known: readonly (Color | null)[],
  k: Intrinsics,
  pnp: PnpSolver,
  maps: LabelMaps,
  frameArea: number,
): CubePose[] {
  const hyps = faceQuadHypotheses(stickers, known, k, pnp, 0.004 * frameArea);
  if (hyps.length === 0) return [];
  const poses: Pose[] = hyps.map((h) => h.pose);
  for (let a = 0; a < hyps.length; a++) {
    for (let b = a + 1; b < hyps.length; b++) {
      const ha = hyps[a], hb = hyps[b];
      if (ha.face === hb.face || ha.corners2d === hb.corners2d) continue;
      if (rotationAngle(ha.pose.rotation, hb.pose.rotation) > 25) continue;
      const joint = pnp([...ha.corners3d, ...hb.corners3d], [...ha.corners2d, ...hb.corners2d], k, ha.pose);
      if (joint) poses.push(joint);
    }
  }
  const scored = poses
    .map((pose) => ({ pose, score: regionScore(maps, pose, known, k) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
  return scored.map(({ pose }) => {
    const r = alignToRegions(maps, pose, known, k);
    return r ? r.pose : { ...pose, error: 0 };
  });
}
