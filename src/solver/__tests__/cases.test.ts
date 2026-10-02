import { describe, it, expect } from 'vitest'
import { SOLVED, STICKER_POS, applyAlg, type Color } from '../cube54'
import { algCases, caseOf } from '../cases'

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
  it('PLL names match the standard cases', () => {
    const REF: Record<string, string> = {
      Aa: "x R' U R' D2 R U' R' D2 R2 x'", Ab: "x R2 D2 R U R' D2 R U' R x'",
      E: "x' R U' R' D R U R' D' R U R' D R U' R' D' x", F: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
      Ga: "R2 U R' U R' U' R U' R2 U' D R' U R D'", Gb: "R' U' R U D' R2 U R' U R U' R U' R2 D",
      Gc: "R2 U' R U' R U R' U R2 U D' R U' R' D", Gd: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
      H: "M2 U M2 U2 M2 U M2", Ja: "R' U L' U2 R U' R' U2 R L", Jb: "R U R' F' R U R' U' R' F R2 U' R'",
      Na: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", Nb: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
      Ra: "R U' R' U' R U R D R' U' R D' R' U2 R'", Rb: "R2 F R U R U' R' F' R U2 R' U2 R",
      T: "R U R' U' R' F R2 U' R' U' R U R' F'", Ua: "M2 U M U2 M' U M2", Ub: "M2 U' M U2 M' U' M2",
      V: "R' U R' U' y R' F' R2 U' R' U R' F R F", Y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
      Z: "M' U M2 U M2 U M' U2 M2",
    }
    const AUF = ['', 'U', 'U2', "U'"]
    const ap = (s: Color[], a: string) => (a ? applyAlg(s, a) : s) as Color[]
    // the reference algorithm solves the case, with U turns before and after
    const solves = (s: Color[], alg: string) => AUF.some((a) => AUF.some((b) => {
      const end = ap(ap(ap(s, a), alg), b)
      return AUF.some((c) => ap(end, c).every((x, i) => x === SOLVED[i]))
    }))
    for (const c of cases.filter((x) => x.kind === 'pll')) {
      const name = c.id.slice(4)
      expect(Object.keys(REF).filter((n) => solves(c.state, REF[n])), name).toEqual([name])
    }
  })
  it('OLL numbers match the standard cases', () => {
    const REF: Record<number, string> = {
      1: "R U2 R2 F R F' U2 R' F R F'", 2: "F R U R' U' F' f R U R' U' f'",
      21: "R U2 R' U' R U R' U' R U' R'", 22: "R U2 R2 U' R2 U' R2 U2 R", 23: "R2 D' R U2 R' D R U2 R",
      24: "r U R' U' r' F R F'", 25: "F' r U R' U' r' F R", 26: "R U2 R' U' R U' R'", 27: "R U R' U R U2 R'",
      33: "R U R' U' R' F R F'", 37: "F R' F' R U R U' R'", 43: "F' U' L' U L F", 44: "F U R U' R' F'",
      45: "F R U R' U' F'", 57: "R U R' U' M' U R U' r'",
    }
    // which top stickers are yellow, the same whatever U turn the case is seen from
    const pattern = (s: Color[]) => ['', 'U', 'U2', "U'"]
      .map((a) => (a ? applyAlg(s, a) : s).map((x, i) => (STICKER_POS[i][1] === 1 && x === 'Y' ? 1 : 0)).join(''))
      .sort()[0]
    for (const [n, alg] of Object.entries(REF)) {
      const c = cases.find((x) => x.name === `OLL ${n}`)!
      expect(pattern(c.state), c.name).toBe(pattern(caseOf(alg)))
    }
  })
})
