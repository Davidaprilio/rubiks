import type { RubikColor } from '../cv/colorDetector';
import { COLOR_DISPLAY } from '../cv/colorDetector';
import type { FaceName } from './scanState';
import { FACE_INSTRUCTIONS, FACE_CENTER_COLORS } from './scanState';

// Create a 3x3 face grid HTML
function createFaceGrid(faceId: string, cellSize: number = 12): string {
  const cells = Array(9).fill(null).map((_, i) => 
    `<div id="${faceId}-${i}" class="rounded-sm" style="width:${cellSize}px;height:${cellSize}px;background:#374151;border:1px solid #4b5563;"></div>`
  ).join('');
  return `<div class="grid grid-cols-3 grid-rows-1 gap-[1px]">${cells}</div>`;
}

export function createScanUI(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'scan-page';
  container.className = 'w-screen h-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden';
  
  container.innerHTML = `
    <div id="scan-header" class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gray-800/80 backdrop-blur">
      <a href="/" class="text-white hover:text-gray-300 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </a>
      <h1 class="text-white text-lg font-semibold">Scan Rubik's Cube</h1>
      <div id="scan-progress" class="text-gray-300 text-sm">0/6 faces</div>
    </div>
    
    <!-- Cube Net Preview - Stair/Tangga Layout -->
    <div id="cube-net-preview" class="absolute top-16 left-4 z-20 opacity-90">
      <div class="flex flex-col items-center gap-[2px]">
        <!-- Row 1: U face -->
        <div class="flex items-center">
          <div class="w-16"></div>
          <div id="net-U" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-U', 10)}
            ${createFaceGrid('net-U', 10)}
            ${createFaceGrid('net-U', 10)}
          </div>
          <div class="w-16"></div>
        </div>
        
        <!-- Row 2: L, F, R, B faces -->
        <div class="flex items-center gap-[2px]">
          <div id="net-L" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-L', 10)}
            ${createFaceGrid('net-L', 10)}
            ${createFaceGrid('net-L', 10)}
          </div>
          <div id="net-F" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-F', 10)}
            ${createFaceGrid('net-F', 10)}
            ${createFaceGrid('net-F', 10)}
          </div>
          <div id="net-R" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-R', 10)}
            ${createFaceGrid('net-R', 10)}
            ${createFaceGrid('net-R', 10)}
          </div>
          <div id="net-B" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-B', 10)}
            ${createFaceGrid('net-B', 10)}
            ${createFaceGrid('net-B', 10)}
          </div>
        </div>
        
        <!-- Row 3: D face -->
        <div class="flex items-center">
          <div class="w-16"></div>
          <div id="net-D" class="flex flex-col gap-[1px]">
            ${createFaceGrid('net-D', 10)}
            ${createFaceGrid('net-D', 10)}
            ${createFaceGrid('net-D', 10)}
          </div>
          <div class="w-16"></div>
        </div>
      </div>
    </div>
    
    <div id="camera-container" class="relative w-full h-full flex items-center justify-center">
      <video id="camera-feed" class="absolute inset-0 w-full h-full object-cover" autoplay playsinline></video>
      <canvas id="detection-canvas" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
      
      <div id="scan-overlay" class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div id="guide-frame" class="relative" style="width: 240px; height: 240px;">
          <!-- 3x3 grid overlay -->
          <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1">
            ${Array(9).fill('<div class="border-2 border-white/50 rounded-sm"></div>').join('')}
          </div>
          <!-- Corner markers -->
          <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white"></div>
          <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white"></div>
          <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white"></div>
          <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white"></div>
        </div>
      </div>
    </div>
    
    <div id="scan-controls" class="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gray-800/80 backdrop-blur">
      <div id="face-instruction" class="text-white text-center text-lg mb-3">
        Show the UP face (Yellow center)
      </div>
      <div id="detected-colors" class="flex justify-center mb-4">
        <div class="grid grid-cols-3 gap-1">
          ${Array(9).fill('<div class="w-10 h-10 rounded border-2 border-gray-600 bg-gray-700"></div>').join('')}
        </div>
      </div>
      <div class="flex justify-center gap-4">
        <button id="btn-capture" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
          Capture Face
        </button>
        <button id="btn-skip" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors">
          Skip
        </button>
        <button id="btn-reset" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
          Reset
        </button>
      </div>
    </div>
    
    <div id="loading-overlay" class="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
      <p class="text-white text-lg">Loading camera...</p>
    </div>
    
    <div id="completion-overlay" class="absolute inset-0 z-50 bg-gray-900/90 flex flex-col items-center justify-center hidden">
      <div class="text-center">
        <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <h2 class="text-white text-2xl font-bold mb-2">Scan Complete!</h2>
        <p class="text-gray-300 mb-6">All 6 faces have been scanned</p>
        <div class="flex gap-4 justify-center">
          <button id="btn-view-3d" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
            View 3D Cube
          </button>
          <button id="btn-start-ar" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors">
            Start AR Tracking
          </button>
        </div>
      </div>
    </div>
  `;
  
  return container;
}

export function updateProgressUI(scanned: number, total: number) {
  const progress = document.getElementById('scan-progress');
  if (progress) {
    progress.textContent = `${scanned}/${total} faces`;
  }
}

export function updateFaceInstruction(face: FaceName) {
  const instruction = document.getElementById('face-instruction');
  if (instruction) {
    instruction.textContent = FACE_INSTRUCTIONS[face];
  }
}

export function updateDetectedColorsUI(colors: RubikColor[][]) {
  const container = document.getElementById('detected-colors');
  if (!container) return;
  
  const cells = container.querySelectorAll('.rounded');
  let idx = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[idx] as HTMLElement;
      const color = colors[row][col];
      cell.style.backgroundColor = COLOR_DISPLAY[color].hex;
      cell.style.borderColor = COLOR_DISPLAY[color].hex;
      idx++;
    }
  }
}

// Update the cube net preview with a face's colors
export function updateCubeNetFace(face: FaceName, colors: RubikColor[][]) {
  const netFace = document.getElementById(`net-${face}`);
  if (!netFace) return;
  
  const cells = netFace.querySelectorAll('[id^="net-"]');
  let idx = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[idx] as HTMLElement;
      if (cell) {
        const color = colors[row][col];
        cell.style.backgroundColor = COLOR_DISPLAY[color].hex;
        cell.style.borderColor = 'rgba(0,0,0,0.3)';
      }
      idx++;
    }
  }
}

export function setCaptureEnabled(enabled: boolean) {
  const btn = document.getElementById('btn-capture') as HTMLButtonElement;
  if (btn) {
    btn.disabled = !enabled;
  }
}

export function showLoading(show: boolean) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

export function showCompletion(show: boolean) {
  const overlay = document.getElementById('completion-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

export function getVideoElement(): HTMLVideoElement | null {
  return document.getElementById('camera-feed') as HTMLVideoElement;
}

export function getCanvasElement(): HTMLCanvasElement | null {
  return document.getElementById('detection-canvas') as HTMLCanvasElement;
}

export function getGuideFrameRect(): DOMRect | null {
  const frame = document.getElementById('guide-frame');
  return frame ? frame.getBoundingClientRect() : null;
}
