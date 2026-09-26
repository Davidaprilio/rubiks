import {
  SOLVED, STICKER_NORMAL, STICKER_POS, cubieOf, moveForward, normalizeAlg, type Color, type Vec3,
} from '../solver/cube54';
import { COLOR_DISPLAY } from '../cv/colorDetector';

/** SVG pictures of algorithm cases: top view (OLL / PLL) and a 3D view (F2L). */

const GREY = '#6b7280';
const EDGE = '#111827';
const fill = (c: Color | 'grey') => (c === 'grey' ? GREY : COLOR_DISPLAY[c].hex);

const U_LAYER = SOLVED.map((_, i) => i).filter((i) => STICKER_POS[i][1] === 1);

/**
 * Top view: the U face with the top row of the four sides around it (back at the top).
 * mode 'oll': only yellow vs grey; 'pll': all colors plus arrows showing where pieces go.
 */
export function topView(state: readonly Color[], mode: 'oll' | 'pll', alg?: string, size = 132): string {
  const cell = size / 5, gap = cell * 0.08;
  const parts: string[] = [];
  const color = (i: number) => (mode === 'oll' ? (state[i] === 'Y' ? 'Y' : 'grey') : state[i]);
  const rect = (x: number, y: number, w: number, h: number, c: Color | 'grey') =>
    `<rect x="${x + gap / 2}" y="${y + gap / 2}" width="${w - gap}" height="${h - gap}" rx="${cell * 0.12}" fill="${fill(c)}" stroke="${EDGE}" stroke-width="1"/>`;
  const center = (i: number) => {
    const [x, , z] = STICKER_POS[i];
    return { x: (x + 2.5) * cell, y: (z + 2.5) * cell };
  };
  for (const i of U_LAYER) {
    const [x, , z] = STICKER_POS[i];
    const n = STICKER_NORMAL[i];
    const col = x + 2, row = z + 2; // grid of 5 x 5, the U face in the middle 3 x 3
    if (n[1] === 1) parts.push(rect(col * cell, row * cell, cell, cell, color(i)));
    else if (n[2] === -1) parts.push(rect(col * cell, (row - 1) * cell + cell * 0.55, cell, cell * 0.45, color(i))); // back
    else if (n[2] === 1) parts.push(rect(col * cell, (row + 1) * cell, cell, cell * 0.45, color(i))); // front
    else if (n[0] === -1) parts.push(rect((col - 1) * cell + cell * 0.55, row * cell, cell * 0.45, cell, color(i))); // left
    else if (n[0] === 1) parts.push(rect((col + 1) * cell, row * cell, cell * 0.45, cell, color(i))); // right
  }
  if (mode === 'pll' && alg) {
    // follow each top layer piece (by its U sticker) through the algorithm
    let where = U_LAYER.filter((i) => STICKER_NORMAL[i][1] === 1).filter((i) => cubieOf(i).length > 1);
    const from = where.slice();
    for (const t of normalizeAlg(alg)) { const f = moveForward(t); where = where.map((i) => f[i]); }
    parts.push(`<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#111827"/></marker></defs>`);
    from.forEach((f, k) => {
      if (where[k] === f) return;
      const a = center(f), b = center(where[k]);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), s = cell * 0.28 / len;
      parts.push(`<line x1="${a.x + dx * s}" y1="${a.y + dy * s}" x2="${b.x - dx * s}" y2="${b.y - dy * s}" stroke="#111827" stroke-width="2.2" marker-end="url(#ah)"/>`);
    });
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img">${parts.join('')}</svg>`;
}

/** Corners of a sticker (size in cubie widths) around its center, in model space. */
function stickerQuad(i: number, size: number): Vec3[] {
  const [px, py, pz] = STICKER_POS[i], n = STICKER_NORMAL[i];
  const c: Vec3 = [px + 0.5 * n[0], py + 0.5 * n[1], pz + 0.5 * n[2]];
  const a: Vec3 = n[1] !== 0 ? [1, 0, 0] : [0, 1, 0];
  const b: Vec3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  const h = size / 2;
  return [[-h, -h], [h, -h], [h, h], [-h, h]].map(([u, v]) => [c[0] + a[0] * u + b[0] * v, c[1] + a[1] * u + b[1] * v, c[2] + a[2] * u + b[2] * v] as Vec3);
}

/**
 * 3D view from the front right: U on top, F on the left, R on the right. `show(i)` decides
 * which stickers keep their color (the rest is grey).
 */
export function isoView(state: readonly Color[], show: (i: number) => boolean, size = 132): string {
  const k = size / 7.2;
  const project = ([x, y, z]: Vec3) => ({ x: size / 2 + (x - z) * 0.866 * k, y: size / 2 + ((x + z) * 0.5 - y) * k });
  const polys: string[] = [];
  const visible = (i: number) => {
    const n = STICKER_NORMAL[i];
    return n[1] === 1 || n[2] === 1 || n[0] === 1;
  };
  for (let i = 0; i < 54; i++) {
    if (!visible(i)) continue;
    const back = stickerQuad(i, 1).map(project), front = stickerQuad(i, 0.88).map(project);
    const pts = (q: { x: number; y: number }[]) => q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    polys.push(`<polygon points="${pts(back)}" fill="${EDGE}"/>`);
    polys.push(`<polygon points="${pts(front)}" fill="${fill(show(i) ? state[i] : 'grey')}"/>`);
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img">${polys.join('')}</svg>`;
}

/**
 * F2L picture: the solved first two layer pieces and the front-right pair in color; the last
 * layer pieces (wherever they are, e.g. sitting in the empty slot) grey.
 */
export function f2lView(state: readonly Color[], size = 132): string {
  const colorsOf = (i: number) => cubieOf(i).map((s) => state[s]);
  const pair = (i: number) => {
    const cols = colorsOf(i).sort().join('');
    return cols === 'GRW' || cols === 'GR';
  };
  const lastLayer = (i: number) => colorsOf(i).includes('Y');
  return isoView(state, (i) => pair(i) || (!lastLayer(i) && STICKER_POS[i][1] < 1), size);
}
