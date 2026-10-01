type Cleanup = (() => void) | null | void;
/** renders the page and returns what undoes it */
export type RouteHandler = () => Cleanup | Promise<Cleanup>;

const routes = new Map<string, RouteHandler>();
let currentCleanup: (() => void) | null = null;

export function route(path: string, handler: RouteHandler) {
  routes.set(path, handler);
}

/** where the app is served from without the trailing slash: '' locally, '/rubiks' on GitHub Pages */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Address of an app route (e.g. '/scan') under the base the app is served from. */
export function url(path: string): string {
  return BASE + path;
}

/** The app route of an address under the base, or null when it is outside the app. */
function toRoute(pathname: string): string | null {
  if (!BASE) return pathname;
  if (pathname === BASE) return '/';
  return pathname.startsWith(BASE + '/') ? pathname.slice(BASE.length) : null;
}

export function navigate(path: string) {
  history.pushState(null, '', url(path));
  handleRoute();
}

export function getCurrentRoute(): string {
  return toRoute(location.pathname) ?? '/';
}

let shownPath: string | null = null;
/** bumped on every navigation, a handler that finishes after a newer one started is stale */
let navigation = 0;

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
  const handler = routes.get(path) ?? routes.get('/');
  const current = ++navigation;

  const cleanup = await handler?.();
  if (current !== navigation) {
    // navigated away while the handler was still loading: undo what it set up
    cleanup?.();
    return;
  }
  currentCleanup = cleanup ?? null;
}

export function initRouter() {
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href');
    const path = href?.startsWith('/') ? toRoute(href) : null;
    if (path !== null) {
      e.preventDefault();
      navigate(path);
    }
  });
  handleRoute();
}
