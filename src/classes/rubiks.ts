import { CubeFace, mapCubeFaceByIndex, mapCubeFaceByName } from "@/consts/cube";
import type { Colors, CubeFaceType, FaceIndex, FullRubiksNotation, KeyCubeFace, Notation, NotationLower } from "@/consts/cube";
import { getArrMatrixIndex, rotateMatrix } from "@/lib/utils";
import { Face } from "./models/face";
import type { Piece } from "./models/piece";
import { Facelet } from "./models/facelet";
const adjacentIndexMap = ['U', 'R', 'D', 'L'] as const;

export class Rubiks {
    readonly debug;
    readonly size = 3;
    public facelets: Facelet[][] = [];
    public faces: Face[] = [];
    public pieces: Piece[] = [];

    constructor(options?: { debug?: boolean }) {
        this.debug = options?.debug ?? false;
    }

    makeCubeState() {
        this.facelets = []
        this.faces = []
        for (const key in CubeFace) {
            const face = CubeFace[key as Colors];
            if (face.faceIndex === null) continue; // Skip the base face
            // this.cubeState[face.faceIndex] = Array(9).fill(CubeFace[key as Colors].code)
            const faceInstance = new Face(this, face.faceIndex);
            this.facelets[face.faceIndex] = Array.from({ length: this.size * this.size }, () => {
                return faceInstance.addFacelet(face.code);
            });
            this.faces.push(faceInstance);
        }

        for (const face of this.faces) {
            face.make();
        }
        return this.facelets;
    }

    getPiece(facelet: Facelet): Piece | undefined;
    getPiece(piece: Piece|string): Piece | undefined;
    getPiece(arg: Facelet | Piece | string): Piece | undefined {
        return this.pieces.find(p => {
            if (arg instanceof Facelet) {
                return p.hash.includes(arg.toString())
            };
            if (typeof arg === "string") return p.hash === arg;
            return p === arg;
        });
    }

    addPieces(piece: Piece) {
        if (this.pieces.some(p => p.hash === piece.hash)) return;
        this.pieces.push(piece);
    }

    getFaceletAtFace(faceIndex: number) {
        return this.facelets[faceIndex];
    }

    getState() {
        if (this.facelets.length === 0) {
            this.makeCubeState();
        }
        return this.facelets.map(face => face.map(facelet => facelet.toString()));
    }

    getAdjacentFaces(faceIndex: number): [KeyCubeFace, KeyCubeFace, KeyCubeFace, KeyCubeFace] | null {
        const s = mapCubeFaceByIndex[faceIndex];
        if (s === null || s.adjacent === null) return null;
        return [...s.adjacent];
    }

    getBackFaceIndex(frontFaceIndex: number): FaceIndex {
        return (frontFaceIndex + 3) % 6 as FaceIndex;
    }

    /**
     * Get the piece of an adjacent face based on the center face index, side, and piece index.
     * this will automate fix direction of adjacent pieces index
     * Example: 
     * - getPieceOfAdjacentFace(0, 'F', [0,1,2]) => [2, 5, 8]
     * - getPieceOfAdjacentFace(0, 'L', [0,1,2]) => [0, 3, 6]
     * - getPieceOfAdjacentFace(0, 'R', [3,4,5]) => [1, 4, 7]
     * @param centerFaceIndex The index of the center face.
     * @param side The side of the adjacent face.
     * @param pickPieceIndex The index of the piece to pick.
     * @returns The color of the piece or null if not found.
     * 
     */
    getPieceOfAdjacentFace(centerFaceIndex: number, side: Exclude<Notation, 'B' | 'F'>, pickPieceIndex: number[]) {
        const adjacentFaces = this.getAdjacentFaces(centerFaceIndex);
        if (!adjacentFaces) return null;

        const sideToIndexMap = {
            U: 0,
            R: 1,
            D: 2,
            L: 3,
        }
        const selectedColor = adjacentFaces[sideToIndexMap[side]]
        const selectedFace = CubeFace[selectedColor]
        const facePieces = this.facelets[selectedFace.faceIndex!];
        let indexReflect = Array.from({ length: facePieces.length }, (_, i) => i);

        // centerFaceIndex genap U & R = clockwise | L & D = double-clockwise
        // centerFaceIndex ganjil U & R = nothing | D & L = counter-clockwise
        let rotate = 0; // -1: counter-clockwise, 0: nothing, 1: clockwise, 2: double-clockwise
        if (centerFaceIndex % 2 === 0) {
            rotate = (side === 'U' || side === 'R') ? 1 : 2;
        } else {
            rotate = (side === 'U' || side === 'R') ? 0 : -1;
        }

        while (rotate !== 0) {
            indexReflect = rotateMatrix(indexReflect, this.size, rotate > 0);
            rotate += (rotate > 0) ? -1 : 1;
        }

        const indexReflectMap = indexReflect.reduce((acc, pickIndex, reflectIndex) => {
            acc[pickIndex] = reflectIndex;
            return acc;
        }, {} as Record<number, number>);

        const mappedPickPieceIndex = pickPieceIndex.map(index => indexReflectMap[index]);
        return mappedPickPieceIndex;
    }

