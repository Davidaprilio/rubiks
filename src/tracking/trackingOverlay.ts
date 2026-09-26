import { COLOR_DISPLAY } from '../cv/colorDetector';
import { project, mat3Vec } from '../cv/cubePose';
import type { Vec3 } from '../solver/cube54';
import { CameraTracker, type TrackerFrame } from './cameraTracker';
import { CaptureRecorder } from './captureRecorder';
import type { Point } from './types';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const CORNERS: Vec3[] = [];
for (const x of [-1.5, 1.5]) for (const y of [-1.5, 1.5]) for (const z of [-1.5, 1.5]) CORNERS.push([x, y, z]);
// cube edges: corner pairs that differ in exactly one coordinate
const EDGES: [number, number][] = [];
for (let a = 0; a < 8; a++) {
  for (let b = a + 1; b < 8; b++) {
    if (CORNERS[a].filter((v, i) => v !== CORNERS[b][i]).length === 1) EDGES.push([a, b]);
  }
}
// axis of every face drawn from the center, in its center color
const AXES: { dir: Vec3; color: string }[] = [
  { dir: [0, 2.4, 0], color: COLOR_DISPLAY.Y.hex },
  { dir: [2.4, 0, 0], color: COLOR_DISPLAY.G.hex },
  { dir: [0, 0, 2.4], color: COLOR_DISPLAY.R.hex },
];

export interface TrackingOverlayOptions {
  mirror: boolean;
  onMirrorChange: (mirror: boolean) => void;
  /** show the cube as the person holding it sees it (the side facing away from the camera) */
  pov: boolean;
  onPovChange: (pov: boolean) => void;
  onClose: () => void;
  /** reset the virtual cube to solved (to match a solved physical cube) */
  onResetSolved?: () => void;
  /** show the dev recorder button */
  dev?: boolean;
}

/**
 * Picture in picture camera preview with the detected stickers, the face grids and the
 * estimated cube (skeleton) drawn on top.
 */
