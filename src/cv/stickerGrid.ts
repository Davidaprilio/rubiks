import type { GridComponent, Point, StickerCandidate } from '../tracking/types';

/**
 * Groups sticker candidates into grids (one grid per visible cube face).
 * Pure geometry, no OpenCV, so it can be unit tested with synthetic stickers.
 *
 * Two stickers are grid neighbours when the vector between their centers is about one
 * (or two, to bridge a missing sticker) grid pitch along one of the sticker's own edges,
 * and their size and orientation are alike. A breadth first walk over that graph gives each
 * sticker an integer cell; every connected group is then clipped to a 3x3 window.
 */

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const len = (a: Point) => Math.hypot(a.x, a.y);

/** Half edge vectors of a quad, right handed in image space (x right, y down). */
export function quadAxes(quad: readonly Point[]): { u: Point; v: Point } {
  const [p0, p1, p2, p3] = quad;
  let u = mul(add(sub(p1, p0), sub(p2, p3)), 0.25);
  let v = mul(add(sub(p3, p0), sub(p2, p1)), 0.25);
  if (cross(u, v) < 0) [u, v] = [v, u];
  return { u, v };
}

/** The 4 rotations of a right handed basis (keeps handedness). */
function rotations(u: Point, v: Point): [Point, Point][] {
  return [[u, v], [v, mul(u, -1)], [mul(u, -1), mul(v, -1)], [mul(v, -1), u]];
}

/** Rotate (u, v) by quarter turns so it best matches (ru, rv). */
function alignBasis(u: Point, v: Point, ru: Point, rv: Point): [Point, Point] {
  let best: [Point, Point] = [u, v];
  let score = -Infinity;
  for (const [a, b] of rotations(u, v)) {
    const s = dot(a, ru) / (len(a) * len(ru) || 1) + dot(b, rv) / (len(b) * len(rv) || 1);
    if (s > score) { score = s; best = [a, b]; }
  }
  return best;
}

/** Express d in the basis (U, V): d = a U + b V. */
function solve2(d: Point, U: Point, V: Point): [number, number] {
  const det = cross(U, V);
  if (Math.abs(det) < 1e-9) return [NaN, NaN];
  return [cross(d, V) / det, cross(U, d) / det];
}

export interface GridOptions {
  /** accepted grid pitch, in sticker edge lengths */
  minPitch: number;
  maxPitch: number;
  /** accepted sideways drift, in sticker edge lengths */
  maxDrift: number;
  maxAreaRatio: number;
  /** max angle between the aligned axes of two neighbours, degrees */
  maxAngle: number;
  /** max ratio between the matching edge lengths of two neighbours */
  maxEdgeRatio: number;
  /** max distance of a sticker from the fitted lattice, in grid pitches */
  maxResidual: number;
}

export const DEFAULT_GRID_OPTIONS: GridOptions = {
  minPitch: 0.95,
  maxPitch: 1.8,
  maxDrift: 0.4,
  maxAreaRatio: 2.0,
  maxAngle: 22,
  maxEdgeRatio: 1.35,
  maxResidual: 0.22,
};

interface Edge { to: number; step: [number, number] }

/** Integer step from sticker i to sticker j in i's own (full edge) basis, or null. */
function neighbourStep(si: StickerCandidate, sj: StickerCandidate, o: GridOptions): [number, number] | null {
  const ratio = si.area > sj.area ? si.area / sj.area : sj.area / si.area;
  if (ratio > o.maxAreaRatio) return null;
  const U = mul(si.u, 2), V = mul(si.v, 2);
  const [a, b] = solve2(sub(sj.center, si.center), U, V);
  if (!Number.isFinite(a)) return null;
  const pick = (along: number, side: number): number | null => {
    if (Math.abs(side) > o.maxDrift) return null;
    const m = Math.abs(along);
    if (m >= o.minPitch && m <= o.maxPitch) return Math.sign(along);
    if (m >= 2 * o.minPitch && m <= 2 * o.maxPitch) return 2 * Math.sign(along); // a sticker is missing in between
    return null;
  };
  const alongU = pick(a, b);
  if (alongU !== null) return [alongU, 0];
  const alongV = pick(b, a);
  if (alongV !== null) return [0, alongV];
  return null;
}

/**
 * Neighbours on one face look alike: same orientation and about the same edge lengths.
 * Stickers of two faces meeting at a cube edge differ in at least one of these.
 */
