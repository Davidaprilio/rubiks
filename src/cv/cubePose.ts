import {
  FACES, FACE_COLOR, STICKER_NORMAL, STICKER_POS, type Color, type FaceLetter, type Vec3,
} from '../solver/cube54';
import type { CubePose, GridComponent, Intrinsics, ObservedSticker, Point, StickerCandidate } from '../tracking/types';

/**
 * From grids of stickers to a cube pose. Pure math; the PnP solver is injected so the
 * OpenCV part stays in poseEstimator.ts and this file can be unit tested.
 */

export type Mat3 = number[]; // row major 3x3

export const mat3Mul = (a: Mat3, b: Mat3): Mat3 => {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
};
export const mat3T = (a: Mat3): Mat3 => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
export const mat3Vec = (a: Mat3, v: Vec3): Vec3 => [
  a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
  a[3] * v[0] + a[4] * v[1] + a[5] * v[2],
  a[6] * v[0] + a[7] * v[1] + a[8] * v[2],
];

/** Angle in degrees between two rotations. */
export function rotationAngle(a: Mat3, b: Mat3): number {
  const m = mat3Mul(mat3T(a), b);
  const c = Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2));
  return (Math.acos(c) * 180) / Math.PI;
}

/** 3D center of a sticker in model units (cube spans -1.5 .. 1.5). */
export function stickerPoint(index: number): Vec3 {
  const p = STICKER_POS[index], n = STICKER_NORMAL[index];
  return [p[0] + 0.5 * n[0], p[1] + 0.5 * n[1], p[2] + 0.5 * n[2]];
}

export function project(pose: Pick<CubePose, 'rotation' | 'translation'>, k: Intrinsics, p: Vec3): Point {
  const c = mat3Vec(pose.rotation, p);
  const z = c[2] + pose.translation[2];
  return {
    x: k.fx * (c[0] + pose.translation[0]) / z + k.cx,
    y: k.fy * (c[1] + pose.translation[1]) / z + k.cy,
  };
}

/** Is the face with this outward normal turned towards the camera? */
export function faceVisible(pose: Pick<CubePose, 'rotation' | 'translation'>, face: FaceLetter): boolean {
  const i = FACES.indexOf(face) * 9 + 4;
  const n = mat3Vec(pose.rotation, STICKER_NORMAL[i]);
  const c = mat3Vec(pose.rotation, stickerPoint(i));
  const p: Vec3 = [c[0] + pose.translation[0], c[1] + pose.translation[1], c[2] + pose.translation[2]];
  return n[0] * p[0] + n[1] * p[1] + n[2] * p[2] < 0;
}

// ---------------------------------------------------------------------------
// hypotheses: which face is a grid, and how is it turned
// ---------------------------------------------------------------------------

export interface FaceHypothesis {
  component: number;
  face: FaceLetter;
  /** stickers of the component placed on the cube */
  stickers: ObservedSticker[];
  /** observed colors that disagree with the expected cube state */
  mismatches: number;
}

/** net cell (row, col) of an image grid cell for quarter turn k */
function turnCell(row: number, col: number, k: number): [number, number] {
  for (let t = 0; t < k; t++) [row, col] = [col, 2 - row];
  return [row, col];
}

/**
 * Every plausible (face, quarter turn, offset) placement of a grid on the cube.
 * `known` is the expected color of every sticker (null = unknown), e.g. the virtual cube.
 * When it is given, only placements whose colors agree with it (a few misread stickers
 * allowed) are returned; without it the face is identified by its center sticker only.
 */
