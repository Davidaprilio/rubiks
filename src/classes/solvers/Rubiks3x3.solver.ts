import { CubeFace, type KeyColors } from "@/consts/cube";
import type { Rubiks } from "../rubiks";

export class Rubiks3x3Solver {

    readonly rubik: Rubiks;

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
        const sideMapIndex = ['U', 'R', 'D', 'L'] as const;
        const statePieces = this.rubik.getState();
        return adjacentFaces.every((side, idx) => {
            const pieceIndices = this.rubik.getPieceOfAdjacentFace(faceIndex, sideMapIndex[idx], [4, 7]);
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
}