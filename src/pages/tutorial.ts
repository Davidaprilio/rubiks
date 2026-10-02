import { algCases, type AlgCase } from '../solver/cases';
import { normalizeAlg } from '../solver/cube54';
import { saveVirtualSession, toVirtualCubeState, toVirtualMoves } from '../solver/virtualCube';
import { f2lView, topView } from '../tutorial/cubeDiagram';
import { openAlgModal } from '../tutorial/algModal';
import { navigate } from '../router';

let cleanupFn: (() => void) | null = null;
/** the open animation modal, closed when leaving the page */
let closeModal: (() => void) | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const F2L_GROUPS: Record<string, { title: string; text: string }> = {
  'both-top': {
    title: 'Corner dan edge di layer atas',
    text: 'Kasus paling sering. Pasangkan corner dan edge di layer atas dulu, lalu masukkan bersama ke slot kanan depan.',
  },
  'edge-in-slot': {
    title: 'Edge sudah di slot, corner di atas',
    text: 'Edge sudah di tempatnya (bisa terbalik). Keluarkan dan pasangkan dengan corner, atau masukkan corner dengan edge tetap di slot.',
  },
  'corner-in-slot': {
    title: 'Corner sudah di slot, edge di atas',
    text: 'Corner sudah di bawah slot (bisa terpelintir). Angkat corner untuk dipasangkan dengan edge-nya.',
  },
  'both-in-slot': {
    title: 'Keduanya di slot tapi salah',
    text: 'Corner dan edge sudah di slot tapi terbalik atau terpelintir. Keluarkan pasangannya lalu masukkan lagi dengan benar.',
  },
};

const PLL_TAGS: Record<string, string> = {
  'edges:3-cycle': 'Hanya edge berputar (3 edge)',
  'edges:swap': 'Hanya edge bertukar',
  'corners:3-cycle': 'Corner berputar (3 corner)',
  'adjacent-swap': 'Tukar corner bersebelahan',
  'diagonal-swap': 'Tukar corner diagonal',
};

/** Open the case on the virtual cube with the algorithm ready to step through. */
function practice(c: AlgCase, alg: string) {
  const moves = toVirtualMoves(normalizeAlg(alg));
  saveVirtualSession({
    method: 'practice',
    title: `${c.name} · latihan`,
    cube: toVirtualCubeState(c.state),
    moves,
    phases: [{ id: c.kind, name: c.name, steps: [{ label: alg, from: 0, to: moves.length }] }],
  });
  navigate('/');
}

function caseCard(c: AlgCase) {
  const card = el('div', 'case-card bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-300 transition');
  card.dataset.search = `${c.name} ${c.algorithms.join(' ')}`.toLowerCase();
  card.title = 'Lihat animasi rumusnya';
  const open = (algIndex: number) => {
    closeModal?.();
    closeModal = openAlgModal(c, (alg) => practice(c, alg), algIndex);
  };
  card.addEventListener('click', () => open(0));
  const pic = el('div', 'flex justify-center');
  pic.innerHTML = c.kind === 'f2l' ? f2lView(c.state) : topView(c.state, c.kind, c.algorithms[0]);
  const title = el('div', 'font-bold text-gray-800', c.name);
  const algs = el('div', 'flex flex-col gap-1');
  c.algorithms.forEach((alg, i) => {
    const row = el('div', 'flex items-start gap-2');
    const text = el('div', `font-mono text-sm flex-1 break-words rounded hover:bg-indigo-50 ${i === 0 ? 'text-gray-900' : 'text-gray-500'}`, alg);
    text.title = 'Lihat animasi rumus ini';
    // this formula, not the first one
    text.addEventListener('click', (e) => { e.stopPropagation(); open(i); });
    const btn = el('button', 'shrink-0 text-xs font-bold px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer', 'Coba ▶');
    btn.title = 'Buka kasus ini di virtual cube dan jalankan rumusnya';
    btn.addEventListener('click', (e) => { e.stopPropagation(); practice(c, alg); });
    row.append(text, btn);
    algs.append(row);
  });
  const setup = el('div', 'text-xs text-gray-500 border-t border-gray-100 pt-2');
  const setupAlg = el('span', 'font-mono text-gray-700 select-all cursor-text', c.setup);
  setupAlg.title = 'Klik untuk memilih, lalu salin';
  // selecting the moves must not open the animation
  setupAlg.addEventListener('click', (e) => e.stopPropagation());
  setup.append('Setup dari solved: ', setupAlg);
  setup.title = 'Putar ini dari kubus solved (kuning di atas, merah di depan) untuk mendapat kasus ini di kubus asli';
  card.append(pic, title, algs, setup);
  return card;
}

