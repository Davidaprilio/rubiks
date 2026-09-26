import { PIXEL_LABELS, labelPixels } from './colorClassify';
import { quadAxes } from './stickerGrid';
import type { Point, StickerCandidate } from '../tracking/types';
import type { Color } from '../solver/cube54';

export interface RgbaImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface StickerDetectOptions {
  /** min / max sticker area as a fraction of the frame */
  minArea: number;
  maxArea: number;
  /** contour area / convex hull area */
  minSolidity: number;
  /** contour area / fitted quad area */
  minFill: number;
  /** longest / shortest sticker edge (foreshortening) */
  maxAspect: number;
}

export const DEFAULT_STICKER_OPTIONS: StickerDetectOptions = {
  minArea: 0.0006,
  maxArea: 0.3, // a whole face of a stickerless cube is one blob
  minSolidity: 0.85,
  minFill: 0.72,
  maxAspect: 3.2,
};

const quadArea = (q: Point[]) => {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], n = q[(i + 1) % q.length];
    a += p.x * n.y - n.x * p.y;
  }
  return Math.abs(a) / 2;
};

/** Clockwise in image space (y down) starting from the top-left-most corner. */
function orderQuad(points: Point[]): [Point, Point, Point, Point] {
  const cx = points.reduce((s, p) => s + p.x, 0) / 4, cy = points.reduce((s, p) => s + p.y, 0) / 4;
  const sorted = points.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const start = sorted.reduce((bi, p, i) => (p.x + p.y < sorted[bi].x + sorted[bi].y ? i : bi), 0);
  return [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]) as [Point, Point, Point, Point];
}

/**
 * Find square-ish, uniformly colored blobs (stickers) in an RGBA frame.
 * `labels` is an optional reusable buffer of width * height bytes.
 */
export function detectStickers(
  cv: any,
  image: RgbaImage,
  lut: Uint8Array,
  options: Partial<StickerDetectOptions> = {},
  labels: Uint8Array = new Uint8Array(image.width * image.height),
): StickerCandidate[] {
  const o = { ...DEFAULT_STICKER_OPTIONS, ...options };
  const { width, height } = image;
  labelPixels(image.data, lut, labels);
  const frameArea = width * height;
  const minArea = o.minArea * frameArea, maxArea = o.maxArea * frameArea;

  const mask = new cv.Mat(height, width, cv.CV_8UC1);
  const eroded = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const hull = new cv.Mat();
  const approx = new cv.Mat();
  const out: StickerCandidate[] = [];

  try {
    for (let label = 0; label < PIXEL_LABELS.length; label++) {
      const m = mask.data as Uint8Array;
      let any = false;
      for (let i = 0; i < labels.length; i++) {
        const on = labels[i] === label;
        m[i] = on ? 255 : 0;
        any ||= on;
      }
      if (!any) continue;
      // one pixel erosion separates same colored stickers that touch through a thin grid line
      cv.erode(mask, eroded, kernel);
      // CCOMP: the outer boundary of every blob is top level, even a sticker that sits inside a
      // hole of a same colored background (a white sticker in front of a white wall)
      cv.findContours(eroded, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      const tree = hierarchy.data32S as Int32Array;
      for (let c = 0; c < contours.size(); c++) {
        if (tree[c * 4 + 3] !== -1) continue; // a hole, not a blob
        const contour = contours.get(c);
        try {
          const area = cv.contourArea(contour);
          if (area < minArea || area > maxArea) continue;
          cv.convexHull(contour, hull, false, true);
          const hullArea = cv.contourArea(hull);
          if (hullArea <= 0 || area / hullArea < o.minSolidity) continue;

          cv.approxPolyDP(hull, approx, 0.1 * cv.arcLength(hull, true), true);
          let pts: Point[];
          if (approx.rows === 4) {
            pts = [0, 1, 2, 3].map((i) => ({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] }));
          } else {
            const rect = cv.minAreaRect(contour);
            pts = cv.RotatedRect.points(rect).map((p: Point) => ({ x: p.x, y: p.y }));
          }
          const quad = orderQuad(pts);
          const qa = quadArea(quad);
          if (qa <= 0 || area / qa < o.minFill) continue;
          const { u, v } = quadAxes(quad);
          const lu = Math.hypot(u.x, u.y), lv = Math.hypot(v.x, v.y);
          if (Math.max(lu, lv) / Math.max(1e-6, Math.min(lu, lv)) > o.maxAspect) continue;
          const sin = Math.abs(u.x * v.y - u.y * v.x) / (lu * lv);
          if (sin < 0.55) continue; // too skewed to be a sticker

          const center = {
            x: quad.reduce((s, p) => s + p.x, 0) / 4,
            y: quad.reduce((s, p) => s + p.y, 0) / 4,
          };
          out.push({ id: out.length, color: PIXEL_LABELS[label] as Color, center, quad, u, v, area: qa });
        } finally {
          contour.delete();
        }
      }
    }
  } finally {
    mask.delete(); eroded.delete(); kernel.delete(); contours.delete(); hierarchy.delete(); hull.delete(); approx.delete();
  }
  return out;
}

