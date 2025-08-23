import type { KeyColors } from "@/consts/cube";
import type { Piece } from "./piece";
import type { Face } from "./face";

export type FaceletType = "corner" | "edge";

export class Facelet {
    private _piece: Piece | null = null;
    private _face: Face | null = null;

    constructor(
        readonly id: string,
        readonly color: KeyColors,
    ) {}

    get piece(): Piece | null {
        return this._piece;
    }

    set piece(piece: Piece) {
        this.setPiece(piece);
    }

    setPiece(piece: Piece) {
        this._piece = piece;
        piece.addFacelet(this);
    }

    get face(): Face | null {
        return this._face;
    }

    set face(face: Face) {
        if (this._face) {
            throw new Error("Facelet already has a face");
        }
        this._face = face;
    }

    toString(): string {
        return `${this.color}${this.id}`;
    }
}