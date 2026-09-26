import {
  FACE_MOVES, FACES, ROTATIONS, SOLVED, STICKER_FACE, applyMove, centersHome, isSolved, locatePiece,
  moveForward, normalizeAlg, rotateState, stickerAt, validateState, type Color,
} from './cube54';
import { OllAlgorithms } from '../classes/solvers/algorithms/oll.algo';
import { PllAlgorithms } from './pll.algo';

/**
 * CFOP (Cross, F2L, OLL, PLL) solver working on a plain 54 sticker state.
 * Cube orientation: yellow on top, white on the bottom, red in front.
 * The cross is built on the white (bottom) face.
 *
 *  - Cross : optimal, breadth first search over the 4 cross edges
 *  - F2L   : shortest insertion of each corner/edge pair that keeps the cross and finished pairs
 *  - OLL   : algorithm table (+ U turn) that orients the last layer
 *  - PLL   : algorithm table (+ U turns) that permutes the last layer
 */

export interface SolutionStep {
  label: string;
  moves: string[];
}

export interface SolutionPhase {
  id: 'cross' | 'f2l' | 'oll' | 'pll';
  name: string;
  description: string;
  steps: SolutionStep[];
}

export interface Solution {
  method: 'cfop';
  phases: SolutionPhase[];
  /** every move of every phase in order */
  moves: string[];
}

export class SolveError extends Error {}

// ---------------------------------------------------------------------------
// tracked pieces & pruning tables
// ---------------------------------------------------------------------------

const S = 54;
const FACE_INDEX = Object.fromEntries(FACES.map((f, i) => [f, i]));

const CROSS_HOME = [
  stickerAt([0, -1, 1], 'D'),
  stickerAt([1, -1, 0], 'D'),
  stickerAt([0, -1, -1], 'D'),
  stickerAt([-1, -1, 0], 'D'),
];

interface Slot { name: string; corner: number; edge: number }

const F2L_SLOTS: Slot[] = [
  { name: 'front-right', corner: stickerAt([1, -1, 1], 'D'), edge: stickerAt([1, 0, 1], 'F') },
  { name: 'front-left', corner: stickerAt([-1, -1, 1], 'D'), edge: stickerAt([-1, 0, 1], 'F') },
  { name: 'back-right', corner: stickerAt([1, -1, -1], 'D'), edge: stickerAt([1, 0, -1], 'B') },
  { name: 'back-left', corner: stickerAt([-1, -1, -1], 'D'), edge: stickerAt([-1, 0, -1], 'B') },
];

const MOVE_FORWARD = FACE_MOVES.map((m) => Uint8Array.from(moveForward(m)));
const MOVE_FACE = FACE_MOVES.map((m) => FACE_INDEX[m[0]]);

let crossTable: Uint8Array | null = null;
const crossKey = (a: number, b: number, c: number, d: number) => ((a * S + b) * S + c) * S + d;

/** distance of the 4 cross edges (position + orientation) to the solved cross, for every reachable arrangement */
function getCrossTable(): Uint8Array {
  if (crossTable) return crossTable;
  const table = new Uint8Array(S ** 4).fill(255);
  let frontier = [crossKey(...(CROSS_HOME as [number, number, number, number]))];
  table[frontier[0]] = 0;
  for (let depth = 1; frontier.length; depth++) {
    const next: number[] = [];
    for (const key of frontier) {
      const p = [Math.floor(key / S ** 3), Math.floor(key / S ** 2) % S, Math.floor(key / S) % S, key % S];
      for (const fwd of MOVE_FORWARD) {
        const k = crossKey(fwd[p[0]], fwd[p[1]], fwd[p[2]], fwd[p[3]]);
        if (table[k] === 255) { table[k] = depth; next.push(k); }
      }
    }
    frontier = next;
  }
  crossTable = table;
  return table;
}

const pairTables: (Uint8Array | null)[] = F2L_SLOTS.map(() => null);

/** distance of a corner + edge (position + orientation) to their home slot */
function getPairTable(slot: number): Uint8Array {
  let table = pairTables[slot];
  if (table) return table;
  table = new Uint8Array(S * S).fill(255);
  const { corner, edge } = F2L_SLOTS[slot];
  let frontier = [corner * S + edge];
  table[frontier[0]] = 0;
  for (let depth = 1; frontier.length; depth++) {
    const next: number[] = [];
    for (const key of frontier) {
      const c = Math.floor(key / S), e = key % S;
      for (const fwd of MOVE_FORWARD) {
        const k = fwd[c] * S + fwd[e];
        if (table[k] === 255) { table[k] = depth; next.push(k); }
      }
    }
    frontier = next;
  }
  pairTables[slot] = table;
  return table;
}

