import * as THREE from 'three';
import type { Cube, TwistNotation } from '../classes/cube';
import { SOLVED } from '../solver/cube54';
import { loadMirrorState, loadPovState, saveMirrorState, savePovState } from '../cv/colorClassify';
import { toThreePose } from '../cv/cubePose';
import type { TrackerFrame } from '../tracking/cameraTracker';
import { fromVirtualCubeState, toVirtualCubeState } from '../solver/virtualCube';
import type { SolutionPanel } from './homeSolution';

interface Controls { enabled: boolean; reset(): void }

/** Fastest the virtual cube turns while following the camera, degrees per second. */
const MAX_TURN_SPEED = 540;

export interface HomeTrackingOptions {
  host: HTMLElement;
  button: HTMLButtonElement;
  cube: Cube;
  camera: THREE.PerspectiveCamera;
  controls: Controls;
  /** solution player, when a scanned solution is shown */
  solution: () => SolutionPanel | null;
}

/**
 * "Camera Tracking" on the home page: the virtual cube follows the orientation (tilt and turn) of
 * the physical cube seen by the webcam. OpenCV and the tracker are loaded on first use.
 */
export function setupHomeTracking(o: HomeTrackingOptions) {
  let stop: (() => void) | null = null;
  let starting = false;
  const setLabel = (on: boolean) => {
    o.button.textContent = on ? 'Stop Tracking' : 'Camera Tracking';
    o.button.classList.toggle('bg-red-600', on);
    o.button.classList.toggle('hover:bg-red-700', on);
    o.button.classList.toggle('bg-indigo-600', !on);
    o.button.classList.toggle('hover:bg-indigo-700', !on);
  };

  async function start() {
    if (stop || starting) return;
    starting = true;
    o.button.disabled = true;
    o.button.textContent = 'Loading...';
    try {
      const [{ CameraTracker }, { mountTrackingOverlay }, { MoveDetector }] = await Promise.all([
        import('../tracking/cameraTracker'),
        import('../tracking/trackingOverlay'),
        import('../tracking/moveDetector'),
      ]);
      // the move detector keeps the cube state the camera should see; it follows the virtual
      // cube (buttons, solution player, resets) and moves it when it sees a twist
      const detector = new MoveDetector(fromVirtualCubeState(o.cube.get()));
      const tracker = new CameraTracker({ knownState: () => detector.state, alternatives: () => detector.nextStates });
      let resyncTimer = 0;
      const resync = () => detector.setState(fromVirtualCubeState(o.cube.get()));
      const onRunNotation = (e: Event) => {
        const moves = ((e as CustomEvent).detail?.notations ?? []) as string[];
        const known = moves.filter((m) => /^[URFDLBMES]['2]?$/.test(m));
        detector.applyExternal(known);
        // rotations / wide moves: read the cube again once it has finished turning
        if (known.length !== moves.length) needResync = true;
      };
      let needResync = false;
      const onTwistEnd = (e: Event) => {
        if (!needResync || (e as CustomEvent).detail?.position !== 'end') return;
        clearTimeout(resyncTimer);
        resyncTimer = window.setTimeout(() => { needResync = false; resync(); }, 150);
      };
      o.cube.on('runNotation', onRunNotation);
      o.cube.on('twist', onTwistEnd);
      o.cube.on('set', resync);
      let mirror = loadMirrorState();
      let pov = loadPovState();
      const overlay = mountTrackingOverlay(o.host, tracker, {
        mirror,
        onMirrorChange: (m) => { mirror = m; saveMirrorState(m); updateTarget(); },
        pov,
        onPovChange: (v) => { pov = v; savePovState(v); updateTarget(); },
        onClose: () => stop?.(),
        // only while no scanned solution is shown, that one defines the cube state
        onResetSolved: o.solution() ? undefined : () => { o.cube.set(toVirtualCubeState(SOLVED)); },
        dev: import.meta.env.DEV,
      });

      // the view must match the webcam: no trackball, camera straight at the cube
      o.controls.enabled = false;
      o.controls.reset();
      o.camera.position.set(0, 0, 10);
      o.camera.up.set(0, 1, 0);
      o.camera.lookAt(0, 0, 0);

      // the tracker gives a pose 15-30 times a second; the cube eases towards it on every
      // rendered frame instead of jumping, which hides the steps and the small jitter
      // only the orientation is followed: the cube stays centered on screen wherever the
      // physical cube is held in the camera frame
      const targetQ = new THREE.Quaternion();
      o.cube.threeObj.position.set(0, 0, 0);
      let hasTarget = false;
      let lastFrame: TrackerFrame | null = null;
      // also called when the view option changes, so the cube turns to the new view right away
      function updateTarget() {
        if (!lastFrame?.pose) return;
        const p = toThreePose(lastFrame.pose, lastFrame.intrinsics, pov ? 'pov' : mirror ? 'mirror' : 'camera');
        targetQ.set(...p.quaternion);
        if (!hasTarget) {
          o.cube.threeObj.quaternion.copy(targetQ);
          hasTarget = true;
        }
      }
      const unsubscribe = tracker.onFrame((frame) => {
        if (!frame.pose) return;
        lastFrame = frame;
        updateTarget();
      });
      let easeId = 0;
      let last = performance.now();
      const ease = (now: number) => {
        easeId = requestAnimationFrame(ease);
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!hasTarget) return;
        const obj = o.cube.threeObj;
        // adaptive time constant: calm when (almost) still, still following real motion; a big
        // change (e.g. a confirmed re-lock) is spread over time by the speed cap instead of a jump
        const angle = THREE.MathUtils.radToDeg(obj.quaternion.angleTo(targetQ));
        const tau = angle < 2 ? 0.22 : angle < 10 ? 0.14 : 0.1;
        const step = angle * (1 - Math.exp(-dt / tau));
        obj.quaternion.rotateTowards(targetQ, THREE.MathUtils.degToRad(Math.min(step, MAX_TURN_SPEED * dt)));
      };
      easeId = requestAnimationFrame(ease);

      // detected twists turn the virtual cube (through the solution player when it is the
      // next step of the solution); whole cube rotations are shown by the pose alone
      const unsubscribeDetector = tracker.onFrame((frame) =>
        detector.onObservation(frame.observation, { nextExpectedMove: o.solution()?.nextMove() }));
      const offMove = detector.onMove(({ move }) => {
        overlay.setMoveStatus(`Twist: ${move}`, 'ok');
        busyShown = false;
        if (o.solution()?.applyMove(move)) return;
        void o.cube.runNotation([move as TwistNotation]);
      });
      const offStatus = detector.onStatus((st) => {
        if (st.kind === 'desync') overlay.setMoveStatus(`Out of sync with the virtual cube (${st.mismatches} stickers differ). Match it, or press Solved / rescan.`, 'warn');
        else if (st.kind === 'changing' || st.kind === 'candidate') { overlay.setMoveStatus('Twisting...', 'busy'); busyShown = true; }
        else if (st.kind === 'in-sync' && busyShown) { overlay.setMoveStatus('Twist detection: ready', 'busy'); busyShown = false; }
      });
      let busyShown = false;

      await tracker.start();
      stop = () => {
        offMove();
        offStatus();
        clearTimeout(resyncTimer);
        o.cube.off('runNotation', onRunNotation);
        o.cube.off('twist', onTwistEnd);
        o.cube.off('set', resync);
        unsubscribeDetector();
        unsubscribe();
        cancelAnimationFrame(easeId);
        tracker.stop();
        overlay.dispose();
        o.cube.threeObj.quaternion.identity();
        o.cube.threeObj.position.set(0, 0, 0);
        o.controls.enabled = true;
        stop = null;
        setLabel(false);
      };
      setLabel(true);
    } catch (err) {
      console.error(err);
      o.button.textContent = 'Camera unavailable';
      setTimeout(() => setLabel(false), 2000);
      stop?.();
    } finally {
      starting = false;
      o.button.disabled = false;
    }
  }

  o.button.addEventListener('click', () => (stop ? stop() : void start()));
  setLabel(false);
  return () => stop?.();
}
