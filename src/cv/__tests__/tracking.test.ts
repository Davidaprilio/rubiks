import { describe, it, expect, beforeAll } from 'vitest'
import { SOLVED, applyAlg, type Color } from '@/solver/cube54'
import { buildPixelLut, DEFAULT_TUNED } from '@/cv/colorClassify'
import { analyzeFrame, defaultIntrinsics } from '@/cv/poseEstimator'
import { rotationAngle, PoseSmoother, predictPose, toThreePose } from '@/cv/cubePose'
import { compose, renderBlurred, renderCube, rotX, rotY, rotZ, viewPose } from './synthetic'

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}

let cv: any
const lut = buildPixelLut(DEFAULT_TUNED)
const k = defaultIntrinsics(480, 360)

beforeAll(async () => {
  // loaded through require: the ESM import of the opencv.js bundle does not work under vitest
  const nodeModule = 'node:module' // kept out of the type checker: the app does not use node types
  const { createRequire } = await import(/* @vite-ignore */ nodeModule)
  let mod = createRequire(import.meta.url)('@techstark/opencv-js')
  if (mod instanceof Promise) mod = await mod
  // the wasm runtime may still be starting
  for (let i = 0; i < 400 && typeof mod.Mat !== 'function'; i++) await new Promise((r) => setTimeout(r, 50))
  cv = mod
}, 60000)

const scrambled = applyAlg(SOLVED, "R U2 F' D L2 B U' R2 F D' L U2 B' R' F2 U") as Color[]

describe('camera tracking pipeline (synthetic frames)', () => {
  it('finds the pose of a scrambled cube in many orientations and places', () => {
    const rand = rng(7)
    let worst = 0, found = 0
    const wrong: string[] = []
    const N = 40
    for (let i = 0; i < N; i++) {
      // any orientation where the cube is not seen exactly edge on
      const rot = compose(rotY(rand() * 360), rotX(rand() * 360), rotZ(rand() * 360))
      // cube between ~1/5 and ~1/3 of the frame height, anywhere in the frame
      const z = 11 + rand() * 9
      const t: [number, number, number] = [(rand() - 0.5) * 0.7 * z, (rand() - 0.5) * 0.5 * z, z]
      const truth = viewPose(rot, t)
      const obs = analyzeFrame(renderCube(scrambled, truth, k, { seed: i + 1 }), { cv, lut, intrinsics: k, known: scrambled, previous: null })
      if (!obs.pose) continue
      found++
      const err = rotationAngle(obs.pose.rotation, truth.rotation)
      worst = Math.max(worst, err)
      // every sticker placed on the cube must carry the color it really has
      const misplaced = obs.observed.filter((s) => s.color !== scrambled[s.index]).length
      if (err > 6 || Math.abs(obs.pose.translation[0] - t[0]) > 0.8 || misplaced) wrong.push(`frame ${i}: ${err.toFixed(1)} deg, ${misplaced} misplaced`)
    }
    console.log(`found ${found}/${N}, worst rotation error ${worst.toFixed(2)} deg`, wrong)
    expect(wrong).toEqual([])
    expect(found).toBeGreaterThan(N * 0.85)
  }, 60000)

  it('works with a missing (logo) center sticker', () => {
    const truth = viewPose(compose(rotY(30), rotX(25)), [1, -1, 18])
    const obs = analyzeFrame(renderCube(scrambled, truth, k, { hide: [4 + 18] }), { cv, lut, intrinsics: k, known: scrambled, previous: null })
    expect(obs.pose).not.toBeNull()
    expect(rotationAngle(obs.pose!.rotation, truth.rotation)).toBeLessThan(6)
  })

  it('on a solved cube keeps the orientation closest to the previous pose', () => {
    // one face only: the 4 quarter turns look identical
    for (const z of [0, 90, 180, 270]) {
      const truth = viewPose(rotZ(z + 10), [0, 0, 16])
      const previous = viewPose(rotZ(z), [0, 0, 16])
      const obs = analyzeFrame(renderCube(SOLVED, truth, k), { cv, lut, intrinsics: k, known: SOLVED, previous })
      expect(obs.pose).not.toBeNull()
      expect(rotationAngle(obs.pose!.rotation, truth.rotation), `z ${z}`).toBeLessThan(6)
    }
  })

  it('without an expected state still finds the pose from the centers', () => {
    const truth = viewPose(compose(rotY(-35), rotX(30)), [0, 0, 17])
    const unknown = new Array(54).fill(null)
    const obs = analyzeFrame(renderCube(scrambled, truth, k), { cv, lut, intrinsics: k, known: unknown, previous: null })
    expect(obs.pose).not.toBeNull()
    expect(rotationAngle(obs.pose!.rotation, truth.rotation)).toBeLessThan(6)
  })

  it('copes with stickers hidden by fingers', () => {
    const rand = rng(21)
    let wrong = 0, found = 0
    for (let i = 0; i < 20; i++) {
      const truth = viewPose(compose(rotY(rand() * 360), rotX(rand() * 360)), [0, 0, 11 + rand() * 6])
      const hide = Array.from({ length: 8 }, () => Math.floor(rand() * 54))
      const obs = analyzeFrame(renderCube(scrambled, truth, k, { seed: i + 3, noise: 30, hide }), { cv, lut, intrinsics: k, known: scrambled, previous: null })
      if (!obs.pose) continue
      found++
      if (rotationAngle(obs.pose.rotation, truth.rotation) > 6) wrong++
    }
    expect(found).toBeGreaterThan(15)
    expect(wrong).toBe(0)
  }, 60000)

  it('finds nothing in an empty frame', () => {
    const img = renderCube(scrambled, viewPose(rotY(0), [0, 0, -20]), k) // behind the camera
    const obs = analyzeFrame(img, { cv, lut, intrinsics: k, known: scrambled, previous: null })
    expect(obs.pose).toBeNull()
  })
})

