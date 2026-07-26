import { getCV } from './opencvLoader';
import { detectCubeFace, type GridPoint } from './faceScanner';

export interface TrackedPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export class ARTracker {
  private position: TrackedPosition = { x: 0, y: 0, width: 0, height: 0, visible: false };
  private smoothedPosition: TrackedPosition = { x: 0, y: 0, width: 0, height: 0, visible: false };
  private smoothingFactor = 0.3; // Lower = more smoothing
  private overlayElement: HTMLElement | null = null;
  private solutionMoves: string[] = [];
  private currentMoveIndex = 0;
  
  constructor() {
    this.overlayElement = document.getElementById('ar-overlay');
  }
  
  update(frame: any): TrackedPosition {
    const detection = detectCubeFace(frame);
    
    if (detection && detection.found) {
      this.position = {
        x: detection.center.x,
        y: detection.center.y,
        width: detection.size,
        height: detection.size,
        visible: true,
      };
    } else {
      this.position.visible = false;
    }
    
    // Smooth the position
    if (this.position.visible) {
      if (!this.smoothedPosition.visible) {
        // First detection, snap to position
        this.smoothedPosition = { ...this.position };
      } else {
        // Exponential moving average
        this.smoothedPosition.x += (this.position.x - this.smoothedPosition.x) * this.smoothingFactor;
        this.smoothedPosition.y += (this.position.y - this.smoothedPosition.y) * this.smoothingFactor;
        this.smoothedPosition.width += (this.position.width - this.smoothedPosition.width) * this.smoothingFactor;
        this.smoothedPosition.height += (this.position.height - this.smoothedPosition.height) * this.smoothingFactor;
      }
      this.smoothedPosition.visible = true;
    } else {
      // Keep last known position for a short time before hiding
      this.smoothedPosition.visible = false;
    }
    
    return this.smoothedPosition;
  }
  
  setSolutionMoves(moves: string[]) {
    this.solutionMoves = moves;
    this.currentMoveIndex = 0;
  }
  
  nextMove() {
    if (this.currentMoveIndex < this.solutionMoves.length - 1) {
      this.currentMoveIndex++;
    }
  }
  
  prevMove() {
    if (this.currentMoveIndex > 0) {
      this.currentMoveIndex--;
    }
  }
  
  getCurrentMove(): string | null {
    if (this.solutionMoves.length === 0) return null;
    return this.solutionMoves[this.currentMoveIndex];
  }
  
  getProgress(): { current: number; total: number } {
    return {
      current: this.currentMoveIndex,
      total: this.solutionMoves.length,
    };
  }
  
  getPosition(): TrackedPosition {
    return this.smoothedPosition;
  }
}

export function createAROverlayUI(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'ar-overlay-container';
  container.className = 'absolute inset-0 z-30 pointer-events-none';
  
  container.innerHTML = `
    <div id="ar-move-indicator" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden">
      <div class="bg-black/70 text-white text-4xl font-bold px-8 py-4 rounded-xl backdrop-blur">
        <span id="ar-current-move">-</span>
      </div>
    </div>
    
    <div id="ar-controls" class="absolute bottom-20 left-0 right-0 flex justify-center gap-4 pointer-events-auto">
      <button id="ar-prev" class="bg-gray-700/80 hover:bg-gray-600 text-white px-4 py-2 rounded-lg backdrop-blur">
        Previous
      </button>
      <button id="ar-next" class="bg-blue-600/80 hover:bg-blue-500 text-white px-4 py-2 rounded-lg backdrop-blur">
        Next Move
      </button>
      <button id="ar-exit" class="bg-red-600/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg backdrop-blur">
        Exit AR
      </button>
    </div>
    
    <div id="ar-progress" class="absolute top-20 left-0 right-0 text-center">
      <div class="inline-block bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur">
        Move <span id="ar-move-current">0</span> / <span id="ar-move-total">0</span>
      </div>
    </div>
  `;
  
  return container;
}

export function updateARMoveUI(move: string | null, current: number, total: number) {
  const moveEl = document.getElementById('ar-current-move');
  const currentEl = document.getElementById('ar-move-current');
  const totalEl = document.getElementById('ar-move-total');
  const indicator = document.getElementById('ar-move-indicator');
  
  if (moveEl) moveEl.textContent = move || '-';
  if (currentEl) currentEl.textContent = String(current);
  if (totalEl) totalEl.textContent = String(total);
  if (indicator) {
    indicator.classList.toggle('hidden', !move);
  }
}
