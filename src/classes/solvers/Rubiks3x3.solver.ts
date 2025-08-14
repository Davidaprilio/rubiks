import { CubeFace, mapCubeFaceByIndex, type KeyColors } from "@/consts/cube";
import type { Rubiks } from "../rubiks";

export class Rubiks3x3Solver {

    readonly rubik: Rubiks;
    readonly sideMapIndex = ['U', 'R', 'D', 'L'] as const;

    constructor(rubik: Rubiks) {
        this.rubik = rubik;
    }

    hasCross(): number {
        let count = 0;
        this.rubik.getState().forEach((face, index) => {
            const isCross = this.faceHasCross(index, face);
            console.log(`Checking face ${index}: ${face}`, isCross);
            if (isCross) count++;
        });
        return count;
    }

    faceHasCross(faceIndex: number, facePieces: KeyColors[]): boolean {
        // Check if the specified face has a cross
        const centerColor = facePieces[4];
        const faceHasCross = [1, 3, 4, 5, 7].every((crossIndex) => facePieces[crossIndex].startsWith(centerColor[0]));
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

    getFaceF2L(faceIndex: number): FaceF2L {
        const piecesState = this.rubik.getState();
        const baseFaceColorComplete = this.faceIsSameColor(piecesState[faceIndex]);
        const faceF2L: FaceF2L = {
            face: faceIndex,
            color: mapCubeFaceByIndex[faceIndex].code as Exclude<KeyColors, 'E'>,
            done: baseFaceColorComplete,
            isF2L: false,
            pieces: piecesState[faceIndex]!,
            adjacent: []
        };
        if (!baseFaceColorComplete) return faceF2L;

        const adjacentFaces = this.rubik.getAdjacentFaces(faceIndex)!;
        for (let i = 0; i < adjacentFaces.length; i++) {
            const side = adjacentFaces[i];
            const adjacentFaceIndex = CubeFace[side]!.faceIndex!;
            const adjacent: FaceF2L['adjacent'][number] = {
                face: adjacentFaceIndex,
                color: CubeFace[side]!.code as Exclude<KeyColors, 'E'>,
                done: false,
                pieces: piecesState[adjacentFaceIndex],
                piecesIndexF2L: [
                    0, 0, 0,
                    0, 0, 0,
                ]
            }
            const adjacentIndex = this.rubik.getPieceOfAdjacentFace(faceIndex, this.sideMapIndex[i], [3,4,5,6,7,8]);
            if (!adjacentIndex) {
                adjacent.done = false;
                continue;
            };

            adjacent.done = adjacentIndex.every(index => adjacent.pieces[index].startsWith(side[0]));
            adjacent.piecesIndexF2L = adjacentIndex as [number, number, number, number, number, number];
            faceF2L.adjacent.push(adjacent);
        }

        faceF2L.isF2L = faceF2L.adjacent.every(adj => adj.done);
        return faceF2L;
    }

    faceIsSameColor(pieces: KeyColors[]): boolean {
        const centerColor = pieces[4];
        return pieces.every(piece => piece.startsWith(centerColor[0]));
    }
}

type FaceF2L = {
    face: number;
    color: Exclude<KeyColors, 'E'>;
    done: boolean;
    isF2L: boolean;
    pieces: KeyColors[];
    adjacent: {
        face: number;
        color: Exclude<KeyColors, 'E'>;
        pieces: KeyColors[];
        done: boolean;
        piecesIndexF2L: [
            number, number, number,
            number, number, number,
        ];
    }[];
}