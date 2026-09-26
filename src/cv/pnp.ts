import type { Vec3 } from '../solver/cube54';
import type { CubePose, Intrinsics, Point } from '../tracking/types';
import { mat3Mul, mat3T, mat3Vec, type Mat3, type PnpSolver } from './cubePose';

/**
 * Perspective-n-point in plain TypeScript (no OpenCV: its solvers throw C++ exceptions on
 * degenerate input, which corrupts the wasm heap).
 *
 *  - no guess: all points must lie on one cube face; the pose comes from the plane homography
 *  - with a guess (or after the homography): Levenberg-Marquardt on the reprojection error
 */

type Pose = Pick<CubePose, 'rotation' | 'translation'>;

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Solve A x = b (n x n) with partial pivoting; null when (nearly) singular. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  const scaleRef = Math.max(1e-12, ...A.flat().map(Math.abs));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10 * scaleRef) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Rotation matrix from a rotation vector (Rodrigues). */
export function rodrigues(w: Vec3): Mat3 {
  const th = norm(w);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = scale(w, 1 / th);
  const c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
}

/** Nearest rotation to a 3x3 matrix given by its columns (iterative polar decomposition). */
function orthonormalize(m: Mat3): Mat3 {
  let r = m.slice();
  for (let i = 0; i < 30; i++) {
    const inv = invert3(r);
    if (!inv) break;
    const it = mat3T(inv);
    const next = r.map((v, k) => 0.5 * (v + it[k]));
    const diff = next.reduce((s, v, k) => s + Math.abs(v - r[k]), 0);
    r = next;
    if (diff < 1e-12) break;
  }
  return r;
}

function invert3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
}

/** Pose of a set of points lying on one plane of the cube, from the plane homography. */
function planarPose(points3d: Vec3[], points2d: Point[], k: Intrinsics): Pose | null {
  // the plane: all points share one coordinate (the face)
  const axis = [0, 1, 2].find((a) => points3d.every((p) => Math.abs(p[a] - points3d[0][a]) < 1e-9));
  if (axis === undefined) return null;
  const e1: Vec3 = [0, 0, 0], e2: Vec3 = [0, 0, 0];
  e1[(axis + 1) % 3] = 1;
  e2[(axis + 2) % 3] = 1;
  const e3 = cross(e1, e2);
  const origin: Vec3 = [0, 0, 0];
  origin[axis] = points3d[0][axis];

  // homography (X, Y, 1) -> normalized image coords, h33 = 1, least squares
  const rows: number[][] = [], rhs: number[] = [];
  points3d.forEach((p, i) => {
    const X = dot(sub(p, origin), e1), Y = dot(sub(p, origin), e2);
    const x = (points2d[i].x - k.cx) / k.fx, y = (points2d[i].y - k.cy) / k.fy;
    rows.push([X, Y, 1, 0, 0, 0, -x * X, -x * Y]); rhs.push(x);
    rows.push([0, 0, 0, X, Y, 1, -y * X, -y * Y]); rhs.push(y);
  });
  const AtA = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => rows.reduce((s, r) => s + r[i] * r[j], 0)));
  const Atb = Array.from({ length: 8 }, (_, i) => rows.reduce((s, r, n) => s + r[i] * rhs[n], 0));
  const h = solveLinear(AtA, Atb);
  if (!h) return null;
  const h1: Vec3 = [h[0], h[3], h[6]], h2: Vec3 = [h[1], h[4], h[7]], h3: Vec3 = [h[2], h[5], 1];
  let lambda = 2 / (norm(h1) + norm(h2));
  if (!Number.isFinite(lambda)) return null;
  if (h3[2] * lambda < 0) lambda = -lambda; // the plane is in front of the camera
  const r1 = scale(h1, lambda), r2 = scale(h2, lambda), tp = scale(h3, lambda);
  const r3 = cross(r1, r2);
  // columns r1 r2 r3 -> rotation of the plane frame
  const P = orthonormalize([r1[0], r2[0], r3[0], r1[1], r2[1], r3[1], r1[2], r2[2], r3[2]]);
  const E: Mat3 = [e1[0], e2[0], e3[0], e1[1], e2[1], e3[1], e1[2], e2[2], e3[2]];
  const rotation = mat3Mul(P, mat3T(E));
  const translation = sub(tp, mat3Vec(rotation, origin)) as [number, number, number];
  return { rotation, translation };
}

