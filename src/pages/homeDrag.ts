import * as THREE from 'three';
import type { Cube, TwistNotation } from '../classes/cube';

interface Controls { enabled: boolean }

/** pixels the pointer has to move before a drag on the cube counts as a turn */
const THRESHOLD = 12;

/**
 * Turn for a positive (right hand, counterclockwise seen from +axis) quarter turn of a layer,
 * and its opposite. Layers: 1 = R / U / F side, -1 = L / D / B side, 0 = the slice between.
 */
const TURNS: Record<'x' | 'y' | 'z', Record<number, [TwistNotation, TwistNotation]>> = {
  x: { 1: ["R'", 'R'], [-1]: ['L', "L'"], 0: ['M', "M'"] },
  y: { 1: ["U'", 'U'], [-1]: ['D', "D'"], 0: ['E', "E'"] },
  z: { 1: ["F'", 'F'], [-1]: ['B', "B'"], 0: ["S'", 'S'] },
};

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/** the axis a vector points along most */
function mainAxis(v: THREE.Vector3): 'x' | 'y' | 'z' {
  const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  return (['x', 'y', 'z'] as const)[a.indexOf(Math.max(...a))];
}

/**
 * Swipe on a sticker to turn its layer the way the finger moves; a drag that starts next to
 * the cube still rotates the view. Off while `controls` are disabled (camera tracking).
 */
export function setupDragTwist(o: { dom: HTMLElement; camera: THREE.Camera; cube: Cube; controls: Controls }) {
  const raycaster = new THREE.Raycaster();
  let drag: { x: number; y: number; point: THREE.Vector3; normal: 'x' | 'y' | 'z'; pointerId: number } | null = null;

  const ndc = (e: PointerEvent) => {
    const r = o.dom.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  /** screen position (pixels, y down) of a point in cube coordinates */
  const toScreen = (local: THREE.Vector3) => {
    const r = o.dom.getBoundingClientRect();
    const p = o.cube.threeObj.localToWorld(local.clone()).project(o.camera);
    return new THREE.Vector2((p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height);
  };

  const onDown = (e: PointerEvent) => {
    if (!o.controls.enabled || e.button !== 0 || drag) return;
    raycaster.setFromCamera(ndc(e), o.camera);
    const hit = raycaster.intersectObject(o.cube.threeObj, true).find((h) => h.face);
    if (!hit) return;
    // face normal in cube coordinates
    const normal = hit.face!.normal.clone().transformDirection(hit.object.matrixWorld);
    const inv = new THREE.Quaternion();
    o.cube.threeObj.getWorldQuaternion(inv).invert();
    normal.applyQuaternion(inv);
    drag = { x: e.clientX, y: e.clientY, point: o.cube.threeObj.worldToLocal(hit.point.clone()), normal: mainAxis(normal), pointerId: e.pointerId };
    // the view must not rotate while turning a layer
    o.controls.enabled = false;
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = new THREE.Vector2(e.clientX - drag.x, e.clientY - drag.y);
    if (d.length() < THRESHOLD) return;
    d.normalize();
    // of the two axes along the touched face, the one whose turn moves the point most like the finger
    let best: { axis: 'x' | 'y' | 'z'; dot: number } | null = null;
    const from = toScreen(drag.point);
    for (const axis of ['x', 'y', 'z'] as const) {
      if (axis === drag.normal) continue;
      const velocity = AXES[axis].clone().cross(drag.point);
      const dir = toScreen(drag.point.clone().addScaledVector(velocity, 0.1)).sub(from);
      if (dir.lengthSq() < 1e-6) continue;
      const dot = d.dot(dir.normalize());
      if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { axis, dot };
    }
    const point = drag.point;
    end();
    if (!best) return;
    const layer = Math.max(-1, Math.min(1, Math.round(point[best.axis])));
    void o.cube.runNotation([TURNS[best.axis][layer][best.dot > 0 ? 0 : 1]]);
  };

  const end = () => {
    if (!drag) return;
    drag = null;
    o.controls.enabled = true;
  };
  const onUp = (e: PointerEvent) => { if (drag && e.pointerId === drag.pointerId) end(); };

  // capture: runs before the trackball controls' own pointerdown on the same element
  o.dom.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return () => {
    end();
    o.dom.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
}