// ---------------------------------------------------------------------------
// cross
// ---------------------------------------------------------------------------

function solveCross(state: Color[]): string[] {
  const table = getCrossTable();
  let p = CROSS_HOME.map((home) => locatePiece(state, home));
  const moves: string[] = [];
  let dist = table[crossKey(p[0], p[1], p[2], p[3])];
  while (dist > 0) {
    let found = false;
    for (let m = 0; m < MOVE_FORWARD.length; m++) {
      const fwd = MOVE_FORWARD[m];
      const q = p.map((x) => fwd[x]);
      if (table[crossKey(q[0], q[1], q[2], q[3])] === dist - 1) {
        moves.push(FACE_MOVES[m]);
        p = q;
        dist--;
        found = true;
        break;
      }
    }
    if (!found) throw new SolveError('Could not solve the cross.');
  }
  return moves;
}

// ---------------------------------------------------------------------------
// F2L
// ---------------------------------------------------------------------------

const MAX_F2L_DEPTH = 13;

/**
 * Shortest sequence (<= limit moves) that puts pair `target` home while every piece of the
 * cross and of `done` pairs is home again at the end. Iterative deepening with the exact
 * per-group distance tables as heuristic.
 */
function searchPair(state: Color[], done: number[], target: number, limit: number): string[] | null {
  const cross = getCrossTable();
  const slots = [...done, target];
  const tables = slots.map(getPairTable);
  const K = 4 + slots.length * 2;
  const homes = [
    ...CROSS_HOME,
    ...slots.flatMap((s) => [F2L_SLOTS[s].corner, F2L_SLOTS[s].edge]),
  ];
  const levels: Uint8Array[] = Array.from({ length: limit + 1 }, () => new Uint8Array(K));
  levels[0].set(homes.map((h) => locatePiece(state, h)));
  const path: number[] = [];

  const heuristic = (p: Uint8Array) => {
    let h = cross[crossKey(p[0], p[1], p[2], p[3])];
    for (let j = 0; j < tables.length; j++) {
      const d = tables[j][p[4 + 2 * j] * S + p[5 + 2 * j]];
      if (d > h) h = d;
    }
    return h;
  };

  const dfs = (depth: number, lastFace: number): boolean => {
    const cur = levels[depth];
    const h = heuristic(cur);
    if (h === 0) return true;
    if (depth + h > limit) return false;
    const next = levels[depth + 1];
    for (let m = 0; m < MOVE_FORWARD.length; m++) {
      const face = MOVE_FACE[m];
      if (face === lastFace) continue;
      // opposite faces commute: only allow them in one order
      if (lastFace >= 0 && face % 3 === lastFace % 3 && face < lastFace) continue;
      const fwd = MOVE_FORWARD[m];
      for (let k = 0; k < K; k++) next[k] = fwd[cur[k]];
      path[depth] = m;
      if (dfs(depth + 1, face)) return true;
    }
    return false;
  };

  if (!dfs(0, -1)) return null;
  // find actual length: walk again until distance is 0
  const moves: string[] = [];
  for (let d = 0; d < levels.length; d++) {
    if (heuristic(levels[d]) === 0) break;
    moves.push(FACE_MOVES[path[d]]);
  }
  return moves;
}

function solveF2L(start: Color[]): { state: Color[]; steps: SolutionStep[] } {
  let state = start;
  const solved: number[] = [];
  const steps: SolutionStep[] = [];
  while (solved.length < 4) {
    let best: { slot: number; moves: string[] } | null = null;
    for (let limit = 0; limit <= MAX_F2L_DEPTH && !best; limit++) {
      for (let slot = 0; slot < 4; slot++) {
        if (solved.includes(slot)) continue;
        const moves = searchPair(state, solved, slot, limit);
        if (moves) { best = { slot, moves }; break; }
      }
    }
    if (!best) throw new SolveError('Could not solve F2L.');
    for (const m of best.moves) state = applyMove(state, m);
    solved.push(best.slot);
    steps.push({ label: `Pair ${F2L_SLOTS[best.slot].name}`, moves: best.moves });
  }
  return { state, steps };
}

// ---------------------------------------------------------------------------
// last layer
// ---------------------------------------------------------------------------

const AUF: string[][] = [[], ['U'], ['U2'], ["U'"]];

