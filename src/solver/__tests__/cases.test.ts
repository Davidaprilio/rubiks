import { describe, it, expect } from 'vitest'
import { SOLVED, STICKER_POS, applyAlg, type Color } from '../cube54'
import { algCases } from '../cases'

const f2lDone = (s: Color[]) => s.every((c, i) => STICKER_POS[i][1] === 1 || c === SOLVED[i])

describe('tutorial cases', () => {
  const cases = algCases()
  it('has 41 F2L, 57 OLL and 21 PLL cases, each with an algorithm', () => {
    expect(cases.filter((c) => c.kind === 'f2l')).toHaveLength(41)
    expect(cases.filter((c) => c.kind === 'oll')).toHaveLength(57)
    expect(cases.filter((c) => c.kind === 'pll')).toHaveLength(21)
    for (const c of cases) expect(c.algorithms.length, c.id).toBeGreaterThan(0)
  })
  it('every F2L algorithm puts the pair in without breaking the rest of F2L', () => {
    for (const c of cases.filter((x) => x.kind === 'f2l')) {
      expect(f2lDone(c.state), c.id).toBe(false)
      for (const alg of c.algorithms) expect(f2lDone(applyAlg(c.state, alg) as Color[]), `${c.id} ${alg}`).toBe(true)
    }
  })
  it('OLL / PLL cases keep the first two layers', () => {
    for (const c of cases.filter((x) => x.kind !== 'f2l')) expect(f2lDone(c.state), c.id).toBe(true)
  })
})
