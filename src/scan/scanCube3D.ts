import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RubikColor } from '../cv/colorDetector';
import { COLOR_DISPLAY } from '../cv/colorDetector';
import { FACE_CENTER_COLORS, type FaceName } from './scanState';

type OnFaceClick = (face: FaceName) => void;

const FACE_KEYS: FaceName[] = ['U', 'F', 'R', 'D', 'B', 'L'];

interface FaceState {
  group: THREE.Group;
  stickers: THREE.Mesh[];
  bgMesh: THREE.Mesh;
  flatPos: THREE.Vector3;
  flatRot: THREE.Euler;
  cubePos: THREE.Vector3;
  cubeRot: THREE.Euler;
}

const FACE_SPACING = 2.7;
const STICKER_SIZE = 0.8;
const STICKER_GAP = 0.9;
const FACE_SIZE = STICKER_GAP * 2 + STICKER_SIZE;

const FLAT_LAYOUT: Record<FaceName, { pos: [number, number, number]; rot: [number, number, number] }> = {
  U: { pos: [0, FACE_SPACING, 0],         rot: [0, 0, 0] },
  F: { pos: [0, 0, 0],                    rot: [0, 0, 0] },
  R: { pos: [FACE_SPACING, 0, 0],         rot: [0, 0, 0] },
  D: { pos: [FACE_SPACING, -FACE_SIZE, 0], rot: [0, 0, 0] },
  B: { pos: [FACE_SPACING * 2, -FACE_SPACING, 0], rot: [0, 0, 0] },
  L: { pos: [FACE_SPACING * 2, -(FACE_SPACING + FACE_SIZE), 0], rot: [0, 0, 0] },
};

const CUBE_SIZE = 1.35;

const CUBE_LAYOUT: Record<FaceName, { pos: [number, number, number]; rot: [number, number, number] }> = {
  F: { pos: [0, 0, CUBE_SIZE],    rot: [0, 0, 0] },
  U: { pos: [0, CUBE_SIZE, 0],    rot: [-Math.PI / 2, 0, 0] },
  R: { pos: [CUBE_SIZE, 0, 0],    rot: [0, Math.PI / 2, 0] },
  D: { pos: [0, -CUBE_SIZE, 0],   rot: [Math.PI / 2, 0, -Math.PI / 2] },
  B: { pos: [0, 0, -CUBE_SIZE],   rot: [0, Math.PI, -Math.PI * 1.5] },
  L: { pos: [-CUBE_SIZE, 0, 0],   rot: [0, -Math.PI / 2, -Math.PI * 1.5] },
};

const FOLD_DURATION = 600;

const STICKER_LOCAL_ROT: Record<FaceName, number> = {
  U: 0, F: 0, R: 0, D: 0, B: 0, L: 0,
};

function hexToThree(hex: string) { return new THREE.Color(hex); }
const DEFAULT_HEX = '#9ca3af';
const BG_HEX = '#1a1a1a';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return new THREE.Vector3().lerpVectors(a, b, t);
}

function lerpEuler(a: THREE.Euler, b: THREE.Euler, t: number) {
  return new THREE.Euler(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
    a.order,
  );
}