describe('three.js pose', () => {
  it('a cube held upright with F to the camera is not rotated in three.js', () => {
    const p = toThreePose(viewPose(rotY(0), [0, 0, 12]), k, 'camera')
    expect(p.quaternion.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0, 1])
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('moves right/up on screen with the cube, and mirrors', () => {
    const right = toThreePose(viewPose(rotY(0), [2, -1, 12]), k, 'camera') // camera y is down
    expect(right.x).toBeGreaterThan(0)
    expect(right.y).toBeGreaterThan(0)
    const turned = toThreePose(viewPose(rotY(30), [2, 0, 12]), k, 'camera')
    const mirrored = toThreePose(viewPose(rotY(30), [2, 0, 12]), k, 'mirror')
    expect(mirrored.x).toBeCloseTo(-turned.x)
    // a turn about the vertical axis flips direction in a mirror
    expect(mirrored.quaternion[1]).toBeCloseTo(-turned.quaternion[1])
  })
})

describe('POV view', () => {
  // three.js object rotation applied to a model axis: which way does that face point on screen?
  const facing = (q: number[], axis: [number, number, number]) => {
    const [x, y, z, w] = q
    const m = [
      1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
    ]
    return [0, 1, 2].map((i) => Math.round(m[i * 3] * axis[0] + m[i * 3 + 1] * axis[1] + m[i * 3 + 2] * axis[2]) || 0)
  }

  it('the camera sees red (F): the person holding the cube sees orange (B)', () => {
    const q = toThreePose(viewPose(rotY(0), [0, 0, 12]), k, 'pov').quaternion
    expect(facing(q, [0, 0, -1])).toEqual([0, 0, 1]) // B faces the viewer (+z towards the screen)
    expect(facing(q, [0, 1, 0])).toEqual([0, 1, 0]) // U still up
  })

  it('turning the cube to show the camera blue (L) shows the person green (R)', () => {
    // the cube turned a quarter about the vertical axis so L faces the camera
    const q = toThreePose(viewPose(rotY(90), [0, 0, 12]), k, 'pov').quaternion
    expect(facing(q, [1, 0, 0])).toEqual([0, 0, 1]) // R faces the viewer
  })
})

describe('pose smoother', () => {
  it('ignores a single frame flip but follows a lasting one', () => {
    const s = new PoseSmoother({ confirmFrames: 3 })
    const a = viewPose(rotY(0), [0, 0, 16]), b = viewPose(rotY(90), [0, 0, 16])
    s.update(a, 0)
    s.update(b, 30)
    expect(rotationAngle(s.pose!.rotation, a.rotation)).toBeLessThan(1)
    s.update(b, 60); s.update(b, 90)
    expect(rotationAngle(s.pose!.rotation, b.rotation)).toBeLessThan(1)
  })

  it('holds the pose briefly, then reports lost', () => {
    const s = new PoseSmoother({ holdMs: 500 })
    s.update(viewPose(rotY(0), [0, 0, 16]), 0)
    expect(s.update(null, 300).pose).not.toBeNull()
    expect(s.update(null, 700).pose).toBeNull()
  })
})


describe('frame to frame tracking (sequences)', () => {
  /** Runs the tracker loop the way CameraTracker does, returns per frame errors (null = lost). */
  function run(state: Color[], poses: ReturnType<typeof viewPose>[], opts: { hide?: (i: number) => number[]; noise?: number; blur?: (i: number) => ReturnType<typeof viewPose>[]; light?: number; track?: boolean } = {}) {
    const smoother = new PoseSmoother()
    let raw: { pose: ReturnType<typeof viewPose>; i: number }[] = []
    return poses.map((truth, i) => {
      const predicted = opts.track === false ? null : raw.length === 2 ? predictPose(raw[0].pose, raw[1].pose, (i - raw[1].i) / (raw[1].i - raw[0].i)) : raw[0]?.pose ?? smoother.pose
      const img = opts.blur
        ? renderBlurred(state, opts.blur(i), k, { seed: i + 1, noise: opts.noise ?? 20, hide: opts.hide?.(i), light: opts.light })
        : renderCube(state, truth, k, { seed: i + 1, noise: opts.noise ?? 20, hide: opts.hide?.(i) })
      const obs = analyzeFrame(img, { cv, lut, intrinsics: k, known: state, previous: smoother.pose, predicted }, i * 33)
      // like CameraTracker: poses older than ~400 ms are forgotten
      raw = raw.filter((r) => i - r.i <= 12)
      if (obs.pose) raw = [...raw, { pose: obs.pose, i }].slice(-2)
      smoother.update(obs.pose, i * 33)
      return obs.pose ? rotationAngle(obs.pose.rotation, truth.rotation) : null
    })
  }
  // wrong = locked on a wrong orientation; small errors are imprecision (blur, fingers)
  const summary = (errs: (number | null)[]) => {
    console.log(JSON.stringify(errs.map((e) => (e === null ? 'L' : Math.round(e)))))
    const found = errs.filter((e): e is number => e !== null).sort((a, b) => a - b)
    return {
      lost: errs.length - found.length,
      wrong: found.filter((e) => e > 15).length,
      median: found.length ? Math.round(found[Math.floor(found.length / 2)] * 10) / 10 : null,
    }
  }

  for (const [name, axis] of [['x', rotX], ['y', rotY], ['z', rotZ]] as const) {
    it(`keeps the lock on a solved cube during a whole cube ${name} rotation`, () => {
      // 360 degrees in 36 frames (about 1 second at 30 fps), tilted so 2-3 faces show
      const poses = Array.from({ length: 36 }, (_, i) => viewPose(compose(rotX(20), rotY(-30), axis(i * 10)), [0.5, 0, 13]))
      const s = summary(run(SOLVED as Color[], poses))
      expect(s.wrong).toBe(0)
      expect(s.lost).toBeLessThanOrEqual(2)
    }, 60000)
  }

  it('follows a scrambled cube moved and turned around with stickers hidden by fingers', () => {
    const rand = rng(5)
    const poses = Array.from({ length: 60 }, (_, i) => viewPose(
      compose(rotX(25 + 20 * Math.sin(i / 7)), rotY(-40 + 8 * i), rotZ(10 * Math.sin(i / 5))),
      [3 * Math.sin(i / 9), 1.5 * Math.cos(i / 6), 12 + 2 * Math.sin(i / 11)],
    ))
    const s = summary(run(scrambled, poses, { hide: () => Array.from({ length: 6 }, () => Math.floor(rand() * 54)), noise: 30 }))
    expect(s.wrong).toBe(0)
    expect(s.lost).toBeLessThanOrEqual(3)
  }, 60000)

  for (const [label, step, exposure] of [['normal', 12, 0.5], ['extreme', 15, 1]] as const) {
    it(`fast turns with motion blur in dim light (${label}: ${step} deg/frame, blur over ${exposure * 100}% of the frame)`, () => {
      // held still for a moment (sharp), then turned `step` degrees per frame (~${step * 30} deg/s)
      const at = (a: number) => viewPose(compose(rotX(25), rotY(-35 + a), rotZ(8)), [1, 0.5, 17])
      const angle = (i: number) => Math.max(0, i - 4) * step
      const poses = Array.from({ length: 34 }, (_, i) => at(angle(i)))
      const blur = (i: number) => (i <= 4 ? [at(0)] : [-0.5, -0.17, 0.17, 0.5].map((f) => at(angle(i) + f * step * exposure)))
      const tracked = summary(run(SOLVED as Color[], poses, { blur, light: 0.8, noise: 25 }))
      const searched = summary(run(SOLVED as Color[], poses, { blur, light: 0.8, noise: 25, track: false }))
      console.log(`motion blur ${label}: tracked`, tracked, 'per frame search', searched)
      expect(tracked.lost).toBeLessThanOrEqual(searched.lost)
      expect(tracked.wrong).toBeLessThanOrEqual(searched.wrong)
      if (label === 'normal') {
        expect(tracked.wrong).toBe(0)
        expect(tracked.lost).toBeLessThanOrEqual(2)
      }
    }, 60000)
  }
})