    getFaceIndexAdjacent(index: FaceIndex, pick: number[]): (number[]|null)[] {
        const adjacentFaces = this.getAdjacentFaces(index);
        if (!adjacentFaces) return [];
        return adjacentFaces.map((_, i) => {
            return this.getPieceOfAdjacentFace(index, this.getIndexAdjacentCode(i)!, pick)!;
        });
    }

    getIndexAdjacentCode(index: number): Exclude<Notation, 'B' | 'F'> | null {
        return adjacentIndexMap[index] || null;
    }

    getFace(index: FaceIndex): Face | null {
        return this.faces[index] || null;
    }

    getFaceByColor(color: KeyCubeFace): Face | null {
        return this.getFace(CubeFace[color].faceIndex!);
    }

    /**
     * set move notation for Rubik's cube.
     * @param notation - The notation to set.
     */
    turns(notation: string) {
        const moves = notation.split(' ') as FullRubiksNotation[];
        moves.forEach(move => this.turn(move));
        this.logger.log(`Applied moves: ${notation}`);
    }

    turn(notation: FullRubiksNotation) {
        let loop = 1;
        if (notation.endsWith("2")) {
            loop = 2;
        } else if (notation.endsWith("i") || notation.endsWith("'")) {
            loop = 3; // counter-clockwise
        }
        const moveNotation = notation[0] as Notation | NotationLower;
        if (['x', 'y', 'z'].includes(moveNotation)) {
            this.logger.warn(`Skipping 3D rotation ${moveNotation} for Rubik's cube`);
            return;
        }
        for (let i = 0; i < loop; i++) {
            this.turnNotation(moveNotation, true);
        }
    }

    /**
     * Turns the Rubik's cube face based on the notation.
     */
    turnNotation(notation: Notation | NotationLower, clockwise: boolean = true) {
        if (this.facelets.length === 0) this.makeCubeState();

        switch (notation) {
            case 'U':
            case 'u':
                this.rotateFace(CubeFace.YELLOW.faceIndex, clockwise, (notation === 'u'));
                break;
            case 'D':
            case 'd':
                this.rotateFace(CubeFace.WHITE.faceIndex, clockwise, (notation === 'd'));
                break;
            case 'L':
            case 'l':
                this.rotateFace(CubeFace.BLUE.faceIndex, clockwise, (notation === 'l'));
                break;
            case 'R':
            case 'r':
                this.rotateFace(CubeFace.GREEN.faceIndex, clockwise, (notation === 'r'));
                break;
            case 'F':
            case 'f':
                this.rotateFace(CubeFace.RED.faceIndex, clockwise, (notation === 'f'));
                break;
            case 'B':
            case 'b':
                this.rotateFace(CubeFace.ORANGE.faceIndex, clockwise, (notation === 'b'));
                break
            default:
                throw new Error(`Unknown notation: ${notation}`);
        }
    }

    rotateFace(faceIndex: number, clockwise: boolean = true, withMiddle: boolean = true) {
        this.facelets[faceIndex] = rotateMatrix(this.facelets[faceIndex], this.size, clockwise);
        this.pivotFace(faceIndex, clockwise);
        if (withMiddle) {
            this.pivotFace(faceIndex, clockwise, 1);
        }
    }

