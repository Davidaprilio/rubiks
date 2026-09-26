import { STICKER_NORMAL, STICKER_POS, type Color, type Vec3 } from '../solver/cube54';
import type { CubePose, Intrinsics } from '../tracking/types';
import { PIXEL_LABELS } from './colorClassify';
import { mat3Vec, project, rotationAngle, stickerPoint } from './cubePose';
import { optimizePose } from './pnp';

/**
 * Pose refinement against colored regions instead of single stickers.
 *
 * When the cube moves, motion blur washes out the black lines between stickers: stickers of one
 * color melt into stripes or a whole face turns into one blob, and sticker detection finds
 * nothing. The colors are still where they are, though. Starting from the predicted pose this
 * moves the cube model until every sticker (sampled at a few points) lies inside a region of
 * its expected color, and the area just outside the cube's outline is not that color.
 */

type Pose = Pick<CubePose, 'rotation' | 'translation'>;

export interface LabelMaps {
  width: number;
  height: number;
  /** processing pixels per map pixel */
  factor: number;
  /** top-left of the map in processing pixels */
  x0: number;
  y0: number;
  /** per label: distance (map px) to the nearest pixel of that color */
  toColor(label: number): Float32Array;
  /** per label: distance (map px) to the nearest pixel NOT of that color (0 outside it) */
  insideColor(label: number): Float32Array;
  /**
   * How much a match of this color counts as evidence: a color that covers much of the frame
   * (a white wall, a red shirt) is matched anywhere, so it counts little.
   */
  weight(label: number): number;
}

/** Two pass chamfer distance to the nearest `target` pixel. */
function distanceTransform(target: (i: number) => boolean, w: number, h: number): Float32Array {
  const INF = 1e6, D = 1, DD = Math.SQRT2;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = target(i) ? 0 : INF;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + D);
      if (y > 0) {
        v = Math.min(v, d[i - w] + D);
        if (x > 0) v = Math.min(v, d[i - w - 1] + DD);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + DD);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + D);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + D);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + DD);
        if (x > 0) v = Math.min(v, d[i + w - 1] + DD);
      }
      d[i] = v;
    }
  }
  return d;
}

export interface Rect { x: number; y: number; width: number; height: number }

/**
 * Distance maps of every color from the pixel labels, at 1/`factor` resolution, limited to
 * `roi` (processing pixels) and computed only for the colors that are asked for.
 */
export function buildLabelMaps(labels: Uint8Array, width: number, height: number, factor = 2, roi?: Rect): LabelMaps {
  const rx0 = Math.max(0, Math.floor(roi?.x ?? 0)), ry0 = Math.max(0, Math.floor(roi?.y ?? 0));
  const rx1 = Math.min(width, Math.ceil(roi ? roi.x + roi.width : width));
  const ry1 = Math.min(height, Math.ceil(roi ? roi.y + roi.height : height));
  const w = Math.max(1, Math.floor((rx1 - rx0) / factor)), h = Math.max(1, Math.floor((ry1 - ry0) / factor));
  const small = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) small[y * w + x] = labels[(ry0 + y * factor) * width + rx0 + x * factor];
  const to = new Map<number, Float32Array>(), inside = new Map<number, Float32Array>();
  const counts = new Array(PIXEL_LABELS.length).fill(0);
  for (let i = 0; i < labels.length; i += 4) if (labels[i] < counts.length) counts[labels[i]]++;
  const weights = counts.map((c) => (c * 4 > 0.2 * labels.length ? 0.25 : 1));
  return {
    width: w, height: h, factor, x0: rx0, y0: ry0,
    weight: (label) => weights[label] ?? 1,
    toColor(c) {
      let m = to.get(c);
      if (!m) { m = distanceTransform((i) => small[i] === c, w, h); to.set(c, m); }
      return m;
    },
    insideColor(c) {
      let m = inside.get(c);
      if (!m) { m = distanceTransform((i) => small[i] !== c, w, h); inside.set(c, m); }
      return m;
    },
  };
}

