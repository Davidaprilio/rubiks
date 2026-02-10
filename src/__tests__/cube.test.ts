import { describe, it, expect, beforeEach } from 'vitest'
import { Cube } from '@/classes/cube'

describe('Cube', () => {
  let cube: Cube

  beforeEach(() => {
    cube = new Cube()
  })

  describe('constructor', () => {
    it('should create 27 cubelets', () => {
      expect(cube.cubelets).toHaveLength(27)
    })

    it('should set size to 3', () => {
      expect(cube.size).toBe(3)
    })

    it('should assign unique ids 0-26', () => {
      const ids = cube.cubelets.map(c => c.id)
      expect(ids).toEqual(Array.from({ length: 27 }, (_, i) => i))
    })
  })

  describe('cubelet types', () => {
    it('should have 1 core cubelet (id 13)', () => {
      const cores = cube.cubelets.filter(c => c.type === 'core')
      expect(cores).toHaveLength(1)
      expect(cores[0].id).toBe(13)
    })

    it('should have 6 center cubelets', () => {
      const centers = cube.cubelets.filter(c => c.type === 'center')
      expect(centers).toHaveLength(6)
      expect(centers.map(c => c.id).sort()).toEqual([4, 10, 12, 14, 16, 22].sort())
    })

    it('should have 12 edge cubelets', () => {
      const edges = cube.cubelets.filter(c => c.type === 'edge')
      expect(edges).toHaveLength(12)
      expect(edges.map(c => c.id).sort()).toEqual([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].sort())
    })

    it('should have 8 corner cubelets', () => {
      const corners = cube.cubelets.filter(c => c.type === 'corner')
      expect(corners).toHaveLength(8)
      expect(corners.map(c => c.id).sort()).toEqual([0, 2, 6, 8, 18, 20, 24, 26].sort())
    })
  })

  describe('groups', () => {
    it('should populate centers group', () => {
      expect(cube.groups.centers.cubelets).toHaveLength(6)
    })

    it('should populate edges group', () => {
      expect(cube.groups.edges.cubelets).toHaveLength(12)
    })

    it('should populate corners group', () => {
      expect(cube.groups.corners.cubelets).toHaveLength(8)
    })

    it('should populate crosses group (centers + edges)', () => {
      expect(cube.groups.crosses.cubelets).toHaveLength(18)
    })
  })

  describe('sides', () => {
    it('each side should have 9 cubelets', () => {
      for (const key of Object.keys(cube.side) as (keyof typeof cube.side)[]) {
        expect(cube.side[key].cubelets).toHaveLength(9)
      }
    })
  })

  describe('getIndexRange', () => {
    it('should return 9 indexes for each z-layer', () => {
      expect(cube.getIndexRange('z', 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
      expect(cube.getIndexRange('z', 1)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
      expect(cube.getIndexRange('z', 2)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26])
    })

    it('should return 9 indexes for each y-layer', () => {
      const layer0 = cube.getIndexRange('y', 0)
      expect(layer0).toHaveLength(9)
      expect(layer0).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20])
    })

    it('should return 9 indexes for each x-layer', () => {
      const layer0 = cube.getIndexRange('x', 0)
      expect(layer0).toHaveLength(9)
    })
  })

  describe('getCubelet', () => {
    it('should return the cubelet by id', () => {
      const cubelet = cube.getCubelet(0)
      expect(cubelet).not.toBeNull()
      expect(cubelet!.id).toBe(0)
    })

    it('should return null for invalid id', () => {
      const cubelet = cube.getCubelet(999)
      expect(cubelet).toBeNull()
    })
  })

  describe('twist', () => {
    it('should swap cubelets correctly for U move', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.twist('U')
      const idsAfter = cube.cubelets.map(c => c.id)

      // U move should only affect the top layer (indices 0,1,2,9,10,11,18,19,20)
      // Non-top-layer cubelets should remain unchanged
      expect(idsAfter[3]).toBe(idsBefore[3])
      expect(idsAfter[4]).toBe(idsBefore[4])
      expect(idsAfter[13]).toBe(idsBefore[13])

      // Verify the U permutation: 0←2, 2←20, 20←18, 18←0
      expect(idsAfter[0]).toBe(idsBefore[2])
      expect(idsAfter[2]).toBe(idsBefore[20])
      expect(idsAfter[20]).toBe(idsBefore[18])
      expect(idsAfter[18]).toBe(idsBefore[0])
    })

    it('should swap cubelets correctly for U\' (inverse U)', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.twist("U'")
      const idsAfter = cube.cubelets.map(c => c.id)

      // U' is inverse of U: 0←18, 18←20, 20←2, 2←0
      expect(idsAfter[0]).toBe(idsBefore[18])
      expect(idsAfter[18]).toBe(idsBefore[20])
      expect(idsAfter[20]).toBe(idsBefore[2])
      expect(idsAfter[2]).toBe(idsBefore[0])
    })

    it('U followed by U\' should restore original state', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.twist('U')
      await cube.twist("U'")
      const idsAfter = cube.cubelets.map(c => c.id)
      expect(idsAfter).toEqual(idsBefore)
    })

    it('R followed by R\' should restore original state', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.twist('R')
      await cube.twist("R'")
      const idsAfter = cube.cubelets.map(c => c.id)
      expect(idsAfter).toEqual(idsBefore)
    })

    it('F followed by F\' should restore original state', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.twist('F')
      await cube.twist("F'")
      const idsAfter = cube.cubelets.map(c => c.id)
      expect(idsAfter).toEqual(idsBefore)
    })

    it('any face move 4 times should restore original state', async () => {
      const moves: ('U' | 'D' | 'L' | 'R' | 'F' | 'B')[] = ['U', 'D', 'L', 'R', 'F', 'B']
      for (const move of moves) {
        const freshCube = new Cube()
        const idsBefore = freshCube.cubelets.map(c => c.id)
        for (let i = 0; i < 4; i++) {
          await freshCube.twist(move)
        }
        const idsAfter = freshCube.cubelets.map(c => c.id)
        expect(idsAfter).toEqual(idsBefore)
      }
    })

    it('double move (U2) should equal two single moves', async () => {
      const cube2 = new Cube()
      await cube.twist('U')
      await cube.twist('U')
      await cube2.twist('U2')
      expect(cube.cubelets.map(c => c.id)).toEqual(cube2.cubelets.map(c => c.id))
    })
  })

  describe('runNotation', () => {
    it('should parse and execute a string sequence', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.runNotation("RU")
      // should not be in solved state after R U
      const idsAfter = cube.cubelets.map(c => c.id)
      expect(idsAfter).not.toEqual(idsBefore)
    })

    it('should accept array of notations', async () => {
      const idsBefore = cube.cubelets.map(c => c.id)
      await cube.runNotation(['R', "R'"])
      const idsAfter = cube.cubelets.map(c => c.id)
      expect(idsAfter).toEqual(idsBefore)
    })
  })

  describe('hasColor / hasColors', () => {
    it('should find cubelets with a given color', () => {
      const reds = cube.hasColor('R')
      expect(reds.cubelets.length).toBeGreaterThan(0)
    })

    it('should find cubelets with multiple colors (AND)', () => {
      const redYellow = cube.hasColors('R', 'Y')
      // red-yellow edges or corners
      expect(redYellow.cubelets.length).toBeGreaterThan(0)
      redYellow.cubelets.forEach(c => {
        expect(c.hasColor('R')).not.toBe(false)
        expect(c.hasColor('Y')).not.toBe(false)
      })
    })
  })

  describe('set', () => {
    it('should reset and rebuild cubelets from a state array', () => {
      const originalIds = cube.cubelets.map(c => c.id)
      const state = [
        'RYXXBX', 'RYXXXX', 'RYGXXX',
        'RXXXBX', 'RXXXXX', 'RXGXXX',
        'RXXWBX', 'RXXWXX', 'RXGWXX',

        'XYXXBX', 'XYXXXX', 'XYGXXX',
        'XXXXBX', 'XXXXXX', 'XXGXXX',
        'XXXWBX', 'XXXWXX', 'XXGWXX',

        'XYXXBX', 'XYXXXX', 'XYGXXX',
        'XXXXBX', 'XXXXXX', 'XXGXXX',
        'XXXWBX', 'XXXWXX', 'XXGWXX',
      ]
      cube.set(state)
      expect(cube.cubelets).toHaveLength(27)
      // ids should be sequential 0-26 (freshly created cubelets)
      expect(cube.cubelets.map(c => c.id)).toEqual(originalIds)
      // sides should still be mapped correctly
      for (const key of Object.keys(cube.side) as (keyof typeof cube.side)[]) {
        expect(cube.side[key].cubelets).toHaveLength(9)
      }
    })
  })
})
