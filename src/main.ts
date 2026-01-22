import './style.css'
import './utils/number'
import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { Cube } from './classes/cube';

function setupThree() {
  //  First let's create a Scene object.
	const scene = new THREE.Scene()

	const 
	// FIELD_OF_VIEW = 45,
	FIELD_OF_VIEW = 75,
	WIDTH         = window.innerWidth,
	HEIGHT        = window.innerHeight,
	ASPECT_RATIO  = WIDTH / HEIGHT,
	NEAR          = 0.1,
	FAR           = 1000

	const camera = new THREE.PerspectiveCamera( FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR )
	camera.position.z = 5
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

function main() {
  const { scene, camera, renderer } = setupThree()

  const trackballControl = new TrackballControls( camera, renderer.domElement );
  trackballControl.rotateSpeed = 5;

  const axesHelper = new THREE.AxesHelper(8);
  scene.add( axesHelper );

  const c = new Cube()
  c.setRadius(0.4)
  scene.add( c.threeObj )
  window.cube = c

  // light
  const light = new THREE.AmbientLight( 0xffffff, 0.5 )
  light.position.set( 0, 8, 1 )
  scene.add( light )

  // animation loop
  function animate() {

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    trackballControl.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);
}


main()

declare global {
    interface Window {
        cube: Cube;
    }
}