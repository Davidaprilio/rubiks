/// <reference lib="webworker" />
import { getCV, loadOpenCV } from '../cv/opencvLoader';
import type { TunedColors } from '../cv/colorClassify';
import type { Color } from '../solver/cube54';
import { TrackingCore } from './trackingCore';

/**
 * Runs the tracking pipeline off the main thread, so analysing a frame (20-30 ms) does not
 * compete with rendering the page.
 *
 * in:  { type: 'init', tuned } | { type: 'colors', tuned } | { type: 'reset' }
 *      { type: 'frame', bitmap, time, known }   (the bitmap is transferred)
 * out: { type: 'ready' } | { type: 'error', message } | { type: 'result', ...CoreResult }
 */
export type WorkerIn =
  | { type: 'init'; tuned: TunedColors }
  | { type: 'colors'; tuned: TunedColors }
  | { type: 'reset' }
  | { type: 'frame'; bitmap: ImageBitmap; time: number; known: (Color | null)[] | null; alternatives?: (Color | null)[][] };

let core: TrackingCore | null = null;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      await loadOpenCV();
      core = new TrackingCore(getCV(), msg.tuned);
      self.postMessage({ type: 'ready' });
    } else if (msg.type === 'colors') {
      core?.setColors(msg.tuned);
    } else if (msg.type === 'reset') {
      core?.reset();
    } else if (msg.type === 'frame') {
      const { bitmap } = msg;
      if (!core) { bitmap.close(); return; }
      if (!canvas || canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
        canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      }
      ctx!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const image = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      const result = core.step(image, msg.known, msg.time, msg.alternatives);
      self.postMessage({ type: 'result', ...result });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
