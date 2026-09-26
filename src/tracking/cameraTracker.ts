import { loadTunedColors } from '../cv/colorClassify';
import { getCV, loadOpenCV } from '../cv/opencvLoader';
import type { Color } from '../solver/cube54';
import type { CubePose, FrameObservation, Intrinsics } from './types';
import { TrackingCore, type CoreResult } from './trackingCore';
import type { WorkerIn } from './tracker.worker';

export interface TrackerFrame {
  observation: FrameObservation;
  /** smoothed pose, null when the cube is lost */
  pose: Pick<CubePose, 'rotation' | 'translation'> | null;
  /** the cube was found in this frame */
  tracking: boolean;
  intrinsics: Intrinsics;
  /** frames analysed per second */
  fps: number;
  /** time spent analysing this frame, ms */
  processMs: number;
  /** expected sticker colors used for this frame */
  known: readonly (Color | null)[] | null;
  /** the analysed (downscaled) camera image; only valid during the frame callback */
  image: HTMLCanvasElement;
}


export interface CameraTrackerOptions {
  /** width the frames are analysed at */
  processWidth?: number;
  /** max analysed frames per second */
  maxFps?: number;
  /** expected sticker colors (the virtual cube), read every frame */
  knownState?: () => readonly (Color | null)[] | null;
  /** states one move away from the expected one (move detection), read every frame */
  alternatives?: () => readonly (readonly (Color | null)[])[];
}

/**
 * Webcam -> cube pose. Grabs frames from a <video> (once per new camera frame), and runs the
 * sticker / grid / pose pipeline on a downscaled copy in a web worker; falls back to the main
 * thread when the worker cannot start.
 */
export class CameraTracker {
  readonly video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  /** the frame being analysed, kept for the frame listeners (recorder) */
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private worker: Worker | null = null;
  private core: TrackingCore | null = null; // main thread fallback
  private busy = false;
  private looping = false;
  private lastFrame = 0;
  private pendingKnown: readonly (Color | null)[] | null = null;
  private fpsWindow: number[] = [];
  private listeners = new Set<(frame: TrackerFrame) => void>();
  private readonly o: Required<CameraTrackerOptions>;

  constructor(options: CameraTrackerOptions = {}) {
    this.o = { processWidth: 480, maxFps: 30, knownState: () => null, alternatives: () => [], ...options };
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
  }

  onFrame(listener: (frame: TrackerFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get running() { return this.stream !== null; }
  /** true when the analysis runs in the worker */
  get offMainThread() { return this.worker !== null; }

  async start(deviceId?: string) {
    this.stopStream();
    const streamPromise = navigator.mediaDevices.getUserMedia({
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });
    let stream: MediaStream;
    try {
      [stream] = await Promise.all([
        streamPromise,
        this.worker || this.core ? Promise.resolve() : this.startAnalysis(),
      ]);
    } catch (e) {
      // the camera may have opened while the analysis failed: release it
      streamPromise.then((s) => s.getTracks().forEach((t) => t.stop()), () => {});
      throw e;
    }
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();
    this.post({ type: 'reset' });
    this.core?.reset();
    this.busy = false;
    if (!this.looping) { this.looping = true; this.schedule(); }
  }

  private async startAnalysis() {
    const tuned = loadTunedColors();
    try {
      const worker = new Worker(new URL('./tracker.worker.ts', import.meta.url), { type: 'module' });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('tracker worker timed out')), 60000);
        worker.onmessage = (e) => {
          if (e.data?.type === 'ready') { clearTimeout(timer); resolve(); }
          else if (e.data?.type === 'error') { clearTimeout(timer); reject(new Error(e.data.message)); }
        };
        worker.onerror = (e) => { clearTimeout(timer); reject(new Error(e.message || 'tracker worker failed')); };
        worker.postMessage({ type: 'init', tuned } satisfies WorkerIn);
      });
      worker.onmessage = (e) => this.onWorkerMessage(e.data);
      this.worker = worker;
    } catch (err) {
      console.warn('cube tracking: worker unavailable, analysing on the main thread', err);
      await loadOpenCV();
      this.core = new TrackingCore(getCV(), tuned);
    }
  }

  private post(msg: WorkerIn, transfer: Transferable[] = []) {
    this.worker?.postMessage(msg, transfer);
  }

  /** Re-read the calibrated colors (after tuning them in the scanner). */
  reloadColors() {
    const tuned = loadTunedColors();
    this.post({ type: 'colors', tuned });
    this.core?.setColors(tuned);
  }

  static async cameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  }

  stop() {
    this.cancelScheduled?.();
    this.cancelScheduled = null;
    this.looping = false;
    this.stopStream();
    this.worker?.terminate();
    this.worker = null;
    this.core = null;
    this.busy = false;
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /**
   * Runs once per new camera frame when the browser supports requestVideoFrameCallback,
   * otherwise on animation frames (with some slack, so 60 Hz rendering does not turn a 30 fps
   * limit into every third frame).
   */
  private schedule() {
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (id: number) => void };
    if (v.requestVideoFrameCallback) {
      const id = v.requestVideoFrameCallback(this.loop);
      this.cancelScheduled = () => v.cancelVideoFrameCallback?.(id);
    } else {
      const id = requestAnimationFrame(this.loop);
      this.cancelScheduled = () => cancelAnimationFrame(id);
    }
  }
  private cancelScheduled: (() => void) | null = null;

  private loop = () => {
    if (!this.looping) return; // stopped
    this.schedule();
    const now = performance.now();
    // one frame in flight at a time: a new camera frame waits until the last one is analysed
    if (this.busy || now - this.lastFrame < 1000 / this.o.maxFps - 5) return;
    const { videoWidth, videoHeight } = this.video;
    if (!videoWidth || !videoHeight || !(this.worker || this.core)) return;
    this.lastFrame = now;

    const width = Math.min(this.o.processWidth, videoWidth);
    const height = Math.round((videoHeight / videoWidth) * width);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.drawImage(this.video, 0, 0, width, height);
    const known = this.o.knownState();
    const alternatives = this.o.alternatives();
    this.pendingKnown = known;

    if (this.worker) {
      this.busy = true;
      createImageBitmap(this.canvas).then((bitmap) => {
        this.post({ type: 'frame', bitmap, time: now, known: known ? [...known] : null, alternatives: alternatives.map((a) => [...a]) }, [bitmap]);
      }).catch(() => { this.busy = false; });
      return;
    }
    try {
      const image = this.ctx.getImageData(0, 0, width, height);
      this.emit(this.core!.step(image, known, now, alternatives));
    } catch (err) {
      console.warn('cube tracking frame failed', err);
    }
  };

  private onWorkerMessage(msg: { type: string; message?: string } & Partial<CoreResult>) {
    if (msg.type === 'error') { console.warn('cube tracking frame failed', msg.message); this.busy = false; return; }
    if (msg.type !== 'result') return;
    this.busy = false;
    if (!this.looping) return;
    this.emit(msg as CoreResult);
  }

  private emit(result: CoreResult) {
    const now = performance.now();
    this.fpsWindow.push(now);
    while (this.fpsWindow.length && now - this.fpsWindow[0] > 1000) this.fpsWindow.shift();
    const frame: TrackerFrame = {
      ...result,
      fps: this.fpsWindow.length,
      known: this.pendingKnown,
      image: this.canvas,
    };
    for (const l of this.listeners) l(frame);
  }
}
