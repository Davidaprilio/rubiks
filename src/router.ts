export type RouteHandler = () => void | Promise<void>;

const routes = new Map<string, RouteHandler>();
let currentCleanup: (() => void) | null = null;

export function route(path: string, handler: RouteHandler) {
  routes.set(path, handler);
}

export function navigate(path: string) {
  history.pushState(null, '', path);
  handleRoute();
}

export function getCurrentRoute(): string {
  return location.pathname;
}

export function setCleanup(fn: (() => void) | null) {
  currentCleanup = fn;
}

let shownPath: string | null = null;

/** Back / forward between #fragments of the page already shown: just scroll there. */
function onPopState() {
  if (getCurrentRoute() === shownPath) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else document.getElementById('app')?.firstElementChild?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  void handleRoute();
}

async function handleRoute() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const path = getCurrentRoute();
  shownPath = path;
  const handler = routes.get(path);

  if (handler) {
    await handler();
  } else {
    const homeHandler = routes.get('/');
    if (homeHandler) await homeHandler();
  }
}

export function initRouter() {
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link && link.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      navigate(link.getAttribute('href')!);
    }
  });
  handleRoute();
}
