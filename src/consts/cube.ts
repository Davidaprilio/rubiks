import * as THREE from 'three';

export const colors = {
  'w': 'white',
  'r': 'red',
  'b': 'blue',
  'g': 'green',
  'y': 'yellow',
  'o': 'orange',
  'e': 'empty',
} as const;


export const CubeFace = {
  RED: {
    code: "R",
    color: "#B90000",
  },
  ORANGE: {
    code: "O",
    color: "#FF5900",
  },
  YELLOW: {
    code: "Y",
    color: "#FFD500",
  },
  WHITE: {
    code: "W",
    color: "#FFFFFF",
  },
  GREEN: {
    code: "G",
    color: "#009B48",
  },
  BLUE: {
    code: "B",
    color: "#0045AD",
  },
  BASE: {
    code: "X",
    color: "#000000", // gray
  },
} as const;

export type KeyColors = keyof typeof colors;
export type Colors = (typeof colors)[KeyColors];
export type AllColors = KeyColors | Colors;
export type FillAllColors = Exclude<AllColors, 'e' | 'empty'>;

export const RUBIKS_THREE_COLORS = {
  red: new THREE.Color(CubeFace.RED.color),
  orange: new THREE.Color(CubeFace.ORANGE.color),
  yellow: new THREE.Color(CubeFace.YELLOW.color),
  white: new THREE.Color(CubeFace.WHITE.color),
  green: new THREE.Color(CubeFace.GREEN.color),
  blue: new THREE.Color(CubeFace.BLUE.color),
  base: new THREE.Color(CubeFace.BASE.color),
}


export const PIECES_COLOR_MAP: Record<number, {
  [faceIndex in 0 | 1 | 2 | 3 | 4 | 5]: THREE.Color | null;
}> = {
  0: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  1: {
    0: null,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  2: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  3: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  4: {
    0: null,
    1: null,
    2: null,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  5: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  6: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  7: {
    0: null,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  8: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: RUBIKS_THREE_COLORS.blue,
    5: null,
  },
  9: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: null,
  },
  10: {
    0: null,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: null,
  },
  11: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: null,
  },
  12: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  },
  13: {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  },
  14: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: null,
    4: null,
    5: null,
  },
  15: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: null,
  },
  16: {
    0: null,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: null,
  },
  17: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: null,
  },
  18: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  19: {
    0: null,
    1: null,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  20: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: RUBIKS_THREE_COLORS.white,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  21: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: null,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  22: {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  23: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: null,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  24: {
    0: RUBIKS_THREE_COLORS.red,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  25: {
    0: null,
    1: null,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
  26: {
    0: null,
    1: RUBIKS_THREE_COLORS.orange,
    2: RUBIKS_THREE_COLORS.yellow,
    3: null,
    4: null,
    5: RUBIKS_THREE_COLORS.green,
  },
} as const;