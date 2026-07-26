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

async function handleRoute() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const path = getCurrentRoute();
  const handler = routes.get(path);

  if (handler) {
    await handler();
  } else {
    const homeHandler = routes.get('/');
    if (homeHandler) await homeHandler();
  }
}

export function initRouter() {
  window.addEventListener('popstate', handleRoute);
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link && link.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      navigate(link.getAttribute('href')!);
    }
  });
  handleRoute();
}
