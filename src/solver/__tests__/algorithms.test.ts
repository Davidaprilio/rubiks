import { describe, it, expect } from 'vitest'
import { ROTATIONS, SOLVED, applyAlg, centersHome, invertAlg, normalizeAlg, rotateState, STICKER_FACE, STICKER_POS, type Color } from '../cube54'
import { OllAlgorithms } from '@/classes/solvers/algorithms/oll.algo'
import { PllAlgorithms } from '@/classes/solvers/algorithms/pll.algo'
import { F2lAlgorithms } from '@/classes/solvers/algorithms/f2l.algo'

/** Stickers of the first two layers (y <= 0), the FR slot (x = 1, y = 0, z = 1 and its corner) excluded when asked. */
const f2lStickers = (withoutFR: boolean) => SOLVED.map((_, i) => i).filter((i) => {
  const [x, y, z] = STICKER_POS[i]
  if (y > 0) return false
  if (withoutFR && x === 1 && z === 1) return false
  return true
})

/**
 * The case an algorithm solves: undo it from a solved cube. Wide moves / slices can leave the
 * whole cube turned (the algorithm then ends with a rotation): turn it back so the centers are home.
 */
const caseOf = (alg: string) => {
  let s = applyAlg(SOLVED, invertAlg(normalizeAlg(alg))) as Color[]
  if (!centersHome(s)) {
    const r = ROTATIONS.find((rot) => centersHome(rotateState(s, rot)))
    if (r) s = rotateState(s, r)
  }
  return s
}

const intact = (state: Color[], stickers: number[]) => stickers.every((i) => state[i] === SOLVED[i])

const AUF = ['', 'U', 'U2', "U'"]
const reorient = (s: Color[]) => {
  if (centersHome(s)) return s
  const r = ROTATIONS.find((rot) => centersHome(rotateState(s, rot)))
  return r ? rotateState(s, r) : s
}
/** Does `alg` (after a U turn if needed) take `state` to one where `done` holds? */
const solvesCase = (state: Color[], alg: string, done: (s: Color[]) => boolean) =>
  AUF.some((pre) => done(reorient(applyAlg(applyAlg(state, pre ? [pre] : []), alg) as Color[])))

describe('algorithm dictionaries', () => {
  const f2l = f2lStickers(false)
  const ollDone = (s: Color[]) => intact(s, f2l) && s.slice(0, 9).every((c) => c === 'Y')
  const pllDone = (s: Color[]) => AUF.some((post) => (applyAlg(s, post ? [post] : []) as Color[]).every((c, i) => c === SOLVED[i]))

  for (const [name, a] of Object.entries(OllAlgorithms)) {
    const start = caseOf(a.solve[0])
    it(`OLL ${name} ${(a.tags ?? []).join(',')}: keeps F2L`, () => {
      expect(centersHome(start)).toBe(true)
      expect(intact(start, f2l)).toBe(true)
    })
    a.solve.slice(1).forEach((alg, n) => it(`OLL ${name} alternative ${n + 1} solves the same case`, () => {
      expect(solvesCase(start, alg, ollDone)).toBe(true)
    }))
  }
  for (const [name, a] of Object.entries(PllAlgorithms)) {
    const start = caseOf(a.solve[0])
    it(`PLL ${name}: keeps F2L and the yellow top`, () => {
      expect(intact(start, f2l)).toBe(true)
      expect(start.slice(0, 9).every((c) => c === 'Y')).toBe(true)
      expect(STICKER_FACE[0]).toBe('U')
    })
    a.solve.slice(1).forEach((alg, n) => it(`PLL ${name} alternative ${n + 1} solves the same case`, () => {
      expect(solvesCase(start, alg, pllDone)).toBe(true)
    }))
  }
  for (const [name, a] of Object.entries(F2lAlgorithms)) {
    a.solve.forEach((alg, n) => it(`F2L ${name} #${n}: only touches the FR slot and the top layer`, () => {
      expect(intact(caseOf(alg), f2lStickers(true))).toBe(true)
    }))
  }
})
