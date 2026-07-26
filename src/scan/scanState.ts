import type { RubikColor } from '../cv/colorDetector';

export type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export interface ScannedFace {
  name: FaceName;
  colors: RubikColor[][]; // 3x3 grid
  scanned: boolean;
}

export interface ScanState {
  faces: Map<FaceName, ScannedFace>;
  currentFaceIndex: number;
  isComplete: boolean;
}

const FACE_ORDER: FaceName[] = ['U', 'D', 'L', 'R', 'F', 'B'];

const FACE_INSTRUCTIONS: Record<FaceName, string> = {
  U: 'Show the UP face (Yellow center)',
  D: 'Show the DOWN face (White center)',
  L: 'Show the LEFT face (Blue center)',
  R: 'Show the RIGHT face (Green center)',
  F: 'Show the FRONT face (Red center)',
  B: 'Show the BACK face (Orange center)',
};

const FACE_CENTER_COLORS: Record<FaceName, RubikColor> = {
  U: 'Y',
  D: 'W',
  L: 'B',
  R: 'G',
  F: 'R',
  B: 'O',
};

export class ScanStateManager {
  private state: ScanState;
  private onUpdate: ((state: ScanState) => void) | null = null;
  
  constructor() {
    this.state = {
      faces: new Map(),
      currentFaceIndex: 0,
      isComplete: false,
    };
    
    // Initialize all faces as not scanned
    for (const name of FACE_ORDER) {
      this.state.faces.set(name, {
        name,
        colors: [
          ['W', 'W', 'W'],
          ['W', 'W', 'W'],
          ['W', 'W', 'W'],
        ],
        scanned: false,
      });
    }
  }
  
  setUpdateCallback(callback: (state: ScanState) => void) {
    this.onUpdate = callback;
  }
  
  private notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate(this.state);
    }
  }
  
  getCurrentFace(): FaceName {
    return FACE_ORDER[this.state.currentFaceIndex];
  }
  
  getCurrentInstruction(): string {
    return FACE_INSTRUCTIONS[this.getCurrentFace()];
  }
  
  getExpectedCenterColor(): RubikColor {
    return FACE_CENTER_COLORS[this.getCurrentFace()];
  }
  
  getProgress(): { scanned: number; total: number } {
    let scanned = 0;
    for (const face of this.state.faces.values()) {
      if (face.scanned) scanned++;
    }
    return { scanned, total: FACE_ORDER.length };
  }
  
  recordFace(colors: RubikColor[][]): boolean {
    const currentFace = this.getCurrentFace();
    const face = this.state.faces.get(currentFace)!;
    
    // Validate center color matches expected
    const centerColor = colors[1][1];
    if (centerColor !== FACE_CENTER_COLORS[currentFace]) {
      console.warn(`Center color mismatch: expected ${FACE_CENTER_COLORS[currentFace]}, got ${centerColor}`);
      // Allow it anyway but warn
    }
    
    face.colors = colors;
    face.scanned = true;
    
    // Move to next face
    this.state.currentFaceIndex++;
    
    // Check if all faces are scanned
    if (this.state.currentFaceIndex >= FACE_ORDER.length) {
      this.state.isComplete = true;
    }
    
    this.notifyUpdate();
    return true;
  }
  
  isComplete(): boolean {
    return this.state.isComplete;
  }
  
  getFace(name: FaceName): ScannedFace | undefined {
    return this.state.faces.get(name);
  }
  
  getAllFaces(): ScannedFace[] {
    return FACE_ORDER.map(name => this.state.faces.get(name)!);
  }
  
  // Convert scanned state to Cube.set() format
  // Cube state format: 27 cubelets, each with 6 chars (F U R D L B)
  // X = colorless, other = actual color
  toCubeState(): string[] {
    // We need to map face colors to cubelet positions
    // Cube layout:
    // Front slice (z=0): cubelets 0-8
    // Standing slice (z=1): cubelets 9-17
    // Back slice (z=2): cubelets 18-26
    
    // Face mapping:
    // F face (z=0): cubelets 0-8, sticker index 0 (F)
    // B face (z=2): cubelets 18-26, sticker index 5 (B)
    // U face (y=0): cubelets 0,1,2,9,10,11,18,19,20, sticker index 1 (U)
    // D face (y=2): cubelets 6,7,8,15,16,17,24,25,26, sticker index 3 (D)
    // L face (x=2): cubelets 0,3,6,9,12,15,18,21,24, sticker index 4 (L)
    // R face (x=0): cubelets 2,5,8,11,14,17,20,23,26, sticker index 2 (R)
    
    const state = Array(27).fill('XXXXXX');
    
    const faces = this.state.faces;
    
    // Helper to set a sticker color
    const setSticker = (cubeletIdx: number, stickerIdx: number, color: RubikColor) => {
      const arr = state[cubeletIdx].split('');
      arr[stickerIdx] = color;
      state[cubeletIdx] = arr.join('');
    };
    
    // F face (sticker index 0)
    const fFace = faces.get('F')!;
    const fMap = [[0,0], [1,0], [2,0], [0,1], [1,1], [2,1], [0,2], [1,2], [2,2]];
    for (let i = 0; i < 9; i++) {
      const [col, row] = fMap[i];
      setSticker(i, 0, fFace.colors[row][col]);
    }
    
    // B face (sticker index 5)
    const bFace = faces.get('B')!;
    const bMap = [[2,0], [1,0], [0,0], [2,1], [1,1], [0,1], [2,2], [1,2], [0,2]];
    for (let i = 0; i < 9; i++) {
      const [col, row] = bMap[i];
      setSticker(18 + i, 5, bFace.colors[row][col]);
    }
    
    // U face (sticker index 1)
    const uFace = faces.get('U')!;
    const uCubelets = [0, 1, 2, 9, 10, 11, 18, 19, 20];
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      setSticker(uCubelets[i], 1, uFace.colors[row][col]);
    }
    
    // D face (sticker index 3)
    const dFace = faces.get('D')!;
    const dCubelets = [6, 7, 8, 15, 16, 17, 24, 25, 26];
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      setSticker(dCubelets[i], 3, dFace.colors[row][col]);
    }
    
    // L face (sticker index 4)
    const lFace = faces.get('L')!;
    const lCubelets = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      setSticker(lCubelets[i], 4, lFace.colors[row][col]);
    }
    
    // R face (sticker index 2)
    const rFace = faces.get('R')!;
    const rCubelets = [2, 5, 8, 11, 14, 17, 20, 23, 26];
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      setSticker(rCubelets[i], 2, rFace.colors[row][col]);
    }
    
    return state;
  }
  
  reset() {
    this.state.currentFaceIndex = 0;
    this.state.isComplete = false;
    for (const face of this.state.faces.values()) {
      face.scanned = false;
      face.colors = [
        ['W', 'W', 'W'],
        ['W', 'W', 'W'],
        ['W', 'W', 'W'],
      ];
    }
    this.notifyUpdate();
  }
}

export { FACE_ORDER, FACE_INSTRUCTIONS, FACE_CENTER_COLORS };
