import { FACES, stickerAt, type Color, type FaceLetter, type Vec3 } from './cube54';

/** A 3x3 grid of one scanned face, indexed [row][col] like the scanner produces. */
export type ScannedGrid = string[][];
export type ScannedFaces = Record<FaceLetter, ScannedGrid>;

/**
 * Where each sticker of the scan net sits on the cube. This mirrors the folded net of the
 * scanner (ScanCube3D): U above F, R right of F, D below R, B right of D, L below B, which is
 * exactly how the cube is turned while scanning (U, F, R, D, B, L).
 */
function scanPosition(face: FaceLetter, row: number, col: number): Vec3 {
  switch (face) {
    case 'F': return [col - 1, 1 - row, 1];
    case 'U': return [col - 1, 1, row - 1];
    case 'R': return [1, 1 - row, 1 - col];
    case 'D': return [1 - row, -1, 1 - col];
    case 'B': return [1 - row, col - 1, -1];
    case 'L': return [-1, col - 1, row - 1];
  }
}

const scanIndex = (face: FaceLetter, row: number, col: number) => stickerAt(scanPosition(face, row, col), face);

/** Convert the six scanned faces to a solver state. */
export function scanToState(faces: ScannedFaces): Color[] {
  const state: Color[] = new Array(54);
  for (const face of FACES) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        state[scanIndex(face, row, col)] = faces[face][row][col] as Color;
      }
    }
  }
  return state;
}

/** Inverse of scanToState: what the scanner would show for a state. */
export function stateToScan(state: readonly Color[]): ScannedFaces {
  const out = {} as ScannedFaces;
  for (const face of FACES) {
    out[face] = [0, 1, 2].map((row) => [0, 1, 2].map((col) => state[scanIndex(face, row, col)]));
  }
  return out;
}
