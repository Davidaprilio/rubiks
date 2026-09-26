import { getCV } from './opencvLoader';

export type RubikColor = 'W' | 'O' | 'B' | 'R' | 'G' | 'Y';

export interface ColorRange {
  name: RubikColor;
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
}

// HSV ranges for Rubik's cube colors
// H: 0-180, S: 0-255, V: 0-255 (OpenCV scale)
const COLOR_RANGES: ColorRange[] = [
  { name: 'W', hMin: 0, hMax: 180, sMin: 0, sMax: 40, vMin: 200, vMax: 255 },
  { name: 'Y', hMin: 20, hMax: 35, sMin: 100, sMax: 255, vMin: 150, vMax: 255 },
  { name: 'G', hMin: 35, hMax: 85, sMin: 80, sMax: 255, vMin: 80, vMax: 255 },
  { name: 'B', hMin: 85, hMax: 130, sMin: 80, sMax: 255, vMin: 80, vMax: 255 },
  { name: 'R', hMin: 0, hMax: 10, sMin: 120, sMax: 255, vMin: 100, vMax: 255 },
  { name: 'R', hMin: 170, hMax: 180, sMin: 120, sMax: 255, vMin: 100, vMax: 255 },
  { name: 'O', hMin: 10, hMax: 20, sMin: 120, sMax: 255, vMin: 150, vMax: 255 },
];

export function classifyColor(h: number, s: number, v: number): RubikColor {
  // Handle achromatic (white/gray)
  if (s < 40 && v > 200) return 'W';
  
  // Handle red wrap-around
  if ((h < 10 || h > 170) && s > 120 && v > 100) return 'R';
  
  // Standard hue-based classification
  if (h >= 10 && h < 20 && s > 120) return 'O';
  if (h >= 20 && h < 35 && s > 100) return 'Y';
  if (h >= 35 && h < 85 && s > 80) return 'G';
  if (h >= 85 && h < 130 && s > 80) return 'B';
  
  // Fallback based on saturation and value
  if (v > 200) return 'W';
  if (s < 50) return 'W';
  
  return 'W'; // default
}

export function detectCellColor(
  hsvImage: any,
  cx: number,
  cy: number,
  sampleRadius: number = 5
): RubikColor {
  const cv = getCV();
  const rows = hsvImage.rows;
  const cols = hsvImage.cols;
  
  // Clamp to image bounds
  const x = Math.max(sampleRadius, Math.min(cols - sampleRadius - 1, cx));
  const y = Math.max(sampleRadius, Math.min(rows - sampleRadius - 1, cy));
  
  let hSum = 0, sSum = 0, vSum = 0;
  let count = 0;
  
  // Sample pixels in a small region around the center
  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const pixel = hsvImage.ucharPtr(y + dy, x + dx);
      hSum += pixel[0];
      sSum += pixel[1];
      vSum += pixel[2];
      count++;
    }
  }
  
  const h = hSum / count;
  const s = sSum / count;
  const v = vSum / count;
  
  return classifyColor(h, s, v);
}

export function detectFaceColors(
  frame: any,
  gridPoints: { x: number; y: number }[][]
): RubikColor[][] {
  const cv = getCV();
  const hsv = new cv.Mat();
  cv.cvtColor(frame, hsv, cv.COLOR_RGB2HSV);
  
  const colors: RubikColor[][] = [];
  
  for (let row = 0; row < 3; row++) {
    const colorRow: RubikColor[] = [];
    for (let col = 0; col < 3; col++) {
      const point = gridPoints[row][col];
      const color = detectCellColor(hsv, point.x, point.y);
      colorRow.push(color);
    }
    colors.push(colorRow);
  }
  
  hsv.delete();
  return colors;
}

export const COLOR_DISPLAY: Record<RubikColor, { hex: string; name: string }> = {
  W: { hex: '#FFFFFF', name: 'White' },
  O: { hex: '#ff6600', name: 'Orange' },
  B: { hex: '#0000dd', name: 'Blue' },
  R: { hex: '#ff0000', name: 'Red' },
  G: { hex: '#00aa00', name: 'Green' },
  Y: { hex: '#ffee00', name: 'Yellow' },
};
