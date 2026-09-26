/**
 * Generates src/solver/data/f2lCases.ts: the 41 F2L cases of the front-right slot with an
 * algorithm for each. Algorithms from the dictionary (classes/solvers/algorithms/f2l.algo.ts)
 * are used when they solve the case; otherwise the shortest algorithm is searched, preferring
 * R/U moves, then F, then L/B.
 *
 * Run: GEN=1 npx vitest run src/solver/__tests__/f2lCases.generate.test.ts
 */
import { it } from 'vitest'
import { SOLVED, STICKER_POS, applyAlg, cubieOf, invertAlg, moveForward, simplifyAlg, stickerAt, tokenize, type Color } from '../cube54'
import { F2lAlgorithms } from '@/classes/solvers/algorithms/f2l.algo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>

const CROSS = [stickerAt([0, -1, 1], 'D'), stickerAt([1, -1, 0], 'D'), stickerAt([0, -1, -1], 'D'), stickerAt([-1, -1, 0], 'D')]
const OTHER_SLOTS = [
  stickerAt([-1, -1, 1], 'D'), stickerAt([-1, 0, 1], 'F'),
  stickerAt([1, -1, -1], 'D'), stickerAt([1, 0, -1], 'B'),
  stickerAt([-1, -1, -1], 'D'), stickerAt([-1, 0, -1], 'B'),
]
const FR_CORNER = stickerAt([1, -1, 1], 'D')
const FR_EDGE = stickerAt([1, 0, 1], 'F')
const HOME = [...CROSS, ...OTHER_SLOTS, FR_CORNER, FR_EDGE]

const TIERS = [
  ['U', 'U2', "U'", 'R', 'R2', "R'"],
  ['U', 'U2', "U'", 'R', 'R2', "R'", 'F', 'F2', "F'"],
  ['U', 'U2', "U'", 'R', 'R2', "R'", 'F', 'F2', "F'", 'L', 'L2', "L'", 'B', 'B2', "B'"],
]
const FWD = new Map<string, Uint8Array>()
for (const m of TIERS[2]) FWD.set(m, Uint8Array.from(moveForward(m)))

/** Exact distance of the FR pair alone (any face move): an admissible bound for the search. */
function pairTable(): Uint8Array {
  const S = 54, table = new Uint8Array(S * S).fill(255)
  const all = ['U', 'R', 'F', 'D', 'L', 'B'].flatMap((f) => [f, f + '2', f + "'"]).map((m) => Uint8Array.from(moveForward(m)))
  let frontier = [FR_CORNER * S + FR_EDGE]
  table[frontier[0]] = 0
  for (let d = 1; frontier.length; d++) {
    const next: number[] = []
    for (const key of frontier) {
      const c = Math.floor(key / S), e = key % S
      for (const f of all) { const k = f[c] * S + f[e]; if (table[k] === 255) { table[k] = d; next.push(k) } }
    }
    frontier = next
  }
  return table
}
const PAIR = pairTable()

function search(start: Uint8Array, moves: string[], maxDepth: number): string[] | null {
  const n = start.length
  const h = (p: Uint8Array) => {
    let others = 0
    for (let i = 0; i < n - 2; i++) if (p[i] !== HOME[i]) { others = 1; break }
    return Math.max(PAIR[p[n - 2] * 54 + p[n - 1]], others)
  }
  const path: string[] = []
  const levels = Array.from({ length: maxDepth + 1 }, () => new Uint8Array(n))
  const dfs = (depth: number, limit: number, lastFace: string): boolean => {
    const cur = levels[depth]
    const hv = h(cur)
    if (hv === 0) return true
    if (depth + hv > limit) return false
    for (const m of moves) {
      if (m[0] === lastFace) continue
      // opposite faces commute: only one order
      if ((m[0] === 'L' && lastFace === 'R') || (m[0] === 'B' && lastFace === 'F')) continue
      const f = FWD.get(m)!, nx = levels[depth + 1]
      for (let i = 0; i < n; i++) nx[i] = f[cur[i]]
      path[depth] = m
      if (dfs(depth + 1, limit, m[0])) return true
    }
    return false
  }
  levels[0].set(start)
  for (let limit = h(start); limit <= maxDepth; limit++) {
    if (dfs(0, limit, '')) {
      const out: string[] = []
      for (let d = 0; h(levels[d]) !== 0; d++) out.push(path[d])
      return out
    }
  }
  return null
}

const U_FWD = Uint8Array.from(moveForward('U'))
const inTopOrSlot = (sticker: number) => {
  const [x, y, z] = STICKER_POS[sticker]
  return y === 1 || (y !== 1 && x === 1 && z === 1)
}

