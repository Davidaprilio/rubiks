import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cube, type TwistNotation } from '../classes/cube';
import { normalizeAlg } from '../solver/cube54';
import { toVirtualCubeState, toVirtualMoves } from '../solver/virtualCube';
import type { AlgCase } from '../solver/cases';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Modal that plays a case's algorithm on a 3D cube: from the case, through every move, a short
 * pause on the result, back to the case, and again, until closed.
 */
export function openAlgModal(c: AlgCase, onPractice: (alg: string) => void) {
  let algIndex = 0;
  let paused = false;
  let closed = false;
  let runId = 0;
  /** the twist being animated: the cube must not be reset in the middle of one */
  let twisting: Promise<unknown> = Promise.resolve();

  const backdrop = el('div', 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4');
  const dialog = el('div', 'bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden');
  const head = el('div', 'flex items-center justify-between px-4 py-3 border-b border-gray-200');
  head.append(el('div', 'font-bold text-gray-900 text-lg', c.name));
  const close = el('button', 'text-gray-500 hover:text-gray-900 text-2xl leading-none cursor-pointer', '×');
  close.title = 'Tutup (Esc)';
  head.append(close);

  const view = el('div', 'relative bg-white h-80 border-b border-gray-200');
  const status = el('div', 'absolute top-2 left-3 text-xs text-gray-600');
  view.append(status);
  view.append(el('div', 'absolute bottom-2 right-3 text-xs text-gray-400', 'Geser untuk memutar pandangan'));

  const body = el('div', 'p-4 flex flex-col gap-3');
  const chips = el('div', 'flex flex-wrap gap-1 min-h-[28px]');
  const algList = el('div', 'flex flex-col gap-1');
  const controls = el('div', 'flex gap-2');
  const pauseBtn = el('button', 'px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-bold text-gray-800 cursor-pointer', 'Pause');
  const tryBtn = el('button', 'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white cursor-pointer', 'Coba di virtual cube ▶');
  controls.append(pauseBtn, tryBtn);
  body.append(chips, algList, controls);
  dialog.append(head, view, body);
  backdrop.append(dialog);
  document.body.append(backdrop);

  // --- 3D ---
  const width = () => view.clientWidth, height = () => view.clientHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(40, width() / height(), 0.1, 100);
  camera.position.set(5.2, 5.6, 8.4);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width(), height());
  view.prepend(renderer.domElement);
  // brighter than the home page (only this scene): strong ambient plus a soft light from the
  // viewer's side, so the stickers look like their real colors on the white background
  scene.add(new THREE.AmbientLight(0xffffff, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 8, 6);
  scene.add(key);
  const controlsOrbit = new OrbitControls(camera, renderer.domElement);
  controlsOrbit.enablePan = false;
  controlsOrbit.enableZoom = false;
  const cube = new Cube();
  scene.add(cube.threeObj);
  renderer.setAnimationLoop(() => { controlsOrbit.update(); renderer.render(scene, camera); });
  const onResize = () => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
  };
  window.addEventListener('resize', onResize);

  const start = toVirtualCubeState(c.state);

  function renderAlgList() {
    algList.replaceChildren();
    c.algorithms.forEach((alg, i) => {
      const row = el('button', `text-left font-mono text-sm px-2 py-1 rounded cursor-pointer ${i === algIndex ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-300' : 'text-gray-600 hover:bg-gray-100'}`, alg);
      row.title = i === algIndex ? 'Rumus yang sedang diputar' : 'Putar rumus ini';
      row.addEventListener('click', () => { if (i !== algIndex) { algIndex = i; renderAlgList(); void loop(); } });
      algList.append(row);
    });
  }

  function renderChips(moves: string[], current: number) {
    chips.replaceChildren(...moves.map((m, i) => el('span',
      `font-mono text-xs px-1.5 py-0.5 rounded ${i < current ? 'bg-green-100 text-green-800' : i === current ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-600'}`, m)));
  }

  const waitWhilePaused = async (id: number) => { while (paused && !closed && id === runId) await sleep(100); };

  /** Case -> moves -> pause -> case ..., restarted when another algorithm is picked. */
  async function loop() {
    const id = ++runId;
    const moves = toVirtualMoves(normalizeAlg(c.algorithms[algIndex]));
    while (!closed && id === runId) {
      await twisting;
      if (closed || id !== runId) return;
      cube.set(start);
      renderChips(moves, -1);
      status.textContent = 'Kondisi awal';
      await sleep(900);
      for (let i = 0; i < moves.length; i++) {
        await waitWhilePaused(id);
        if (closed || id !== runId) return;
        renderChips(moves, i);
        status.textContent = `Langkah ${i + 1} / ${moves.length}: ${moves[i]}`;
        twisting = cube.runNotation([moves[i] as TwistNotation]);
        await twisting;
      }
      renderChips(moves, moves.length);
      status.textContent = 'Selesai';
      await sleep(1400);
      await waitWhilePaused(id);
    }
  }

  function dispose() {
    if (closed) return;
    closed = true;
    runId++;
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    renderer.setAnimationLoop(null);
    controlsOrbit.dispose();
    renderer.dispose();
    backdrop.remove();
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dispose();
    if (e.key === ' ') { e.preventDefault(); pauseBtn.click(); }
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', dispose);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) dispose(); });
  pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? 'Play' : 'Pause'; });
  tryBtn.addEventListener('click', () => { const alg = c.algorithms[algIndex]; dispose(); onPractice(alg); });

  renderAlgList();
  void loop();
  return dispose;
}
