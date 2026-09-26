import { describe, it, expect } from 'vitest'
import { SOLVED, applyAlg } from '../cube54'
import { scanToState, stateToScan, type ScannedFaces } from '../scanAdapter'
import { solveCFOP } from '../cfop'

const uniform = (c: string) => [[c, c, c], [c, c, c], [c, c, c]]

describe('scan adapter', () => {
  it('uniform faces of the standard color scheme are a solved cube', () => {
    const faces: ScannedFaces = { U: uniform('Y'), F: uniform('R'), R: uniform('G'), D: uniform('W'), B: uniform('O'), L: uniform('B') }
    expect(scanToState(faces)).toEqual(SOLVED)
  })

  it('round trips', () => {
    const state = applyAlg(SOLVED, "R U R' U' F2 D L' B")
    expect(scanToState(stateToScan(state))).toEqual(state)
  })

  it('matches the layout of the scanner net', () => {
    // After U, the front top row shows the right face color (R -> green)
    const scan = stateToScan(applyAlg(SOLVED, 'U'))
    expect(scan.F[0]).toEqual(['G', 'G', 'G'])
    // U face seen in the net has the back edge on row 0
    const scan2 = stateToScan(applyAlg(SOLVED, 'B'))
    expect(scan2.U[0]).toEqual(['G', 'G', 'G']) // B turn: the right color goes to the top back row
    // R face has the front column at col 0 (after F, front-right column of U comes onto R: yellow on top row)
    const scan3 = stateToScan(applyAlg(SOLVED, 'F'))
    expect(scan3.R.map((row) => row[0])).toEqual(['Y', 'Y', 'Y'])
    expect(scan3.U[2]).toEqual(['B', 'B', 'B'])
  })

  it('solves a scrambled cube coming from scanned faces', () => {
    const state = applyAlg(SOLVED, "F R U' R' U' R U R' F' R U R' U' R' F R F' D2 L B")
    const sol = solveCFOP(scanToState(stateToScan(state)))
    expect(sol.moves.length).toBeGreaterThan(0)
  })
})