function residuals(pose: Pose, points3d: Vec3[], points2d: Point[], k: Intrinsics, out: number[]) {
  points3d.forEach((p, i) => {
    const c = mat3Vec(pose.rotation, p);
    const z = c[2] + pose.translation[2];
    out[2 * i] = k.fx * (c[0] + pose.translation[0]) / z + k.cx - points2d[i].x;
    out[2 * i + 1] = k.fy * (c[1] + pose.translation[1]) / z + k.cy - points2d[i].y;
  });
  return out;
}

/**
 * Levenberg-Marquardt over a pose (rotation as a small rotation vector update + translation),
 * minimizing the squared residuals returned by `residualsOf`.
 */
export function optimizePose(
  start: Pose,
  residualsOf: (pose: Pose) => number[],
  options: { iterations?: number; step?: number } = {},
): Pose {
  const iterations = options.iterations ?? 15;
  const h = options.step ?? 1e-6;
  let pose = start;
  let r = residualsOf(pose);
  let cost = r.reduce((s, v) => s + v * v, 0);
  let mu = 1e-3;
  const apply = (p: Pose, d: number[]): Pose => ({
    rotation: mat3Mul(rodrigues([d[0], d[1], d[2]]), p.rotation),
    translation: [p.translation[0] + d[3], p.translation[1] + d[4], p.translation[2] + d[5]],
  });
  for (let it = 0; it < iterations; it++) {
    // numeric jacobian
    const J: number[][] = [];
    const z = Math.max(1, Math.abs(pose.translation[2]));
    const eps = [h, h, h, h * z, h * z, h * z];
    for (let j = 0; j < 6; j++) {
      const d = [0, 0, 0, 0, 0, 0];
      d[j] = eps[j];
      const rj = residualsOf(apply(pose, d));
      J.push(rj.map((v, i) => (v - r[i]) / eps[j]));
    }
    const JtJ = Array.from({ length: 6 }, (_, a) => Array.from({ length: 6 }, (_, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
    const Jtr = Array.from({ length: 6 }, (_, a) => J[a].reduce((s, v, i) => s + v * r[i], 0));
    let improved = false;
    for (let tries = 0; tries < 8 && !improved; tries++) {
      const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + mu) + 1e-12 : v)));
      const step = solveLinear(A, Jtr.map((v) => -v));
      if (!step) { mu *= 10; continue; }
      const cand = apply(pose, step);
      if (cand.translation[2] <= 0) { mu *= 10; continue; }
      const rc = residualsOf(cand);
      const cc = rc.reduce((s, v) => s + v * v, 0);
      if (cc < cost) {
        pose = { rotation: orthonormalize(cand.rotation), translation: cand.translation };
        r = rc; mu = Math.max(1e-7, mu / 10); improved = true;
        if (cost - cc < 1e-10 * (1 + cost)) it = iterations;
        cost = cc;
      } else {
        mu *= 10;
      }
    }
    if (!improved) break;
  }
  return pose;
}

/** Levenberg-Marquardt refinement of the pose on point correspondences. */
export function refinePose(start: Pose, points3d: Vec3[], points2d: Point[], k: Intrinsics, iterations = 15): Pose {
  return optimizePose(start, (p) => residuals(p, points3d, points2d, k, new Array(points3d.length * 2)), { iterations });
}

export const solvePnp: PnpSolver = (points3d, points2d, k, guess) => {
  if (points3d.length < 4 || points3d.length !== points2d.length) return null;
  const start = guess ?? planarPose(points3d, points2d, k);
  if (!start) return null;
  const pose = refinePose(start, points3d, points2d, k);
  return [...pose.rotation, ...pose.translation].every(Number.isFinite) ? pose : null;
};
