import '../utils/number'
import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { Cube } from '../classes/cube';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { CFOP } from '../classes/solvers/cfop';
import { sleep } from '../utils/utils';
import { createLayout } from 'animejs';
import { navigate } from '../router';
import { clearVirtualSession, loadVirtualSession } from '../solver/virtualCube';
import { mountSolutionPanel, type SolutionPanel } from './homeSolution';
import { setupHomeTracking } from './homeTracking';

const isDev = import.meta.env.DEV;

function setupThree(container: HTMLElement) {
  const scene = new THREE.Scene()

  const 
  FIELD_OF_VIEW = 45,
  WIDTH         = container.clientWidth,
  HEIGHT        = container.clientHeight,
  ASPECT_RATIO  = WIDTH / HEIGHT,
  NEAR          = 0.1,
  FAR           = 1000

  const camera = new THREE.PerspectiveCamera( FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR )
  camera.position.z = 10
  camera.lookAt( scene.position )
  scene.add( camera )

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  container.appendChild( renderer.domElement )

  return { scene, camera, renderer }
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

let cleanupFn: (() => void) | null = null;

export async function loadHomePage() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="home-container" class="relative w-screen h-screen">
      <div id="panel" class="absolute bottom-0 left-0 right-0 w-full py-2 block z-10">
        <div id="notation" class="text-center">
          <template id="notation-option">
            <button class="text-gray-400 px-4 mx-4 my-1 rounded border bg-gray-700 cursor-pointer active:scale-95"></button>
          </template>
        </div>
      </div>
      <div class="absolute top-0 left-0 mt-1 ml-1 z-10">
        <div class="flex overflow-hidden max-w-xl gap-x-2 layout-container"></div>
      </div>
      <div class="absolute top-4 right-4 z-10 flex gap-2">
        <button id="tracking-btn" class="text-white px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-60">Camera Tracking</button>
        <a href="/tutorial" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">
          Tutorial
        </a>
        <a href="/scan" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
          Scan Cube
        </a>
      </div>
    </div>
  `;

  const container = document.getElementById('home-container')!;
  const { scene, camera, renderer } = setupThree(container)
  
  let animateDev = () => {} 
  let stats: any = null;

  if (isDev) {
    stats = new Stats();
    document.body.appendChild( stats.dom );

    animateDev = () => {
      stats.update();
    }

    const axesHelper = new THREE.AxesHelper(8);
    scene.add( axesHelper );
  }

  const trackballControl = new TrackballControls( camera, renderer.domElement );
  trackballControl.rotateSpeed = 5;

  const c = new Cube()
  scene.add( c.threeObj )
  window.cube = c

  const light = new THREE.AmbientLight( 0xffffff, 0.5 )
  light.position.set( 0, 8, 1 )
  scene.add( light )

  const animate: XRFrameRequestCallback = () => {
    animateDev();
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    trackballControl.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

  let solutionPanel: SolutionPanel | null = null
  // declared before the first await so cleanup can always call it
  const stopTracking = setupHomeTracking({
    host: container,
    button: document.getElementById('tracking-btn') as HTMLButtonElement,
    cube: c,
    camera,
    controls: trackballControl,
    solution: () => solutionPanel,
  })

  const disposeScene = () => {
    stopTracking();
    solutionPanel?.dispose();
    renderer.setAnimationLoop(null);
    trackballControl.dispose();
    renderer.dispose();
    if (stats && stats.dom.parentNode) {
      stats.dom.parentNode.removeChild(stats.dom);
    }
  }

  await sleep(1_000)
  // left the page during the wait: another page owns #app now
  if (!container.isConnected) {
    disposeScene();
    return;
  }

  c.on('runNotation', (e) => {
    const { notations } = (e as CustomEvent).detail;
    for (const n of notations) {
      window.addItem(n)
    }
  });

  c.on('twist', (e) => {
    const { position } = (e as CustomEvent).detail;
    if (position == 'end') {
      window.removeItem()
    }
  })

  // coming from the scanner: show the scanned cube and its solution instead of the demo
  const session = loadVirtualSession()
  if (session) {
    c.set(session.cube)
    // tutorial practice: look from above the front right so the top layer is visible too
    if (session.method === 'practice') {
      camera.position.set(4.5, 5.5, 8)
      camera.lookAt(0, 0, 0)
    }
    solutionPanel = mountSolutionPanel(container, c, session, () => {
      clearVirtualSession()
      navigate('/')
    })
  } else {
    // start solved: a solved physical cube then matches the virtual one for camera tracking
    window.solver = new CFOP(c)
  }

  // Setup notation buttons
  const notation = ["U", "D", "L", "R", "F", "B",
                    "U'", "D'", "L'", "R'", "F'", "B'",
                    "U2", "D2", "L2", "R2", "F2", "B2"];

  const templateEl = document.querySelector<HTMLTemplateElement>('#notation-option');
  const panelEl = document.querySelector<HTMLDivElement>('#notation');

  for (const char of notation) {
    const btn = templateEl?.content.cloneNode(true).childNodes[1] as HTMLElement | undefined;
    if (btn) {
      btn.textContent = char;
      btn.addEventListener('click', async () => {
        await window.cube.runNotation(char);
      });
      panelEl?.appendChild(btn);
    }
  }

  const layout = createLayout('.layout-container', {
    duration: 250,
    ease: 'outQuad',
    leaveTo: {
      transform: 'translateY(-100px) scale(.25)',
      opacity: 0,
      duration: 350,
      ease: 'out(3)'
    },
    enterFrom: {
      transform: 'translateY(100px) scale(.25)',
      opacity: 0,
      duration: 350,
      ease: 'out(3)'
    }
  });

  function removeItem() {
    layout.update(({ root }) => {
      const items = root.querySelectorAll('.item:not(.hidden)');
      if (items[0] == undefined) return;
      items[0].classList.add('hidden');
    }).then(() => {
      layout.leaving.forEach($el => $el.remove());
    });
  }

  function addItem(text: string) {
    layout.update(({root}) => {
      const $el = document.createElement('div');
      $el.classList.add('item', 'bg-gray-700', 'text-white', 'p-2', 'rounded');
      $el.textContent = text;
      root.appendChild($el);
    })
  }

  window.removeItem = removeItem;
  window.addItem = addItem;

  // Keyboard controls
  const notationKey = ['u', 'd', 'l', 'r', 'f', 'b', 'm', 'e', 's'];
  let accented = false;
  let doubleStep = false;
  
  const onKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    if (e.repeat) return
    const n = e.key;
    if (n === 'Alt') {
      accented = true;
      return;
    }
    if (n === 'Control') {
      doubleStep = true;
      return;
    }

    let char = ''
    if (notationKey.includes(n.toLowerCase())) {
      char = n;
    }

    if (char.length == 0) return;
    if (accented) {
      char += "'";
    }
    if (doubleStep) {
      char += "2";
    }

    window.cube.runNotation(char);
  };
  
  const onKeyUp = (e: KeyboardEvent) => {
    const n = e.key;
    if (n === 'Alt') {
      accented = false;
      return;
    }
    if (n === 'Control') {
      doubleStep = false;
      return;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  cleanupFn = () => {
    disposeScene();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    cleanupFn = null;
  };
}

export function getHomeCleanup() {
  return cleanupFn;
}
