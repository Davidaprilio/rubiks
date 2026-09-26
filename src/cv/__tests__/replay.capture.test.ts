/**
 * Replays camera captures (npm run dev -> Camera Tracking -> ● Rec / 📷) through the tracking
 * pipeline, offline, exactly like CameraTracker does, and writes next to every capture:
 *
 *   captures/<session>/report.txt          per frame results + summary
 *   captures/<session>/debug/fNNNNN.png    frame with detections (left) and color labels (right)
 *
 * Run:  npm run replay                    all sessions
 *       CAPTURE=<session> npm run replay  one session
 *
 * Skipped in the normal test run and when there are no captures.
 */
import { it, expect } from 'vitest'
import { buildPixelLut, NO_LABEL, labelPixels, type TunedColors } from '@/cv/colorClassify'
import { analyzeFrame } from '@/cv/poseEstimator'
import { project, rotationAngle } from '@/cv/cubePose'
import type { CubePose, Intrinsics, StickerCandidate } from '@/tracking/types'
import type { CaptureSession } from '@/tracking/captureRecorder'
import { MoveDetector } from '@/tracking/moveDetector'
import { TrackingCore } from '@/tracking/trackingCore'
import type { Vec3 } from '@/solver/cube54'
import { decodePng, drawLine, encodePng, fsp, hexRgb, type Rgba } from './nodeImage'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cwd = (globalThis as any).process?.cwd?.() ?? '.'
const root = `${cwd}/captures`

type Pose = Pick<CubePose, 'rotation' | 'translation'>

// same as COLOR_DISPLAY (colorDetector.ts pulls in the OpenCV ESM bundle, which vitest cannot import)
const COLOR_DISPLAY: Record<string, { hex: string }> = {
  W: { hex: '#FFFFFF' }, O: { hex: '#ff6600' }, B: { hex: '#0000dd' }, R: { hex: '#ff0000' }, G: { hex: '#00aa00' }, Y: { hex: '#ffee00' },
}
const LABEL_RGB: [number, number, number][] = ['W', 'O', 'B', 'R', 'G', 'Y'].map((c) => hexRgb(COLOR_DISPLAY[c].hex))

const CORNERS: Vec3[] = []
for (const x of [-1.5, 1.5]) for (const y of [-1.5, 1.5]) for (const z of [-1.5, 1.5]) CORNERS.push([x, y, z])
const EDGES: [number, number][] = []
for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (CORNERS[a].filter((v, i) => v !== CORNERS[b][i]).length === 1) EDGES.push([a, b])

function drawQuad(img: Rgba, q: StickerCandidate['quad'], rgb: [number, number, number], width = 1, dashed = false) {
  for (let i = 0; i < 4; i++) drawLine(img, q[i].x, q[i].y, q[(i + 1) % 4].x, q[(i + 1) % 4].y, rgb, width, dashed)
}

function drawCube(img: Rgba, pose: Pose, k: Intrinsics, rgb: [number, number, number]) {
  const p = CORNERS.map((c) => project(pose, k, c))
  for (const [a, b] of EDGES) drawLine(img, p[a].x, p[a].y, p[b].x, p[b].y, rgb, 1)
  const o = project(pose, k, [0, 0, 0]), u = project(pose, k, [0, 2.4, 0]), f = project(pose, k, [0, 0, 2.4])
  drawLine(img, o.x, o.y, u.x, u.y, hexRgb(COLOR_DISPLAY.Y.hex), 2)
  drawLine(img, o.x, o.y, f.x, f.y, hexRgb(COLOR_DISPLAY.R.hex), 2)
}

async function loadCv() {
  const nodeModule = 'node:module'
  const { createRequire } = await import(/* @vite-ignore */ nodeModule)
  let cv = createRequire(import.meta.url)('@techstark/opencv-js')
  if (cv instanceof Promise) cv = await cv
  for (let i = 0; i < 400 && typeof cv.Mat !== 'function'; i++) await new Promise((r) => setTimeout(r, 50))
  return cv
}

async function sessions(): Promise<string[]> {
  const fs = await fsp()
  if (!fs.existsSync(root)) return []
  const all: string[] = fs.readdirSync(root).filter((d: string) => fs.existsSync(`${root}/${d}/session.json`)).sort()
  return env.CAPTURE ? all.filter((d) => d === env.CAPTURE) : all
}

// only on request (npm run replay): real captures can take minutes
const found = env.REPLAY || env.CAPTURE ? await sessions() : []