/** Bounding box of the cube at `pose` in processing pixels, grown by `margin` (fraction). */
export function cubeBounds(pose: Pose, k: Intrinsics, margin = 0.35): Rect | null {
  if (pose.translation[2] <= 0) return null;
  const xs: number[] = [], ys: number[] = [];
  for (const x of [-1.5, 1.5]) for (const y of [-1.5, 1.5]) for (const z of [-1.5, 1.5]) {
    const p = project(pose, k, [x, y, z]);
    xs.push(p.x); ys.push(p.y);
  }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const mx = (x1 - x0) * margin, my = (y1 - y0) * margin;
  return { x: x0 - mx, y: y0 - my, width: x1 - x0 + 2 * mx, height: y1 - y0 + 2 * my };
}

function sample(map: Float32Array, m: LabelMaps, px: number, py: number, outside: number): number {
  const x = (px - m.x0) / m.factor, y = (py - m.y0) / m.factor;
  if (x < 0 || y < 0 || x > m.width - 1 || y > m.height - 1) return outside;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, m.width - 1), y1 = Math.min(y0 + 1, m.height - 1);
  const fx = x - x0, fy = y - y0;
  const a = map[y0 * m.width + x0], b = map[y0 * m.width + x1], c = map[y1 * m.width + x0], d = map[y1 * m.width + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Unit axes of the plane of a face with normal n. */
function tangents(n: Vec3): [Vec3, Vec3] {
  const a: Vec3 = n[0] !== 0 ? [0, 1, 0] : [1, 0, 0];
  const b: Vec3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  return [a, b];
}

const add = (p: Vec3, v: Vec3, s: number): Vec3 => [p[0] + v[0] * s, p[1] + v[1] * s, p[2] + v[2] * s];

/** How squarely a face (given by one of its stickers) looks at the camera: 1 = head on, < 0 = away. */
function facing(pose: Pose, idx: number): number {
  const n = mat3Vec(pose.rotation, STICKER_NORMAL[idx]);
  const c = mat3Vec(pose.rotation, stickerPoint(idx));
  const p: Vec3 = [c[0] + pose.translation[0], c[1] + pose.translation[1], c[2] + pose.translation[2]];
  return -(n[0] * p[0] + n[1] * p[1] + n[2] * p[2]) / Math.hypot(...p);
}

interface Sample { point: Vec3; label: number; inside: boolean; sticker: number }

export function buildSamples(pose: Pose, known: readonly (Color | null)[]): Sample[] {
  const samples: Sample[] = [];
  const faceFacing = [0, 1, 2, 3, 4, 5].map((f) => facing(pose, f * 9 + 4));
  const faceOfNormal = (v: Vec3) => [0, 1, 2, 3, 4, 5].find((f) => {
    const n = STICKER_NORMAL[f * 9 + 4];
    return n[0] === v[0] && n[1] === v[1] && n[2] === v[2];
  })!;
  for (let idx = 0; idx < 54; idx++) {
    const color = known[idx];
    if (!color) continue;
    const f = Math.floor(idx / 9);
    if (faceFacing[f] < 0.12) continue; // seen too edge on to be reliable
    const label = PIXEL_LABELS.indexOf(color);
    const center = stickerPoint(idx);
    const [a, b] = tangents(STICKER_NORMAL[idx]);
    for (const da of [-0.3, 0, 0.3]) for (const db of [-0.3, 0, 0.3]) samples.push({ point: add(add(center, a, da), b, db), label, inside: true, sticker: idx });
    // across a silhouette edge of the cube the color must not continue
    const pos = STICKER_POS[idx];
    for (const t of [a, b, a.map((v) => -v) as Vec3, b.map((v) => -v) as Vec3]) {
      if (pos[0] * t[0] + pos[1] * t[1] + pos[2] * t[2] !== 1) continue; // not on this border
      if (faceFacing[faceOfNormal(t)] >= 0.12) continue; // the neighbouring face is sampled itself
      samples.push({ point: add(center, t, 0.8), label, inside: false, sticker: idx });
    }
  }
  return samples;
}

// ---------------------------------------------------------------------------
// one layer may be caught mid twist
// ---------------------------------------------------------------------------

/** The 9 layers of the cube (3 per axis) a sticker belongs to: its cubie coordinate per axis. */
const layersOf = (sticker: number) => STICKER_POS[sticker].map((v, axis) => axis * 3 + v + 1);

/**
 * The layer whose stickers fit clearly worse than the rest, given a per sticker "bad" value
 * (0 = fits, 1 = does not). While the person turns a layer, that layer does not match the
 * cube model at all; it is ignored instead of dragging the pose along (which would show a
 * twist as a tilt).
 */
export function worstLayer(bad: Map<number, number>): number | null {
  const sum = new Array(9).fill(0), count = new Array(9).fill(0);
  for (const [sticker, b] of bad) for (const l of layersOf(sticker)) { sum[l] += b; count[l]++; }
  let worst = -1, worstRate = 0;
  for (let l = 0; l < 9; l++) {
    if (count[l] < 3) continue;
    const rate = sum[l] / count[l];
    if (rate > worstRate) { worstRate = rate; worst = l; }
  }
  if (worst < 0 || worstRate < 0.2) return null;
  let restSum = 0, restCount = 0;
  for (const [sticker, b] of bad) if (!layersOf(sticker).includes(worst)) { restSum += b; restCount++; }
  if (restCount < 6) return null;
  // the rest fits well, and clearly better than this layer (early in a twist the layer is only
  // a little off, so this is relative rather than absolute)
  const rest = restSum / restCount;
  return rest <= 0.2 && worstRate >= 2.5 * rest + 0.05 ? worst : null;
}

/** Per sticker: fraction of its inside samples that miss the expected color. */
export function missRates(maps: LabelMaps, pose: Pose, k: Intrinsics, samples: Sample[]): Map<number, number> {
  const miss = new Map<number, number>(), total = new Map<number, number>();
  for (const s of samples) {
    if (!s.inside) continue;
    const p = project(pose, k, s.point);
    const m = sample(maps.toColor(s.label), maps, p.x, p.y, 8) < 1 ? 0 : 1;
    miss.set(s.sticker, (miss.get(s.sticker) ?? 0) + m);
    total.set(s.sticker, (total.get(s.sticker) ?? 0) + 1);
  }
  const out = new Map<number, number>();
  for (const [st, t] of total) out.set(st, (miss.get(st) ?? 0) / t);
  return out;
}

/**
 * Fraction of the sticker samples of `pose` that lie inside their expected color (0..1).
 * A single layer that clearly does not fit (mid twist) is left out.
 */
export function regionScore(maps: LabelMaps, pose: Pose, known: readonly (Color | null)[], k: Intrinsics): number {
  if (pose.translation[2] <= 0) return 0;
  const samples = buildSamples(pose, known);
  const rates = missRates(maps, pose, k, samples);
  if (rates.size < 2) return 0;
  const skip = worstLayer(rates);
  let miss = 0, weight = 0;
  for (const [sticker, r] of rates) {
    if (skip !== null && layersOf(sticker).includes(skip)) continue;
    const w = maps.weight(PIXEL_LABELS.indexOf(known[sticker]!));
    miss += w * r; weight += w;
  }
  // too little real evidence, e.g. only stickers of the background's color
  return weight >= 3 ? 1 - miss / weight : 0;
}

export interface RegionAlignResult {
  pose: CubePose;
  /** fraction of sticker samples that ended inside their expected color */
  score: number;
  samples: number;
  /** layer left out as mid twist (axis * 3 + coordinate + 1), null when none */
  skippedLayer: number | null;
  /** some stickers did not fit and were left out: probably a layer mid twist */
  partial: boolean;
}

export function alignToRegions(
  maps: LabelMaps,
  start: Pose,
  known: readonly (Color | null)[],
  k: Intrinsics,
  /** pose to hold on to while a twist is suspected (the last pose before it), default `start` */
  anchor: Pose = start,
): RegionAlignResult | null {
  if (start.translation[2] <= 0) return null;
  const all = buildSamples(start, known);
  if (all.filter((s) => s.inside).length < 18) return null;
  const f = maps.factor;
  const z0 = start.translation[2];
  // while a twist is suspected the pose is also held close to the start (the prediction): the
  // stickers that are left are near the turning layer and easily pulled by it
  let holdWeight = 0;
  const optimize = (samples: Sample[], from: Pose) => {
    const residualsOf = (pose: Pose) => {
      const r = samples.map((s) => {
        const p = project(pose, k, s.point);
        const w = maps.weight(s.label);
        return w * (s.inside
          ? Math.min(8, sample(maps.toColor(s.label), maps, p.x, p.y, 8))
          : Math.min(4, sample(maps.insideColor(s.label), maps, p.x, p.y, 0)));
      });
      // a smaller cube still lies inside all its colors: keep the distance close to the
      // prediction (the cube rarely moves much towards / away from the camera between frames)
      r.push(Math.sqrt(samples.length) * 4 * ((pose.translation[2] - z0) / z0) * 10);
      if (holdWeight > 0) {
        const w = Math.sqrt(samples.length) * holdWeight;
        r.push(w * rotationAngle(pose.rotation, anchor.rotation));
        r.push(w * 3 * (pose.translation[0] - anchor.translation[0]), w * 3 * (pose.translation[1] - anchor.translation[1]));
      }
      return r;
    };
    // coarse first (large differentiation step reaches over the flat parts of the maps), then fine
    const pose = optimizePose(from, residualsOf, { iterations: 12, step: 3e-3 });
    return optimizePose(pose, residualsOf, { iterations: 8, step: 5e-4 });
  };

  // Stickers that do not fit even at the predicted pose are left out: a layer mid twist, and
  // the stickers it hides while it swings in front of them. They would drag the pose along and
  // show a twist as a tilt. When too many miss (the whole cube moved fast) all are used.
  const trusted = (at: Pose) => {
    const rates = missRates(maps, at, k, all);
    const good = new Set([...rates].filter(([, r]) => r <= 0.34).map(([st]) => st));
    return good.size >= Math.max(5, 0.5 * rates.size) && good.size < rates.size ? good : null;
  };
  let samples = all;
  let pose = start;
  const first = trusted(start);
  if (first) {
    holdWeight = 0.15;
    samples = all.filter((s) => first.has(s.sticker));
    pose = optimize(samples, start);
    const second = trusted(pose); // the better pose may bring stickers back
    if (second) { samples = all.filter((s) => second.has(s.sticker)); pose = optimize(samples, pose); }
  } else {
    pose = optimize(all, start);
  }
  const skipped = samples === all ? null : worstLayer(missRates(maps, pose, k, all));

  const inside = samples.filter((s) => s.inside);
  let hits = 0, sq = 0;
  for (const s of inside) {
    const p = project(pose, k, s.point);
    const d = Math.min(8, sample(maps.toColor(s.label), maps, p.x, p.y, 8));
    if (d < 1) hits++;
    sq += d * d;
  }
  return {
    pose: { ...pose, error: Math.sqrt(sq / inside.length) * f },
    score: hits / inside.length,
    samples: inside.length,
    skippedLayer: skipped,
    partial: samples !== all,
  };
}

/**
 * The color of every sticker the camera sees well at `pose`, read from the pixel labels at a few
 * points inside the sticker (no sticker outlines needed, so it works on stickerless cubes).
 * null = not visible, seen too edge on, or no clear majority color.
 */
export function readStickerColors(
  labels: Uint8Array,
  width: number,
  height: number,
  pose: Pose,
  k: Intrinsics,
  minFacing = 0.3,
): (Color | null)[] {
  const out: (Color | null)[] = new Array(54).fill(null);
  if (pose.translation[2] <= 0) return out;
  const counts = new Array(PIXEL_LABELS.length).fill(0);
  for (let idx = 0; idx < 54; idx++) {
    if (facing(pose, idx) < minFacing) continue;
    const center = stickerPoint(idx);
    const [a, b] = tangents(STICKER_NORMAL[idx]);
    counts.fill(0);
    let total = 0;
    for (const da of [-0.22, 0, 0.22]) {
      for (const db of [-0.22, 0, 0.22]) {
        const p = project(pose, k, add(add(center, a, da), b, db));
        const x = Math.round(p.x), y = Math.round(p.y);
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        total++;
        const l = labels[y * width + x];
        if (l < PIXEL_LABELS.length) counts[l]++;
      }
    }
    if (total < 9) continue;
    const best = counts.indexOf(Math.max(...counts));
    if (counts[best] >= 6) out[idx] = PIXEL_LABELS[best] as Color;
  }
  return out;
}