it.skipIf(!env.GEN)('generate the 41 F2L cases', async () => {
  const cornerSpots = SOLVED.map((_, i) => i).filter((i) => cubieOf(i).length === 3 && inTopOrSlot(i))
  const edgeSpots = SOLVED.map((_, i) => i).filter((i) => cubieOf(i).length === 2 && inTopOrSlot(i))
  const seen = new Set<string>()
  const cases: { corner: number; edge: number; alg: string[]; group: string }[] = []

  for (const c of cornerSpots) {
    for (const e of edgeSpots) {
      if (c === FR_CORNER && e === FR_EDGE) continue // solved
      // the same case up to a U turn (pieces in the U layer turn along)
      const variants: [number, number][] = []
      let vc = c, ve = e
      for (let t = 0; t < 4; t++) {
        variants.push([vc, ve])
        if (STICKER_POS[vc][1] === 1) vc = U_FWD[vc]
        if (STICKER_POS[ve][1] === 1) ve = U_FWD[ve]
      }
      const key = variants.map(([a, b]) => `${a},${b}`).sort()[0]
      if (seen.has(key)) continue
      seen.add(key)
      // shortest over the U variants and move tiers; prefer not starting with a U turn
      let best: { corner: number; edge: number; alg: string[] } | null = null
      for (const moves of TIERS) {
        for (const [a, b] of variants) {
          const sol = search(Uint8Array.from([...CROSS, ...OTHER_SLOTS, a, b]), moves, best ? best.alg.length : 13)
          if (!sol) continue
          const better = !best || sol.length < best.alg.length || (sol.length === best.alg.length && best.alg[0]?.[0] === 'U' && sol[0]?.[0] !== 'U')
          if (better) best = { corner: a, edge: b, alg: sol }
        }
        if (best) break
      }
      if (!best) throw new Error(`no algorithm for case ${c},${e}`)
      const cornerTop = STICKER_POS[best.corner][1] === 1, edgeTop = STICKER_POS[best.edge][1] === 1
      const group = cornerTop && edgeTop ? 'both-top' : cornerTop ? 'edge-in-slot' : edgeTop ? 'corner-in-slot' : 'both-in-slot'
      cases.push({ ...best, group })
    }
  }

  // dictionary algorithms that solve each case (with a U turn before if needed)
  const AUF = ['', 'U', 'U2', "U'"]
  const f2lIntact = (s: Color[]) => s.every((col, i) => STICKER_POS[i][1] === 1 || col === SOLVED[i])
  const out = cases.map((cs, n) => {
    const state = applyAlg(SOLVED, invertAlg(cs.alg)) as Color[]
    const dictionary = Object.entries(F2lAlgorithms).flatMap(([name, a]) => a.solve.map((alg) => ({ name, alg })))
      .filter(({ alg }) => AUF.some((pre) => f2lIntact(applyAlg(applyAlg(state, pre ? [pre] : []), alg) as Color[])))
      .map(({ name, alg }) => {
        const pre = AUF.find((p) => f2lIntact(applyAlg(applyAlg(state, p ? [p] : []), alg) as Color[]))!
        return { name, alg: simplifyAlg([...(pre ? [pre] : []), ...tokenize(alg)]).join(' ') }
      })
    // dictionary algorithms first (shortest first), then the searched one when it is different
    const algs = [...new Set([...dictionary.map((d) => d.alg).sort((a, b) => a.split(' ').length - b.split(' ').length), cs.alg.join(' ')])]
    return { id: n + 1, group: cs.group, setup: invertAlg(cs.alg).join(' '), algorithms: algs, fromDictionary: [...new Set(dictionary.map((d) => d.name))], generated: cs.alg.join(' ') }
  })
  const order = ['both-top', 'edge-in-slot', 'corner-in-slot', 'both-in-slot']
  out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.generated.length - b.generated.length)
  out.forEach((c, i) => { c.id = i + 1 })

  const nodeFs = 'node:fs'
  const fs = await import(/* @vite-ignore */ nodeFs)
  const file = `/**
 * The 41 F2L cases of the front-right slot (white cross on the bottom, yellow on top, red in front).
 * GENERATED by src/solver/__tests__/f2lCases.generate.test.ts, do not edit by hand.
 *
 *  setup:          moves that make the case from a solved cube
 *  algorithms:     algorithms that solve it; from the dictionary (f2l.algo.ts) when one fits
 *  fromDictionary: dictionary entries that solve this case
 *  generated:      shortest algorithm found by search (R/U first, then F, then L/B)
 */
export interface F2lCase {
  id: number
  group: 'both-top' | 'edge-in-slot' | 'corner-in-slot' | 'both-in-slot'
  setup: string
  algorithms: string[]
  fromDictionary: string[]
  generated: string
}

export const F2L_CASES: F2lCase[] = ${JSON.stringify(out, null, 2)}
`
  fs.writeFileSync('src/solver/data/f2lCases.ts', file)
  console.log('cases', out.length, 'with dictionary algorithm', out.filter((c) => c.fromDictionary.length).length)
}, 30 * 60 * 1000)
