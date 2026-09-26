import type { Color } from './cube54';
import { solveCFOP, type Solution } from './cfop';

export type { Solution, SolutionPhase, SolutionStep } from './cfop';
export { SolveError } from './cfop';
export { scanToState, stateToScan } from './scanAdapter';
export type { ScannedFaces } from './scanAdapter';

export interface SolveMethod {
  id: string;
  name: string;
  solve(state: readonly Color[]): Solution;
}

/** Available solving methods, first one is the default. */
export const SOLVE_METHODS: SolveMethod[] = [
  { id: 'cfop', name: 'CFOP', solve: solveCFOP },
];
