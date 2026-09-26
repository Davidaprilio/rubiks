import { loadTunedColors } from '../cv/colorClassify';
import type { CameraTracker, TrackerFrame } from './cameraTracker';

/**
 * Dev tool: saves the frames the tracker analyses (lossless PNG, exactly what the pipeline saw)
 * plus what it found in them into `captures/<session>/` of the project, through the dev server
 * (see the `cube-captures` plugin in vite.config.ts). `npm run replay` runs the pipeline on
 * them again offline and writes a report and debug images next to them.
 */

export interface CaptureFrameMeta {
  file: string;
  time: number;
  intrinsics: TrackerFrame['intrinsics'];
  known: TrackerFrame['known'];
  processMs: number;
  /** what the live tracker found (auto labels, may be wrong) */
  result: {
    pose: TrackerFrame['observation']['pose'];
    smoothed: TrackerFrame['pose'];
    stickers: number;
    components: number[];
    observed: { index: number; color: string }[];
    matchesKnown: boolean | null;
    aligned: TrackerFrame['observation']['aligned'];
  };
}

export interface CaptureSession {
  session: string;
  note: string;
  created: string;
  userAgent: string;
  tunedColors: ReturnType<typeof loadTunedColors>;
  mirror: boolean;
  frames: CaptureFrameMeta[];
}

const upload = async (path: string, body: Blob | string) => {
  const res = await fetch(`/__captures/${path}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`capture upload failed (${res.status}): ${path}`);
};

const toPng = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) =>
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));

export class CaptureRecorder {
  private meta: CaptureSession | null = null;
  private unsubscribe: (() => void) | null = null;
  private pending: Promise<unknown>[] = [];
  private lastSaved = 0;
  private errors = 0;

  /** @param maxFps frames saved per second at most (a PNG frame is ~200-400 KB) */
  constructor(private tracker: CameraTracker, private mirror: () => boolean, private maxFps = 15) {}

  get recording() { return this.meta !== null; }
  get savedFrames() { return this.meta?.frames.length ?? 0; }

  start(note = '') {
    if (this.meta) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    this.meta = {
      session: stamp,
      note,
      created: new Date().toISOString(),
      userAgent: navigator.userAgent,
      tunedColors: loadTunedColors(),
      mirror: this.mirror(),
      frames: [],
    };
    this.errors = 0;
    this.unsubscribe = this.tracker.onFrame((frame) => this.onFrame(frame));
  }

  /** Save one frame right now (outside a recording), e.g. when something looks wrong. */
  snapshot(note = 'snapshot'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.start(note);
      this.lastSaved = -Infinity;
      const off = this.tracker.onFrame(() => {
        off();
        // onFrame of the recorder ran first and queued the frame
        this.stop().then(resolve, reject);
      });
    });
  }

  private onFrame(frame: TrackerFrame) {
    const meta = this.meta;
    if (!meta) return;
    const now = performance.now();
    if (now - this.lastSaved < 1000 / this.maxFps) return;
    this.lastSaved = now;
    const file = `f${String(meta.frames.length).padStart(5, '0')}.png`;
    const o = frame.observation;
    meta.frames.push({
      file,
      time: o.time,
      intrinsics: frame.intrinsics,
      known: frame.known ? [...frame.known] : null,
      processMs: Math.round(frame.processMs * 10) / 10,
      result: {
        pose: o.pose,
        smoothed: frame.pose,
        stickers: o.stickers.length,
        components: o.components.map((c) => c.cells.length),
        observed: o.observed.map((s) => ({ index: s.index, color: s.color })),
        matchesKnown: o.matchesKnown,
        aligned: o.aligned ?? null,
      },
    });
    // toBlob copies the canvas now, the upload can finish later
    this.pending.push(toPng(frame.image).then((png) => upload(`${meta.session}/${file}`, png)).catch((e) => {
      this.errors++;
      console.warn(e);
    }));
  }

  /** Stop and write session.json; resolves to the folder the capture is in. */
  async stop(): Promise<string> {
    const meta = this.meta;
    if (!meta) return '';
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.meta = null;
    await Promise.all(this.pending);
    this.pending = [];
    await upload(`${meta.session}/session.json`, JSON.stringify(meta, null, 1));
    if (this.errors) throw new Error(`${this.errors} frames failed to upload`);
    return `captures/${meta.session}`;
  }
}
