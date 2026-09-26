/**
 * F2L (First Two Layers) Algorithms
 * Based on standard CFOP F2L cases for the FR slot
 *
 * Key format: "c{pos}{ori}e{pos}{ori}" where:
 *   pos = U-layer position (0=BL, 1=BR, 2=FR, 3=FL)
 *   ori = orientation (corner: 0/1/2, edge: 0/1)
 *
 * Piece definitions:
 *   Corner FR: colors R(right face), G(front face), W(down face)
 *   Edge FR: colors R(right face), G(front face)
 *
 * Positions in U layer (clockwise from top):
 *   0 = back-left, 1 = back-right, 2 = front-right, 3 = front-left
 */
export const F2lAlgorithms: Record<string, {
    solve: string[]
    tags?: string[]
}> = {
    // Basic: corner + edge already paired, insert from U
    "basic-paired": {
        tags: ["basic"],
        solve: ["U R U' R'"]
    },
    // Basic: corner + edge paired but flipped
    "basic-paired-flip": {
        tags: ["basic"],
        solve: ["R U R' U' R U R'"]
    },

    // Case 1: corner UFR oriented 0, edge UF
    "c20e20": {
        solve: ["U R U2 R' U R U' R'"]
    },
    // Case 2: corner UFR oriented 0, edge UR
    "c20e10": {
        solve: ["U' R U R'"]
    },
    // Case 3: corner UFR oriented 0, edge UB
    "c20e00": {
        solve: ["R U2 R' U' R U R'"]
    },
    // Case 4: corner UFR oriented 0, edge UL
    "c20e30": {
        solve: ["U' R U' R' U R U' R'"]
    },
    // Case 5: corner UFR oriented 1, edge UF
    "c21e20": {
        solve: ["R U2 R' U' R U R'"]
    },
    // Case 6: corner UFR oriented 1, edge UR
    "c21e10": {
        solve: ["U R U' R' U R U' R'"]
    },
    // Case 7: corner UFR oriented 1, edge UB
    "c21e00": {
        solve: ["U R U2 R' U R U' R'"]
    },
    // Case 8: corner UFR oriented 1, edge UL
    "c21e30": {
        solve: ["R U R'"]
    },
    // Case 9: corner UBR oriented 0, edge UF
    "c10e20": {
        solve: ["U R U' R' U' R U R'"]
    },
    // Case 10: corner UBR oriented 0, edge UR
    "c10e10": {
        solve: ["U' R U R' U R U' R'"]
    },
    // Case 11: corner UBR oriented 0, edge UB
    "c10e00": {
        solve: ["R U' R' U R U' R'"]
    },
    // Case 12: corner UBR oriented 1, edge UF
    "c11e20": {
        solve: ["R U' R' U R U2 R' U R U' R'"]
    },
    // Case 13: corner UBR oriented 1, edge UR
    "c11e10": {
        solve: ["R U2 R' U' R U R'"]
    },
    // Case 14: corner UBR oriented 1, edge UB
    "c11e00": {
        solve: ["R U R' U' R U R'"]
    },
    // Case 15: corner UBL oriented 0, edge UF
    "c00e20": {
        solve: ["U' R U R' U R U' R'"]
    },
    // Case 16: corner UBL oriented 0, edge UR
    "c00e10": {
        solve: ["U R U' R'"]
    },
    // Case 17: corner UBL oriented 0, edge UB
    "c00e00": {
        solve: ["R U' R' U' R U R'"]
    },
    // Case 18: corner UBL oriented 1, edge UF
    "c01e20": {
        solve: ["R U' R' U R U' R'"]
    },
    // Case 19: corner UBL oriented 1, edge UR
    "c01e10": {
        solve: ["U R U R' U' R U R'"]
    },
    // Case 20: corner UBL oriented 1, edge UB
    "c01e00": {
        solve: ["U R U2 R' U' R U R'"]
    },
    // Case 21: corner UFL oriented 0, edge UF
    "c30e20": {
        solve: ["R U R' U' R U R' U' R U R'"]
    },
    // Case 22: corner UFL oriented 0, edge UR
    "c30e10": {
        solve: ["U' R U R' U R U' R'"]
    },
    // Case 23: corner UFL oriented 0, edge UB
    "c30e00": {
        solve: ["U R U' R' U' R U R'"]
    },
    // Case 24: corner UFL oriented 1, edge UF
    "c31e20": {
        solve: ["R U' R' U2 R U' R'"]
    },
    // Case 25: corner UFL oriented 1, edge UR
    "c31e10": {
        solve: ["R U R' U' R U R'"]
    },
    // Case 26: corner UFL oriented 1, edge UB
    "c31e00": {
        solve: ["R U' R' U R U2 R' U R U' R'"]
    },

    // Edge flipped in slot cases
    "edge-flip-1": {
        tags: ["edge-flipped"],
        solve: ["R U' R' U R U2 R' U R U' R'"]
    },
    "edge-flip-2": {
        tags: ["edge-flipped"],
        solve: ["R U R' U' R U R' U' R U R'"]
    },

    // Corner in slot, edge in U layer
    "corner-in-slot-edge-uf": {
        tags: ["corner-solved"],
        solve: ["U R U' R' U' R U R'"]
    },
    "corner-in-slot-edge-ur": {
        tags: ["corner-solved"],
        solve: ["R U R' U' R U R'"]
    },
    "corner-in-slot-edge-ub": {
        tags: ["corner-solved"],
        solve: ["U' R U' R' U R U' R'"]
    },
    "corner-in-slot-edge-ul": {
        tags: ["corner-solved"],
        solve: ["R U2 R' U' R U R'"]
    },

    // Edge in slot, corner in U layer
    "edge-in-slot-corner-ufr": {
        tags: ["edge-solved"],
        solve: ["R U' R' U R U' R'"]
    },
    "edge-in-slot-corner-ubr": {
        tags: ["edge-solved"],
        solve: ["U R U R' U' R U R'"]
    },
    "edge-in-slot-corner-ubl": {
        tags: ["edge-solved"],
        solve: ["U2 R U' R' U R U' R'"]
    },
    "edge-in-slot-corner-ufl": {
        tags: ["edge-solved"],
        solve: ["U' R U R' U' R U R'"]
    },

    // Both in slot but wrong orientation
    "slot-wrong-ori-1": {
        tags: ["slot-wrong"],
        solve: ["R U' R' U R U2 R' U R U' R'"]
    },
    "slot-wrong-ori-2": {
        tags: ["slot-wrong"],
        solve: ["R U R' U' R U R' U' R U R'"]
    },
    "slot-wrong-ori-3": {
        tags: ["slot-wrong"],
        solve: ["R U2 R' U' R U R' U' R U R'"]
    },
    "slot-wrong-ori-4": {
        tags: ["slot-wrong"],
        solve: ["R U R' U R U' R' U R U2 R'"]
    },

    // Separated cases (corner and edge not adjacent)
    "separated-1": {
        tags: ["separated"],
        solve: ["R U R' U' R U R'"]
    },
    "separated-2": {
        tags: ["separated"],
        solve: ["R U' R' U R U' R'"]
    },
    "separated-3": {
        tags: ["separated"],
        solve: ["U R U2 R' U R U' R'"]
    },
    "separated-4": {
        tags: ["separated"],
        solve: ["U' R U R' U' R U R'"]
    },
}
