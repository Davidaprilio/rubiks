import { FACE_MOVES, applyMove, type Color } from '../solver/cube54';
import type { FrameObservation } from './types';

export interface DetectedMove {
  /** notation of the move, e.g. "R", "U'", "F2" */
  move: string;
  kind: 'twist';
  /** 0..1 */
  confidence: number;
  time: number;
}

export type DetectorStatus =
  | { kind: 'blind' } // too few stickers seen to judge
  | { kind: 'in-sync' }
  | { kind: 'changing'; mismatches: number } // colors differ, no clear move (e.g. a layer mid twist)
  | { kind: 'candidate'; move: string; frames: number }
  | { kind: 'desync'; mismatches: number };

export interface MoveContext {
  /** next move of the solution being followed: confirmed a little faster */
  nextExpectedMove?: string | null;
}

export interface MoveDetectorOptions {
  /** frames a move must be seen in a row before it counts */
  confirmFrames: number;
  /** ... when it is the expected next move of the solution */
  confirmExpected: number;
  /** stickers that must be seen to judge */
  minSeen: number;
  /** frames of unexplained colors before reporting desync */
  desyncFrames: number;
}

const MOVES = FACE_MOVES; // 18 outer layer turns

/**
 * Detects layer twists by watching the colors of the stickers the camera sees, in cube
 * coordinates (`observation.observedState`), and comparing them with the cube state it keeps:
 *
 *  - colors agree with the state: nothing happened (turning the whole cube only changes the pose)
 *  - colors disagree: every single move and every pair of moves is applied to the state; a move
 *    is accepted only when it explains the colors (at most one misread sticker), clearly better
 *    than any other candidate, and it stays so for `confirmFrames` frames in a row
 *  - while a layer is mid twist no candidate fits, so nothing is decided
 *  - colors that no move explains for a while are reported as desync instead of guessed
 */
export class MoveDetector {
  private _state: (Color | null)[];
  private listeners = new Set<(m: DetectedMove) => void>();
  private statusListeners = new Set<(s: DetectorStatus) => void>();
  private streak: { move: string; frames: number } | null = null;
  private unexplained = 0;
  /** moves this detector emitted that will come back through applyExternal */
  private echo: string[] = [];
  private singles: { move: string; state: (Color | null)[] }[] | null = null;
  private pairs: { move: string; state: (Color | null)[] }[] | null = null;
  readonly o: MoveDetectorOptions;

  constructor(state: readonly (Color | null)[], options: Partial<MoveDetectorOptions> = {}) {
    this._state = [...state];
    this.o = { confirmFrames: 3, confirmExpected: 2, minSeen: 8, desyncFrames: 30, ...options };
  }

  /** The cube state the detector believes in (and the tracker expects). */
  get state(): readonly (Color | null)[] { return this._state; }

  /** Every state one move away, for the tracker to try right after a twist. */
  get nextStates(): readonly (readonly (Color | null)[])[] {
    return this.candidates(false).map((c) => c.state);
  }

  onMove(listener: (m: DetectedMove) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (s: DetectorStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Replace the state (virtual cube reset, new scan). */
  setState(state: readonly (Color | null)[]) {
    this._state = [...state];
    this.echo = [];
    this.changed();
  }

  /** Moves made on the virtual cube (buttons, solution player, or the echo of our own moves). */
  applyExternal(moves: string[]) {
    for (const m of moves) {
      if (this.echo[0] === m) { this.echo.shift(); continue; }
      this._state = applyMove(this._state, m);
    }
    this.changed();
  }

  reset() {
    this.streak = null;
    this.unexplained = 0;
  }

  private changed() {
    this.singles = null;
    this.pairs = null;
    this.reset();
  }

  private status(s: DetectorStatus) {
    for (const l of this.statusListeners) l(s);
  }

  private candidates(pairs: boolean) {
    this.singles ??= MOVES.map((move) => ({ move, state: applyMove(this._state, move) }));
    if (!pairs) return this.singles;
    if (!this.pairs) {
      // two quick moves between frames; one entry per distinct resulting state
      const seen = new Set([key(this._state), ...this.singles.map((c) => key(c.state))]);
      this.pairs = [];
      for (const a of this.singles) {
        for (const m of MOVES) {
          if (m[0] === a.move[0]) continue; // same face twice is a single move
          const state = applyMove(a.state, m);
          const k = key(state);
          if (seen.has(k)) continue;
          seen.add(k);
          this.pairs.push({ move: `${a.move} ${m}`, state });
        }
      }
    }
    return [...this.singles, ...this.pairs];
  }

  onObservation(observation: FrameObservation, context: MoveContext = {}): void {
    const obs = observation.observedState;
    if (!observation.pose) return;
    const seen = obs.reduce((n, c, i) => n + (c && this._state[i] ? 1 : 0), 0);
    if (seen < this.o.minSeen) { this.status({ kind: 'blind' }); return; }

    const m0 = mismatches(obs, this._state);
    if (m0 <= 1) {
      this.reset();
      this.status({ kind: 'in-sync' });
      return;
    }

    const pick = (pairs: boolean) => {
      let best: { move: string; m: number } | null = null, second = Infinity;
      for (const c of this.candidates(pairs)) {
        const m = mismatches(obs, c.state);
        if (!best || m < best.m) { if (best) second = Math.min(second, best.m); best = { move: c.move, m }; }
        else second = Math.min(second, m);
      }
      return best && best.m <= 1 && best.m <= m0 - 3 && second >= best.m + 2 ? best : null;
    };
    const best = pick(false) ?? (m0 >= 4 ? pick(true) : null);

    if (!best) {
      this.unexplained++;
      this.status(this.unexplained >= this.o.desyncFrames && m0 >= 4 ? { kind: 'desync', mismatches: m0 } : { kind: 'changing', mismatches: m0 });
      return;
    }
    this.unexplained = 0;
    this.streak = this.streak?.move === best.move ? { move: best.move, frames: this.streak.frames + 1 } : { move: best.move, frames: 1 };
    const expected = context.nextExpectedMove && best.move.split(' ')[0] === context.nextExpectedMove;
    const needed = expected ? this.o.confirmExpected : this.o.confirmFrames;
    if (this.streak.frames < needed) {
      this.status({ kind: 'candidate', move: best.move, frames: this.streak.frames });
      return;
    }

    // accepted: take it into our state now, the virtual cube will echo it back
    for (const move of best.move.split(' ')) {
      this._state = applyMove(this._state, move);
      this.echo.push(move);
    }
    this.changed();
    const confidence = Math.min(1, 1 - best.m / Math.max(1, seen) * 4);
    for (const move of best.move.split(' ')) {
      for (const l of this.listeners) l({ move, kind: 'twist', confidence, time: observation.time });
    }
    this.status({ kind: 'in-sync' });
  }
}

const key = (s: readonly (Color | null)[]) => s.map((c) => c ?? '.').join('');

function mismatches(obs: readonly (Color | null)[], state: readonly (Color | null)[]) {
  let n = 0;
  for (let i = 0; i < 54; i++) if (obs[i] && state[i] && obs[i] !== state[i]) n++;
  return n;
}
