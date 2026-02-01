import * as THREE from 'three';

export interface CubeColor {
    name: string,
    initial: string,
    hex: string,
    font: string,
}

//  Global constants to describe sticker colors.

export type ColorKey = 'WHITE' | 'ORANGE' | 'BLUE' | 'RED' | 'GREEN' | 'YELLOW' | 'COLORLESS';
export type FaceConfigKey = 'UP' | 'DOWN' | 'RIGHT' | 'LEFT' | 'BACK' | 'FRONT';

export const colors: { [key in ColorKey]: CubeColor } = {
    WHITE: {
        name: 'white',
        initial: 'W',
        hex: '#FFFFFF',
        font: '#888888',
    },
    ORANGE: {
        name: 'orange',
        initial: 'O',
        hex: '#ff6600',
        font: '#ff6600',
    },
    BLUE: {
        name: 'blue',
        initial: 'B',
        hex: '#0000dd',
        font: '#0000dd',
    },
    RED: {
        name: 'red',
        initial: 'R',
        hex: '#ff0000',
        font: '#ff0000',
    },
    GREEN: {
        name: 'green',
        initial: 'G',
        hex: '#00aa00',
        font: '#00aa00',
    },
    YELLOW: {
        name: 'yellow',
        initial: 'Y',
        hex: '#ffee00',
        font: '#ffee00',
    },
    COLORLESS: {
        name: 'NA',
        initial: 'X',
        hex: '#454545',
        font: 'color: #EEEEEE',
    }
};

export const colorsKey = {
    W: colors.WHITE,
    O: colors.ORANGE,
    B: colors.BLUE,
    R: colors.RED,
    G: colors.GREEN,
    Y: colors.YELLOW,
    X: colors.COLORLESS
}

export type StickerColor = keyof typeof colorsKey


export interface FaceConfig {
    up: [number, number, number],
    position: [number, number, number],
    color: THREE.Color
    colorSet: CubeColor
}

export const COLORKEY2FACE: { [key in StickerColor]: FaceConfigKey } = {
    W: 'DOWN',
    O: 'BACK',
    B: 'LEFT',
    R: 'FRONT',
    G: 'RIGHT',
    Y: 'UP',
    X: 'FRONT'  // default for colorless
}

export const cubieFaceCfg: { [key in FaceConfigKey]: FaceConfig } = {
    UP: {
        up: [0, 0, 1],
        position: [0, 1, 0],
        color: new THREE.Color(colors.YELLOW.hex),
        colorSet: colors.YELLOW
    },
    BACK: {
        up: [1, 0, 0],
        position: [0, 0, - 1],
        color: new THREE.Color(colors.ORANGE.hex),
        colorSet: colors.ORANGE
    },
    LEFT: {
        up: [0, 1, 0],
        position: [- 1, 0, 0],
        color: new THREE.Color(colors.BLUE.hex),
        colorSet: colors.BLUE
    },
    RIGHT: {
        up: [0, - 1, 0],
        position: [1, 0, 0],
        color: new THREE.Color(colors.GREEN.hex),
        colorSet: colors.GREEN
    },
    DOWN: {
        up: [0, 0, - 1],
        position: [0, - 1, 0],
        color: new THREE.Color(colors.WHITE.hex),
        colorSet: colors.WHITE
    },
    FRONT: {
        up: [- 1, 0, 0],
        position: [0, 0, 1],
        color: new THREE.Color(colors.RED.hex),
        colorSet: colors.RED
    },
}