it.skipIf(found.length === 0)('replay camera captures', async () => {
  const fs = await fsp()
  const cv = await loadCv()
  for (const name of found) {
    const dir = `${root}/${name}`
    const meta: CaptureSession = JSON.parse(fs.readFileSync(`${dir}/session.json`, 'utf8'))
    fs.mkdirSync(`${dir}/debug`, { recursive: true })
    const lut = buildPixelLut(meta.tunedColors as TunedColors)
    const core = new TrackingCore(cv, meta.tunedColors as TunedColors)
    // the detector starts from the state the live session expected at its first frame
    const detector = new MoveDetector(meta.frames[0]?.known ?? new Array(54).fill(null))
    const moves: string[] = []
    let frameMoves: string[] = []
    detector.onMove((m) => { moves.push(m.move); frameMoves.push(m.move); detector.applyExternal([m.move]) })
    let prevRaw: Pose | null = null
    const lines: string[] = []
    const stats = { frames: 0, found: 0, liveFound: 0, jumps: 0, smoothJumps: 0, longestLost: 0, ms: 0, noStickers: 0, disagree: 0 }
    let prevSmooth: Pose | null = null
    let lostRun = 0

    for (const f of meta.frames) {
      const img = await decodePng(new Uint8Array(fs.readFileSync(`${dir}/${f.file}`)))
      const k = f.intrinsics
      const now = f.time
      const labels = new Uint8Array(img.width * img.height)
      const t0 = performance.now()
      const step = core.step(img, detector.state, now, detector.nextStates)
      const ms = performance.now() - t0
      const obs = step.observation
      frameMoves = []
      detector.onObservation(obs)
      const shown = step.pose
      // what the 3D cube follows (before the render side easing)
      if (shown && prevSmooth && rotationAngle(shown.rotation, prevSmooth.rotation) > 25) stats.smoothJumps++
      prevSmooth = shown
      stats.frames++
      stats.ms += ms
      if (obs.pose) stats.found++
      if (f.result.pose) stats.liveFound++
      if (obs.stickers.length === 0) stats.noStickers++
      lostRun = obs.pose ? 0 : lostRun + 1
      stats.longestLost = Math.max(stats.longestLost, lostRun)
      const jump = obs.pose && prevRaw ? rotationAngle(obs.pose.rotation, prevRaw.rotation) : 0
      if (jump > 25) stats.jumps++
      if (obs.pose) prevRaw = obs.pose
      const vsLive = obs.pose && f.result.pose ? rotationAngle(obs.pose.rotation, f.result.pose.rotation) : null
      if (vsLive !== null && vsLive > 15) stats.disagree++
      lines.push([
        f.file,
        `stickers ${String(obs.stickers.length).padStart(2)}`,
        `grids [${obs.components.map((c) => c.cells.length).join(',')}]`,
        `outliers ${obs.outliers.length}`,
        obs.pose ? `pose err ${obs.pose.error.toFixed(1)}px` : 'LOST',
        obs.aligned ? `region ${obs.aligned.score.toFixed(2)}` : '',
        obs.matchesKnown === false ? 'COLORS-DIFFER' : '',
        jump > 25 ? `JUMP ${jump.toFixed(0)}deg` : '',
        vsLive !== null && vsLive > 15 ? `live differs ${vsLive.toFixed(0)}deg` : '',
        obs.twisting ? 'twisting' : '',
        frameMoves.length ? `MOVE ${frameMoves.join(' ')}` : '',
        `${ms.toFixed(0)}ms (live ${f.processMs}ms)`,
      ].filter(Boolean).join('  '))

      // debug image: detections on the frame | pixel color labels
      const W = img.width, H = img.height
      const out: Rgba = { data: new Uint8ClampedArray(W * 2 * H * 4), width: W * 2, height: H }
      labelPixels(img.data, lut, labels)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const s = (y * W + x) * 4, d = (y * W * 2 + x) * 4, e = (y * W * 2 + W + x) * 4
          out.data[d] = img.data[s] * 0.7; out.data[d + 1] = img.data[s + 1] * 0.7; out.data[d + 2] = img.data[s + 2] * 0.7; out.data[d + 3] = 255
          const l = labels[y * W + x]
          const c = l === NO_LABEL ? [0, 0, 0] : LABEL_RGB[l]
          out.data[e] = c[0]; out.data[e + 1] = c[1]; out.data[e + 2] = c[2]; out.data[e + 3] = 255
        }
      }
      for (const s of obs.outliers) drawQuad(out, s.quad, [160, 160, 160], 1, true)
      for (const comp of obs.components) {
        for (const a of comp.cells) for (const b of comp.cells) {
          if ((b.gx === a.gx + 1 && b.gy === a.gy) || (b.gy === a.gy + 1 && b.gx === a.gx)) drawLine(out, a.sticker.center.x, a.sticker.center.y, b.sticker.center.x, b.sticker.center.y, [255, 255, 255])
        }
        for (const c of comp.cells) drawQuad(out, c.sticker.quad, hexRgb(COLOR_DISPLAY[c.sticker.color].hex), 2)
      }
      if (f.result.pose) drawCube(out, f.result.pose, k, [255, 0, 255]) // live result
      if (obs.pose) drawCube(out, obs.pose, k, [0, 230, 255]) // replay result
      fs.writeFileSync(`${dir}/debug/${f.file}`, await encodePng(out))
    }

    const pct = (n: number) => `${((100 * n) / Math.max(1, stats.frames)).toFixed(0)}%`
    const summary = [
      `session ${name}${meta.note ? ` (${meta.note})` : ''}: ${stats.frames} frames`,
      `found: replay ${stats.found} (${pct(stats.found)}), live ${stats.liveFound} (${pct(stats.liveFound)})`,
      `frames without any sticker: ${stats.noStickers}, longest lost run: ${stats.longestLost} frames`,
      `orientation jumps > 25deg between frames: raw ${stats.jumps}, smoothed (what the 3D cube follows) ${stats.smoothJumps}`,
      `frames where replay and live differ > 15deg: ${stats.disagree}`,
      `twists detected: ${moves.length ? moves.join(' ') : 'none'}`,
      `analysis time: ${(stats.ms / Math.max(1, stats.frames)).toFixed(1)} ms/frame (node)`,
      'debug/*.png: left = frame (cyan = replay pose, magenta = live pose, colored = stickers in grids, gray dashed = stickers outside grids), right = color labels',
    ]
    fs.writeFileSync(`${dir}/report.txt`, [...summary, '', ...lines].join('\n') + '\n')
    console.log(summary.join('\n'))
  }
  expect(true).toBe(true)
}, 30 * 60 * 1000)
