import { buildPixelLut, type TunedColors } from '../cv/colorClassify';
import { analyzeFrame, defaultIntrinsics } from '../cv/poseEstimator';
import { PoseSmoother, predictPose } from '../cv/cubePose';
import type { RgbaImage } from '../cv/stickerDetector';
import type { Color } from '../solver/cube54';
import type { CubePose, FrameObservation, Intrinsics } from './types';

type Pose = Pick<CubePose, 'rotation' | 'translation'>;

export interface CoreResult {
  observation: FrameObservation;
  /** smoothed pose, null when the cube is lost */
  pose: Pose | null;
  tracking: boolean;
  intrinsics: Intrinsics;
  processMs: number;
}

/**
 * The per frame tracking state and step (prediction, analysis, smoothing), without any DOM,
 * so it runs the same in the tracker worker and on the main thread.
 */
export class TrackingCore {
  private lut: Uint8Array;
  private labels = new Uint8Array(0);
  private smoother = new PoseSmoother();
  /** last two unsmoothed poses, for predicting the next frame */
  private raw: { pose: Pose; time: number }[] = [];
  /** last pose seen with the whole cube fitting (no layer mid twist) */
  private anchor: Pose | null = null;
  private twisting = false;
  private twistFrames = 0;

  constructor(private cv: unknown, tuned: TunedColors) {
    this.lut = buildPixelLut(tuned);
  }

  setColors(tuned: TunedColors) { this.lut = buildPixelLut(tuned); }

  reset() { this.smoother.reset(); this.raw = []; this.anchor = null; this.twisting = false; this.twistFrames = 0; }

  step(image: RgbaImage, known: readonly (Color | null)[] | null, time: number, alternatives?: readonly (readonly (Color | null)[])[]): CoreResult {
    const start = performance.now();
    if (this.labels.length !== image.width * image.height) this.labels = new Uint8Array(image.width * image.height);
    const intrinsics = defaultIntrinsics(image.width, image.height);

    // predict this frame's pose from the last raw ones (constant velocity)
    this.raw = this.raw.filter((r) => time - r.time < 400);
    const [r0, r1] = this.raw;
    // while a layer is being twisted the cube itself is held still: expect it where it was
    // before the twist instead of extrapolating (small errors would add up)
    const predicted = this.twisting && this.anchor
      ? this.anchor
      : r0 && r1
        ? predictPose(r0.pose, r1.pose, (time - r1.time) / Math.max(1, r1.time - r0.time))
        : r0?.pose ?? this.smoother.pose;

    const observation = analyzeFrame(image, {
      cv: this.cv,
      lut: this.lut,
      labels: this.labels,
      intrinsics,
      known,
      previous: this.smoother.pose,
      predicted,
      alternatives,
      anchor: this.twisting ? this.anchor : null,
    }, time);
    if (observation.pose) this.raw = [...this.raw, { pose: observation.pose, time }].slice(-2);
    // a twist takes well under a second; holding on longer would pin a cube that really moved
    this.twistFrames = observation.twisting && observation.pose ? this.twistFrames + 1 : 0;
    this.twisting = this.twistFrames > 0 && this.twistFrames <= 12;
    if (observation.pose && !observation.twisting) this.anchor = observation.pose;
    if (!observation.pose && time - (this.raw[1]?.time ?? this.raw[0]?.time ?? -Infinity) > 400) this.anchor = null;
    const { pose, tracking } = this.smoother.update(observation.pose, time);
    return { observation, pose, tracking, intrinsics, processMs: performance.now() - start };
  }
}
