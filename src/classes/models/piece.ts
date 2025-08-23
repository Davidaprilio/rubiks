import type { Facelet } from "./facelet";

export type PieceType = "corner" | "edge" | "center";
const pieceLengthTypeMap: { [key: number]: PieceType } = {
    1: "corner",
    2: "edge",
    3: "center"
};

export class Piece {
    private facelets: Facelet[] = [];
    private type: PieceType | null = null;
    private _hash: string = '';

    get hash(): string {
        return this._hash;
    }

    private setHash() {
        this._hash = this.facelets.sort((a, b) => a.toString().localeCompare(b.toString())).join("-");
    }

    constructor() {}

    addFacelet(facelet: Facelet) {
        if (this.facelets.length > 3) {
            throw new Error("Cannot add more than 3 facelets to a piece.");
        }
        if (this.facelets.includes(facelet)) {
            return false;
        }
        this.facelets.push(facelet);
        if (facelet.piece === null) {
            facelet.piece = this;
        }
        this.setHash();
        return true;
    }

    getFacelets() {
        return this.facelets;
    }

    getType(): PieceType {
        return pieceLengthTypeMap[this.facelets.length];
    }

    setType() {
        this.type = this.getType();
    }

    isCorner(): boolean {
        return this.type === "corner";
    }

    isEdge(): boolean {
        return this.type === "edge";
    }

    isCenter(): boolean {
        return this.type === "center";
    }
}