export function faceHypotheses(component: GridComponent, index: number, known: readonly (Color | null)[] | null, limit = 8): FaceHypothesis[] {
  const maxX = Math.max(...component.cells.map((c) => c.gx));
  const maxY = Math.max(...component.cells.map((c) => c.gy));
  const all: (FaceHypothesis & { centerSeen: boolean; checked: number })[] = [];
  for (let ox = 0; ox <= 2 - maxX; ox++) {
    for (let oy = 0; oy <= 2 - maxY; oy++) {
      const center = component.cells.find((c) => c.gx + ox === 1 && c.gy + oy === 1);
      const faces = center ? FACES.filter((f) => FACE_COLOR[f] === center.sticker.color) : FACES;
      for (const face of faces) {
        const f = FACES.indexOf(face);
        for (let k = 0; k < 4; k++) {
          let mismatches = 0, checked = 0;
          const stickers = component.cells.map((c) => {
            const [row, col] = turnCell(c.gy + oy, c.gx + ox, k);
            const idx = f * 9 + row * 3 + col;
            const expected = known?.[idx] ?? null;
            if (expected) { checked++; if (expected !== c.sticker.color) mismatches++; }
            return { index: idx, face, row, col, color: c.sticker.color, center: c.sticker.center, quad: c.sticker.quad };
          });
          all.push({ component: index, face, stickers, mismatches, centerSeen: !!center, checked });
        }
      }
    }
  }
  if (all.length === 0) return [];

  const n = component.cells.length;
  let kept: typeof all;
  if (known && known.some((c) => c !== null)) {
    const best = Math.min(...all.map((h) => h.mismatches));
    // without its center a small grid matches some face by chance too easily
    kept = all.filter((h) => (h.centerSeen || h.checked >= 6) && h.checked >= Math.min(3, n) && h.mismatches <= Math.floor(n / 4) && h.mismatches <= best + 1);
  } else {
    kept = all.filter((h) => h.centerSeen);
  }
  return kept.sort((a, b) => a.mismatches - b.mismatches).slice(0, limit);
}

/** The grid without its first/last row or column. */
function trimmedGrids(c: GridComponent): GridComponent[] {
  const maxX = Math.max(...c.cells.map((x) => x.gx)), maxY = Math.max(...c.cells.map((x) => x.gy));
  const keep = (pred: (x: GridComponent['cells'][number]) => boolean, dx: number, dy: number): GridComponent => ({
    ...c,
    cells: c.cells.filter(pred).map((x) => ({ ...x, gx: x.gx - dx, gy: x.gy - dy })),
  });
  const out: GridComponent[] = [];
  if (maxX > 0) out.push(keep((x) => x.gx > 0, 1, 0), keep((x) => x.gx < maxX, 0, 0));
  if (maxY > 0) out.push(keep((x) => x.gy > 0, 0, 1), keep((x) => x.gy < maxY, 0, 0));
  return out;
}

// ---------------------------------------------------------------------------
// choosing the pose
// ---------------------------------------------------------------------------

export type PnpSolver = (
  points3d: Vec3[],
  points2d: Point[],
  k: Intrinsics,
  guess?: Pick<CubePose, 'rotation' | 'translation'>,
) => Pick<CubePose, 'rotation' | 'translation'> | null;

export function reprojectionError(pose: Pick<CubePose, 'rotation' | 'translation'>, k: Intrinsics, stickers: ObservedSticker[]): number {
  let sum = 0;
  for (const s of stickers) {
    const p = project(pose, k, stickerPoint(s.index));
    sum += (p.x - s.center.x) ** 2 + (p.y - s.center.y) ** 2;
  }
  return Math.sqrt(sum / Math.max(1, stickers.length));
}

export interface PoseChoice {
  pose: CubePose;
  hypotheses: FaceHypothesis[];
  /** true when the seen colors agree with the expected cube state */
  matchesKnown: boolean;
}

export interface ChooseOptions {
  /** smoothed pose of the previous frames, used to keep 90 degree ambiguities stable */
  previous?: Pick<CubePose, 'rotation' | 'translation'> | null;
  /** faces with fewer stickers do not get their own pose */
  minStickers?: number;
  /** max angle between the poses of two faces of the same cube */
  maxSpread?: number;
}

const U_AXIS: Vec3 = [0, 1, 0];

export function choosePose(
  components: GridComponent[],
  known: readonly (Color | null)[] | null,
  k: Intrinsics,
  solve: PnpSolver,
  options: ChooseOptions = {},
): PoseChoice | null {
  // grids that do not match the expected colors are rejected; if nothing matches at all the
  // physical cube is probably not the virtual one, so fall back to identifying faces by centers
  if (known && known.some((c) => c !== null)) {
    const withState = choosePoseOnce(components, known, k, solve, options);
    if (withState) return { ...withState, matchesKnown: true };
  }
  const byCenters = choosePoseOnce(components, null, k, solve, options);
  return byCenters && { ...byCenters, matchesKnown: false };
}

