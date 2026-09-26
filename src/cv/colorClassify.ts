import type { RubikColor } from './colorDetector';

/**
 * Sticker color classification against the colors the user calibrated in the scanner
 * (Tune Colors tab). Shared by the scanner and the camera tracker.
 */

export type RGB = { r: number; g: number; b: number };
export type TunedColors = Record<string, RGB>;

export const TUNED_COLORS_KEY = 'rubik-tuned-colors';
export const MIRROR_KEY = 'rubik-mirror';

export const DEFAULT_TUNED: TunedColors = {
  W: { r: 142, g: 151, b: 151 },
  O: { r: 179, g: 4, b: 21 },
  B: { r: 13, g: 36, b: 77 },
  R: { r: 99, g: 14, b: 32 },
  G: { r: 6, g: 129, b: 32 },
  Y: { r: 153, g: 163, b: 47 },
};

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const linearize = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const R = linearize(r), G = linearize(g), B = linearize(b);
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / 0.95047), fy = f(y / 1.0), fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

export function classifyColor(r: number, g: number, b: number, tunedColors: TunedColors): RubikColor {
  const lab = rgbToLab(r, g, b);
  let bestKey: RubikColor = 'W';
  let bestDist = Infinity;
  for (const [key, anchor] of Object.entries(tunedColors)) {
    const d = labDistance(lab, rgbToLab(anchor.r, anchor.g, anchor.b));
    if (d < bestDist) { bestDist = d; bestKey = key as RubikColor; }
  }
  return bestKey;
}

export function loadTunedColors(): TunedColors {
  try {
    const saved = localStorage.getItem(TUNED_COLORS_KEY);
    if (saved) return { ...DEFAULT_TUNED, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_TUNED };
}

export function saveTunedColors(colors: TunedColors) {
  localStorage.setItem(TUNED_COLORS_KEY, JSON.stringify(colors));
}

export function loadMirrorState(): boolean {
  try { return localStorage.getItem(MIRROR_KEY) === 'true'; } catch { return false; }
}

export function saveMirrorState(mirror: boolean) {
  try { localStorage.setItem(MIRROR_KEY, String(mirror)); } catch {}
}

export const POV_KEY = 'rubik-tracking-pov';

/** Camera tracking shows the cube as the person holding it sees it (default on). */
export function loadPovState(): boolean {
  try { return localStorage.getItem(POV_KEY) !== 'false'; } catch { return true; }
}

export function savePovState(pov: boolean) {
  try { localStorage.setItem(POV_KEY, String(pov)); } catch {}
}

// ---------------------------------------------------------------------------
// fast per pixel labelling (camera tracker)
// ---------------------------------------------------------------------------

/** Label order used by the pixel classifier. */
export const PIXEL_LABELS: RubikColor[] = ['W', 'O', 'B', 'R', 'G', 'Y'];
export const NO_LABEL = 255;

/**
 * Lookup table from 5 bit per channel RGB to a PIXEL_LABELS index (or NO_LABEL).
 *
 * Shading changes how bright a sticker looks far more than its hue (half of a face in the shadow
 * of a hand, a face turned away from the light), so lightness counts only `lightnessWeight` as
 * much as the color axes. A pixel gets a label only when it is clearly closer to one calibrated
 * color than to any other; dark neutral pixels (grooves, black plastic, shadows, hair) never do.
 */
export function buildPixelLut(tuned: TunedColors, maxDistance = 40, ambiguity = 0.8, lightnessWeight = 0.35): Uint8Array {
  const anchors = PIXEL_LABELS.map((k) => {
    const c = tuned[k] ?? DEFAULT_TUNED[k];
    return rgbToLab(c.r, c.g, c.b);
  });
  const whiteL = anchors[PIXEL_LABELS.indexOf('W')][0];
  const darkest = Math.min(...anchors.map((a) => a[0]));
  const minL = Math.min(18, 0.7 * darkest);
  // two calibrated colors that differ mostly in lightness (a dim camera: orange ~ bright red)
  // must keep lightness to be told apart
  const abGap = (i: number, j: number) => Math.hypot(anchors[i][1] - anchors[j][1], anchors[i][2] - anchors[j][2]);
  const weight = anchors.map((_, i) => anchors.map((__, j) => (i !== j && abGap(i, j) < 20 ? 1 : lightnessWeight)));
  const dist = (p: [number, number, number], q: [number, number, number], w: number) =>
    Math.sqrt((w * (p[0] - q[0])) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
  const lut = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const lab = rgbToLab(r * 8 + 4, g * 8 + 4, b * 8 + 4);
        const chroma = Math.hypot(lab[1], lab[2]);
        let label = NO_LABEL;
        // too dark to tell, or a dark neutral (gray / black) that is not a lit white sticker
        if (lab[0] >= minL && !(chroma < 14 && lab[0] < 0.62 * whiteL)) {
          const rank = (w: (i: number) => number) => {
            let best = -1, d1 = Infinity, d2 = Infinity;
            anchors.forEach((an, i) => {
              const d = dist(lab, an, w(i));
              if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) { d2 = d; }
            });
            return { best, d1, d2 };
          };
          let res = rank(() => lightnessWeight);
          // runner-up too close in hue: decide these two with lightness included
          const second = anchors.findIndex((an, i) => i !== res.best && Math.abs(dist(lab, an, lightnessWeight) - res.d2) < 1e-9);
          if (second >= 0 && weight[res.best][second] === 1) res = rank(() => 1);
          if (res.d1 < maxDistance && res.d1 < ambiguity * res.d2) label = res.best;
        }
        lut[(r << 10) | (g << 5) | b] = label;
      }
    }
  }
  return lut;
}

/** Label every pixel of RGBA data. */
export function labelPixels(data: Uint8ClampedArray | Uint8Array, lut: Uint8Array, out: Uint8Array) {
  for (let i = 0, p = 0; p < out.length; i += 4, p++) {
    out[p] = lut[((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)];
  }
  return out;
}
