import cvModule from '@techstark/opencv-js';

let cv: any = null;
let cvReady = false;
let loadPromise: Promise<void> | null = null;

export function isCvReady(): boolean {
  return cvReady;
}

export async function loadOpenCV(): Promise<void> {
  if (cvReady) return;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const checkReady = (module: any) => {
      if (module && typeof module.Mat === 'function') {
        cv = module;
        cvReady = true;
        console.log('OpenCV ready, Mat type:', typeof cv.Mat);
        resolve();
        return true;
      }
      return false;
    };

    if (cvModule instanceof Promise) {
      console.log('cvModule is Promise');
      cvModule.then((module) => {
        if (!checkReady(module)) {
          module.onRuntimeInitialized = () => {
            cv = module;
            cvReady = true;
            resolve();
          };
        }
      }).catch(reject);
      return;
    }

    if (checkReady(cvModule)) return;

    // Handle cvModule being a function
    const module = typeof cvModule === 'function' ? (cvModule as any)() : cvModule;
    console.log('cvModule type:', typeof cvModule, 'result type:', typeof module);
    
    if (checkReady(module)) return;

    module.onRuntimeInitialized = () => {
      cv = module;
      cvReady = true;
      resolve();
    };

    setTimeout(() => {
      if (!cvReady) reject(new Error('OpenCV.js failed to load'));
    }, 30000);
  });

  return loadPromise;
}

export function getCV() {
  return cv;
}

export function matFromImageData(imageData: ImageData): any {
  const cvInstance = getCV();
  if (!cvInstance) throw new Error('OpenCV not initialized');
  
  // Try built-in helper first
  if (typeof cvInstance.matFromImageData === 'function') {
    return cvInstance.matFromImageData(imageData);
  }
  
  // Fallback
  const mat = new cvInstance.Mat(imageData.height, imageData.width, cvInstance.CV_8UC4);
  mat.data.set(imageData.data);
  return mat;
}