function choosePoseOnce(
  components: GridComponent[],
  known: readonly (Color | null)[] | null,
  k: Intrinsics,
  solve: PnpSolver,
  options: ChooseOptions,
): Omit<PoseChoice, 'matchesKnown'> | null {
  const minStickers = options.minStickers ?? 4;
  const maxSpread = options.maxSpread ?? 25;
  const used = components.slice(0, 3).map((c, i) => ({ c, i })).filter(({ c }) => c.cells.length >= minStickers);
  if (used.length === 0) return null;

  // every hypothesis gets its own pose from its face alone; a grid that does not fit a flat
  // face well is retried without one of its border rows/columns (it may have swallowed
  // stickers of the neighbouring face)
  const perComponent = used.map(({ c, i }) => {
    const pitch = (Math.hypot(c.stepX.x, c.stepX.y) + Math.hypot(c.stepY.x, c.stepY.y)) / 2;
    const maxError = Math.max(1.5, 0.1 * pitch);
    const fits = (grid: GridComponent) => faceHypotheses(grid, i, known).flatMap((h) => {
      const pose = solve(h.stickers.map((s) => stickerPoint(s.index)), h.stickers.map((s) => s.center), k);
      if (!pose || pose.translation[2] <= 0 || !faceVisible(pose, h.face)) return [];
      const error = reprojectionError(pose, k, h.stickers);
      if (error > maxError) return [];
      return [{ h, pose, error }];
    });
    const whole = fits(c);
    if (whole.length > 0) return whole;
    return trimmedGrids(c).filter((g) => g.cells.length >= minStickers).flatMap(fits);
  });

  type Pick = (typeof perComponent)[number][number] | null;
  let best: { picks: Pick[]; cost: number } | null = null;
  const picks: Pick[] = [];
  const evaluate = () => {
    const chosen = picks.filter((p): p is NonNullable<Pick> => p !== null);
    if (chosen.length === 0) return;
    const faces = new Set(chosen.map((p) => p.h.face));
    if (faces.size !== chosen.length) return;
    let spread = 0;
    for (let a = 0; a < chosen.length; a++) {
      for (let b = a + 1; b < chosen.length; b++) spread = Math.max(spread, rotationAngle(chosen[a].pose.rotation, chosen[b].pose.rotation));
    }
    if (spread > maxSpread) return;
    const ref = chosen.reduce((x, y) => (y.h.stickers.length > x.h.stickers.length ? y : x));
    const mismatches = chosen.reduce((s, p) => s + p.h.mismatches, 0);
    const unused = picks.filter((p) => p === null).length;
    let cost = 3 * mismatches + 0.05 * spread + 2.5 * unused;
    if (options.previous) {
      cost += rotationAngle(ref.pose.rotation, options.previous.rotation) / 20;
    } else {
      // no history: prefer the cube held upright (U pointing up in the image, y is down)
      const up = mat3Vec(ref.pose.rotation, U_AXIS);
      cost += (1 + up[1]) / 2;
    }
    if (!best || cost < best.cost) best = { picks: picks.slice(), cost };
  };
  const walk = (i: number) => {
    if (i === perComponent.length) { evaluate(); return; }
    picks[i] = null;
    walk(i + 1);
    for (const p of perComponent[i]) { picks[i] = p; walk(i + 1); }
  };
  walk(0);
  if (!best) return null;

  const chosen = (best as { picks: Pick[] }).picks.filter((p): p is NonNullable<Pick> => p !== null);
  const ref = chosen.reduce((x, y) => (y.h.stickers.length > x.h.stickers.length ? y : x));
  const stickers = chosen.flatMap((p) => p.h.stickers);
  let pose = ref.pose;
  if (chosen.length > 1) {
    const joint = solve(stickers.map((s) => stickerPoint(s.index)), stickers.map((s) => s.center), k, ref.pose);
    if (joint && joint.translation[2] > 0) pose = joint;
  }
  const error = reprojectionError(pose, k, stickers);
  return { pose: { ...pose, error }, hypotheses: chosen.map((p) => p.h) };
}

// ---------------------------------------------------------------------------
// frame to frame tracking
// ---------------------------------------------------------------------------

export interface TrackResult {
  pose: CubePose;
  observed: ObservedSticker[];
}

/**
 * Follow the cube from a predicted pose: project every sticker that can be seen, pair each with
 * the nearest detected sticker of a compatible color, and refine the pose on those pairs.
 * Unlike the per-frame search this needs no complete face grid: a few stickers spread over
 * several (even steeply seen) faces are enough, which keeps the lock while the cube turns.
 */
