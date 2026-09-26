/**
 * PLL (Permutation of Last Layer) Algorithms
 * 21 standard PLL cases
 *
 * Detection key: 8-char string encoding U-layer permutation
 *   Chars 0-3: corners UBL, UBR, UFR, UFL (value 0-3 = which original corner is there)
 *   Chars 4-7: edges UB, UR, UF, UL (value 0-3 = which original edge is there)
 *   Original corners: 0=BO, 1=GO, 2=GR, 3=BR
 *   Original edges: 0=O, 1=G, 2=R, 3=B
 *   Keys are computed programmatically via CFOPSolver.computePllKey()
 *
 * solve[0] is the one the solver executes and must not contain cube rotations
 * (x, y, z) since Cube.twist() doesn't support them; alternatives may.
 */
export const PllAlgorithms: Record<string, {
    solve: string[]
    tags?: string[]
}> = {
    // Edges: 3-cycle (UB→UR→UF)
    "Ua": {
        tags: ["edges:3-cycle"],
        solve: ["R U' R U R U R U' R' U' R2"]
    },
    // Edges: 3-cycle (UB→UF→UR)
    "Ub": {
        tags: ["edges:3-cycle"],
        solve: ["R2 U R U R' U' R' U' R' U R'"]
    },
    // Edges: swap H (UF↔UB, UR↔UL)
    "H": {
        tags: ["edges:swap"],
        solve: ["M2 U M2 U2 M2 U M2"]
    },
    // Edges: swap Z (UF↔UR, UB↔UL)
    "Z": {
        tags: ["edges:swap"],
        solve: ["M' U M2 U M2 U M' U2 M2"]
    },
    // Corners: 3-cycle Aa (UBL→UFR→UBR)
    "Aa": {
        tags: ["corners:3-cycle"],
        solve: ["R' F R' B2 R F' R' B2 R2", "x R' U R' D2 R U' R' D2 R2 x'"]
    },
    // Corners: 3-cycle Ab (UBL→UBR→UFR)
    "Ab": {
        tags: ["corners:3-cycle"],
        solve: ["R2 B2 R F R' B2 R F' R", "x R2 D2 R U R' D2 R U' R x'"]
    },
    // Corners+edges: diagonal swap
    "E": {
        tags: ["diagonal-swap"],
        solve: [
            "R B' R' F R B R' F' R B R' F R B' R' F'",
            "x' R U' R' D R U R' D' R U R' D R U' R' D' x"
        ]
    },
    // Adjacent corner swap + edge 3-cycle
    "T": {
        tags: ["adjacent-swap"],
        solve: ["R U R' U' R' F R2 U' R' U' R U R' F'"]
    },
    // Adjacent corner swap + edge 3-cycle
    "F": {
        tags: ["adjacent-swap"],
        solve: ["R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"]
    },
    // Adjacent corner swap
    "Ja": {
        tags: ["adjacent-swap"],
        solve: [
            "L' U' L F L' U' L U L F' L2 U L",
            "x R2 F R F' R U2 r' U r U2 x'"
        ]
    },
    // Adjacent corner swap
    "Jb": {
        tags: ["adjacent-swap"],
        solve: ["R U R' F' R U R' U' R' F R2 U' R'"]
    },
    // Diagonal corner swap + edge swap
    "Na": {
        tags: ["diagonal-swap"],
        solve: [
            "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
            "z U R' D R2 U' R D' U R' D R2 U' R D' z'"
        ]
    },
    // Diagonal corner swap + edge swap
    "Nb": {
        tags: ["diagonal-swap"],
        solve: [
            "R' U R U' R' F' U' F R U R' F R' F' R U' R",
            "z D' R U' R2 D R' U D' R U' R2 D R' U z'"
        ]
    },
    // Adjacent corner swap
    "Ra": {
        tags: ["adjacent-swap"],
        solve: ["R U' R' U' R U R D R' U' R D' R' U2 R' U'"]
    },
    // Adjacent corner swap
    "Rb": {
        tags: ["adjacent-swap"],
        solve: ["R' U2 R U2 R' F R U R' U' R' F' R2 U'"]
    },
    // Adjacent corner swap
    "V": {
        tags: ["adjacent-swap"],
        solve: ["R' U R' U' B' R' B2 U' B' U B' R B R", "R' U R' U' y R' F' R2 U' R' U R' F R F"]
    },
    // Adjacent corner swap
    "Y": {
        tags: ["adjacent-swap"],
        solve: ["F R U' R' U' R U R' F' R U R' U' R' F R F'"]
    },
    // Corners: 3-cycle
    "Ga": {
        tags: ["corners:3-cycle", "g-perm"],
        solve: ["R2 U R' U R' U' R U' R2 U' D R' U R D'"]
    },
    // Corners: 3-cycle
    "Gb": {
        tags: ["corners:3-cycle", "g-perm"],
        solve: ["R' U' R U D' R2 U R' U R U' R U' R2 D"]
    },
    // Corners: 3-cycle
    "Gc": {
        tags: ["corners:3-cycle", "g-perm"],
        solve: ["R2 U' R U' R U R' U R2 U D' R U' R' D"]
    },
    // Corners: 3-cycle
    "Gd": {
        tags: ["corners:3-cycle", "g-perm"],
        solve: ["R U R' U' D R2 U' R U' R' U R' U R2 D'"]
    },
}
