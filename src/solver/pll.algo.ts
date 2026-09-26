/**
 * PLL algorithms (permute the last layer once it is oriented).
 * Each one is applied on a cube held yellow on top, and may need a U turn before / after.
 */
export const PllAlgorithms: Record<string, string> = {
  Aa: "x R' U R' D2 R U' R' D2 R2",
  Ab: "x R2 D2 R U R' D2 R U' R",
  E: "x' R U' R' D R U R' D' R U R' D R U' R' D'",
  F: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  Ga: "R2 U R' U R' U' R U' R2 D U' R' U R D'",
  Gb: "R' U' R U D' R2 U R' U R U' R U' R2 D",
  Gc: "R2 U' R U' R U R' U R2 D' U R U' R' D",
  Gd: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
  H: "M2 U M2 U2 M2 U M2",
  Ja: "R' U L' U2 R U' R' U2 R L",
  Jb: "R U R' F' R U R' U' R' F R2 U' R'",
  Na: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  Nb: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
  Ra: "R U' R' U' R U R D R' U' R D' R' U2 R'",
  Rb: "R' U2 R U2 R' F R U R' U' R' F' R2",
  T: "R U R' U' R' F R2 U' R' U' R U R' F'",
  Ua: "R U' R U R U R U' R' U' R2",
  Ub: "R2 U R U R' U' R' U' R' U R'",
  V: "R' U R' U' y R' F' R2 U' R' U R' F R F",
  Y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  Z: "M' U M2 U M2 U M' U2 M2",
};
