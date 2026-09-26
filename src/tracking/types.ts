import type { Color, FaceLetter } from '../solver/cube54';

export type Point = { x: number; y: number };

/** One sticker found in a camera frame (frame pixel coordinates). */
export interface StickerCandidate {
  id: number;
  color: Color;
  center: Point;
  /** 4 corners, clockwise in image space (y down) */
  quad: [Point, Point, Point, Point];
  /** half edge vectors of the sticker; right handed in image space (u x v > 0) */
  u: Point;
  v: Point;
  area: number;
}

/** Stickers that lie on one plane of a regular grid: a (partial) cube face. */
export interface GridComponent {
  /** sticker + its integer grid cell, x to the right, y down (right handed in the image) */
  cells: { sticker: StickerCandidate; gx: number; gy: number }[];
  /** grid step vectors in pixels (along gx and gy) */
  stepX: Point;
  stepY: Point;
}

/** A sticker whose place on the cube is known. */
export interface ObservedSticker {
  /** cube54 sticker index */
  index: number;
  face: FaceLetter;
  row: number;
  col: number;
  color: Color;
  center: Point;
  quad: [Point, Point, Point, Point];
}

/** Pose of the cube in the camera frame (OpenCV convention: x right, y down, z forward). */
export interface CubePose {
  /** 3x3 row major rotation, model -> camera. Model: +x = R, +y = U, +z = F, 1 unit = 1 cubie */
  rotation: number[];
  /** translation of the cube center in model units */
  translation: [number, number, number];
  /** RMS reprojection error in frame pixels */
  error: number;
}

export interface Intrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * Everything the tracker learned from one frame. Pose tracking is one consumer of this,
 * move detection (layer twists / cube rotations) will be another.
 */
export interface FrameObservation {
  time: number;
  intrinsics: Intrinsics;
  /** all square-ish stickers found in the frame */
  stickers: StickerCandidate[];
  /** stickers grouped per face plane */
  components: GridComponent[];
  /** stickers that did not fit any grid (e.g. a layer caught mid twist) */
  outliers: StickerCandidate[];
  /** pose of this frame (unsmoothed), null when the cube was not found */
  pose: CubePose | null;
  /** stickers placed on the cube for this pose */
  observed: ObservedSticker[];
  /** colors seen at every cube54 sticker index, null where not visible */
  observedState: (Color | null)[];
  /**
   * true: the seen colors agree with the expected (virtual cube) state;
   * false: they do not, the pose was found from the center stickers only;
   * null: no pose
   */
  matchesKnown: boolean | null;
  /** the pose was found from part of the cube only: probably a layer is being twisted */
  twisting?: boolean;
  /** result of the color region alignment when it ran (fraction of samples inside their color) */
  aligned?: { score: number; samples: number } | null;
}
