import './style.css'
import { route, initRouter, setCleanup } from './router';
import { loadHomePage, getHomeCleanup } from './pages/home';

// Define routes
route('/', async () => {
  await loadHomePage();
  setCleanup(getHomeCleanup());
});

route('/scan', async () => {
  // Dynamic import - OpenCV.js only loaded when scan page is accessed
  const { loadScanPage, getScanCleanup } = await import('./pages/scan');
  await loadScanPage();
  setCleanup(getScanCleanup());
});

route('/tutorial', async () => {
  const { loadTutorialPage, getTutorialCleanup } = await import('./pages/tutorial');
  await loadTutorialPage();
  setCleanup(getTutorialCleanup());
});

// Initialize router
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
});

// Global type declarations
declare global {
    interface Window {
        cube: any;
        solver: any;
        removeItem: () => void;
        addItem: (text: string) => void;
    }
}
