import { describe, it, expect } from 'vitest'
import { SOLVED, FACE_MOVES, STICKER_FACE, applyAlg, isSolvedAnyOrientation, type Color } from '../cube54'
import { solveCFOP, SolveError } from '../cfop'
import { PllAlgorithms } from '../pll.algo'

// deterministic pseudo random
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function scramble(rand: () => number, length = 25) {
  const moves: string[] = []
  let last = ''
  while (moves.length < length) {
    const m = FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)]
    if (m[0] === last) continue
    last = m[0]
    moves.push(m)
  }
  return moves
}

describe('CFOP solver', () => {
  it('returns empty phases for a solved cube', () => {
    const sol = solveCFOP(SOLVED)
    expect(sol.moves).toEqual([])
    expect(sol.phases.map((p) => p.id)).toEqual(['cross', 'f2l', 'oll', 'pll'])
  })

  it('rejects an impossible state', () => {
    const bad = SOLVED.slice() as Color[]
    ;[bad[1], bad[19]] = [bad[19], bad[1]]
    expect(() => solveCFOP(bad)).toThrow(SolveError)
  })

  it('solves random scrambles', () => {
    const rand = rng(12345)
    let worst = 0
    let total = 0
    const N = 60
    for (let i = 0; i < N; i++) {
      const state = applyAlg(SOLVED, scramble(rand))
      const t = performance.now()
      const sol = solveCFOP(state)
      const dt = performance.now() - t
      worst = Math.max(worst, dt)
      total += sol.moves.length
      expect(isSolvedAnyOrientation(applyAlg(state, sol.moves))).toBe(true)
    }
    console.log(`avg moves ${(total / N).toFixed(1)}, worst time ${worst.toFixed(0)}ms`)
  }, 120000)

  it('solves every last layer permutation (PLL table is complete)', () => {
    // reach all 288 permuted last layers by closure over U and the table
    const gens = ['U', ...Object.values(PllAlgorithms)]
    const key = (s: Color[]) => s.join('')
    const seen = new Map<string, Color[]>([[key(SOLVED), SOLVED]])
    let frontier: Color[][] = [SOLVED]
    while (frontier.length) {
      const next: Color[][] = []
      for (const s of frontier) {
        for (const g of gens) {
          const t = applyAlg(s, g)
          if (!seen.has(key(t))) { seen.set(key(t), t); next.push(t) }
        }
      }
      frontier = next
    }
    expect(seen.size).toBe(288)
    for (const s of seen.values()) {
      expect(isSolvedAnyOrientation(applyAlg(s, solveCFOP(s).moves))).toBe(true)
    }
  }, 120000)

  it('solves every last layer orientation (OLL table is complete)', () => {
    const isLL = (i: number) => STICKER_FACE[i] === 'U' || (STICKER_FACE[i] !== 'D' && Math.floor((i % 9) / 3) === 0)
    const signature = (s: Color[]) => s.map((c, i) => (isLL(i) ? (c === 'Y' ? '1' : '0') : '')).join('')
    const gens = ['U', "R U R' U R U2 R'", "F R U R' U' F'", "R U R' U' R' F R F'", 'R U2 R2 U\' R2 U\' R2 U2 R', "r U R' U' r' F R F'", ...Object.values(PllAlgorithms)]
    const classes = new Map<string, Color[]>([[signature(SOLVED), SOLVED]])
    const seen = new Set([SOLVED.join('')])
    let frontier: Color[][] = [SOLVED]
    while (frontier.length && classes.size < 216) {
      const next: Color[][] = []
      for (const s of frontier) {
        for (const g of gens) {
          const t = applyAlg(s, g)
          const k = t.join('')
          if (seen.has(k)) continue
          seen.add(k)
          next.push(t)
          if (!classes.has(signature(t))) classes.set(signature(t), t)
        }
      }
      frontier = next
    }
    expect(classes.size).toBe(216)
    for (const s of classes.values()) {
      expect(isSolvedAnyOrientation(applyAlg(s, solveCFOP(s).moves))).toBe(true)
    }
  }, 120000)
})
