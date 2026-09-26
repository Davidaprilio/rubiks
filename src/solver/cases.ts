import {
  ROTATIONS, SOLVED, STICKER_POS, applyAlg, centersHome, invertAlg, normalizeAlg, rotateState, type Color,
} from './cube54';
import { OllAlgorithms } from '../classes/solvers/algorithms/oll.algo';
import { PllAlgorithms } from '../classes/solvers/algorithms/pll.algo';
import { F2L_CASES } from './data/f2lCases';

/**
 * The CFOP algorithm cases for the tutorial: every case as a cube state (yellow on top, red in
 * front) made from its own algorithm, so the pictures always match the algorithms.
 */

export type CaseKind = 'f2l' | 'oll' | 'pll';

export interface AlgCase {
  kind: CaseKind;
  id: string;
  name: string;
  group: string;
  /** the cube before the algorithm */
  state: Color[];
  /** algorithms that solve it; each already includes the U turn it may need first */
  algorithms: string[];
}

const AUF = ['', 'U', 'U2', "U'"];

/** Whole cube rotations left by wide moves / slices are undone so the centers are home. */
function reorient(state: Color[]): Color[] {
  if (centersHome(state)) return state;
  const r = ROTATIONS.find((rot) => centersHome(rotateState(state, rot)));
  return r ? rotateState(state, r) : state;
}

/** The case an algorithm solves: undo it from a solved cube. */
export function caseOf(alg: string): Color[] {
  // undo move by move through the frame changes of rotations and wide moves
  return reorient(applyAlg(SOLVED, invertAlg(normalizeAlg(alg))) as Color[]);
}

const f2lDone = (s: Color[]) => s.every((c, i) => STICKER_POS[i][1] === 1 || c === SOLVED[i]);
const ollDone = (s: Color[]) => f2lDone(s) && s.slice(0, 9).every((c) => c === 'Y');
const pllDone = (s: Color[]) => AUF.some((post) => (applyAlg(s, post ? [post] : []) as Color[]).every((c, i) => c === SOLVED[i]));

/** `alg` with the U turn it needs first to solve `state` (by `done`), or null. */
function fitted(state: Color[], alg: string, done: (s: Color[]) => boolean): string | null {
  for (const pre of AUF) {
    const end = reorient(applyAlg(applyAlg(state, pre ? [pre] : []), alg) as Color[]);
    if (done(end)) return pre ? `${pre} ${alg}` : alg;
  }
  return null;
}

function build(): AlgCase[] {
  const out: AlgCase[] = [];

  for (const c of F2L_CASES) {
    const state = applyAlg(SOLVED, c.setup) as Color[];
    out.push({
      kind: 'f2l',
      id: `f2l-${c.id}`,
      name: `F2L ${c.id}`,
      group: c.group,
      state,
      algorithms: c.algorithms.filter((a) => fitted(state, a, f2lDone) === a),
    });
  }

  for (const [key, a] of Object.entries(OllAlgorithms)) {
    const state = caseOf(a.solve[0]);
    const gan = (a.tags ?? []).find((t) => t.startsWith('GAN:'));
    out.push({
      kind: 'oll',
      id: `oll-${key}`,
      name: gan ? `OLL ${Number(gan.slice(4))}` : `OLL ${key}`,
      group: 'oll',
      state,
      algorithms: a.solve.map((alg) => fitted(state, alg, ollDone)).filter((x): x is string => x !== null),
    });
  }
  out.sort((x, y) => (x.kind === 'oll' && y.kind === 'oll' ? Number(x.name.slice(4)) - Number(y.name.slice(4)) : 0));

  for (const [name, a] of Object.entries(PllAlgorithms)) {
    const state = caseOf(a.solve[0]);
    out.push({
      kind: 'pll',
      id: `pll-${name}`,
      name: `${name} perm`,
      group: (a.tags ?? [])[0] ?? 'pll',
      state,
      algorithms: a.solve.map((alg) => fitted(state, alg, pllDone)).filter((x): x is string => x !== null),
    });
  }
  return out;
}

let cache: AlgCase[] | null = null;
export const algCases = () => (cache ??= build());
