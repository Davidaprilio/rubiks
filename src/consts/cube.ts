import * as THREE from 'three';

export const colors = {
  'W': 'WHITE',
  'R': 'RED',
  'B': 'BLUE',
  'G': 'GREEN',
  'Y': 'YELLOW',
  'O': 'ORANGE',
  'E': 'EMPTY',
} as const;

export type Notation3D = 'x' | 'y' | 'z' ;
export type Notation = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type NotationLower = 'u' | 'd' | 'l' | 'r' | 'f' | 'b';
export type NotationInverse = 'Ui' | 'Di' | 'Li' | 'Ri' | 'Fi' | 'Bi';
export type NotationLowerInverse = 'ui' | 'di' | 'li' | 'ri' | 'fi' | 'bi';
export type NotationDouble = 'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2';
export type NotationLowerDouble = 'u2' | 'd2' | 'l2' | 'r2' | 'f2' | 'b2';
export type FullRubiksNotation = Notation3D 
  | Notation 
  | NotationInverse 
  | NotationLower 
  | NotationLowerInverse 
  | NotationDouble 
  | NotationLowerDouble;

/**
 * @property {string[]} adjacent - List of adjacent faces key, in clockwise order. 0- Up, 1- Right, 2- Down, 3- Left
 */
export const CubeFace = {
  RED: {
    code: "R",
    name: 'Front',
    faceIndex: 0,
    color: "#B90000",
    adjacent: ['YELLOW', 'GREEN', 'WHITE', 'BLUE'],
  },
  ORANGE: {
    code: "O",
    name: 'Back',
    faceIndex: 3,
    color: "#FF5900",
    adjacent: ['BLUE', 'WHITE', 'GREEN', 'YELLOW'],
  },
  YELLOW: {
    code: "Y",
    name: 'Up',
    faceIndex: 2,
    color: "#FFD500",
    adjacent: ['BLUE', 'ORANGE', 'GREEN', 'RED'],
  },
  WHITE: {
    code: "W",
    name: 'Down',
    faceIndex: 5,
    color: "#FFFFFF",
    adjacent: ['RED', 'GREEN', 'ORANGE', 'BLUE'],
  },
  GREEN: {
    code: "G",
    name: 'Right',
    faceIndex: 1,
    color: "#009B48",
    adjacent: ['YELLOW', 'ORANGE', 'WHITE', 'RED'],
  },
  BLUE: {
    code: "B",
    name: 'Left',
    faceIndex: 4,
    color: "#0045AD",
    adjacent: ['RED', 'WHITE', 'ORANGE', 'YELLOW'],
  },
  EMPTY: {
    code: "E",
    name: 'Empty',
    faceIndex: null,
    adjacent: null,
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
  empty: new THREE.Color(CubeFace.EMPTY.color),
}

export type KeyCubeFace = keyof typeof CubeFace;
export type CubeFaceType = typeof CubeFace[KeyCubeFace];
export const mapCubeFaceByIndex = Object.entries(CubeFace).reduce((acc, [c, value]) => {
  if (value.faceIndex !== null) {
    acc[value.faceIndex] = {
      ...value,
      colorName: c as KeyCubeFace
    };
  }
  return acc;
}, {} as Record<number, (typeof CubeFace[keyof typeof CubeFace]) & { colorName: KeyCubeFace }>);

export const mapCubeFaceByName = Object.entries(CubeFace).reduce((acc, [, value]) => {
  if (value.faceIndex !== null) {
    acc[value.name] = value;
  }
  return acc;
}, {} as Record<CubeFaceType['name'], CubeFaceType>);

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