    /**
     * Rotates the adjacent faces of the given face index.
     * @param faceIndex - The index of the face to center.
     * @param clockwise - Whether to rotate clockwise or counter-clockwise.
     * @param range - 0 marks the starting position on the face side, and the sequence of pieces rotates from that starting point, max 1.
     */
    pivotFace(faceIndex: number, clockwise: boolean = true, range: number = 0) {
        // ganjil 
        // top, right = row 2
        // bottom, left = col 2
        // genap
        // top, left = col 0
        // bottom, right = row 0
        if (range < 0 || range > 1) {
            throw new Error(`Range must be between 0 and 1, got ${range}`);
        }

        this.logger.group(`pivotFace ${faceIndex} ${clockwise ? 'clockwise' : 'counter-clockwise'}`);        
        // side faces rotation
        const adjacent = this.getAdjacentFaces(faceIndex);
        if (adjacent) {
            let tmpPieces: [number, Facelet][] = [];
            if (!clockwise) {
                adjacent.reverse();
                adjacent.unshift(adjacent.pop()!); // Move last to first
            }
            const isOddFace = faceIndex % 2 === 0; // 0, 2, 4 are odd faces
            const matrixIndex = range ? range : isOddFace ? 0 : 2;
           
            const indMove = (index: number) => {
                if (isOddFace) {
                    if (clockwise) return [0, 1].includes(index) ? 'col' : 'row';
                    return [0, 3].includes(index) ? 'col' : 'row';
                } else {
                    return [0, 1].includes(index) ? 'row' : 'col';
                }
            }
            const dirMove = (index: number) => {
                const a = indMove(index);
                this.logger.log(`Direction for index ${index}: ${a}, matrix ${matrixIndex} isOddFace=${isOddFace}, clockwise=${clockwise} color=${adjacent[index]}`);
                return a;
            }

            this.logger.log('adjacent faces:', adjacent);
            adjacent.forEach((adjacentFaceName, index, arrAdjacent) => {
                if (index === 0) {
                    const lastAdjacent = 3
                    const lastFaceIndex = CubeFace[arrAdjacent[3]].faceIndex!
                    tmpPieces = getArrMatrixIndex(this.facelets[lastFaceIndex], dirMove(lastAdjacent), this.size, matrixIndex);
                    this.logger.log('initial tmpPieces:', tmpPieces, {
                        lastAdjacent,
                        color: arrAdjacent[lastAdjacent],
                        lastFaceIndex
                    });
                }
                const sideFaceIndex = CubeFace[adjacentFaceName].faceIndex!
                const safePieces = getArrMatrixIndex(this.facelets[sideFaceIndex], dirMove(index), this.size, matrixIndex);
                this.logger.log('safePieces:', safePieces);
                if (clockwise && (index === 0 || index === 2)) {
                    tmpPieces.reverse();
                } else if (!clockwise && (index === 1 || index === 3)) {
                    this.logger.log('Reversing tmpPieces for counter-clockwise:', tmpPieces);
                    
                    tmpPieces.reverse();
                }
                tmpPieces.forEach(([, color], i) => {
                    this.facelets[sideFaceIndex][safePieces[i][0]] = color;
                });
                tmpPieces = safePieces;
            });
        }

        this.logger.groupEnd();
    }

    printState() {
        if (this.facelets.length === 0) {
            this.makeCubeState();
        }
        console.log('Current Cube State:');
        let faceStatePosition = '';
        for (let i = 0; i < this.facelets.length; i++) {
            faceStatePosition += `${i} ${mapCubeFaceByIndex[i].code[0]}: ${this.facelets[i].join(' ')}\n`;
        }

        console.log(faceStatePosition);

        // maps 3d to 2d
        //       | U(Y) |
        // L(B) | F(R) | R(G) | B(O)
        //     | D(W) |
        const emptySpace = Array(this.size).fill(' '.repeat(this.size * this.size)).join(' ');

        const getStateByName = (name: CubeFaceType['name']) => [...this.facelets[mapCubeFaceByName[name].faceIndex!]];
        const c2dArr = [
            [null, rotateMatrix(getStateByName('Up'), this.size, false), null, null],
            [rotateMatrix(getStateByName('Left'), this.size, true), getStateByName('Front'), getStateByName('Right'), rotateMatrix(getStateByName('Back'), this.size, true)],
            [null, getStateByName('Down'), null, null],
        ];

        let c2dStr = ``;
        c2dStr += `================================\n`;
        c2dStr += `     | Up    |\n`;
        c2dStr += `Left | Front | Right | Back\n`;
        c2dStr += `     | Down  |\n`;
        c2dStr += `========= Visualize 2D =========\n\n`;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < 3; j++) {
                c2dArr[i].forEach((_, index) => {
                    if (c2dArr[i][index] === null) c2dStr += emptySpace;
                    else c2dStr += c2dArr[i][index]?.splice(0, this.size).join(' ');
                    c2dStr += '  ';
                })
                c2dStr += '\n';
            }
            c2dStr += '\n';
        }

        console.log(c2dStr);
    }

    get logger(): Console {
        if (!this.debug) {
            return {
                log: () => { },
                error: () => { },
                warn: () => { },
                info: () => { },
                debug: () => { },
                group: () => { },
                groupEnd: () => { },
            } as Console;
        }
        return console;
    }
}