function shapesAgree(si: StickerCandidate, sj: StickerCandidate, o: GridOptions) {
  const [au, av] = alignBasis(sj.u, sj.v, si.u, si.v);
  const cos = Math.cos((o.maxAngle * Math.PI) / 180);
  if (dot(au, si.u) / (len(au) * len(si.u) || 1) < cos) return false;
  if (dot(av, si.v) / (len(av) * len(si.v) || 1) < cos) return false;
  const ratio = (a: number, b: number) => (a > b ? a / b : b / a);
  return ratio(len(au), len(si.u)) <= o.maxEdgeRatio && ratio(len(av), len(si.v)) <= o.maxEdgeRatio;
}

export function groupStickers(
  stickers: StickerCandidate[],
  options: Partial<GridOptions> = {},
): { components: GridComponent[]; outliers: StickerCandidate[] } {
  const first = groupOnce(stickers, options);
  // stickers cut off by the 3x3 window (e.g. the next face) may form a grid of their own
  if (first.outliers.length < 2) return first;
  const second = groupOnce(first.outliers, options);
  const components = [...first.components, ...second.components].sort((a, b) => b.cells.length - a.cells.length);
  return { components, outliers: second.outliers };
}

function groupOnce(
  stickers: StickerCandidate[],
  options: Partial<GridOptions>,
): { components: GridComponent[]; outliers: StickerCandidate[] } {
  const o = { ...DEFAULT_GRID_OPTIONS, ...options };
  const n = stickers.length;
  const edges: Edge[][] = stickers.map(() => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const si = stickers[i], sj = stickers[j];
      const sij = neighbourStep(si, sj, o);
      const sji = neighbourStep(sj, si, o);
      if (!sij || !sji || !shapesAgree(si, sj, o)) continue;
      edges[i].push({ to: j, step: sij });
      edges[j].push({ to: i, step: sji });
    }
  }

  const visited = new Array<boolean>(n).fill(false);
  const components: GridComponent[] = [];
  const outliers: StickerCandidate[] = [];
  // grow components from the best connected stickers first
  const order = stickers.map((_, i) => i).sort((a, b) => edges[b].length - edges[a].length);

  for (const root of order) {
    if (visited[root]) continue;
    if (edges[root].length === 0) { visited[root] = true; outliers.push(stickers[root]); continue; }

    const cell = new Map<number, [number, number]>();
    const basis = new Map<number, [Point, Point]>();
    cell.set(root, [0, 0]);
    basis.set(root, [stickers[root].u, stickers[root].v]);
    const queue = [root];
    visited[root] = true;
    while (queue.length) {
      const i = queue.shift()!;
      const [bu, bv] = basis.get(i)!;
      const [ci, cj] = cell.get(i)!;
      for (const e of edges[i]) {
        if (visited[e.to]) continue;
        // re-express the raw step in i's aligned basis
        const raw = add(mul(stickers[i].u, e.step[0]), mul(stickers[i].v, e.step[1]));
        const [sa, sb] = solve2(raw, bu, bv).map(Math.round);
        visited[e.to] = true;
        cell.set(e.to, [ci + sa, cj + sb]);
        basis.set(e.to, alignBasis(stickers[e.to].u, stickers[e.to].v, bu, bv));
        queue.push(e.to);
      }
    }

    // keep the 3x3 window with most stickers, one sticker per cell
    const members = [...cell.entries()];
    let bestWin: [number, number] = [0, 0], bestCount = -1;
    const xs = members.map(([, c]) => c[0]), ys = members.map(([, c]) => c[1]);
    for (let wx = Math.min(...xs) - 2; wx <= Math.max(...xs); wx++) {
      for (let wy = Math.min(...ys) - 2; wy <= Math.max(...ys); wy++) {
        const count = new Set(members.filter(([, c]) => c[0] >= wx && c[0] < wx + 3 && c[1] >= wy && c[1] < wy + 3).map(([, c]) => `${c[0]},${c[1]}`)).size;
        if (count > bestCount) { bestCount = count; bestWin = [wx, wy]; }
      }
    }
    const taken = new Map<string, number>();
    const rootBasis = basis.get(root)!;
    for (const [idx, [gx, gy]] of members) {
      const inside = gx >= bestWin[0] && gx < bestWin[0] + 3 && gy >= bestWin[1] && gy < bestWin[1] + 3;
      const key = `${gx},${gy}`;
      if (!inside) { outliers.push(stickers[idx]); continue; }
      const other = taken.get(key);
      if (other === undefined) { taken.set(key, idx); continue; }
      // two stickers claim one cell: keep the one closest to where the cell should be
      const expected = add(stickers[root].center, add(mul(rootBasis[0], 2 * gx * 1.15), mul(rootBasis[1], 2 * gy * 1.15)));
      const keep = len(sub(stickers[idx].center, expected)) < len(sub(stickers[other].center, expected)) ? idx : other;
      outliers.push(stickers[keep === idx ? other : idx]);
      taken.set(key, keep);
    }
    // a grid is flat: drop stickers that do not follow the (affine) lattice of the rest,
    // which is what happens when stickers of two faces got linked across a cube edge
    const cellOf = (key: string) => key.split(',').map(Number) as [number, number];
    for (;;) {
      if (taken.size < 3) break;
      const cells = [...taken.entries()].map(([key, idx]) => {
        const [gx, gy] = cellOf(key);
        return { sticker: stickers[idx], gx, gy, key };
      });
      const fit = gridSteps(cells);
      if (!fit.origin) break;
      const pitch = (len(fit.stepX) + len(fit.stepY)) / 2;
      let worst: { key: string; r: number } | null = null;
      for (const c of cells) {
        const p = add(fit.origin, add(mul(fit.stepX, c.gx), mul(fit.stepY, c.gy)));
        const r = len(sub(p, c.sticker.center));
        if (!worst || r > worst.r) worst = { key: c.key, r };
      }
      if (!worst || worst.r <= o.maxResidual * pitch) break;
      outliers.push(stickers[taken.get(worst.key)!]);
      taken.delete(worst.key);
    }
    if (taken.size < 2) {
      for (const idx of taken.values()) outliers.push(stickers[idx]);
      continue;
    }

    // orient the grid axes like the image (gx to the right, gy down): pick the quarter turn
    // of the root basis whose first axis points most to the right
    const turns = rotations(rootBasis[0], rootBasis[1]);
    const k = turns.reduce((bi, [a], i) => (a.x / len(a) > turns[bi][0].x / len(turns[bi][0]) ? i : bi), 0);
    const turn = ([x, y]: [number, number]): [number, number] => {
      let p: [number, number] = [x, y];
      // rotating the basis by one quarter maps coordinates (x, y) -> (y, -x)
      for (let t = 0; t < k; t++) p = [p[1], -p[0]];
      return p;
    };
    const turned = [...taken.entries()].map(([gx, idx]) => {
      const [x, y] = gx.split(',').map(Number) as [number, number];
      return { idx, c: turn([x, y]) };
    });
    const minX = Math.min(...turned.map((t) => t.c[0])), minY = Math.min(...turned.map((t) => t.c[1]));
    const cells = turned.map(({ idx, c }) => ({ sticker: stickers[idx], gx: c[0] - minX, gy: c[1] - minY }));

    const { stepX, stepY } = gridSteps(cells);
    components.push({ cells, stepX, stepY });
  }

  components.sort((a, b) => b.cells.length - a.cells.length);
  return { components, outliers };
}

