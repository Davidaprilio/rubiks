import { describe, it, expect, beforeEach } from 'vitest'
import { Cube } from '@/classes/cube'
import { CFOP } from '@/classes/solvers/cfop'
import { OllAlgorithms } from '@/classes/solvers/algorithms/oll.algo'
import { ollKeyToStateFaceTop } from '@/utils/utils'

describe('CFOP Solver', () => {
  let cube: Cube
  let cfop: CFOP

  beforeEach(() => {
    cube = new Cube()
    cfop = new CFOP(cube)
  })

  describe('constructor', () => {
    it('should set the cube instance', () => {
      expect(cfop.cube).toBe(cube)
    })
  })

  describe('should can correct get OLL key', () => {
    it('should return 401402002', async () => {
      cfop.setupOllCube([
        "BYR", "YG", "GOY",
        "RY", "Y", "BY",
        "BYO", "OY", "GRY"])
      const key = cfop.getOllKey() as string
      expect(key).toBeTypeOf('string')
      expect(key.length).toBe(9)
      expect(key).toBe('401402002')
    })

    it('should return 102000302', async () => {
      cfop.setupOllCube([
        "boy", "yb", "gyr",
        "yg", "y", "yr",
        "ybr", "oy", "ogy"])
      const key = cfop.getOllKey() as string
      expect(key).toBeTypeOf('string')
      expect(key.length).toBe(9)
      expect(key).toBe('102000302')
    })

    it('should return 102000003', async () => {
      cfop.setupOllCube([
        "ogy", "yr", "ryb",
        "yo", "y", "yb",
        "gyr", "gy", "ybo"])
      const key = cfop.getOllKey() as string
      expect(key).toBeTypeOf('string')
      expect(key.length).toBe(9)
      expect(key).toBe('102000003')
    })
  })

  describe('should can get correct OLL formula and solve it', () => {
    it(`should solve OLL case`, async () => {
      cfop.setupOllCube(["ogy", "yr", "ryb", "yo",  "y",  "yb", "gyr", "gy", "ybo"])
      await cfop.solveOLL()
      expect(cfop.isSolvedOLL()).toBe(true)
    })
  })
  
  describe('all OLL algorithms is correct', () => {
    for (const key in OllAlgorithms) {
      const algo = OllAlgorithms[key]
      let setup = algo.cube?.[0]
      if (setup === undefined) {
        setup = ollKeyToStateFaceTop(key)
      }
      it(`should solve OLL case ${key} ${(algo.tags || []).join(', ')}`, async () => {
        cfop.setupOllCube(setup)
        await cfop.solveOLL()
        expect(cfop.isSolvedOLL()).toBe(true)
      })
    }
  })
})