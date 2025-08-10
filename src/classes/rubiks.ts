import { CubeFace, mapCubeFaceByIndex, mapCubeFaceByName } from "@/consts/cube";
import type { Colors, CubeFaceType, FullRubiksNotation, KeyColors, Notation, NotationLower } from "@/consts/cube";
import { getArrMatrixIndex, rotateMatrix } from "@/lib/utils";

export class Rubiks {
    readonly debug = true;
    private readonly size = 3;
    private cubeState: KeyColors[][] = [];


    makeCubeState() {
        this.cubeState = []
        for (const key in CubeFace) {
            const face = CubeFace[key as Colors];
            if (face.faceIndex === null) continue; // Skip the base face
            // this.cubeState[face.faceIndex] = Array(9).fill(CubeFace[key as Colors].code)
            this.cubeState[face.faceIndex] = Array.from({ length: this.size * this.size }, (_, k) => CubeFace[key as Colors].code + (k + 1)) as KeyColors[];
        }
        return this.cubeState;
    }

    getState() {
        if (this.cubeState.length === 0) {
            this.makeCubeState();
        }
        return JSON.parse(JSON.stringify(this.cubeState)) as KeyColors[][];
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
        if (this.cubeState.length === 0) this.makeCubeState();

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
        this.cubeState[faceIndex] = rotateMatrix(this.cubeState[faceIndex], this.size, clockwise);
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
        if (mapCubeFaceByIndex[faceIndex].adjacent) {
            let tmpPieces: [number, KeyColors][] = [];
            const adjacent = [...mapCubeFaceByIndex[faceIndex].adjacent]
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
                console.log(`Direction for index ${index}: ${a}, matrix ${matrixIndex} isOddFace=${isOddFace}, clockwise=${clockwise} color=${adjacent[index]}`);
                return a;
            }

            console.log('adjacent faces:', adjacent);
            adjacent.forEach((adjacentFaceName, index, arrAdjacent) => {
                if (index === 0) {
                    const lastAdjacent = 3
                    const lastFaceIndex = CubeFace[arrAdjacent[3]].faceIndex
                    tmpPieces = getArrMatrixIndex(this.cubeState[lastFaceIndex], dirMove(lastAdjacent), this.size, matrixIndex);
                    console.log('initial tmpPieces:', tmpPieces, {
                        lastAdjacent,
                        color: arrAdjacent[lastAdjacent],
                        lastFaceIndex
                    });
                }
                const sideFaceIndex = CubeFace[adjacentFaceName].faceIndex
                const safePieces = getArrMatrixIndex(this.cubeState[sideFaceIndex], dirMove(index), this.size, matrixIndex);
                console.log('safePieces:', safePieces);
                if (clockwise && (index === 0 || index === 2)) {
                    tmpPieces.reverse();
                } else if (!clockwise && (index === 1 || index === 3)) {
                    console.log('Reversing tmpPieces for counter-clockwise:', tmpPieces);
                    
                    tmpPieces.reverse();
                }
                tmpPieces.forEach(([, color], i) => {
                    this.cubeState[sideFaceIndex][safePieces[i][0]] = color;
                });
                tmpPieces = safePieces;
            });
        }

        this.logger.groupEnd();
    }

    printState() {
        if (this.cubeState.length === 0) {
            this.makeCubeState();
        }
        console.log('Current Cube State:');
        let faceStatePosition = '';
        for (let i = 0; i < this.cubeState.length; i++) {
            faceStatePosition += `${i} ${mapCubeFaceByIndex[i].code[0]}: ${this.cubeState[i].join(' ')}\n`;
        }

        console.log(faceStatePosition);

        // maps 3d to 2d
        //       | U(Y) |
        // L(B) | F(R) | R(G) | B(O)
        //     | D(W) |
        const emptySpace = Array(this.size).fill(' '.repeat(this.cubeState[0][0].length)).join(' ');

        const getStateByName = (name: CubeFaceType['name']) => [...this.cubeState[mapCubeFaceByName[name].faceIndex!]];
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