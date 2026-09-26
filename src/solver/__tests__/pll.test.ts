import { describe, it, expect } from 'vitest'
import { SOLVED, applyAlg, invertAlg, normalizeAlg, isSolved, type Color, STICKER_FACE } from '../cube54'
import { PllAlgorithms } from '../pll.algo'

describe('PLL table', () => {
  for (const [name, alg] of Object.entries(PllAlgorithms)) {
    it(`${name} only permutes the last layer`, () => {
      const s = applyAlg(SOLVED, alg)
      expect(isSolved(s)).toBe(false)
      // yellow stays on top and the first two layers are untouched
      const bad = s.map((c, i) => c !== SOLVED[i] ? i : -1).filter((i) => i >= 0)
      // only U layer stickers (U face + top rows of side faces) may differ
      for (const i of bad) {
        const face = STICKER_FACE[i]
        const row = Math.floor((i % 9) / 3)
        expect(face === 'U' ? true : row === 0, `${name} sticker ${i}`).toBe(true)
      }
      expect(s.slice(0, 9)).toEqual(SOLVED.slice(0, 9))
    })
  }
})
