import type { RubikColor } from '../cv/colorDetector';
import { COLOR_DISPLAY } from '../cv/colorDetector';
import { ScanStateManager, type FaceName, FACE_INSTRUCTIONS, FACE_CENTER_COLORS } from '../scan/scanState';
import { updateProgressUI, updateFaceInstruction } from '../scan/scanUI';
import { ScanCube3D } from '../scan/scanCube3D';
import { SOLVE_METHODS, scanToState, type ScannedFaces } from '../solver';
import { buildVirtualSession, saveVirtualSession, type VirtualSession } from '../solver/virtualCube';
import { navigate } from '../router';
import { renderSolution, renderSolutionMessage } from '../scan/solutionUI';
import {
  DEFAULT_TUNED, TUNED_COLORS_KEY, classifyColor, loadMirrorState, loadTunedColors, saveMirrorState, saveTunedColors,
} from '../cv/colorClassify';

let cleanupFn: (() => void) | null = null;

const LS_KEY_CUBE = 'rubik-cube-state';

function sampleRGB(ctx: CanvasRenderingContext2D, cx: number, cy: number, win: number): [number, number, number] {
  const { width, height } = ctx.canvas;
  const x0 = Math.max(0, cx - win), y0 = Math.max(0, cy - win);
  const x1 = Math.min(width - 1, cx + win), y1 = Math.min(height - 1, cy + win);
  const data = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; n++; }
  return [Math.round(r/n), Math.round(g/n), Math.round(b/n)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

const FACE_KEYS: FaceName[] = ['U', 'F', 'R', 'D', 'B', 'L'];

const NET_LAYOUT: (FaceName | null)[][] = [
  ['U', null, null],
  ['F', 'R', null],
  [null, 'D', 'B'],
  [null, null, 'L'],
];

const UI_COLORS: { key: RubikColor; name: string; hex: string }[] = [
  { key: 'W', name: 'White', hex: '#FFFFFF' },
  { key: 'O', name: 'Orange', hex: '#FF5800' },
  { key: 'B', name: 'Blue', hex: '#0046AD' },
  { key: 'R', name: 'Red', hex: '#B71234' },
  { key: 'G', name: 'Green', hex: '#009B48' },
  { key: 'Y', name: 'Yellow', hex: '#FFD500' },
];

function loadCubeState(scanManager: ScanStateManager) {
  try {
    const saved = localStorage.getItem(LS_KEY_CUBE);
    if (saved) scanManager.loadFaceState(JSON.parse(saved));
  } catch {}
}

function saveCubeState(scanManager: ScanStateManager) {
  localStorage.setItem(LS_KEY_CUBE, JSON.stringify(scanManager.exportFaceState()));
}

export async function loadScanPage() {
  const app = document.getElementById('app')!;
  const tunedColors = loadTunedColors();

  app.innerHTML = `
    <div id="scan-app" class="h-screen w-screen bg-gray-100 overflow-auto">
      <div class="bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-4">
        <a href="/" class="text-gray-700 hover:text-gray-900 font-bold text-lg">Rubik's Solver</a>
        <span class="text-gray-400">|</span>
        <span class="text-gray-600 font-medium">Scanner</span>
        <a href="/tutorial" class="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium">Tutorial CFOP</a>
      </div>

      <div class="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

        <!-- Left: Camera -->
        <div class="bg-gray-300 rounded-xl p-3 flex flex-col">
          <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 1">
            <video id="camera-feed" class="w-full h-full object-cover" autoplay playsinline muted></video>

            <!-- Scan mode: 3x3 grid -->
            <div id="scan-overlay" class="absolute pointer-events-none" style="left:10%;top:10%;width:80%;height:80%">
              <div class="cell" style="left:0%;top:0%;width:33.33%;height:33.33%"></div>
              <div class="cell" style="left:33.33%;top:0%;width:33.33%;height:33.33%"></div>
              <div class="cell" style="left:66.66%;top:0%;width:33.34%;height:33.33%"></div>
              <div class="cell" style="left:0%;top:33.33%;width:33.33%;height:33.33%"></div>
              <div class="cell" style="left:33.33%;top:33.33%;width:33.33%;height:33.33%"></div>
              <div class="cell" style="left:66.66%;top:33.33%;width:33.34%;height:33.33%"></div>
              <div class="cell" style="left:0%;top:66.66%;width:33.33%;height:33.34%"></div>
              <div class="cell" style="left:33.33%;top:66.66%;width:33.33%;height:33.34%"></div>
              <div class="cell" style="left:66.66%;top:66.66%;width:33.34%;height:33.34%"></div>
              <div id="dot-0" class="color-dot" style="left:16.66%;top:16.66%"></div>
              <div id="dot-1" class="color-dot" style="left:50%;top:16.66%"></div>
              <div id="dot-2" class="color-dot" style="left:83.33%;top:16.66%"></div>
              <div id="dot-3" class="color-dot" style="left:16.66%;top:50%"></div>
              <div id="dot-4" class="color-dot center" style="left:50%;top:50%"></div>
              <div id="dot-5" class="color-dot" style="left:83.33%;top:50%"></div>
              <div id="dot-6" class="color-dot" style="left:16.66%;top:83.33%"></div>
              <div id="dot-7" class="color-dot" style="left:50%;top:83.33%"></div>
              <div id="dot-8" class="color-dot" style="left:83.33%;top:83.33%"></div>
            </div>

            <!-- Next face guide overlay -->
            <div id="next-guide" class="absolute inset-0 flex items-center justify-center pointer-events-none hidden z-30">
              <div class="bg-black/70 rounded-2xl px-8 py-6 text-center backdrop-blur-sm">
                <div id="guide-arrow" class="text-5xl mb-2">↑</div>
                <div id="guide-face" class="text-white text-3xl font-bold mb-1">L</div>
                <div id="guide-text" class="text-gray-300 text-sm">Putar ke Kiri</div>
              </div>
            </div>

            <!-- Tune mode: single center cell -->
            <div id="tune-overlay" class="absolute pointer-events-none hidden" style="left:25%;top:25%;width:50%;height:50%">
              <div class="cell" style="left:0;top:0;width:100%;height:100%;border-width:3px;border-color:rgba(255,255,255,0.8)"></div>
              <div id="tune-dot" class="color-dot center" style="left:50%;top:50%"></div>
            </div>
          </div>

          <div id="status" class="text-center text-gray-700 font-medium py-2 min-h-[24px]">Initializing camera...</div>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <select id="camera-select" class="hidden bg-white border border-gray-300 rounded px-2 py-1 text-sm max-w-[120px]"></select>
            <label id="mirror-label" class="hidden text-sm text-gray-600 flex items-center gap-1">
              <input type="checkbox" id="mirror-toggle"> Mirror
            </label>
            <div class="flex-1"></div>
            <button id="capture-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2">
              <span id="capture-btn-label">Capture Face</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l2-3h6l2 3"/><rect x="2" y="7" width="20" height="14" rx="3"/><circle cx="12" cy="14" r="4"/></svg>
            </button>
          </div>
        </div>

        <!-- Right: Tabs -->
        <div class="flex flex-col">
          <div class="flex gap-1 px-4">
            <button class="tab" data-panel="tune">Tune Colors</button>
            <button class="tab active" data-panel="scan">Scanning Faces</button>
            <button class="tab" data-panel="edit">Manual Edit</button>
          </div>

          <!-- Tune Panel -->
          <div id="panel-tune" class="panel bg-gray-300 rounded-xl rounded-tl-none p-4 hidden">
            <div class="bg-gray-100 rounded-lg p-3 text-sm text-gray-600 mb-4">
              Select a color below, then hold that sticker in the center of the camera and press <strong>Capture</strong>. Repeat for each color.
            </div>
            <div id="tune-grid" class="grid grid-cols-3 gap-3 mb-4"></div>
            <div id="tune-instructions" class="text-center text-gray-700 font-medium mt-2"></div>
          </div>

          <!-- Scan Panel -->
          <div id="panel-scan" class="panel bg-gray-300 rounded-xl rounded-tl-none p-4">
            <div class="flex items-center justify-between mb-2">
              <div id="scan-face-label" class="text-sm text-gray-600 font-medium">U — Atas (Kuning)</div>
              <button id="toggle-3d-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">3D</button>
            </div>
            <div id="cube-3d-container" class="w-full h-[420px] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"></div>
          </div>

          <!-- Edit Panel -->
          <div id="panel-edit" class="panel bg-gray-300 rounded-xl rounded-tl-none p-4 hidden">
            <div id="cube-net-edit" class="flex flex-col items-center gap-2"></div>
            <div class="text-center text-sm text-gray-500 mt-3">Click any sticker to change its color.</div>
          </div>

          <div id="net-actions" class="flex gap-2 justify-center mt-4">
            <button id="clear-btn" class="bg-white hover:bg-red-100 text-gray-700 font-bold px-4 py-2 rounded-lg border border-gray-300">Clear</button>
            <button id="validate-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg">Validate</button>
            <button id="solution-link" class="hidden bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-6 py-2 rounded-lg">Calculate Solution</button>
            <button id="reset-tone-btn" class="hidden bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg">Reset Color Tone</button>
          </div>
          <div id="validation-warning" class="hidden text-red-600 text-center mt-2 text-sm font-medium"></div>

          <div id="solution-panel" class="hidden mt-4 bg-white rounded-xl border border-gray-300 p-4">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="font-bold text-gray-800">Solution</h2>
              <label class="text-sm text-gray-600 flex items-center gap-2">
                Method
                <select id="solve-method" class="bg-white border border-gray-300 rounded px-2 py-1 text-sm"></select>
              </label>
            </div>
            <div id="solution-body"></div>
            <button id="continue-virtual" class="hidden mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg">Continue to Virtual Cube →</button>
          </div>
        </div>
      </div>
    </div>

    <div id="color-picker" class="hidden fixed bg-white border border-gray-300 rounded-lg p-2 z-50 shadow-lg grid grid-cols-3 gap-2"></div>

    <div id="loading-overlay" class="fixed inset-0 z-40 bg-black/50 flex flex-col items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
      <p class="text-white text-lg">Loading camera...</p>
    </div>

    <style>
      .color-dot {
        position: absolute; width: 28px; height: 28px; margin-left: -14px; margin-top: -14px;
        border-radius: 50%; background: #666;
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 0 2px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4);
        transition: background-color 80ms linear;
      }
      .color-dot.center { width: 36px; height: 36px; margin-left: -18px; margin-top: -18px; }
      .cell { position: absolute; border: 2px dashed rgba(255,255,255,0.5); box-sizing: border-box; }
      .tab {
        display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
        cursor: pointer; font-weight: bold; font-size: 14px; color: #374151;
        background: #d1d5db; border-radius: 8px 8px 0 0;
        border: 1px solid #9ca3af; border-bottom: none;
      }
      .tab.active { background: #9ca3af; color: #111827; }
      .face-cell {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
        background: #000; border-radius: 6px; overflow: hidden;
        border: 2px solid rgba(0,0,0,0.15); cursor: pointer;
        width: 90px; height: 90px;
      }
      .face-cell:hover { box-shadow: 0 0 0 2px #839cb4; }
      .face-cell.selected { box-shadow: 0 0 0 3px #1e40af; }
      .sticker { aspect-ratio: 1; background: #e5e7eb; cursor: pointer; }
      .sticker:hover { outline: 2px solid #839cb4; outline-offset: -2px; }
      .sticker.center {
        cursor: default; display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 13px; color: rgba(0,0,0,0.55);
      }
      .sticker.center:hover { outline: none; }
      #panel-edit .face-cell:hover { box-shadow: none; }
      .tune-card {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 10px; border-radius: 10px; border: 2px solid #9ca3af;
        cursor: pointer; background: #f3f4f6; transition: border-color 150ms, box-shadow 150ms;
      }
      .tune-card.active { border-color: #2563eb; box-shadow: 0 0 0 2px #93c5fd; }
      .tune-card .swatch { width: 40px; height: 40px; border-radius: 8px; border: 2px solid rgba(0,0,0,0.2); }
      .tune-card .cam-color { width: 40px; height: 20px; border-radius: 0 0 8px 8px; border: 2px solid rgba(0,0,0,0.2); border-top: none; }
      .tune-card .label { font-size: 12px; font-weight: bold; color: #374151; }
    </style>
  `;

  // State
  const scanManager = new ScanStateManager();
  loadCubeState(scanManager);
  let currentPanel: 'tune' | 'scan' | 'edit' = 'scan';
  let currentFace: FaceName = scanManager.getCurrentFace() ?? 'U'; // undefined once all faces are scanned
  let selectedTuneColor: RubikColor = 'G';
  let videoStream: MediaStream | null = null;
  let liveLoopId: number | null = null;
  let isMirror = loadMirrorState();
  let guideTimeout: number | null = null;

  // Guide sequence: after scanning each face, show how to rotate to next
  // Sequence: U → F → R → D → B → L
  const GUIDE_SEQUENCE: { from: FaceName; to: FaceName; arrow: string; text: string }[] = [
    { from: 'U', to: 'F', arrow: '↑', text: 'Miringkan ke Atas' },
    { from: 'F', to: 'R', arrow: '→', text: 'Putar ke Kanan' },
    { from: 'R', to: 'D', arrow: '↑', text: 'Miringkan ke Atas' },
    { from: 'D', to: 'B', arrow: '→', text: 'Putar ke Kanan' },
    { from: 'B', to: 'L', arrow: '↑', text: 'Miringkan ke Atas' },
  ];
  let guideIndex = 0;

  // Elements
  const video = document.getElementById('camera-feed') as HTMLVideoElement;
  const scanOverlay = document.getElementById('scan-overlay')!;
  const tuneOverlay = document.getElementById('tune-overlay')!;
  const tuneDot = document.getElementById('tune-dot')!;
  const statusEl = document.getElementById('status')!;
  const captureBtn = document.getElementById('capture-btn')!;
  const captureBtnLabel = document.getElementById('capture-btn-label')!;
  const cameraSelect = document.getElementById('camera-select') as HTMLSelectElement;
  const mirrorToggle = document.getElementById('mirror-toggle') as HTMLInputElement;
  const mirrorLabel = document.getElementById('mirror-label')!;
  const nextGuide = document.getElementById('next-guide')!;
  const guideArrow = document.getElementById('guide-arrow')!;
  const guideFace = document.getElementById('guide-face')!;
  const guideText = document.getElementById('guide-text')!;
  const clearBtn = document.getElementById('clear-btn')!;
  const validateBtn = document.getElementById('validate-btn')!;
  const solutionLink = document.getElementById('solution-link') as HTMLButtonElement;
  const solutionPanel = document.getElementById('solution-panel')!;
  const solutionBody = document.getElementById('solution-body')!;
  const solveMethodSelect = document.getElementById('solve-method') as HTMLSelectElement;
  const continueVirtualBtn = document.getElementById('continue-virtual')!;
  let virtualSession: VirtualSession | null = null;
  const resetToneBtn = document.getElementById('reset-tone-btn')!;
  const validationWarning = document.getElementById('validation-warning')!;
  const colorPicker = document.getElementById('color-picker')!;
  const loadingOverlay = document.getElementById('loading-overlay')!;
  const cubeNetEditContainer = document.getElementById('cube-net-edit')!;
  const tuneGrid = document.getElementById('tune-grid')!;
  const tuneInstructions = document.getElementById('tune-instructions')!;
  const cube3dContainer = document.getElementById('cube-3d-container')!;
  const toggle3dBtn = document.getElementById('toggle-3d-btn')!;
  const scanFaceLabel = document.getElementById('scan-face-label')!;

  const dots: HTMLElement[] = [];
  for (let i = 0; i < 9; i++) dots.push(document.getElementById(`dot-${i}`)!);

  const offscreen = document.createElement('canvas');
  const offctx = offscreen.getContext('2d', { willReadFrequently: true })!;

  // --- Tune Grid ---
  function renderTuneGrid() {
    tuneGrid.innerHTML = '';
    UI_COLORS.forEach(c => {
      const card = document.createElement('div');
      card.className = 'tune-card' + (selectedTuneColor === c.key ? ' active' : '');
      card.dataset.key = c.key;

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = c.hex;
      card.appendChild(swatch);

      // Camera color preview
      const camColor = document.createElement('div');
      camColor.className = 'cam-color';
      const tuned = tunedColors[c.key];
      camColor.style.background = tuned ? rgbToHex(tuned.r, tuned.g, tuned.b) : '#888';
      camColor.id = `tune-cam-${c.key}`;
      card.appendChild(camColor);

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = c.name;
      card.appendChild(label);

      card.addEventListener('click', () => {
        selectedTuneColor = c.key;
        renderTuneGrid();
        updateTuneStatus();
      });

      tuneGrid.appendChild(card);
    });
  }

  function updateTuneStatus() {
    const color = UI_COLORS.find(c => c.key === selectedTuneColor)!;
    tuneInstructions.innerHTML = `Hold <strong style="color:${color.hex}">${color.name}</strong> sticker in the center, then press Capture.`;
  }

  renderTuneGrid();
  updateTuneStatus();

  // --- Cube Net ---
  let cube3d: ScanCube3D | null = null;

  function buildNet() {
    const el = cubeNetEditContainer;
    el.innerHTML = '';
    NET_LAYOUT.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'flex gap-2';
      row.forEach(fk => {
        if (fk) {
          const face = document.createElement('div');
          face.className = 'face-cell';
          face.dataset.face = fk;
          face.id = `net-edit-${fk}`;
          for (let i = 0; i < 9; i++) {
            const tile = document.createElement('div');
            tile.className = i === 4 ? 'sticker center' : 'sticker';
            tile.dataset.index = String(i);
            if (i === 4) { tile.textContent = fk; tile.title = 'Center is fixed for this face'; }
            face.appendChild(tile);
          }
          rowEl.appendChild(face);
        } else {
          const spacer = document.createElement('div');
          spacer.style.cssText = 'width:90px;height:90px';
          rowEl.appendChild(spacer);
        }
      });
      el.appendChild(rowEl);
    });
  }
  buildNet();

  // --- 3D Cube ---
  cube3d = new ScanCube3D(cube3dContainer, (face) => {
    selectFace(face);
  });

  // --- 2D / 3D Toggle ---
  let viewMode: '2d' | '3d' = '2d';
  toggle3dBtn.addEventListener('click', async () => {
    if (cube3d?.isAnimating) return;
    if (viewMode === '2d') {
      viewMode = '3d';
      toggle3dBtn.textContent = '2D';
      await cube3d!.fold();
    } else {
      viewMode = '2d';
      toggle3dBtn.textContent = '3D';
      await cube3d!.unfold();
    }
  });

  function selectFace(face: FaceName) {
    currentFace = face;
    scanManager.setCurrentFace(face);
    document.querySelectorAll('#cube-net-edit .face-cell').forEach(f => {
      f.classList.toggle('selected', f.id === `net-edit-${face}`);
    });
    cube3d?.setSelectedFace(face);
    updateFaceInstruction(face);
    const info = FACE_INSTRUCTIONS[face] || face;
    scanFaceLabel.textContent = `${face} — ${info}`;
  }
  selectFace(currentFace);
  renderFaces();
  { const { scanned } = scanManager.getProgress(); updateProgressUI(scanned, 6); guideIndex = scanned; }

  // --- Next face guide ---
  function showGuide(toFace: FaceName, arrow: string, text: string) {
    if (guideTimeout) clearTimeout(guideTimeout);
    guideArrow.textContent = arrow;
    guideFace.textContent = toFace;
    guideText.textContent = text;
    nextGuide.classList.remove('hidden');
    guideTimeout = window.setTimeout(() => {
      nextGuide.classList.add('hidden');
      guideTimeout = null;
    }, 2500);
  }

  function hideGuide() {
    if (guideTimeout) clearTimeout(guideTimeout);
    nextGuide.classList.add('hidden');
  }

  function renderFaces() {
    FACE_KEYS.forEach(fk => {
      const faceEl = document.getElementById(`net-edit-${fk}`);
      if (!faceEl) return;
      const face = scanManager.getFace(fk);
      faceEl.querySelectorAll('.sticker').forEach((tile, i) => {
        const row = Math.floor(i / 3), col = i % 3;
        const color = face?.colors[row][col];
          (tile as HTMLElement).style.background = color ? COLOR_DISPLAY[color].hex : '#9ca3af';
      });
    });

    if (cube3d) {
      cube3d.updateAllFaces((fk) => {
        const face = scanManager.getFace(fk);
        if (!face || !face.scanned) return null;
        return face.colors as RubikColor[][];
      });
    }
  }

  // --- Tabs ---
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = (tab as HTMLElement).dataset.panel as 'tune' | 'scan' | 'edit';
      currentPanel = panel;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.getElementById('panel-tune')!.classList.toggle('hidden', panel !== 'tune');
      document.getElementById('panel-scan')!.classList.toggle('hidden', panel !== 'scan');
      document.getElementById('panel-edit')!.classList.toggle('hidden', panel !== 'edit');
      scanOverlay.classList.toggle('hidden', panel === 'tune');
      tuneOverlay.classList.toggle('hidden', panel !== 'tune');
      captureBtnLabel.textContent = panel === 'tune' ? 'Capture Color' : 'Capture Face';
      if (panel === 'tune') updateTuneStatus();
      if (panel !== 'scan') hideGuide();

      // Show/hide action buttons based on panel
      clearBtn.classList.toggle('hidden', panel === 'tune');
      validateBtn.classList.toggle('hidden', panel === 'tune');
      solutionLink.classList.toggle('hidden', panel === 'tune');
      validationWarning.classList.toggle('hidden', panel === 'tune');
      resetToneBtn.classList.toggle('hidden', panel !== 'tune');
    });
  });

  // --- Color Picker (Edit) ---
  function showPicker(faceKey: FaceName, index: number, tileEl: HTMLElement) {
    colorPicker.innerHTML = '';
    UI_COLORS.forEach(c => {
      const opt = document.createElement('div');
      opt.className = 'w-8 h-8 rounded cursor-pointer border border-gray-300';
      opt.style.background = c.hex;
      opt.title = c.name;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const face = scanManager.getFace(faceKey)!;
        face.colors[Math.floor(index / 3)][index % 3] = c.key;
        renderFaces(); hidePicker(); validateCube(); saveCubeState(scanManager);
      });
      colorPicker.appendChild(opt);
    });
    colorPicker.classList.remove('hidden');
    const rect = tileEl.getBoundingClientRect();
    colorPicker.style.left = `${rect.right + 8}px`;
    colorPicker.style.top = `${rect.top}px`;
  }
  function hidePicker() { colorPicker.classList.add('hidden'); }
  document.addEventListener('click', (e) => { if (!colorPicker.contains(e.target as Node)) hidePicker(); });

  cubeNetEditContainer.addEventListener('click', (e) => {
    const tile = (e.target as HTMLElement).closest('.sticker') as HTMLElement;
    if (!tile || tile.classList.contains('center')) return; // centers are fixed
    const faceEl = tile.closest('.face-cell') as HTMLElement;
    if (!faceEl) return;
    showPicker(faceEl.dataset.face as FaceName, parseInt(tile.dataset.index!, 10), tile);
  });

  // --- Camera ---
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = videoStream;
    await video.play();

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if (videoDevices.length > 1) {
      cameraSelect.classList.remove('hidden');
      cameraSelect.innerHTML = '';
      videoDevices.forEach((d, i) => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(opt);
      });
      cameraSelect.addEventListener('change', async () => {
        if (videoStream) videoStream.getTracks().forEach(t => t.stop());
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraSelect.value } } });
        video.srcObject = videoStream;
        await video.play();
      });
    }

    mirrorLabel.classList.remove('hidden');
    mirrorToggle.checked = isMirror;
    video.style.transform = isMirror ? 'scaleX(-1)' : 'none';
    mirrorToggle.addEventListener('change', () => {
      isMirror = mirrorToggle.checked;
      saveMirrorState(isMirror);
      video.style.transform = isMirror ? 'scaleX(-1)' : 'none';
    });

    loadingOverlay.classList.add('hidden');
    statusEl.textContent = 'Align your cube and press Capture to record a face.';
  } catch (error) {
    console.error('Camera error:', error);
    loadingOverlay.innerHTML = `
      <div class="bg-white rounded-xl p-8 text-center max-w-md">
        <h2 class="text-xl font-bold mb-2">Camera Access Required</h2>
        <p class="text-gray-600 mb-4">Please allow camera access</p>
        <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Try Again</button>
      </div>`;
  }

  // --- Real-time dots ---
  function drawFrame() {
    if (!video.videoWidth) return;

    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offctx.save();
    if (isMirror) { offctx.translate(offscreen.width, 0); offctx.scale(-1, 1); }
    offctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    offctx.restore();

    const gridSize = Math.min(offscreen.width, offscreen.height) * 0.8;
    const left = (offscreen.width - gridSize) / 2;
    const top = (offscreen.height - gridSize) / 2;
    const cellSize = gridSize / 3;
    const win = Math.max(4, Math.round(cellSize * 0.15));

    // Scan mode: update 9 dots
    if (currentPanel === 'scan' || currentPanel === 'edit') {
      for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3), col = i % 3;
        const cx = Math.round(left + col * cellSize + cellSize / 2);
        const cy = Math.round(top + row * cellSize + cellSize / 2);
        const [r, g, b] = sampleRGB(offctx, cx, cy, win);
        const key = classifyColor(r, g, b, tunedColors);
        dots[i].style.background = COLOR_DISPLAY[key].hex;
      }
    }

    // Tune mode: update single center dot
    if (currentPanel === 'tune') {
      const cx = Math.round(offscreen.width / 2);
      const cy = Math.round(offscreen.height / 2);
      const [r, g, b] = sampleRGB(offctx, cx, cy, win);
      const key = classifyColor(r, g, b, tunedColors);
      tuneDot.style.background = COLOR_DISPLAY[key].hex;
      tuneDot.title = `${key} rgb(${r},${g},${b})`;
    }

    liveLoopId = requestAnimationFrame(drawFrame);
  }
  drawFrame();

  // --- Capture ---
  function capture() {
    if (currentPanel === 'tune') { captureTuneColor(); return; }
    if (!video.videoWidth) return;

    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offctx.save();
    if (isMirror) { offctx.translate(offscreen.width, 0); offctx.scale(-1, 1); }
    offctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    offctx.restore();

    const gridSize = Math.min(offscreen.width, offscreen.height) * 0.8;
    const left = (offscreen.width - gridSize) / 2;
    const top = (offscreen.height - gridSize) / 2;
    const cellSize = gridSize / 3;
    const win = Math.max(4, Math.round(cellSize * 0.15));
    const colors: RubikColor[][] = [[], [], []];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = Math.round(left + col * cellSize + cellSize / 2);
        const cy = Math.round(top + row * cellSize + cellSize / 2);
        const [r, g, b] = sampleRGB(offctx, cx, cy, win);
        colors[row].push(classifyColor(r, g, b, tunedColors));
      }
      if (isMirror) colors[row].reverse();
    }

    const face = scanManager.getCurrentFace();
    const detectedCenter = colors[1][1];
    scanManager.recordFace(colors);
    renderFaces();
    saveCubeState(scanManager);

    const { scanned } = scanManager.getProgress();
    updateProgressUI(scanned, 6);

    if (scanManager.isComplete()) {
      hideGuide();
      statusEl.textContent = 'All faces scanned! Press Validate.';
      validateCube();
    } else {
      // Show guide for next face
      const guide = GUIDE_SEQUENCE[guideIndex];
      if (guide) {
        showGuide(guide.to, guide.arrow, guide.text);
        statusEl.textContent = `Scan ${face} done! Pindah ke ${guide.to}`;
        guideIndex++;
      }
      selectFace(scanManager.getCurrentFace());
    }

    if (detectedCenter !== FACE_CENTER_COLORS[face]) {
      const name = (k: RubikColor) => UI_COLORS.find(c => c.key === k)?.name ?? k;
      statusEl.textContent += ` ⚠ Center read as ${name(detectedCenter)}, but face ${face} must have a ${name(FACE_CENTER_COLORS[face])} center. Check that you're showing the right face.`;
    }
  }

  function captureTuneColor() {
    if (!video.videoWidth) return;

    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offctx.save();
    if (isMirror) { offctx.translate(offscreen.width, 0); offctx.scale(-1, 1); }
    offctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    offctx.restore();

    const cx = Math.round(offscreen.width / 2);
    const cy = Math.round(offscreen.height / 2);
    const [r, g, b] = sampleRGB(offctx, cx, cy, 15);

    tunedColors[selectedTuneColor] = { r, g, b };
    saveTunedColors(tunedColors);

    // Update the camera color preview under the swatch
    const camEl = document.getElementById(`tune-cam-${selectedTuneColor}`);
    if (camEl) camEl.style.background = rgbToHex(r, g, b);

    const color = UI_COLORS.find(c => c.key === selectedTuneColor)!;
    statusEl.textContent = `${color.name} saved! rgb(${r},${g},${b})`;
  }

  captureBtn.addEventListener('click', capture);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); capture(); }
  });

  // --- Clear / Validate ---
  clearBtn.addEventListener('click', () => {
    scanManager.reset(); renderFaces(); selectFace('U'); updateProgressUI(0, 6);
    guideIndex = 0; hideGuide();
    localStorage.removeItem(LS_KEY_CUBE);
    statusEl.textContent = 'Align your cube and press Capture.';
    validationWarning.classList.add('hidden'); solutionLink.classList.add('hidden');
    solutionPanel.classList.add('hidden');
    validateBtn.classList.remove('hidden');
  });

  function validateCube() {
    solutionPanel.classList.add('hidden'); // the cube may have changed since the last solution
    const { scanned } = scanManager.getProgress();
    if (scanned < 6) {
      validationWarning.classList.add('hidden');
      validateBtn.classList.remove('hidden');
      solutionLink.classList.add('hidden');
      return;
    }
    const counts: Record<string, number> = { W: 0, O: 0, B: 0, R: 0, G: 0, Y: 0 };
    FACE_KEYS.forEach(fk => {
      const face = scanManager.getFace(fk);
      if (!face || !face.scanned) return;
      face.colors.forEach(row => row.forEach(c => { if (c && counts[c] !== undefined) counts[c]++; }));
    });
    const issues: string[] = [];
    Object.entries(counts).forEach(([k, v]) => {
      if (v !== 9) {
        const name = UI_COLORS.find(c => c.key === k)?.name || k;
        issues.push(`${v} ${name}`);
      }
    });
    if (issues.length === 0) {
      validationWarning.classList.add('hidden');
      validateBtn.classList.add('hidden');
      solutionLink.classList.remove('hidden');
      return;
    }
    validationWarning.textContent = 'Issues: ' + issues.join(', ');
    validationWarning.classList.remove('hidden');
    solutionLink.classList.add('hidden');
    validateBtn.classList.remove('hidden');
  }
  validateBtn.addEventListener('click', validateCube);

  // --- Solve ---
  SOLVE_METHODS.forEach(m => solveMethodSelect.add(new Option(m.name, m.id)));

  async function calculateSolution() {
    const method = SOLVE_METHODS.find(m => m.id === solveMethodSelect.value) ?? SOLVE_METHODS[0];
    solutionPanel.classList.remove('hidden');
    renderSolutionMessage(solutionBody, `Calculating ${method.name} solution...`);
    continueVirtualBtn.classList.add('hidden');
    virtualSession = null;
    solutionLink.disabled = true;
    // let the browser paint the message, the first solve builds its lookup tables
    await new Promise(resolve => setTimeout(resolve, 30));
    try {
      const faces = {} as ScannedFaces;
      FACE_KEYS.forEach(fk => { faces[fk] = scanManager.getFace(fk)!.colors; });
      const state = scanToState(faces);
      const solution = method.solve(state);
      renderSolution(solutionBody, solution);
      virtualSession = buildVirtualSession(state, solution);
      continueVirtualBtn.classList.remove('hidden');
    } catch (err) {
      renderSolutionMessage(solutionBody, err instanceof Error ? err.message : 'Could not solve this cube.', true);
    } finally {
      solutionLink.disabled = false;
    }
  }
  solutionLink.addEventListener('click', calculateSolution);
  continueVirtualBtn.addEventListener('click', () => {
    if (!virtualSession) return;
    saveVirtualSession(virtualSession);
    navigate('/');
  });
  solveMethodSelect.addEventListener('change', calculateSolution);

  // --- Reset Tone ---
  resetToneBtn.addEventListener('click', () => {
    localStorage.removeItem(TUNED_COLORS_KEY);
    Object.assign(tunedColors, DEFAULT_TUNED);
    renderTuneGrid();
    statusEl.textContent = 'Color tone reset to defaults.';
  });

  // Cleanup
  cleanupFn = () => {
    if (liveLoopId) cancelAnimationFrame(liveLoopId);
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    cube3d?.dispose();
    cleanupFn = null;
  };
}

export function getScanCleanup() { return cleanupFn; }
