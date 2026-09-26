import { describe, it, expect } from 'vitest'
import { SOLVED, applyAlg, isSolved, normalizeAlg, validateState, stickerAt, type Color } from '../cube54'

describe('cube54 model', () => {
  it('starts solved and valid', () => {
    expect(isSolved(SOLVED)).toBe(true)
    expect(validateState(SOLVED)).toBeNull()
  })

  it('U moves the front top row to the left face (clockwise from above)', () => {
    const s = applyAlg(SOLVED, 'U')
    expect(s[stickerAt([-1, 1, 1], 'L')]).toBe('R') // front color now on left
    expect(s[stickerAt([1, 1, 1], 'F')]).toBe('G') // right color now on front
  })

  it('R moves the front right column up', () => {
    const s = applyAlg(SOLVED, 'R')
    expect(s[stickerAt([1, 1, 1], 'U')]).toBe('R')
    expect(s[stickerAt([1, -1, 1], 'F')]).toBe('W')
  })

  it('quarter turn ^4 and known orders are identity', () => {
    for (const m of ['U', 'R', 'F', 'D', 'L', 'B', 'M', 'r', 'f']) {
      expect(isSolved(applyAlg(SOLVED, `${m} ${m} ${m} ${m}`))).toBe(true)
      expect(isSolved(applyAlg(SOLVED, `${m}2 ${m}2`))).toBe(true)
      expect(isSolved(applyAlg(SOLVED, `${m} ${m}'`))).toBe(true)
    }
    expect(isSolved(applyAlg(SOLVED, "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"))).toBe(true)
  })

  it('wide moves equal face + slice, rotations are absorbed', () => {
    expect(applyAlg(SOLVED, 'r')).toEqual(applyAlg(SOLVED, "R M'"))
    expect(applyAlg(SOLVED, 'u')).toEqual(applyAlg(SOLVED, "U E'"))
    expect(applyAlg(SOLVED, 'f')).toEqual(applyAlg(SOLVED, 'F S'))
    expect(applyAlg(SOLVED, 'y R')).toEqual(applyAlg(SOLVED, 'B'))
    expect(normalizeAlg('y R')).toEqual(['B'])
    expect(normalizeAlg("y' R")).toEqual(['F'])
    expect(normalizeAlg('x U')).toEqual(['F'])
    expect(normalizeAlg('y2 l')).toEqual(['r'])
    expect(normalizeAlg('z2')).toEqual([])
  })

  it('detects invalid states', () => {
    const twisted = SOLVED.slice() as Color[]
    // rotate one corner in place
    const a = stickerAt([1, 1, 1], 'U'), b = stickerAt([1, 1, 1], 'R'), c = stickerAt([1, 1, 1], 'F')
    ;[twisted[a], twisted[b], twisted[c]] = [twisted[b], twisted[c], twisted[a]]
    expect(validateState(twisted)).toMatch(/twisted/)
    const flipped = SOLVED.slice() as Color[]
    const e1 = stickerAt([0, 1, 1], 'U'), e2 = stickerAt([0, 1, 1], 'F')
    ;[flipped[e1], flipped[e2]] = [flipped[e2], flipped[e1]]
    expect(validateState(flipped)).toMatch(/flipped/)
    const swapped = SOLVED.slice() as Color[]
    const f1 = stickerAt([0, 1, 1], 'U'), f2 = stickerAt([0, 1, 1], 'F')
    const g1 = stickerAt([1, 1, 0], 'U'), g2 = stickerAt([1, 1, 0], 'R')
    ;[swapped[f1], swapped[g1]] = [swapped[g1], swapped[f1]]
    ;[swapped[f2], swapped[g2]] = [swapped[g2], swapped[f2]]
    expect(validateState(swapped)).toMatch(/swapped/)
  })
})