/**
 * Whole single colored faces (stickerless cube): blobs of one color after closing small holes
 * and gaps (grooves, shadows, dark corners), that are close to a quadrilateral.
 * Uses the pixel labels left by detectStickers.
 */
export function detectFaceBlobs(cv: any, labels: Uint8Array, width: number, height: number, minAreaFraction = 0.004): StickerCandidate[] {
  const minArea = minAreaFraction * width * height;
  const mask = new cv.Mat(height, width, cv.CV_8UC1);
  const closed = new cv.Mat();
  const closeKernel = cv.Mat.ones(7, 7, cv.CV_8U);
  const openKernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const hull = new cv.Mat();
  const approx = new cv.Mat();
  const out: StickerCandidate[] = [];
  try {
    for (let label = 0; label < PIXEL_LABELS.length; label++) {
      const m = mask.data as Uint8Array;
      let count = 0;
      for (let i = 0; i < labels.length; i++) {
        const on = labels[i] === label;
        m[i] = on ? 255 : 0;
        if (on) count++;
      }
      if (count < minArea) continue;
      cv.morphologyEx(mask, closed, cv.MORPH_CLOSE, closeKernel);
      cv.morphologyEx(closed, closed, cv.MORPH_OPEN, openKernel);
      cv.findContours(closed, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      const tree = hierarchy.data32S as Int32Array;
      for (let c = 0; c < contours.size(); c++) {
        if (tree[c * 4 + 3] !== -1) continue;
        const contour = contours.get(c);
        try {
          const area = cv.contourArea(contour);
          if (area < minArea || area > 0.5 * width * height) continue;
          cv.convexHull(contour, hull, false, true);
          cv.approxPolyDP(hull, approx, 0.06 * cv.arcLength(hull, true), true);
          if (approx.rows !== 4) continue;
          const pts: Point[] = [0, 1, 2, 3].map((i) => ({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] }));
          const quad = orderQuad(pts);
          const qa = quadArea(quad);
          if (qa <= 0 || area / qa < 0.8) continue;
          const { u, v } = quadAxes(quad);
          const lu = Math.hypot(u.x, u.y), lv = Math.hypot(v.x, v.y);
          if (Math.max(lu, lv) / Math.max(1e-6, Math.min(lu, lv)) > 3.5) continue;
          const center = { x: quad.reduce((s, p) => s + p.x, 0) / 4, y: quad.reduce((s, p) => s + p.y, 0) / 4 };
          out.push({ id: -1 - out.length, color: PIXEL_LABELS[label] as Color, center, quad, u, v, area: qa });
        } finally {
          contour.delete();
        }
      }
    }
  } finally {
    mask.delete(); closed.delete(); closeKernel.delete(); openKernel.delete(); contours.delete(); hierarchy.delete(); hull.delete(); approx.delete();
  }
  return out;
}
