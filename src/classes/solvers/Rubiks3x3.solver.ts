import { CubeFace, mapCubeFaceByIndex, type FaceIndex } from "@/consts/cube";
import type { Facelet } from "../models/facelet";
import type { Rubiks } from "../rubiks";

const formulas: { [key: string]: string } = {
    // Fish
    '401000300': 'Li Ui L Ui Li U2 L',
} as const
export class Rubiks3x3Solver {

    readonly rubik: Rubiks;
    readonly sideMapIndex = ['U', 'R', 'D', 'L'] as const;
    readonly bottomFace = 5;

    constructor(rubik: Rubiks) {
        this.rubik = rubik;
    }

    hasCross(): number {
        let count = 0;
        this.rubik.facelets.forEach((facelet, index) => {
            const isCross = this.faceHasCross(index, facelet);
            if (isCross) count++;
        });
        return count;
    }

    faceHasCross(faceIndex: number, facelet: Facelet[]): boolean {
        // Check if the specified face has a cross
        const centerColor = facelet[4].color;
        const faceHasCross = [1, 3, 4, 5, 7].every((crossIndex) => facelet[crossIndex].color == centerColor);
        if (!faceHasCross) return false;

        const adjacentFaces = this.rubik.getAdjacentFaces(faceIndex)!;
        const statePieces = this.rubik.getState();
        return adjacentFaces.every((side, idx) => {
            const pieceIndices = this.rubik.getPieceOfAdjacentFace(faceIndex, this.sideMapIndex[idx], [4, 7]);
            if (!pieceIndices) return false;

            console.log('Face', {
                side,
                idx,
                faceIndex,
                centerColor,
                pieceIndices,
                pieceIndicesColor: [
                    statePieces[CubeFace[side]!.faceIndex!][pieceIndices[0]],
                    statePieces[CubeFace[side]!.faceIndex!][pieceIndices[1]],
                ],
            });
            
            return pieceIndices.every((index) => {
                const pieces = statePieces[CubeFace[side]!.faceIndex!]
                return pieces[index].startsWith(side[0]);
            });
        });
    }

    // getFaceF2L(faceIndex: number): FaceF2L {
    //     const piecesState = this.rubik.getState();
    //     const baseFaceColorComplete = this.faceIsSameColor(faceIndex);
    //     const faceF2L: FaceF2L = {
    //         face: faceIndex,
    //         color: mapCubeFaceByIndex[faceIndex].code as Exclude<KeyColors, 'E'>,
    //         done: baseFaceColorComplete,
    //         isF2L: false,
    //         facelets: piecesState[faceIndex]!,
    //         adjacent: []
    //     };
    //     if (!baseFaceColorComplete) return faceF2L;

    //     const adjacentFaces = this.rubik.getAdjacentFaces(faceIndex)!;
    //     for (let i = 0; i < adjacentFaces.length; i++) {
    //         const side = adjacentFaces[i];
    //         const adjacentFaceIndex = CubeFace[side]!.faceIndex!;
    //         const adjacent: FaceF2L['adjacent'][number] = {
    //             face: adjacentFaceIndex,
    //             color: CubeFace[side]!.code as Exclude<KeyColors, 'E'>,
    //             done: false,
    //             pieces: piecesState[adjacentFaceIndex],
    //             piecesIndexF2L: [
    //                 0, 0, 0,
    //                 0, 0, 0,
    //             ]
    //         }
    //         const adjacentIndex = this.rubik.getPieceOfAdjacentFace(faceIndex, this.sideMapIndex[i], [3,4,5,6,7,8]);
    //         if (!adjacentIndex) {
    //             adjacent.done = false;
    //             continue;
    //         };

    //         adjacent.done = adjacentIndex.every(index => adjacent.pieces[index].startsWith(side[0]));
    //         adjacent.piecesIndexF2L = adjacentIndex as [number, number, number, number, number, number];
    //         faceF2L.adjacent.push(adjacent);
    //     }

    //     faceF2L.isF2L = faceF2L.adjacent.every(adj => adj.done);
    //     return faceF2L;
    // }