const isLastLayerSticker = (i: number) => STICKER_FACE[i] === 'U' || (STICKER_FACE[i] !== 'D' && Math.floor((i % 9) / 3) === 0);
const firstTwoLayersIntact = (s: Color[]) => s.every((c, i) => isLastLayerSticker(i) || c === SOLVED[i]);
const topOriented = (s: Color[]) => s.slice(0, 9).every((c) => c === 'Y');

const OLL_CANDIDATES = Object.values(OllAlgorithms).flatMap((algo) =>
  algo.solve.map((alg) => normalizeAlg(alg.replace(/'2/g, '2').replace(/2'/g, '2'))));
const PLL_CANDIDATES = [[] as string[], ...Object.values(PllAlgorithms).map((alg) => normalizeAlg(alg))];

function applyTokens(state: Color[], tokens: string[]) {
  let s = state;
  for (const t of tokens) s = applyMove(s, t);
  return s;
}

/**
 * Algorithms using wide moves or slices can leave the whole cube turned (centers moved).
 * Finds the cube rotation(s) that bring the centers back, [] when nothing is needed.
 */
function reorientation(state: Color[]): string[] | null {
  if (centersHome(state)) return [];
  for (const r of ROTATIONS) if (centersHome(rotateState(state, r))) return [r];
  for (const r1 of ROTATIONS) {
    const s1 = rotateState(state, r1);
    for (const r2 of ROTATIONS) if (centersHome(rotateState(s1, r2))) return [r1, r2];
  }
  return null;
}

const ROTATION_COST = 2;

function solveOLL(state: Color[]): { state: Color[]; moves: string[] } {
  if (topOriented(state)) return { state, moves: [] };
  let best: { moves: string[]; cost: number; state: Color[] } | null = null;
  for (const pre of AUF) {
    const start = applyTokens(state, pre);
    for (const alg of OLL_CANDIDATES) {
      const base = pre.length + alg.length;
      if (best && base >= best.cost) continue;
      let end = applyTokens(start, alg);
      const turn = reorientation(end);
      if (!turn) continue;
      for (const r of turn) end = rotateState(end, r);
      const cost = base + turn.length * ROTATION_COST;
      if (best && cost >= best.cost) continue;
      if (topOriented(end) && firstTwoLayersIntact(end)) best = { moves: [...pre, ...alg, ...turn], cost, state: end };
    }
  }
  if (!best) throw new SolveError('No OLL algorithm matches this last layer.');
  return best;
}

function solvePLL(state: Color[]): { state: Color[]; moves: string[] } {
  if (isSolved(state)) return { state, moves: [] };
  let best: string[] | null = null;
  for (const pre of AUF) {
    const start = applyTokens(state, pre);
    for (const alg of PLL_CANDIDATES) {
      const mid = applyTokens(start, alg);
      for (const post of AUF) {
        const moves = [...pre, ...alg, ...post];
        if (best && moves.length >= best.length) continue;
        if (isSolved(applyTokens(mid, post))) best = moves;
      }
    }
  }
  if (!best) throw new SolveError('No PLL algorithm matches this last layer.');
  return { state: applyTokens(state, best), moves: best };
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

export function solveCFOP(initial: readonly Color[]): Solution {
  const problem = validateState(initial);
  if (problem) throw new SolveError(problem);

  let state = initial.slice();

  const crossMoves = solveCross(state);
  state = applyTokens(state, crossMoves);

  const f2l = solveF2L(state);
  state = f2l.state;

  const oll = solveOLL(state);
  state = oll.state;

  const pll = solvePLL(state);
  state = pll.state;

  if (!isSolved(state)) throw new SolveError('Solver finished but the cube is not solved.');

  const phases: SolutionPhase[] = [
    {
      id: 'cross', name: 'Cross',
      description: 'Build the white cross on the bottom face, each edge matching its side center.',
      steps: [{ label: 'White cross', moves: crossMoves }],
    },
    {
      id: 'f2l', name: 'F2L',
      description: 'First two layers: insert each corner + edge pair into its slot.',
      steps: f2l.steps,
    },
    {
      id: 'oll', name: 'OLL',
      description: 'Orient the last layer: make the whole top face yellow.',
      steps: [{ label: oll.moves.length ? 'Orient last layer' : 'Already oriented (OLL skip)', moves: oll.moves }],
    },
    {
      id: 'pll', name: 'PLL',
      description: 'Permute the last layer: move the last layer pieces into place.',
      steps: [{ label: pll.moves.length ? 'Permute last layer' : 'Already solved (PLL skip)', moves: pll.moves }],
    },
  ];

  return { method: 'cfop', phases, moves: phases.flatMap((p) => p.steps.flatMap((s) => s.moves)) };
}
