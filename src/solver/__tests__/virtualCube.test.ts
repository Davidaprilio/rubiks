import { describe, it, expect } from 'vitest'
import { Cube } from '@/classes/cube'
import { SOLVED, FACE_MOVES, applyAlg } from '../cube54'
import { solveCFOP } from '../cfop'
import { buildVirtualSession, fromVirtualCubeState, toVirtualCubeState, toVirtualMoves } from '../virtualCube'

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}
function scramble(rand: () => number, length = 22) {
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

describe('virtual cube bridge', () => {
  it('a solved state matches the default virtual cube', () => {
    expect(toVirtualCubeState(SOLVED)).toEqual(new Cube().get())
  })

  it('reads the virtual cube back into solver colors', () => {
    const state = applyAlg(SOLVED, "R U F' D2 L B'")
    expect(fromVirtualCubeState(toVirtualCubeState(state))).toEqual(state)
    const partial = toVirtualCubeState(SOLVED).map((c, i) => (i === 0 ? 'XXXXXX' : c))
    expect(fromVirtualCubeState(partial).filter((c) => c === null)).toHaveLength(3)
  })

  it('every face move gives the same result as the virtual cube', async () => {
    for (const m of [...FACE_MOVES, 'M', "M'", 'M2', 'E', "E'", 'S', "S'", 'S2']) {
      const cube = new Cube()
      await cube.twist(m as never)
      expect(cube.get(), m).toEqual(toVirtualCubeState(applyAlg(SOLVED, m)))
    }
  })

  it('wide moves expand to face + slice', async () => {
    for (const m of ['r', "r'", 'r2', 'l', "l'", 'u', "u'", 'd', 'f', "f'", 'b', "b'", 'b2']) {
      const cube = new Cube()
      for (const t of toVirtualMoves([m])) await cube.twist(t as never)
      expect(cube.get(), m).toEqual(toVirtualCubeState(applyAlg(SOLVED, m)))
    }
  })

  it('replaying a solution on the virtual cube solves the scanned cube', async () => {
    const rand = rng(4242)
    for (let i = 0; i < 12; i++) {
      const state = applyAlg(SOLVED, scramble(rand))
      const session = buildVirtualSession(state, solveCFOP(state))
      const cube = new Cube()
      cube.set(session.cube)
      await cube.runNotation(session.moves as never)
      // solved, whatever the orientation of the whole cube
      const expected = toVirtualCubeState(applyAlg(state, solveCFOP(state).moves))
      expect(cube.get()).toEqual(expected)
      const last = session.phases.at(-1)!.steps.at(-1)!
      expect(last.to).toBe(session.moves.length)
    }
  })
})
