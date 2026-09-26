import type { Solution } from '../solver';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const moveCount = (moves: string[]) => moves.filter((m) => !/^[xyz]/.test(m)).length;

/** Render the step by step notation of a solution into `container`. */
export function renderSolution(container: HTMLElement, solution: Solution) {
  container.replaceChildren();

  const total = solution.moves.filter((m) => !/^[xyz]/.test(m)).length;
  const full = solution.moves.join(' ');

  const summary = el('div', 'flex items-center justify-between gap-2 mb-3');
  summary.append(el('div', 'text-sm text-gray-600', total === 0 ? 'The cube is already solved.' : `${total} moves. Hold the cube yellow on top, red in front.`));
  if (total > 0) {
    const copy = el('button', 'text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg', 'Copy');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(full); copy.textContent = 'Copied'; }
      catch { copy.textContent = 'Copy failed'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
    });
    summary.append(copy);
  }
  container.append(summary);

  solution.phases.forEach((phase, i) => {
    const count = phase.steps.reduce((n, s) => n + moveCount(s.moves), 0);
    const block = el('div', 'mb-3 last:mb-0');
    const head = el('div', 'flex items-baseline gap-2');
    head.append(el('span', 'font-bold text-gray-800', `${i + 1}. ${phase.name}`), el('span', 'text-xs text-gray-500', `${count} moves`));
    block.append(head, el('div', 'text-xs text-gray-500 mb-1', phase.description));

    for (const step of phase.steps) {
      const row = el('div', 'bg-gray-100 rounded-lg px-3 py-2 mb-1 last:mb-0');
      if (phase.steps.length > 1 || step.moves.length === 0) row.append(el('div', 'text-xs text-gray-500', step.label));
      if (step.moves.length > 0) row.append(el('div', 'font-mono text-base text-gray-900 break-words', step.moves.join(' ')));
      block.append(row);
    }
    container.append(block);
  });
}

export function renderSolutionMessage(container: HTMLElement, message: string, isError = false) {
  container.replaceChildren(el('div', isError ? 'text-sm text-red-600 font-medium' : 'text-sm text-gray-600', message));
}