    /**
     * Get the OLL facelets for a specific face
     * 0: F | 1: U | 2: R | 3: D | 4: L
     * @param faceIndex
     * @example return item [1, 'Y8'] mean Y8 on Up side of top pov cube
     */
    getStateOllFacelet(frontFace: FaceIndex, faceIndex: FaceIndex): [number, string][] {
        const face = this.rubik.faces[faceIndex]
        const facelets = this.rubik.getPieceOfAdjacentFace(frontFace, 'U', [0,1,2,3,4,5,6,7,8])!.map((faceletIndex) => {
            return this.rubik.facelets[faceIndex][faceletIndex]
        });
        const ollState: [number, string][] = Array.from({length: this.rubik.size**2}, () => [-1, ""]);

        // fill zero facelet
        facelets.forEach((facelet, index) => {
            if (facelet.color == face.center?.color) {
                ollState[index] = [0, facelet.toString()];
            };
        });

        // find facelet near side
        let rotate = this.rubik.getNormalizeRotation(frontFace, 'U')
        const adjacents = this.rubik.getFaceIndexAdjacent(faceIndex, [6,7,8])
        const adjacentsIndex = [0,1,2,3];
        while (rotate !== 0) {
            if (rotate > 0) {
                adjacentsIndex.push(adjacentsIndex.shift()!);
            } else {
                adjacentsIndex.unshift(adjacentsIndex.pop()!); 
            }
            rotate += (rotate > 0) ? -1 : 1;
        }

        facelets.forEach((facelet, i) => {
            if (ollState[i][0] >= 0) return;

            for (let adjacentIndex = 0; adjacentIndex < adjacents.length; adjacentIndex++) {
                const adjI = adjacentsIndex[adjacentIndex];
                const adjIndexs = adjacents[adjI]!;
                const adjFace = mapCubeFaceByIndex[faceIndex].adjacent![adjI]
                for (const index of adjIndexs) {
                    const adjFacelet = this.rubik.facelets[CubeFace[adjFace]!.faceIndex!][index]
                    if (adjFacelet.color === face.center?.color && facelet.piece?.hash.includes(adjFacelet.toString())) {
                        ollState[i] = [adjacentsIndex.indexOf(adjI) + 1, adjFacelet.toString()];
                        return;
                    }
                }
            }
        });

        return ollState;
    }

    getOllFormulaKey(frontFace: FaceIndex, faceIndex: FaceIndex): string {
        const ollState = this.getStateOllFacelet(frontFace, faceIndex);
        return ollState.map(([index]) => index).join('');
    }

    solveOLL(frontFace: FaceIndex, faceIndex: FaceIndex): string {
        const formulaKey = this.getOllFormulaKey(frontFace, faceIndex);
        console.log('OLL Formula Key:', formulaKey);
        if (!formulaKey) {
            throw new Error('Invalid OLL formula key', {cause: 'Formula key: ' + formulaKey});
        };
        const formula = formulas[formulaKey];
        if (!formula) {
            throw new Error('Formula OLL Not Found', {cause: 'Formula key: ' + formulaKey});
        }
        
        return formula;
    }

    isOLL(faceDownIndex: number): boolean {
        const topFaceIndex = this.rubik.getBackFaceIndex(faceDownIndex);
        const isDoneColor = this.faceIsSameColor(topFaceIndex);
        if (!isDoneColor) return false;

        // const f2l = this.getFaceF2L(faceDownIndex);
        // return f2l.isF2L;
        return true;
    }

    isSolved(): boolean {
        const state = this.rubik.getState();
        return state.every((_, index) => this.faceIsSameColor(index));
    }

    faceIsSameColor(faceIndex: number): boolean {
        const centerColor = this.rubik.facelets[faceIndex][0].face?.center?.color;
        return this.rubik.facelets[faceIndex].every(facelet => facelet.color === centerColor);
    }
}

// type FaceF2L = {
//     face: number;
//     color: Exclude<KeyColors, 'E'>;
//     done: boolean;
//     isF2L: boolean;
//     facelets: Facelet[];
//     adjacent: {
//         face: number;
//         color: Exclude<KeyColors, 'E'>;
//         facelets: Facelet[];
//         done: boolean;
//         piecesIndexF2L: [
//             number, number, number,
//             number, number, number,
//         ];
//     }[];
// }