export class ScanCube3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animId: number | null = null;

  private faces: Record<FaceName, FaceState> = {} as any;
  private highlightBorder: THREE.Mesh | null = null;
  private selectedFace: FaceName = 'U';
  private onFaceClick: OnFaceClick | null = null;
  private faceMeshMap = new Map<THREE.Mesh, FaceName>();

  private is3D = false;
  private folding = false;
  private foldAnimId: number | null = null;

  constructor(container: HTMLElement, onFaceClick?: OnFaceClick) {
    this.onFaceClick = onFaceClick ?? null;

    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd1d5db);

    this.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    this.camera.position.set(FACE_SPACING, -FACE_SPACING * 0.5, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(FACE_SPACING, -FACE_SPACING * 0.5, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 8, 6);
    this.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir2.position.set(-3, -2, -4);
    this.scene.add(dir2);

    this.buildFaces();
    this.addHighlightBorder();

    this.renderer.domElement.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);

    this.animate();
  }

  private buildFaces() {
    for (const fk of FACE_KEYS) {
      const flat = FLAT_LAYOUT[fk];
      const cube = CUBE_LAYOUT[fk];
      const sr = STICKER_LOCAL_ROT[fk];
      const cosR = Math.cos(sr), sinR = Math.sin(sr);

      const group = new THREE.Group();
      group.position.set(...flat.pos);
      group.rotation.set(...flat.rot);

      const bgGeo = new THREE.PlaneGeometry(FACE_SIZE, FACE_SIZE);
      const bgMat = new THREE.MeshStandardMaterial({ color: hexToThree(BG_HEX), roughness: 0.8 });
      const bgMesh = new THREE.Mesh(bgGeo, bgMat);
      bgMesh.position.z = -0.01;
      group.add(bgMesh);

      const stickers: THREE.Mesh[] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const geo = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
          const mat = new THREE.MeshStandardMaterial({
            // centers never move, so they always show the color of their face
            color: hexToThree(row === 1 && col === 1 ? COLOR_DISPLAY[FACE_CENTER_COLORS[fk]].hex : DEFAULT_HEX),
            roughness: 0.35,
            metalness: 0.05,
          });
          const mesh = new THREE.Mesh(geo, mat);
          const lx = (col - 1) * STICKER_GAP;
          const ly = -(row - 1) * STICKER_GAP;
          mesh.position.set(
            lx * cosR - ly * sinR,
            lx * sinR + ly * cosR,
            0.01,
          );
          mesh.userData = { face: fk, row, col };
          group.add(mesh);
          stickers.push(mesh);
          this.faceMeshMap.set(mesh, fk);
        }
      }

      this.scene.add(group);
      this.faces[fk] = {
        group,
        stickers,
        bgMesh,
        flatPos: new THREE.Vector3(...flat.pos),
        flatRot: new THREE.Euler(...flat.rot),
        cubePos: new THREE.Vector3(...cube.pos),
        cubeRot: new THREE.Euler(...cube.rot),
      };
    }
  }

  private addHighlightBorder() {
    // frame with a hole, so the selected face (and its fixed center color) stays fully visible
    const size = FACE_SIZE + 0.3;
    const roundedRect = (path: THREE.Path, s: number, r: number) => {
      const h = s / 2;
      path.moveTo(-h + r, -h);
      path.lineTo(h - r, -h);
      path.quadraticCurveTo(h, -h, h, -h + r);
      path.lineTo(h, h - r);
      path.quadraticCurveTo(h, h, h - r, h);
      path.lineTo(-h + r, h);
      path.quadraticCurveTo(-h, h, -h, h - r);
      path.lineTo(-h, -h + r);
      path.quadraticCurveTo(-h, -h, -h + r, -h);
    };
    const shape = new THREE.Shape();
    roundedRect(shape, size, 0.1);
    const hole = new THREE.Path();
    roundedRect(hole, FACE_SIZE + 0.02, 0.04);
    shape.holes.push(hole);

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.highlightBorder = new THREE.Mesh(geo, mat);
    this.highlightBorder.renderOrder = 1;
    this.scene.add(this.highlightBorder);
    this.updateHighlight();
  }

  private updateHighlight() {
    if (!this.highlightBorder) return;
    const f = this.faces[this.selectedFace];
    if (!f) return;
    this.highlightBorder.position.copy(f.group.position);
    this.highlightBorder.rotation.copy(f.group.rotation);
    this.highlightBorder.translateZ(0.02);
  }

  get is3DMode() { return this.is3D; }
  get isAnimating() { return this.folding; }

  setSelectedFace(face: FaceName) {
    this.selectedFace = face;
    this.updateHighlight();
  }

  toggle(): Promise<void> {
    if (this.folding) return Promise.resolve();
    return this.is3D ? this.unfold() : this.fold();
  }

  fold(): Promise<void> {
    if (this.folding || this.is3D) return Promise.resolve();
    return this.runFoldAnimation(true);
  }

  unfold(): Promise<void> {
    if (this.folding || !this.is3D) return Promise.resolve();
    return this.runFoldAnimation(false);
  }

  private runFoldAnimation(toCube: boolean): Promise<void> {
    this.folding = true;

    const startTime = performance.now();
    const camFrom = new THREE.Vector3().copy(this.camera.position);
    const targetFrom = new THREE.Vector3().copy(this.controls.target);
    const camTo = toCube
      ? new THREE.Vector3(3.5, 2.5, 7.5)
      : new THREE.Vector3(FACE_SPACING, -FACE_SPACING * 0.5, 18);
    const targetTo = toCube
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(FACE_SPACING, -FACE_SPACING * 0.5, 0);

    return new Promise(resolve => {
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const raw = Math.min(elapsed / FOLD_DURATION, 1);
        const t = easeInOutCubic(raw);

        for (const fk of FACE_KEYS) {
          const f = this.faces[fk];
          const from = toCube ? f.flatPos : f.cubePos;
          const to = toCube ? f.cubePos : f.flatPos;
          const fromR = toCube ? f.flatRot : f.cubeRot;
          const toR = toCube ? f.cubeRot : f.flatRot;
          f.group.position.copy(lerpVec3(from, to, t));
          f.group.rotation.copy(lerpEuler(fromR, toR, t));
        }

        this.camera.position.copy(lerpVec3(camFrom, camTo, t));
        this.controls.target.copy(lerpVec3(targetFrom, targetTo, t));
        this.updateHighlight();

        if (raw < 1) {
          this.foldAnimId = requestAnimationFrame(tick);
        } else {
          this.is3D = toCube;
          this.folding = false;
          this.foldAnimId = null;
          this.controls.enableRotate = toCube;
          this.controls.enableZoom = toCube;

          if (!toCube) {
            const camTarget = new THREE.Vector3(FACE_SPACING, -FACE_SPACING * 0.5, 18);
            const lookTarget = new THREE.Vector3(FACE_SPACING, -FACE_SPACING * 0.5, 0);
            this.camera.position.copy(camTarget);
            this.camera.lookAt(lookTarget);
            this.controls.target.copy(lookTarget);
            this.controls.update();
          }

          resolve();
        }
      };
      this.foldAnimId = requestAnimationFrame(tick);
    });
  }

  updateFaceColors(face: FaceName, colors: RubikColor[][]) {
    const f = this.faces[face];
    if (!f) return;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const color = idx === 4 ? FACE_CENTER_COLORS[face] : colors[row]?.[col];
        const mat = f.stickers[idx].material as THREE.MeshStandardMaterial;
        mat.color = hexToThree(color ? COLOR_DISPLAY[color].hex : DEFAULT_HEX);
      }
    }
  }

  updateAllFaces(getFaceColors: (face: FaceName) => RubikColor[][] | null) {
    for (const fk of FACE_KEYS) {
      const colors = getFaceColors(fk);
      if (colors) this.updateFaceColors(fk, colors);
    }
  }

  private handleClick = (e: MouseEvent) => {
    if (this.folding) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allStickers = FACE_KEYS.flatMap(fk => this.faces[fk].stickers);
    const hits = this.raycaster.intersectObjects(allStickers, false);
    if (hits.length > 0) {
      const face = this.faceMeshMap.get(hits[0].object as THREE.Mesh);
      if (face && this.onFaceClick) this.onFaceClick(face);
    }
  };

  private handleResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.foldAnimId) cancelAnimationFrame(this.foldAnimId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