export function trackFromPrediction(
  candidates: StickerCandidate[],
  predicted: Pick<CubePose, 'rotation' | 'translation'>,
  known: readonly (Color | null)[] | null,
  k: Intrinsics,
  solve: PnpSolver,
  minMatches = 5,
  /** search radii in cubie widths, widest first */
  radii: number[] = [0.9, 0.55, 0.35],
): TrackResult | null {
  if (candidates.length < minMatches || predicted.translation[2] <= 0) return null;
  const pitchPx = k.fx / predicted.translation[2]; // one cubie, in pixels, at the cube center

  const associate = (pose: Pick<CubePose, 'rotation' | 'translation'>, radius: number): ObservedSticker[] => {
    const pairs: { d: number; idx: number; c: StickerCandidate }[] = [];
    for (let idx = 0; idx < 54; idx++) {
      // faces turning into view are allowed a little past edge on
      const n = mat3Vec(pose.rotation, STICKER_NORMAL[idx]);
      const c3 = mat3Vec(pose.rotation, stickerPoint(idx));
      const p3: Vec3 = [c3[0] + pose.translation[0], c3[1] + pose.translation[1], c3[2] + pose.translation[2]];
      const facing = -(n[0] * p3[0] + n[1] * p3[1] + n[2] * p3[2]) / Math.hypot(...p3);
      if (facing < -0.1) continue;
      const expected = known?.[idx] ?? null;
      const at = project(pose, k, stickerPoint(idx));
      for (const c of candidates) {
        if (expected && c.color !== expected) continue;
        const d = Math.hypot(c.center.x - at.x, c.center.y - at.y);
        if (d < radius) pairs.push({ d, idx, c });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    const usedIdx = new Set<number>(), usedC = new Set<StickerCandidate>();
    const out: ObservedSticker[] = [];
    for (const p of pairs) {
      if (usedIdx.has(p.idx) || usedC.has(p.c)) continue;
      usedIdx.add(p.idx); usedC.add(p.c);
      const f = Math.floor(p.idx / 9), cell = p.idx % 9;
      out.push({ index: p.idx, face: FACES[f], row: Math.floor(cell / 3), col: cell % 3, color: p.c.color, center: p.c.center, quad: p.c.quad });
    }
    return out;
  };

  let pose: Pick<CubePose, 'rotation' | 'translation'> = predicted;
  let observed: ObservedSticker[] = [];
  const offAt = (at: typeof pose, o: ObservedSticker) => {
    const p = project(at, k, stickerPoint(o.index));
    return Math.hypot(p.x - o.center.x, p.y - o.center.y);
  };
  // wide search first (the cube moved since the prediction), then tighten
  for (const [n, radius] of radii.entries()) {
    observed = associate(pose, radius * pitchPx);
    if (observed.length < minMatches) return null;
    if (n === 0) {
      // A layer being twisted moves while the rest stays where predicted. Keep what is still in
      // place: otherwise the (often larger) turning part wins and the twist shows as a tilt.
      const inPlace = observed.filter((o) => offAt(predicted, o) <= 0.2 * pitchPx);
      if (inPlace.length >= Math.max(minMatches, 0.3 * observed.length) && inPlace.length < observed.length) {
        const fit = solve(inPlace.map((o) => stickerPoint(o.index)), inPlace.map((o) => o.center), k, predicted);
        if (fit && fit.translation[2] > 0) { pose = fit; observed = inPlace; continue; }
      }
    }
    const refined = solve(observed.map((o) => stickerPoint(o.index)), observed.map((o) => o.center), k, pose);
    if (!refined || refined.translation[2] <= 0) return null;
    pose = refined;
  }
  observed = associate(pose, 0.3 * pitchPx);
  if (observed.length < minMatches) return null;
  // drop the worst fitting sticker until all fit: stickers of a layer mid twist sit off the
  // grid of the rest, and a least squares fit through all of them would tilt the cube
  for (;;) {
    const res = observed.map((o) => {
      const p = project(pose, k, stickerPoint(o.index));
      return Math.hypot(p.x - o.center.x, p.y - o.center.y);
    });
    const worst = res.indexOf(Math.max(...res));
    if (res[worst] <= 0.12 * pitchPx || observed.length <= minMatches) break;
    observed = observed.filter((_, i) => i !== worst);
    const refit = solve(observed.map((o) => stickerPoint(o.index)), observed.map((o) => o.center), k, pose);
    if (!refit || refit.translation[2] <= 0) return null;
    pose = refit;
  }
  const error = reprojectionError(pose, k, observed);
  if (error > Math.max(1.5, 0.12 * (k.fx / pose.translation[2]))) return null;
  return { pose: { ...pose, error }, observed };
}

// ---------------------------------------------------------------------------
// whole faces (stickerless cubes)
// ---------------------------------------------------------------------------

/** The 4 corners of a face, clockwise as seen from outside, starting at the net's top-left. */
export function faceCorners(face: FaceLetter): Vec3[] {
  const f = FACES.indexOf(face) * 9;
  const tl = stickerPoint(f), tr = stickerPoint(f + 2), bl = stickerPoint(f + 6), c = stickerPoint(f + 4);
  const col = tl.map((v, i) => (tr[i] - v) / 2) as Vec3; // one cubie to the right
  const row = tl.map((v, i) => (bl[i] - v) / 2) as Vec3; // one cubie down
  const at = (a: number, b: number): Vec3 => [c[0] + a * col[0] + b * row[0], c[1] + a * col[1] + b * row[1], c[2] + a * col[2] + b * row[2]];
  return [at(-1.5, -1.5), at(1.5, -1.5), at(1.5, 1.5), at(-1.5, 1.5)];
}

export interface FaceQuadHypothesis {
  face: FaceLetter;
  pose: Pick<CubePose, 'rotation' | 'translation'>;
  corners3d: Vec3[];
  corners2d: Point[];
}

/**
 * On a stickerless cube the tiles of a solved (single colored) face melt into one blob.
 * A quadrilateral blob of color c may then be a whole face whose 9 expected colors are all c;
 * its 4 corners give the pose, once per quarter turn (the corners look alike).
 */
export function faceQuadHypotheses(
  candidates: StickerCandidate[],
  known: readonly (Color | null)[],
  k: Intrinsics,
  solve: PnpSolver,
  minArea: number,
): FaceQuadHypothesis[] {
  const uniform = FACES.filter((f) => {
    const i = FACES.indexOf(f) * 9;
    return known.slice(i, i + 9).every((c) => c !== null && c === known[i + 4]);
  });
  const out: FaceQuadHypothesis[] = [];
  for (const c of candidates) {
    if (c.area < minArea) continue;
    for (const face of uniform) {
      if (known[FACES.indexOf(face) * 9 + 4] !== c.color) continue;
      const corners = faceCorners(face);
      for (let turn = 0; turn < 4; turn++) {
        const c3 = [0, 1, 2, 3].map((i) => corners[(i + turn) % 4]);
        const pose = solve(c3, c.quad, k);
        if (!pose || pose.translation[2] <= 0 || !faceVisible(pose, face)) continue;
        out.push({ face, pose, corners3d: c3, corners2d: c.quad });
      }
    }
  }
  return out;
}

/**
 * Constant velocity guess of the pose at time `now` from the last two poses (with their times).
 * The extrapolated turn is capped so one bad frame cannot throw the guess far off.
 */
export function predictPose(
  prev: Pick<CubePose, 'rotation' | 'translation'>,
  last: Pick<CubePose, 'rotation' | 'translation'>,
  steps = 1,
): Pick<CubePose, 'rotation' | 'translation'> {
  const angle = rotationAngle(prev.rotation, last.rotation);
  if (angle > 45) return last;
  const s = Math.min(steps, 3);
  const delta = matToQuat(mat3Mul(last.rotation, mat3T(prev.rotation)));
  const turn = slerp([0, 0, 0, 1], delta, Math.min(s, 45 / Math.max(angle, 1e-6)));
  const rotation = mat3Mul(quatToMat(turn), last.rotation);
  const translation = last.translation.map((v, i) => v + (v - prev.translation[i]) * 0.8 * s) as [number, number, number];
  return { rotation, translation };
}

// ---------------------------------------------------------------------------
// smoothing
// ---------------------------------------------------------------------------

export type Quat = [number, number, number, number]; // x y z w

export function matToQuat(m: Mat3): Quat {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
  const tr = m00 + m11 + m22;
  let q: Quat;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    q = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  const l = Math.hypot(...q);
  return q.map((v) => v / l) as Quat;
}

export function quatToMat([x, y, z, w]: Quat): Mat3 {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { d = -d; bb = b.map((v) => -v) as Quat; }
  if (d > 0.9995) {
    const q = a.map((v, i) => v + (bb[i] - v) * t);
    const l = Math.hypot(...q);
    return q.map((v) => v / l) as Quat;
  }
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => wa * v + wb * bb[i]) as Quat;
}

export interface SmootherOptions {
  /** fraction of the way to the new pose per frame */
  rotationAlpha: number;
  positionAlpha: number;
  /** keep showing the last pose this long after the cube is lost (ms) */
  holdMs: number;
  /** a jump larger than this (degrees) must be confirmed by `confirmFrames` frames */
  jumpDeg: number;
  confirmFrames: number;
}

/**
 * Exponential smoothing of the pose, with protection against single frame flips
 * (a wrong 90/180 degree choice is only accepted when it persists).
 */
export class PoseSmoother {
  private q: Quat | null = null;
  private t: [number, number, number] = [0, 0, 0];
  private lastSeen = -Infinity;
  private pending: { q: Quat; count: number } | null = null;
  readonly o: SmootherOptions;

  constructor(options: Partial<SmootherOptions> = {}) {
    this.o = { rotationAlpha: 0.35, positionAlpha: 0.6, holdMs: 800, jumpDeg: 40, confirmFrames: 3, ...options };
  }

  reset() { this.q = null; this.pending = null; this.lastSeen = -Infinity; }

  /** Current smoothed pose, or null when lost. */
  get pose(): Pick<CubePose, 'rotation' | 'translation'> | null {
    return this.q ? { rotation: quatToMat(this.q), translation: [...this.t] as [number, number, number] } : null;
  }

  update(pose: Pick<CubePose, 'rotation' | 'translation'> | null, now: number): { pose: Pick<CubePose, 'rotation' | 'translation'> | null; tracking: boolean } {
    if (!pose) {
      if (now - this.lastSeen > this.o.holdMs) this.reset();
      return { pose: this.pose, tracking: false };
    }
    const q = matToQuat(pose.rotation);
    this.lastSeen = now;
    if (!this.q) {
      this.q = q; this.t = [...pose.translation]; this.pending = null;
      return { pose: this.pose, tracking: true };
    }
    const angle = rotationAngle(quatToMat(this.q), pose.rotation);
    if (angle > this.o.jumpDeg) {
      const same = this.pending && rotationAngle(quatToMat(this.pending.q), pose.rotation) < this.o.jumpDeg / 2;
      this.pending = same ? { q, count: this.pending!.count + 1 } : { q, count: 1 };
      if (this.pending.count < this.o.confirmFrames) return { pose: this.pose, tracking: true };
      this.q = q; // confirmed: jump straight there
      this.pending = null;
    } else {
      this.pending = null;
      // follow fast turns closely, smooth out jitter when the cube is almost still
      const alpha = Math.min(0.9, this.o.rotationAlpha + angle / 25);
      this.q = slerp(this.q, q, alpha);
    }
    const a = this.o.positionAlpha;
    this.t = this.t.map((v, i) => v + (pose.translation[i] - v) * a) as [number, number, number];
    return { pose: this.pose, tracking: true };
  }
}

// ---------------------------------------------------------------------------
// to three.js
// ---------------------------------------------------------------------------

/**
 * How the virtual cube is shown:
 *  - 'camera': as the webcam sees it
 *  - 'mirror': as in a mirror (matches a mirrored preview)
 *  - 'pov':    as the person holding the cube sees it: from the opposite side of the camera
 *              (the camera sees red in front, the person sees the orange back face)
 */
export type ThreeView = 'camera' | 'mirror' | 'pov';

/**
 * Pose in three.js conventions (camera looks down -z, y up): rotation of the cube object and
 * its position normalised to the frame (-0.5 .. 0.5, y up), for the chosen view.
 */
export function toThreePose(pose: Pick<CubePose, 'rotation' | 'translation'>, k: Intrinsics, view: ThreeView) {
  // C = diag(1, -1, -1) turns OpenCV camera coords into three.js camera coords
  const C: Mat3 = [1, 0, 0, 0, -1, 0, 0, 0, -1];
  let r = mat3Mul(C, pose.rotation);
  const [tx, ty, tz] = pose.translation;
  let x = (k.fx * tx / tz) / k.width;
  const y = -(k.fy * ty / tz) / k.height;
  if (view === 'mirror') {
    const S: Mat3 = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
    r = mat3Mul(mat3Mul(S, r), S);
    x = -x;
  } else if (view === 'pov') {
    // walk around to the other side of the cube: half a turn about the vertical axis
    const Y180: Mat3 = [-1, 0, 0, 0, 1, 0, 0, 0, -1];
    r = mat3Mul(Y180, r);
    x = -x;
  }
  return { quaternion: matToQuat(r), x, y, depth: tz };
}
