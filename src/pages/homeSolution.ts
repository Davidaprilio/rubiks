import type { Cube, TwistNotation } from '../classes/cube';
import { invertAlg } from '../solver/cube54';
import type { VirtualSession } from '../solver/virtualCube';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const BTN = 'px-3 py-1 rounded text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

/**
 * Player for a solution found by the scanner: shows every step and animates it on the virtual cube.
 * Returns a function that stops playback and removes the panel.
 */
export function mountSolutionPanel(
  host: HTMLElement,
  cube: Cube,
  session: VirtualSession,
  onExit: () => void,
): () => void {
  const total = session.moves.length;
  let index = 0;
  let playing = false;
  let busy = false;
  let disposed = false;

  const panel = el('div', 'absolute top-16 left-1 z-10 w-80 max-h-[calc(100vh-9rem)] overflow-y-auto bg-gray-800/95 text-gray-200 rounded-lg p-3 shadow-lg');
  const header = el('div', 'flex items-center justify-between mb-1');
  header.append(el('div', 'font-bold text-white', `Solution · ${session.method.toUpperCase()}`));
  const exit = el('button', 'text-xs text-gray-400 hover:text-white cursor-pointer', 'Exit');
  header.append(exit);

  const progress = el('div', 'text-sm text-gray-400 mb-2');
  const controls = el('div', 'flex gap-2 mb-3');
  const playBtn = el('button', `${BTN} bg-green-600 hover:bg-green-700`);
  const prevBtn = el('button', `${BTN} bg-blue-600 hover:bg-blue-700`, '← Prev');
  const nextBtn = el('button', `${BTN} bg-blue-600 hover:bg-blue-700`, 'Next →');
  const resetBtn = el('button', `${BTN} bg-gray-600 hover:bg-gray-500`, 'Reset');
  controls.append(prevBtn, playBtn, nextBtn, resetBtn);

  const list = el('div', '');
  const chips: HTMLElement[] = [];
  for (const phase of session.phases) {
    const count = phase.steps.reduce((n, s) => n + (s.to - s.from), 0);
    const block = el('div', 'mb-2');
    const title = el('div', 'text-sm font-bold text-white', phase.name);
    title.append(el('span', 'ml-2 text-xs font-normal text-gray-400', `${count} moves`));
    block.append(title);
    for (const step of phase.steps) {
      if (step.to === step.from && phase.steps.length === 1) {
        block.append(el('div', 'text-xs text-gray-500', step.label));
        continue;
      }
      if (phase.steps.length > 1) block.append(el('div', 'text-xs text-gray-500 mt-1', step.label));
      const row = el('div', 'flex flex-wrap gap-1');
      for (let i = step.from; i < step.to; i++) {
        const chip = el('span', 'font-mono text-xs px-1.5 py-0.5 rounded bg-gray-700', session.moves[i]);
        chips[i] = chip;
        row.append(chip);
      }
      block.append(row);
    }
    list.append(block);
  }

  panel.append(header, progress, controls, list);
  host.append(panel);

  function render() {
    chips.forEach((chip, i) => {
      chip.classList.toggle('bg-green-800', i < index);
      chip.classList.toggle('text-green-200', i < index);
      chip.classList.toggle('bg-yellow-500', i === index);
      chip.classList.toggle('text-black', i === index);
      chip.classList.toggle('bg-gray-700', i > index);
    });
    const finished = index >= total;
    progress.textContent = total === 0 ? 'The cube is already solved.' : finished ? `Done · ${total} / ${total}` : `Move ${index + 1} / ${total}`;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    playBtn.disabled = finished && !playing;
    prevBtn.disabled = index === 0 || playing || busy;
    nextBtn.disabled = finished || playing || busy;
    resetBtn.disabled = busy && !playing;
  }

  async function stepOnce() {
    if (busy || disposed || index >= total) return;
    busy = true;
    render();
    await cube.runNotation([session.moves[index] as TwistNotation]);
    index++;
    busy = false;
    render();
  }

  /** Undo the last move by animating its inverse. */
  async function stepBack() {
    if (busy || disposed || index <= 0) return;
    busy = true;
    render();
    await cube.runNotation(invertAlg([session.moves[index - 1]]) as TwistNotation[]);
    index--;
    busy = false;
    render();
  }

  async function play() {
    playing = true;
    render();
    while (playing && !disposed && index < total) await stepOnce();
    playing = false;
    if (!disposed) render();
  }

  async function reset() {
    playing = false;
    while (busy) await new Promise((r) => setTimeout(r, 50)); // let the running move finish
    if (disposed) return;
    cube.set(session.cube);
    index = 0;
    render();
  }

  playBtn.addEventListener('click', () => { if (playing) { playing = false; render(); } else void play(); });
  prevBtn.addEventListener('click', () => void stepBack());
  nextBtn.addEventListener('click', () => void stepOnce());
  resetBtn.addEventListener('click', () => void reset());
  exit.addEventListener('click', onExit);
  render();

  return () => {
    disposed = true;
    playing = false;
    panel.remove();
  };
}
