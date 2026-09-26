import { STICKER_NORMAL, STICKER_POS, type Color, type Vec3 } from '@/solver/cube54'
import { DEFAULT_TUNED } from '@/cv/colorClassify'
import { mat3Mul, mat3Vec, stickerPoint, type Mat3 } from '@/cv/cubePose'
import type { CubePose, Intrinsics, Point } from '@/tracking/types'

export function rotX(deg: number): Mat3 {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}
export function rotY(deg: number): Mat3 {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}
export function rotZ(deg: number): Mat3 {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}
export const compose = (...ms: Mat3[]) => ms.reduce((a, b) => mat3Mul(a, b))

/** OpenCV style camera pose of a cube seen with the given model rotation. */
export function viewPose(rotation: Mat3, translation: Vec3): Pick<CubePose, 'rotation' | 'translation'> {
  // flip so that "identity" means: F towards the camera, U up in the image (camera y is down)
  const flip: Mat3 = [1, 0, 0, 0, -1, 0, 0, 0, -1]
  return { rotation: mat3Mul(flip, rotation), translation }
}

/** Tangent axes of a face (in model space) for sticker corners. */
function faceAxes(n: Vec3): [Vec3, Vec3] {
  const a: Vec3 = Math.abs(n[1]) === 1 ? [1, 0, 0] : [0, 1, 0]
  const b: Vec3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]]
  return [a, b]
}

export function stickerCorners(index: number, size: number): Vec3[] {
  const c = stickerPoint(index), [a, b] = faceAxes(STICKER_NORMAL[index])
  const h = size / 2
  return [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, y]) => [
    c[0] + a[0] * x + b[0] * y, c[1] + a[1] * x + b[1] * y, c[2] + a[2] * x + b[2] * y,
  ] as Vec3)
}

function fillPolygon(img: Uint8ClampedArray, w: number, h: number, poly: Point[], rgb: [number, number, number]) {
  const minX = Math.max(0, Math.floor(Math.min(...poly.map((p) => p.x))))
  const maxX = Math.min(w - 1, Math.ceil(Math.max(...poly.map((p) => p.x))))
  const minY = Math.max(0, Math.floor(Math.min(...poly.map((p) => p.y))))
  const maxY = Math.min(h - 1, Math.ceil(Math.max(...poly.map((p) => p.y))))
  let sign = 0
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = true
      for (let i = 0; i < poly.length && inside; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length]
        const c = (q.x - p.x) * (y + 0.5 - p.y) - (q.y - p.y) * (x + 0.5 - p.x)
        if (c === 0) continue
        if (sign === 0) sign = Math.sign(c)
        else if (Math.sign(c) !== sign) inside = false
      }
      if (inside) {
        const o = (y * w + x) * 4
        img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255
      }
      sign = 0
    }
  }
}

/** Render a cube into an RGBA buffer (stickers in the calibrated colors, black body, noisy background). */
/** A layer caught mid twist: `layer` is the layer coordinate along `axis` (1 = outer). */
export interface Twist { axis: Vec3; layer: number; degrees: number }

/** Twists that turn a layer clockwise seen from the face (like the notation). */
export const TWIST: Record<string, { axis: Vec3; layer: number }> = {
  R: { axis: [1, 0, 0], layer: 1 }, L: { axis: [-1, 0, 0], layer: 1 },
  U: { axis: [0, 1, 0], layer: 1 }, D: { axis: [0, -1, 0], layer: 1 },
  F: { axis: [0, 0, 1], layer: 1 }, B: { axis: [0, 0, -1], layer: 1 },
}

