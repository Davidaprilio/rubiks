import './style.css'
import './utils/number'
import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { Cube } from './classes/cube';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { CFOP } from './classes/solvers/cfop';
import { sleep } from './utils/utils';
import { createLayout, set, utils } from 'animejs';

const isDev = import.meta.env.DEV;

function setupThree() {
  //  First let's create a Scene object.
	const scene = new THREE.Scene()

	const 
	FIELD_OF_VIEW = 45,
	// FIELD_OF_VIEW = 75,
	WIDTH         = window.innerWidth,
	HEIGHT        = window.innerHeight,
	ASPECT_RATIO  = WIDTH / HEIGHT,
	NEAR          = 0.1,
	FAR           = 1000

	const camera = new THREE.PerspectiveCamera( FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR )
	camera.position.z = 10
	camera.lookAt( scene.position )
	scene.add( camera )

	const renderer = new THREE.WebGLRenderer({ antialias: true })
  const app = document.getElementById('app');
  if (!app) {
    throw new Error('App element not found');
  }
	app.appendChild( renderer.domElement )

  return {
    scene,
    camera,
    renderer
  }
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

async function main() {
  const { scene, camera, renderer } = setupThree()
  
  let animateDev = () => {} 

  if (isDev) {
    const stats = new Stats();
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

  // light
  const light = new THREE.AmbientLight( 0xffffff, 0.5 )
  light.position.set( 0, 8, 1 )
  scene.add( light )


  // animation loop
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

  // c.showStickerLabel(true)
  await sleep(1_000)

  // c.set([
  //   "RYXXBX", "BYXXXX", "RYGXXX",
  //   "RXXXBX", "RXXXXX", "RXGXXX",
  //   "RXXWBX", "RXXWXX", "RXGWXX",

  //   "XYXXGX", "XYXXXX", "XYRXXXX",
  //   "XXXXBX", "XXXXXX", "XXGXXXX",
  //   "XXXWBX", "XXXWXX", "XXGWXX",

  //   "XYXXBO", "XYXXXO", "XYGXXO",
  //   "XXXXBO", "XXXXXO", "XXGXXO",
  //   "XXXWBO", "XXXWXO", "XXGWXO"])
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

  // await c.scrumble(10, 0.3)
  const solver = new CFOP(c)
  solver.setupOllCube([
      "BYR", "YG", "GOY",
      "RY",  "Y",  "BY",
      "BYO", "OY", "GRY"])
  window.solver = solver



  c.runNotation("R U R' U'")
}

document.addEventListener('DOMContentLoaded', main)

declare global {
    interface Window {
        cube: Cube;
        solver: any;

        removeItem: () => void;
        addItem: (text: string) => void;
    }
}


const notation = ["U", "D", "L", "R", "F", "B",
                  "U'", "D'", "L'", "R'", "F'", "B'",
                  "U2", "D2", "L2", "R2", "F2", "B2"];

const templateEl = {
  notation: document.querySelector<HTMLTemplateElement>('#notation-option'),
}
const panelEl = {
  notation: document.querySelector<HTMLDivElement>('#notation'),
}

for (const char of notation) {
  const btn = templateEl.notation?.content.cloneNode(true).childNodes[1]
  if (btn) {
    btn.textContent = char;
    btn.addEventListener('click', async () => {
      await window.cube.runNotation(char);
    });
    panelEl.notation?.appendChild(btn);
  }
}

const layout = createLayout('.layout-container', {
  duration: 250,
  ease: 'outQuad',
  leaveTo: {
    transform: 'translateY(-100px) scale(.25)',
    opacity: 0,
    duration: 350, // Applied to the elements leaving the layout
    ease: 'out(3)' // Applied to the elements leaving the layout
  },
  enterFrom: {
    transform: 'translateY(100px) scale(.25)',
    opacity: 0,
    duration: 350, // Applied to the elements entering the layout
    ease: 'out(3)' // Applied to the elements entering the layout
  }
});

function removeItem() {
  layout.update(({ root }) => {
    const items = root.querySelectorAll('.item:not(.hidden)');
    if (items[0] == undefined) return;
    items[0].classList.add('hidden'); // temporarily hide the element using `display: none`
  }).then(() => {
    // Remove the elements from the DOM when the animation finishes
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