function grid(cases: AlgCase[]) {
  const g = el('div', 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]');
  cases.forEach((c) => g.append(caseCard(c)));
  return g;
}

/**
 * Go to a section: scroll there and put its #fragment in the address bar (pushState, so the
 * router does not reload the page; a shared link opens at the same place).
 */
function goTo(id: string, smooth = true) {
  history.pushState(null, '', `#${id}`);
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
}

/** A heading that links to itself (#id), with a # sign on hover. */
function anchoredHeading(tag: 'h2' | 'h3', id: string, text: string, className: string) {
  const h = el(tag, `group ${className}`);
  const a = el('a', 'hover:underline decoration-2 underline-offset-4 cursor-pointer', text);
  a.setAttribute('href', `#${id}`);
  a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(id); });
  const mark = el('span', 'ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity', '#');
  mark.setAttribute('aria-hidden', 'true');
  h.append(a, mark);
  return h;
}

function subsection(id: string, title: string, text?: string) {
  const sub = el('div', 'mb-6 scroll-mt-28');
  sub.id = id;
  sub.append(anchoredHeading('h3', id, title, `text-lg font-bold text-gray-800 ${text ? 'mb-1' : 'mb-2'}`));
  if (text) sub.append(el('p', 'text-sm text-gray-600 mb-3 max-w-3xl', text));
  return sub;
}

function section(id: string, title: string, intro: string[]) {
  const s = el('section', 'scroll-mt-28 mb-10');
  s.id = id;
  s.append(anchoredHeading('h2', id, title, 'text-2xl font-bold text-gray-900 mb-2'));
  intro.forEach((p) => s.append(el('p', 'text-gray-700 mb-2 max-w-3xl', p)));
  return s;
}

function notationTable() {
  const rows: [string, string][] = [
    ['R  U  F  L  D  B', 'Putar sisi Kanan, Atas, Depan, Kiri, Bawah, Belakang 90° searah jarum jam (dilihat dari sisi itu).'],
    ["R'  U'  …", 'Tanda aksen: putar berlawanan arah jarum jam.'],
    ['R2  U2  …', 'Putar 180° (arah bebas).'],
    ['r  u  f  l  d  b', 'Wide: putar dua layer sekaligus (sisi itu + layer tengah di sebelahnya).'],
    ['M  E  S', 'Layer tengah: M searah L, E searah D, S searah F.'],
    ['x  y  z', 'Putar seluruh kubus: x searah R, y searah U, z searah F. Bukan twist, hanya ganti pegangan.'],
    ['( … )  ( … )2', "Kurung hanya pengelompokan supaya mudah dihafal. Angka setelah kurung berarti ulangi isinya: (R U R' U')2 = R U R' U' R U R' U'."],
  ];
  const table = el('div', 'grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 bg-white rounded-xl border border-gray-200 p-4 max-w-3xl');
  for (const [move, text] of rows) {
    table.append(el('div', 'font-mono font-bold text-gray-900 whitespace-pre', move), el('div', 'text-gray-700', text));
  }
  return table;
}