function rotateAbout(p: Vec3, axis: Vec3, degrees: number): Vec3 {
  // clockwise seen from the tip of the axis = negative right handed angle
  const a = (-degrees * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const [x, y, z] = axis
  const d = x * p[0] + y * p[1] + z * p[2]
  const cr: Vec3 = [y * p[2] - z * p[1], z * p[0] - x * p[2], x * p[1] - y * p[0]]
  return [0, 1, 2].map((i) => p[i] * c + cr[i] * s + axis[i] * d * (1 - c)) as Vec3
}

/**
 * Render a cube into an RGBA buffer (stickers in the calibrated colors, black body, noisy
 * background). Cubie faces are painted far to near, so a layer can be drawn mid twist.
 */
export function renderCube(
  state: readonly Color[],
  pose: Pick<CubePose, 'rotation' | 'translation'>,
  k: Intrinsics,
  opts: { noise?: number; seed?: number; stickerSize?: number; hide?: number[]; twist?: Twist } = {},
) {
  const { width: w, height: h } = k
  const img = new Uint8ClampedArray(w * h * 4)
  let seed = opts.seed ?? 1
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
  for (let i = 0; i < w * h; i++) {
    const g = 120 + Math.floor(rand() * 40)
    img[i * 4] = g; img[i * 4 + 1] = g - 10; img[i * 4 + 2] = g - 25; img[i * 4 + 3] = 255
  }
  if (pose.translation[2] <= 0) return { data: img, width: w, height: h }
  const noise = opts.noise ?? 12
  const tw = opts.twist
  const inLayer = (p: Vec3) => !!tw && Math.round(tw.axis[0] * p[0] + tw.axis[1] * p[1] + tw.axis[2] * p[2]) === tw.layer
  const place = (p: Vec3, moving: boolean) => (moving ? rotateAbout(p, tw!.axis, tw!.degrees) : p)
  const cam = (p: Vec3): Vec3 => {
    const c = mat3Vec(pose.rotation, p)
    return [c[0] + pose.translation[0], c[1] + pose.translation[1], c[2] + pose.translation[2]]
  }
  type Poly = { pts: Vec3[]; rgb: [number, number, number]; depth: number; normal: Vec3; order: number }
  const polys: Poly[] = []
  const add = (pts: Vec3[], normal: Vec3, rgb: [number, number, number], order: number) => {
    const c = pts.map(cam)
    const n = mat3Vec(pose.rotation, normal)
    const center = c.reduce((a, p) => [a[0] + p[0] / c.length, a[1] + p[1] / c.length, a[2] + p[2] / c.length] as Vec3, [0, 0, 0] as Vec3)
    if (n[0] * center[0] + n[1] * center[1] + n[2] * center[2] >= 0) return // facing away
    polys.push({ pts: c, rgb, depth: Math.hypot(...center), normal: n, order })
  }
  for (let idx = 0; idx < 54; idx++) {
    const moving = inLayer(STICKER_POS[idx])
    const normal = moving ? rotateAbout(STICKER_NORMAL[idx], tw!.axis, tw!.degrees) : STICKER_NORMAL[idx]
    add(stickerCorners(idx, 1).map((p) => place(p, moving)), normal, [15, 15, 15], 0)
    if (opts.hide?.includes(idx)) continue
    const c = DEFAULT_TUNED[state[idx]]
    const jitter = () => Math.round((rand() - 0.5) * noise)
    add(stickerCorners(idx, opts.stickerSize ?? 0.86).map((p) => place(p, moving)), normal, [c.r + jitter(), c.g + jitter(), c.b + jitter()], 1)
  }
  if (tw && tw.degrees % 90 !== 0) {
    // the black inside of the gap between the turning layer and the rest
    const a = tw.axis
    const [t1, t2] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].filter((v) => v[0] * a[0] + v[1] * a[1] + v[2] * a[2] === 0) as Vec3[]
    const square = (d: number): Vec3[] => [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]
      .map(([u, v]) => [a[0] * d + t1[0] * u + t2[0] * v, a[1] * d + t1[1] * u + t2[1] * v, a[2] * d + t1[2] * u + t2[2] * v] as Vec3)
    const neg: Vec3 = [-a[0], -a[1], -a[2]]
    add(square(0.5), a, [15, 15, 15], 0) // top of the fixed part
    add(square(0.5).map((p) => place(p, true)), neg, [15, 15, 15], 0) // bottom of the turning layer
  }
  // a sticker lies on its black backing: draw it just after (same depth up to rounding)
  polys.sort((p, q) => (q.depth - q.order * 1e-3) - (p.depth - p.order * 1e-3))
  for (const p of polys) fillPolygon(img, w, h, p.pts.map((c) => ({ x: k.fx * c[0] / c[2] + k.cx, y: k.fy * c[1] / c[2] + k.cy })), p.rgb)
  return { data: img, width: w, height: h }
}

/** Motion blur: average of renders along the motion, plus a light level factor. */
export function renderBlurred(
  state: readonly Color[],
  poses: Pick<CubePose, 'rotation' | 'translation'>[],
  k: Intrinsics,
  opts: { noise?: number; seed?: number; hide?: number[]; light?: number } = {},
) {
  const frames = poses.map((p, i) => renderCube(state, p, k, { ...opts, seed: (opts.seed ?? 1) * 7 + i }).data)
  const out = new Uint8ClampedArray(frames[0].length)
  const light = opts.light ?? 1
  for (let i = 0; i < out.length; i++) {
    if (i % 4 === 3) { out[i] = 255; continue }
    let sum = 0
    for (const f of frames) sum += f[i]
    out[i] = (sum / frames.length) * light
  }
  return { data: out, width: k.width, height: k.height }
}
