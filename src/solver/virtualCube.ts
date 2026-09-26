import { normalizeAlg, stickerAt, type Color, type FaceLetter, type Vec3 } from './cube54';
import type { Solution } from './cfop';

/**
 * Bridge between the solver state and the animated virtual cube (`Cube` class) of the home page.
 *
 * The virtual cube has 27 cubelets numbered z * 9 + y * 3 + x with x: left -> right,
 * y: up -> down, z: front -> back. Each cubelet is a 6 char string, one char per sticker
 * in the order F U R D L B ('X' = no sticker).
 */

const CUBELET_FACES: FaceLetter[] = ['F', 'U', 'R', 'D', 'L', 'B'];

const onFace = (pos: Vec3, face: FaceLetter) => {
  switch (face) {
    case 'F': return pos[2] === 1;
    case 'B': return pos[2] === -1;
    case 'U': return pos[1] === 1;
    case 'D': return pos[1] === -1;
    case 'R': return pos[0] === 1;
    case 'L': return pos[0] === -1;
  }
};

/** Solver state -> `Cube.set()` state. */
export function toVirtualCubeState(state: readonly Color[]): string[] {
  const cubelets: string[] = [];
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const pos: Vec3 = [x - 1, 1 - y, 1 - z];
        cubelets.push(CUBELET_FACES.map((f) => (onFace(pos, f) ? state[stickerAt(pos, f)] : 'X')).join(''));
      }
    }
  }
  return cubelets;
}

/** `Cube.get()` state -> solver sticker colors; colorless ('X') stickers become null. */
export function fromVirtualCubeState(cubelets: readonly string[]): (Color | null)[] {
  const state: (Color | null)[] = new Array(54).fill(null);
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const pos: Vec3 = [x - 1, 1 - y, 1 - z];
        const chars = cubelets[z * 9 + y * 3 + x] ?? '';
        CUBELET_FACES.forEach((f, i) => {
          if (!onFace(pos, f)) return;
          const c = chars[i];
          state[stickerAt(pos, f)] = c && 'WYROGB'.includes(c) ? (c as Color) : null;
        });
      }
    }
  }
  return state;
}

// wide moves as face + slice; the flag tells the slice turns against the wide move direction
const EXPANSION: Record<string, [face: string, slice: string, inverted: boolean]> = {
  r: ['R', 'M', true], l: ['L', 'M', false],
  u: ['U', 'E', true], d: ['D', 'E', false],
  f: ['F', 'S', false], b: ['B', 'S', true],
};

const invertSuffix = (s: string) => (s === "'" ? '' : s === '' ? "'" : s);

/** Rotation free moves using only face and M/E/S slice turns. */
export function toVirtualMoves(moves: string[]): string[] {
  return normalizeAlg(moves).flatMap((token) => {
    const e = EXPANSION[token[0]];
    if (!e) return [token];
    const s = token.slice(1);
    return [e[0] + s, e[1] + (e[2] ? invertSuffix(s) : s)];
  });
}

export interface VirtualSession {
  method: string;
  /** shown in the player header instead of the method (e.g. a tutorial case) */
  title?: string;
  /** scanned cube, ready for `Cube.set()` */
  cube: string[];
  /** every move to animate, in order */
  moves: string[];
  phases: { id: string; name: string; steps: { label: string; from: number; to: number }[] }[];
}

/** Everything the home page needs to replay a solution on the virtual cube. */
export function buildVirtualSession(state: readonly Color[], solution: Solution): VirtualSession {
  const moves = toVirtualMoves(solution.moves);
  let consumed: string[] = [];
  let cursor = 0;
  const phases = solution.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    steps: phase.steps.map((step) => {
      consumed = [...consumed, ...step.moves];
      const to = toVirtualMoves(consumed).length;
      const range = { label: step.label, from: cursor, to };
      cursor = to;
      return range;
    }),
  }));
  return { method: solution.method, cube: toVirtualCubeState(state), moves, phases };
}

const STORAGE_KEY = 'rubik-virtual-session';

export function saveVirtualSession(session: VirtualSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadVirtualSession(): VirtualSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as VirtualSession) : null;
    return session && Array.isArray(session.cube) && session.cube.length === 27 && Array.isArray(session.moves) ? session : null;
  } catch {
    return null;
  }
}

export function clearVirtualSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