export async function loadTutorialPage() {
  const app = document.getElementById('app')!;
  app.innerHTML = '';
  // light page: the app's global style is dark (white text), which inputs would inherit
  const page = el('div', 'h-screen w-screen bg-gray-100 overflow-auto text-gray-900 [color-scheme:light]');
  page.id = 'tutorial-page';

  const header = el('div', 'bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-4 sticky top-0 z-20');
  const home = el('a', 'text-gray-700 hover:text-gray-900 font-bold text-lg', "Rubik's Solver");
  home.setAttribute('href', '/');
  header.append(home, el('span', 'text-gray-400', '|'), el('span', 'text-gray-600 font-medium', 'Tutorial CFOP'));

  const nav = el('div', 'bg-gray-100/95 backdrop-blur border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-2 sticky top-[45px] z-10');
  const cases = algCases();
  const count = (k: string) => cases.filter((c) => c.kind === k).length;
  const links: [string, string][] = [
    ['notasi', 'Notasi'], ['cross', 'Cross'],
    ['f2l', `F2L (${count('f2l')})`], ['oll', `OLL (${count('oll')})`], ['pll', `PLL (${count('pll')})`],
  ];
  for (const [id, label] of links) {
    const a = el('a', 'px-3 py-1 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-200', label);
    a.setAttribute('href', `#${id}`);
    a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(id); });
    nav.append(a);
  }
  const search = el('input', 'ml-auto bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm w-56 text-gray-900 placeholder:text-gray-400');
  search.type = 'search';
  search.placeholder = 'Cari kasus atau rumus…';
  nav.append(search);

  const main = el('div', 'max-w-6xl mx-auto p-4');

  const intro = section('intro', 'Metode CFOP', [
    'CFOP menyelesaikan rubik dalam 4 tahap: Cross, F2L (First Two Layers), OLL (Orientation of the Last Layer) dan PLL (Permutation of the Last Layer). Semua gambar di halaman ini memakai pegangan yang sama dengan aplikasi: kuning di atas, merah di depan, cross putih di bawah.',
    'Tekan "Coba ▶" pada rumus mana pun untuk membuka kasus itu di virtual cube, lalu jalankan langkah demi langkah dengan Prev / Next.',
  ]);

  const notation = section('notasi', 'Notasi', ['Setiap huruf adalah satu putaran. Pegang kubus tanpa mengubah arah sampai rumus selesai (kecuali ada x, y atau z).']);
  notation.append(notationTable());

  const cross = section('cross', '1. Cross', [
    'Buat tanda plus putih di sisi bawah, dan setiap edge putih harus cocok dengan warna center di sampingnya (putih-merah di depan, putih-hijau di kanan, dan seterusnya).',
    'Cross tidak memakai rumus hafalan: cari edge putih, bawa ke bawah dengan 1-3 putaran tanpa merusak edge yang sudah benar. Cross selalu bisa diselesaikan dalam 8 putaran atau kurang.',
    'Tips: kerjakan cross di bawah sejak awal (bukan di atas lalu dibalik), dan rencanakan seluruh cross sebelum mulai memutar. Solver di aplikasi ini juga memberi contoh cross terpendek untuk kubus hasil scan.',
  ]);

  const f2l = section('f2l', '2. F2L — First Two Layers', [
    'Pasangkan corner putih dengan edge yang warnanya sama, lalu masukkan pasangan itu ke slotnya di antara dua layer bawah. Ulangi untuk 4 slot. Semua kasus di bawah untuk slot kanan depan (putih-merah-hijau); untuk slot lain putar kubus (y) sampai slotnya di kanan depan.',
    'Stiker abu-abu tidak penting untuk kasus itu. Rumus dari kamus diutamakan; kasus yang belum ada di kamus memakai rumus terpendek hasil pencarian komputer.',
  ]);
  for (const [group, info] of Object.entries(F2L_GROUPS)) {
    const list = cases.filter((c) => c.kind === 'f2l' && c.group === group);
    const sub = subsection(`f2l-${group}`, `${info.title} (${list.length})`, info.text);
    sub.append(grid(list));
    f2l.append(sub);
  }

  const oll = section('oll', '3. OLL — Orientation of the Last Layer', [
    'Buat seluruh sisi atas kuning dalam satu rumus. Cocokkan pola kuning (tampak atas; strip di pinggir = stiker kuning yang menghadap ke samping) lalu jalankan rumusnya. Putar U dulu sampai polanya sama persis dengan gambar.',
    'Untuk pemula: cukup hafalkan 2-look OLL (buat tanda plus kuning dulu dengan F R U R\' U\' F\', lalu selesaikan sudut dengan Sune R U R\' U R U2 R\').',
  ]);
  oll.append(grid(cases.filter((c) => c.kind === 'oll')));

  const pll = section('pll', '4. PLL — Permutation of the Last Layer', [
    'Sisi atas sudah kuning semua; sekarang pindahkan potongan layer atas ke tempatnya. Panah menunjukkan ke mana setiap potongan dipindahkan oleh rumus. Setelah rumus mungkin perlu putaran U terakhir.',
  ]);
  const byTag = new Map<string, AlgCase[]>();
  for (const c of cases.filter((x) => x.kind === 'pll')) byTag.set(c.group, [...(byTag.get(c.group) ?? []), c]);
  for (const [tag, list] of byTag) {
    const sub = subsection(`pll-${tag.replace(/[^a-z0-9]+/gi, '-')}`, `${PLL_TAGS[tag] ?? tag} (${list.length})`);
    sub.append(grid(list));
    pll.append(sub);
  }

  const empty = el('div', 'hidden text-center text-gray-500 py-10', 'Tidak ada kasus yang cocok.');
  main.append(intro, notation, cross, f2l, oll, pll, empty);
  page.append(header, nav, main);
  app.append(page);

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    page.querySelectorAll<HTMLElement>('.case-card').forEach((card) => {
      const ok = !q || (card.dataset.search ?? '').includes(q);
      card.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    empty.classList.toggle('hidden', shown > 0);
  });

  // opened with a #fragment (shared link, back / forward): go to that part
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  cleanupFn = () => {
    closeModal?.();
    closeModal = null;
    cleanupFn = null;
  };
}

export function getTutorialCleanup() { return cleanupFn; }
