import { CubeFace, mapCubeFaceByIndex, type FaceIndex, type KeyColors } from "@/consts/cube";
import { Facelet } from "./facelet";
import type { Rubiks } from "../rubiks";
import { Piece } from "./piece";

export class Face {
    private _center: Facelet | null = null;
    constructor(
        readonly rubiks: Rubiks,
        readonly index: FaceIndex,
        readonly facelets: Facelet[] = [],
    ) {}

    get center() {
        return this._center;
    }

    make() {
        // set center is facelet odd
        if (this.facelets.length % 2 === 1) {
            this._center = this.facelets[Math.floor(this.facelets.length / 2)];
        }

        const indexCorners = this.getIndexCorners()
        const colors = mapCubeFaceByIndex[this.index].adjacent!
        const adjacents = this.rubiks.getFaceIndexAdjacent(this.index, [6,7,8])
        
        const getFacelet = (faceI: number, i: number) => this.rubiks.facelets[CubeFace[colors[faceI]].faceIndex!][i]
        const createCornerPiece = (fI: number, shiftI: number, popI: number) => {
            const corner = new Piece();
            corner.addFacelet(this.facelets[indexCorners[fI]]);
            corner.addFacelet(getFacelet(shiftI, adjacents[shiftI]!.shift()!));
            corner.addFacelet(getFacelet(popI, adjacents[popI]!.pop()!));   
            corner.setType()
            this.rubiks.addPieces(corner);
        }
        createCornerPiece(0, 0, 3) // TL
        createCornerPiece(1, 1, 0) // TR
        createCornerPiece(2, 3, 2) // BL
        createCornerPiece(3, 2, 1) // BR

        // create edges
        const edges = this.getIndexEdges();
        const createEdgesPiece = (index: number) => {
            let indexs = edges[index]
            if (index == 1 || index == 3) indexs = indexs.reverse();
            indexs.forEach((i) => {
                const edge = new Piece();
                edge.addFacelet(this.facelets[i]);
                edge.addFacelet(getFacelet(index, adjacents[index]!.shift()!));
                edge.setType()
                this.rubiks.addPieces(edge);
            });
        }
        createEdgesPiece(0); // top
        createEdgesPiece(1); // right
        createEdgesPiece(2); // bottom
        createEdgesPiece(3); // left        
    }

    addFacelet(color: KeyColors) {
        const facelet = new Facelet(this.facelets.length.toString(), color);
        facelet.face = this;
        this.pushFacelet(facelet);
        return facelet;
    }

    pushFacelet(facelet: Facelet) {
        this.facelets.push(facelet);
    }

    toArray(): Facelet[] {
        return [...this.facelets];
    }

    getIndexCorners(): [number, number, number, number] {
        const size = this.rubiks.size;
        return [0, (size-1), (size*size-size), (size*size-1)]
    }

    getIndexEdges(): [number[], number[], number[], number[]] {
        const size = this.rubiks.size;
        return [
            [...Array(size-2).keys()].map(i => i+1), // top
            [...Array(size-2).keys()].map(i => (size*(i+1))+size-1), // right
            [...Array(size-2).keys()].map(i => (size*(size-1))+i+1), // bottom
            [...Array(size-2).keys()].map(i => (size*(i+1))), // left
        ]
    }

    [Symbol.iterator](): Iterator<Facelet> {
        return this.facelets[Symbol.iterator]();
    }
}
    
