import type { Cube, TwistNotation } from "@/classes/cube";
import type { Solver } from "@/classes/solvers/solver";
import type { Cubelet } from "@/classes/cubelet";

/**
 * This 3x3 Cube Solve
 * use CFOP Method (Cross, F2L, OLL, PLL)
 */
export class CFOP implements Solver {
  readonly topCubelet: Cubelet
  private readonly crossFormula: Record<string, Record<string, string>> = this.buildCrossFormula()

  constructor(
    readonly cube: Cube
  ) {
    this.topCubelet = this.cube.getCubelet(10)!;
  }

  private solvedCross = {
    f: false,
    b: false,
    l: false,
    r: false
  }

  logic() {
    // CFOP solving logic goes here
    console.log("CFOP solving logic not yet implemented.");
  }

  async solve() {
    this.logic();
  }

  isSolved(): boolean {
    // Check if the cube is solved
    console.log("CFOP isSolved check not yet implemented.");
    return false;
  }

  async crossSolve() {
    for (const side of ['front', 'left', 'right', 'back'] as const) {
      await this.solveCrossEdge(side)
    }
    console.log(this.solvedCross);
    
  }

  async solveCrossEdge(side: 'front' | 'back' | 'left' | 'right') {
    const center = this.cube.side[side].centers.cubelets[0]
    const centerColor = center[side].color
    const edge = this.cube.groups.edges.hasColors('W', centerColor.initial).cubelets[0]
    if (edge === undefined) return
    const stikerPos = {
      down: edge.hasColor('W'),
      second: edge.hasColor(centerColor.initial)
    }

    console.log(edge.id, edge.side);
    

    if (stikerPos.down === false || stikerPos.second === false) {
      // edge not on down face
      console.log(edge, 'not have down sticker');
      return
    }

    const codePos = `${stikerPos.down[0]}${stikerPos.second[0]}`
    console.log(side, codePos);
    
    const move = this.crossFormula[side[0]][codePos]
    console.log(move);
    if (move === undefined) return
    if (move === '') {
      console.log('edge already solved');
      return this.isSolvedEdge(side)
    }

    await this.cube.runNotation(move.split(' ') as TwistNotation[])
    return this.isSolvedEdge(side)
  }

  isSolvedEdge(face: 'left' | 'right' | 'front' | 'back'): boolean {
    const center = this.cube.side[face].centers.cubelets[0]
    const centerColor = center[face].color
    const edge = this.cube.groups.edges.hasColors('W', centerColor.initial).cubelets[0]
    if (edge === undefined) return false
    const stikerPos = {
      down: edge.hasColor('W'),
      second: edge.hasColor(centerColor.initial)
    }
    if (stikerPos.down === false || stikerPos.second === false) return false

    const isSolved = stikerPos.down === 'down' && centerColor.initial === edge[stikerPos.second].color.initial
    this.solvedCross[face[0] as 'f' | 'b' | 'l' | 'r'] = isSolved
    return isSolved
  }

  private buildCrossFormula() {
    const mapFormula: Record<string, Record<string, string>> = {
      f: {
        // top white
        uf:"F2",
        ur: "U F2",
        ul:"U' F2", 
        ub:"U2 F2",
        // upside white
        fu: "U' R' F R",
        ru: "R' F R",
        bu: "U R' F R",
        lu: "L' F L",
        // equator white
        fr: "D R' D'",
        fl: "D' L D",
        bl: "D' L' D",
        br: "D R D'",
        rb: "D2 R D2",
        lb: "D2 L' D2",
        rf: "F",
        lf: "F'",
        // down white
        dr: "R D R' D'",
        dl: "L' D' L D",
        db: "B D2 B' D2",
        df: "",
        fd: "F' D R' D'",
        rd: "R F",
        bd: "B D' L' D",
        ld: "L' F'",
      }
    }

    const mapFaceDirection: Record<string, Record<string, string>> = {
      f: {u:'u', d:'d', r:'r', l:'l', b:'b', f:'f'},
      r: {u:'u', d:'d', r:'b', l:'f', b:'l', f:'r'},
      l: {u:'u', d:'d', r:'f', l:'b', b:'r', f:'l'},
      b: {u:'u', d:'d', r:'l', l:'r', b:'f', f:'b'},
    }

    const replaceWithMap = (str: string, map: Record<string, string>) => {
      return str.replace(/[udrlbf]/gi, c => {
        const lower = c.toLowerCase();
        const replaced = map[lower];
        if (!replaced) return c;
        return c === lower ? replaced : replaced.toUpperCase();
      });
    }

    // build fromula from template mapFormula
    // this for convert mapFormula face f to other face r, l, b
    const build = (face: 'r' | 'l' | 'b') => {
      const formula: Record<string, string> = {}
      for (const key in mapFormula.f) {
        const map = mapFaceDirection[face]
        const newKey = replaceWithMap(key, map);
        const move = replaceWithMap(mapFormula.f[key], map);
        formula[newKey] = move
      }
      return formula
    }

    mapFormula['r'] = build('r')
    mapFormula['l'] = build('l')
    mapFormula['b'] = build('b')

    console.log(mapFormula);
    
    return mapFormula
  }
}