/** Least squares lattice through the sticker centers: center = origin + gx * stepX + gy * stepY. */
function gridSteps(cells: Pick<GridComponent['cells'][number], 'sticker' | 'gx' | 'gy'>[]): { stepX: Point; stepY: Point; origin?: Point } {
  // least squares fit: center = origin + gx * stepX + gy * stepY
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, n = 0;
  let bx = { x: 0, y: 0 }, by = { x: 0, y: 0 }, b1 = { x: 0, y: 0 };
  for (const c of cells) {
    sxx += c.gx * c.gx; sxy += c.gx * c.gy; syy += c.gy * c.gy; sx += c.gx; sy += c.gy; n++;
    bx = add(bx, mul(c.sticker.center, c.gx)); by = add(by, mul(c.sticker.center, c.gy)); b1 = add(b1, c.sticker.center);
  }
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const solveFor = (r: [number, number, number]) => solve3(M, r);
  const X = solveFor([bx.x, by.x, b1.x]);
  const Y = solveFor([bx.y, by.y, b1.y]);
  if (X && Y) return { stepX: { x: X[0], y: Y[0] }, stepY: { x: X[1], y: Y[1] }, origin: { x: X[2], y: Y[2] } };
  // degenerate (a single row or column): use the sticker axes instead
  const s = cells[0].sticker;
  return { stepX: mul(s.u, 2.3), stepY: mul(s.v, 2.3) };
}

function solve3(m: number[][], r: [number, number, number]): [number, number, number] | null {
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  if (Math.abs(d) < 1e-9) return null;
  const col = (i: number) => m.map((row, k) => row.map((v, j) => (j === i ? r[k] : v)));
  return [det(col(0)) / d, det(col(1)) / d, det(col(2)) / d];
}
