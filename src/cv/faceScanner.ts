import { getCV } from './opencvLoader';
import { detectCellColor, type RubikColor } from './colorDetector';

export interface GridPoint {
  x: number;
  y: number;
}

export interface FaceDetectionResult {
  colors: RubikColor[][];
  gridPoints: GridPoint[][];
  confidence: number;
  detected: boolean;
}

// Generate a 3x3 grid of sample points within a bounding box
export function generateGridPoints(
  centerX: number,
  centerY: number,
  size: number
): GridPoint[][] {
  const cellSize = size / 3;
  const offset = cellSize / 2;
  const startX = centerX - size / 2 + offset;
  const startY = centerY - size / 2 + offset;
  
  const points: GridPoint[][] = [];
  for (let row = 0; row < 3; row++) {
    const rowPoints: GridPoint[] = [];
    for (let col = 0; col < 3; col++) {
      rowPoints.push({
        x: Math.round(startX + col * cellSize),
        y: Math.round(startY + row * cellSize),
      });
    }
    points.push(rowPoints);
  }
  return points;
}

// Detect the largest square contour in the frame
export function detectCubeFace(frame: any): {
  found: boolean;
  center: { x: number; y: number };
  size: number;
  corners: { x: number; y: number }[];
} | null {
  const cv = getCV();
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const hierarchy = new cv.Mat();
  const contours = new cv.MatVector();
  
  cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  cv.Canny(blurred, edges, 50, 150);
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  
  let bestSquare: {
    center: { x: number; y: number };
    size: number;
    area: number;
    corners: { x: number; y: number }[];
  } | null = null;
  
  const minArea = (frame.rows * frame.cols) * 0.02; // Min 2% of frame
  const maxArea = (frame.rows * frame.cols) * 0.6;  // Max 60% of frame
  
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    
    if (area < minArea || area > maxArea) continue;
    
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.04 * peri, true);
    
    if (approx.rows === 4) {
      // Check if it's roughly square
      const rect = cv.boundingRect(approx);
      const aspectRatio = rect.width / rect.height;
      
      if (aspectRatio > 0.7 && aspectRatio < 1.3) {
        const size = Math.max(rect.width, rect.height);
        const center = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
        
        // Extract corners
        const corners: { x: number; y: number }[] = [];
        for (let j = 0; j < 4; j++) {
          corners.push({
            x: approx.intAt(j, 0),
            y: approx.intAt(j, 1),
          });
        }
        
        if (!bestSquare || area > bestSquare.area) {
          bestSquare = { center, size, area, corners };
        }
      }
    }
    approx.delete();
    contour.delete();
  }
  
  gray.delete();
  blurred.delete();
  edges.delete();
  hierarchy.delete();
  contours.delete();
  
  if (bestSquare) {
    return {
      found: true,
      center: bestSquare.center,
      size: bestSquare.size,
      corners: bestSquare.corners,
    };
  }
  
  return null;
}

// Detect colors of a face given grid points
export function detectFaceColorsAtPoints(
  frame: any,
  gridPoints: GridPoint[][]
): RubikColor[][] {
  const cv = getCV();
  const hsv = new cv.Mat();
  cv.cvtColor(frame, hsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
  
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

// Check if two color arrays are the same
export function colorsMatch(a: RubikColor[][], b: RubikColor[][]): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

// Check if a face detection is stable (consistent over multiple frames)
export class StabilityChecker {
  private history: RubikColor[][][] = [];
  private requiredFrames: number;
  
  constructor(requiredFrames: number = 10) {
    this.requiredFrames = requiredFrames;
  }
  
  addDetection(colors: RubikColor[][]): boolean {
    this.history.push(colors);
    if (this.history.length > this.requiredFrames) {
      this.history.shift();
    }
    return this.isStable();
  }
  
  isStable(): boolean {
    if (this.history.length < this.requiredFrames) return false;
    
    const first = this.history[0];
    for (let i = 1; i < this.history.length; i++) {
      if (!colorsMatch(first, this.history[i])) return false;
    }
    return true;
  }
  
  getStableColors(): RubikColor[][] | null {
    if (!this.isStable()) return null;
    return this.history[0];
  }
  
  reset() {
    this.history = [];
  }
}