export function mountTrackingOverlay(host: HTMLElement, tracker: CameraTracker, options: TrackingOverlayOptions) {
  let mirror = options.mirror;

  const panel = el('div', 'absolute top-16 right-4 z-10 w-80 bg-gray-800/95 text-gray-200 rounded-lg p-2 shadow-lg');
  const view = el('div', 'relative w-full rounded overflow-hidden bg-black');
  const video = tracker.video;
  video.className = 'block w-full h-auto';
  const canvas = el('canvas', 'absolute inset-0 w-full h-full pointer-events-none');
  view.append(video, canvas);

  const status = el('div', 'flex items-center gap-2 text-xs mt-2');
  const dot = el('span', 'inline-block w-2 h-2 rounded-full bg-gray-500');
  const statusText = el('span', '', 'Starting camera...');
  const fpsText = el('span', 'ml-auto text-gray-500');
  status.append(dot, statusText, fpsText);
  const hint = el('div', 'text-xs text-amber-300 mt-1 hidden');
  const captureInfo = el('div', 'text-xs text-sky-300 mt-1 hidden break-all');
  const moveStatus = el('div', 'text-xs mt-1 min-h-[1rem] text-gray-400', 'Twist detection: ready');

  const controls = el('div', 'flex flex-wrap items-center gap-2 mt-2 text-xs');
  const mirrorLabel = el('label', 'flex items-center gap-1 cursor-pointer');
  const mirrorBox = el('input', '');
  mirrorBox.type = 'checkbox';
  mirrorBox.checked = mirror;
  mirrorLabel.append(mirrorBox, 'Mirror');
  mirrorLabel.title = 'Mirror the camera preview';
  const povLabel = el('label', 'flex items-center gap-1 cursor-pointer');
  const povBox = el('input', '');
  povBox.type = 'checkbox';
  povBox.checked = options.pov;
  povLabel.append(povBox, 'My view');
  povLabel.title = 'Show the cube as you see it while holding it (the side facing you, not the camera)';
  const cameraSelect = el('select', 'hidden bg-gray-700 rounded px-1 py-0.5 max-w-[120px]');
  const spacer = el('div', 'flex-1');
  const recBtn = el('button', 'hidden px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer', '● Rec');
  const solvedBtn = el('button', 'px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer', 'Solved');
  solvedBtn.title = 'Reset the virtual cube to solved, to match a solved physical cube';
  if (options.onResetSolved) solvedBtn.addEventListener('click', options.onResetSolved);
  else solvedBtn.classList.add('hidden');
  const closeBtn = el('button', 'px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white cursor-pointer', 'Stop');
  controls.append(povLabel, mirrorLabel, cameraSelect, spacer, recBtn, solvedBtn, closeBtn);

  // the changing lines (status, tips, capture info) go under the buttons so the buttons stay put
  panel.append(view, controls, status, moveStatus, hint, captureInfo);
  host.append(panel);

  const applyMirror = () => { view.style.transform = mirror ? 'scaleX(-1)' : 'none'; };
  applyMirror();
  mirrorBox.addEventListener('change', () => { mirror = mirrorBox.checked; applyMirror(); options.onMirrorChange(mirror); });
  povBox.addEventListener('change', () => options.onPovChange(povBox.checked));
  closeBtn.addEventListener('click', options.onClose);

  void CameraTracker.cameras().then((cams) => {
    if (cams.length < 2) return;
    cameraSelect.classList.remove('hidden');
    cams.forEach((c, i) => cameraSelect.add(new Option(c.label || `Camera ${i + 1}`, c.deviceId)));
    const current = (tracker.video.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId;
    if (current) cameraSelect.value = current;
    cameraSelect.addEventListener('change', () => void tracker.start(cameraSelect.value));
  }).catch(() => {});

  let recorder: CaptureRecorder | null = null;
  let recTimer: number | null = null;
  if (options.dev) {
    // dev only: frames are written into the project by the dev server (captures/<session>)
    const rec = recorder = new CaptureRecorder(tracker, () => mirror);
    const snapBtn = el('button', 'px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer', '📷');
    snapBtn.title = 'Save this frame to captures/';
    recBtn.before(snapBtn);
    recBtn.classList.remove('hidden');
    recBtn.title = 'Record frames to captures/ (for replay and tuning)';
    const report = (text: string) => { captureInfo.textContent = text; captureInfo.classList.remove('hidden'); };
    const saved = (dir: string) => report(`Saved to ${dir}`);
    const failed = (e: unknown) => report(`Capture failed: ${e instanceof Error ? e.message : e} (needs npm run dev)`);
    snapBtn.addEventListener('click', () => { if (!rec.recording) rec.snapshot().then(saved, failed); });
    recBtn.addEventListener('click', () => {
      if (!rec.recording) {
        rec.start();
        recBtn.textContent = '■ Stop rec';
        recBtn.classList.add('bg-red-700');
        recTimer = window.setInterval(() => report(`Recording... ${rec.savedFrames} frames`), 250);
        return;
      }
      if (recTimer) clearInterval(recTimer);
      recBtn.textContent = '● Rec';
      recBtn.classList.remove('bg-red-700');
      report('Saving...');
      rec.stop().then(saved, failed);
    });
  }

  const ctx = canvas.getContext('2d')!;

  function draw(frame: TrackerFrame) {
    const { observation: obs, intrinsics: k } = frame;
    if (canvas.width !== k.width || canvas.height !== k.height) { canvas.width = k.width; canvas.height = k.height; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const line = (a: Point, b: Point) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    const quad = (q: Point[]) => { ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };

    // stickers that fit no grid
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    for (const s of obs.outliers) { quad(s.quad); ctx.stroke(); }
    ctx.setLineDash([]);

    // face grids: sticker outlines in their color and the lattice between neighbours
    for (const comp of obs.components) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      for (const a of comp.cells) {
        for (const b of comp.cells) {
          if ((b.gx === a.gx + 1 && b.gy === a.gy) || (b.gy === a.gy + 1 && b.gx === a.gx)) line(a.sticker.center, b.sticker.center);
        }
      }
      ctx.lineWidth = 2;
      for (const c of comp.cells) {
        ctx.strokeStyle = COLOR_DISPLAY[c.sticker.color].hex;
        quad(c.sticker.quad);
        ctx.stroke();
      }
    }

    // skeleton of the estimated cube
    if (frame.pose) {
      const pose = frame.pose;
      ctx.lineWidth = 2;
      ctx.strokeStyle = frame.tracking ? '#22d3ee' : 'rgba(34,211,238,0.4)';
      const pts = CORNERS.map((c) => project(pose, k, c));
      for (const [a, b] of EDGES) {
        // hidden edges dashed: an edge is hidden when both its corners are behind the cube center
        const center = pose.translation[2];
        const depth = (i: number) => mat3Vec(pose.rotation, CORNERS[i])[2] + pose.translation[2];
        ctx.setLineDash(depth(a) > center && depth(b) > center ? [4, 4] : []);
        line(pts[a], pts[b]);
      }
      ctx.setLineDash([]);
      const origin = project(pose, k, [0, 0, 0]);
      ctx.lineWidth = 3;
      for (const axis of AXES) {
        ctx.strokeStyle = axis.color;
        line(origin, project(pose, k, axis.dir));
      }
    }

    // status
    const found = !!obs.pose;
    dot.className = `inline-block w-2 h-2 rounded-full ${found ? 'bg-green-400' : frame.pose ? 'bg-yellow-400' : 'bg-red-500'}`;
    statusText.textContent = found
      ? `Tracking · ${obs.observed.length} stickers`
      : frame.pose ? 'Holding last pose...' : obs.stickers.length ? 'Searching for the cube...' : 'No stickers found';
    fpsText.textContent = `${frame.fps} fps · ${frame.processMs.toFixed(0)} ms`;
    if (obs.matchesKnown === false) {
      hint.textContent = 'The colors differ from the virtual cube, orientation comes from the centers only.';
      hint.classList.remove('hidden');
    } else if (!found && obs.stickers.length === 0) {
      hint.textContent = 'Tip: calibrate the colors in Scan Cube → Tune Colors, and use good light.';
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
  }

  const unsubscribe = tracker.onFrame(draw);
  return {
    setStatus(text: string) { statusText.textContent = text; },
    setMoveStatus(text: string, tone: 'ok' | 'busy' | 'warn') {
      moveStatus.textContent = text;
      moveStatus.className = `text-xs mt-1 min-h-[1rem] ${tone === 'ok' ? 'text-green-300' : tone === 'warn' ? 'text-amber-300' : 'text-gray-400'}`;
    },
    dispose() {
      unsubscribe();
      if (recTimer) clearInterval(recTimer);
      // closed while recording: still write session.json so the frames can be replayed
      if (recorder?.recording) recorder.stop().catch((e) => console.warn(e));
      panel.remove();
    },
  };
}
