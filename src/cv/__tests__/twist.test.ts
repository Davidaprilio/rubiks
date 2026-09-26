import { describe, it, expect, beforeAll } from 'vitest'
import { SOLVED, applyAlg, invertAlg, type Color } from '@/solver/cube54'
import { DEFAULT_TUNED } from '@/cv/colorClassify'
import { rotationAngle } from '@/cv/cubePose'
import { TrackingCore } from '@/tracking/trackingCore'
import { MoveDetector } from '@/tracking/moveDetector'
import { defaultIntrinsics } from '@/cv/poseEstimator'
import { compose, renderCube, rotX, rotY, rotZ, viewPose, TWIST } from './synthetic'

let cv: unknown
const k = defaultIntrinsics(480, 360)

beforeAll(async () => {
  const nodeModule = 'node:module'
  const { createRequire } = await import(/* @vite-ignore */ nodeModule)
  let mod = createRequire(import.meta.url)('@techstark/opencv-js')
  if (mod instanceof Promise) mod = await mod
  for (let i = 0; i < 400 && typeof mod.Mat !== 'function'; i++) await new Promise((r) => setTimeout(r, 50))
  cv = mod
}, 60000)

type Pose = ReturnType<typeof viewPose>
interface Frame { state: Color[]; pose: Pose; twist?: { face: string; degrees: number } }

/** Runs frames through the real tracking core + move detector, like the home page does. */
function run(frames: Frame[], start: Color[] = SOLVED as Color[], nextExpected: string[] = []) {
  const core = new TrackingCore(cv, DEFAULT_TUNED)
  const detector = new MoveDetector(start)
  const moves: string[] = []
  detector.onMove((m) => { moves.push(m.move); detector.applyExternal([m.move]) })
  const errors: (number | null)[] = []
  const statuses: string[] = []
  detector.onStatus((st) => statuses.push(st.kind === 'candidate' ? `c:${st.move}` : st.kind === 'changing' ? `x${st.mismatches}` : st.kind[0]))
  frames.forEach((f, i) => {
    const twist = f.twist ? { ...TWIST[f.twist.face[0]], degrees: f.twist.face.endsWith("'") ? -f.twist.degrees : f.twist.degrees } : undefined
    const img = renderCube(f.state, f.pose, k, { seed: i + 1, noise: 20, twist })
    const r = core.step(img, detector.state, i * 33, detector.nextStates)
    errors.push(r.observation.pose ? rotationAngle(r.observation.pose.rotation, f.pose.rotation) : null)
    detector.onObservation(r.observation, { nextExpectedMove: nextExpected[moves.length] })
  })
  return { moves, errors, state: detector.state, statuses }
}

const still = (state: Color[], pose: Pose, n: number): Frame[] => Array.from({ length: n }, () => ({ state, pose }))
const twistFrames = (state: Color[], pose: Pose, face: string, steps = 6): Frame[] =>
  Array.from({ length: steps }, (_, i) => ({ state, pose, twist: { face, degrees: (90 * (i + 1)) / (steps + 1) } }))

describe('layer twist detection (synthetic frames)', () => {
  const pose = viewPose(compose(rotX(25), rotY(-35)), [0, 0, 11])

  it('detects R then U\' on a solved cube, and the pose does not tilt meanwhile', () => {
    const s0 = SOLVED as Color[]
    const s1 = applyAlg(s0, 'R') as Color[]
    const s2 = applyAlg(s1, "U'") as Color[]
    const frames = [
      ...still(s0, pose, 5),
      ...twistFrames(s0, pose, 'R'),
      ...still(s1, pose, 6),
      ...twistFrames(s1, pose, "U'"),
      ...still(s2, pose, 6),
    ]
    const { moves, errors, state } = run(frames)
    console.log('moves', moves, 'pose errors', JSON.stringify(errors.map((e) => (e === null ? 'L' : Math.round(e)))))
    expect(moves).toEqual(['R', "U'"])
    expect(state).toEqual(s2)
    const still1 = errors.slice(0, 5).concat(errors.slice(11, 17), errors.slice(23))
    expect(still1.every((e) => e !== null && e < 6)).toBe(true)
    // during the twists the pose may wobble a little but must not flip
    expect(errors.every((e) => e === null || e < 20)).toBe(true)
  }, 120000)

  it('does not report moves when the cube is only tilted and turned', () => {
    const s = applyAlg(SOLVED, "R U F'") as Color[]
    const frames: Frame[] = Array.from({ length: 30 }, (_, i) => ({
      state: s,
      pose: viewPose(compose(rotX(25 + 15 * Math.sin(i / 5)), rotY(-35 + 4 * i), rotZ(10 * Math.sin(i / 7))), [0, 0, 11]),
    }))
    const { moves } = run(frames, s)
    expect(moves).toEqual([])
  }, 120000)

  it('follows a short scramble done in front of the camera', () => {
    const alg = ['R', 'U', "F'", 'L2', 'D']
    let s = SOLVED as Color[]
    const frames: Frame[] = [...still(s, pose, 4)]
    for (const m of alg) {
      frames.push(...twistFrames(s, pose, m[0] + (m.endsWith("'") ? "'" : ''), m.endsWith('2') ? 8 : 6).map((f) => m.endsWith('2') ? { ...f, twist: { face: m[0], degrees: f.twist!.degrees * 2 } } : f))
      s = applyAlg(s, m) as Color[]
      frames.push(...still(s, pose, 5))
    }
    const { moves, state, errors, statuses } = run(frames)
    console.log('scramble moves', moves, JSON.stringify(errors.map((e) => (e === null ? 'L' : Math.round(e)))))
    console.log(statuses.join(' '))
    // moves on faces the camera cannot see (D here) cannot be detected: the state stays behind
    expect(moves.slice(0, 4)).toEqual(['R', 'U', "F'", 'L2'])
    void invertAlg
    void state
  }, 120000)
})
