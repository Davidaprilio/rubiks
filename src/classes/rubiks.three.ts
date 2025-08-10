import { CubeFace, mapCubeFaceByIndex, mapCubeFaceByName, PIECES_COLOR_MAP, RUBIKS_THREE_COLORS, type Colors, type CubeFaceType, type KeyColors } from '@/consts/cube';
import { getArrMatrixIndex, rotateMatrix } from '@/lib/utils';
import * as THREE from 'three';


const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: 0xffffff,
});

export class RubiksCube {
    readonly debug = true;
    private readonly size = 3;
    private readonly totalPiece = 27;
    private readonly pieces: THREE.Mesh[] = [];
    readonly groupPieces: THREE.Group = new THREE.Group();
    readonly groupRotate: THREE.Group = new THREE.Group();
    readonly cubeGeometries: THREE.BufferGeometry[] = [];
    private _piecePositions: [number, number, number][] = [];
    private currRotate = 0;
    private rotateThreshold = Math.PI / 2;
    private cubeState: KeyColors[][] = [];

    constructor() {
    }

    async generateCube() {
        const sizePiece = 0.90;
        // const font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json')

        for (let piece = 0; piece < this.totalPiece; piece++) {
            // let aPiece = stateMapping[piece];
            const boxPiece = new THREE.BoxGeometry(sizePiece, sizePiece, sizePiece);
            const colors = [];
            const pieceFaceColors = PIECES_COLOR_MAP[piece];
            if (pieceFaceColors) {
                for (const faceIndex in pieceFaceColors) {
                    let color = pieceFaceColors[parseInt(faceIndex) as 0 | 1 | 2 | 3 | 4 | 5];
                    if (color === null || color === undefined) {
                        color = RUBIKS_THREE_COLORS.empty;
                    }

                    colors.push(...this.makeVerticesColorFace(color));
                }
            }

            boxPiece.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            this.pieces[piece] = new THREE.Mesh(boxPiece, material);
            this.groupPieces.add(this.pieces[piece]);

            if (piece === 0) {
                this.pieces[piece].userData = {
                    name: 'center',
                }

                console.log('Center piece created:', this.pieces[piece]);
                
            }
        }
        this.groupPieces.add(...this.pieces);
        this.groupRotate.add(this.groupPieces);

        for (const pieceNum in this.pieces) {
            const posOfPiece = this.piecePos(parseInt(pieceNum))
            if (!posOfPiece) {
                throw new Error(`Position for piece ${pieceNum} not found.`);
            }
            this.pieces[pieceNum].position.set(...posOfPiece);
        }

        // this.groupPieces.position.x = 0.25;
        // this.groupPieces.position.y = 0.75;
        // this.groupPieces.animations.

        // const firstFace = this.pieces.slice(0, 9)
        // console.log('firstFace', firstFace, this.pieces);
        // this.groupRotate.add(
        //     ...firstFace
        // );
    }

    piecePos(index: number): [number, number, number] | undefined {
        if (this._piecePositions.length === 0) {
            this.makepiecePos();
        }
        return this._piecePositions[index];
    }

    makeVerticesColorFace(color: THREE.Color): number[] {
        return [
            ...color.toArray(),
            ...color.toArray(),
            ...color.toArray(),
            ...color.toArray(),
        ];
    }

    private makepiecePos() {
        // BUILD AN ARRAY OF PIECES OF CUBE POSITIONS
        for (let z = 1; z >= -1; z--) {
            for (let y = -1; y <= 1; y++) {
                for (let x = 1; x >= -1; x--) {
                    this._piecePositions.push([x, y, z]);
                }
            }
        }
    }

    private makeCubeState() {
        this.cubeState = []
        for (const key in CubeFace) {
            const face = CubeFace[key as Colors];
            if (face.faceIndex === null) continue; // Skip the base face
            this.cubeState[face.faceIndex] = Array(9).fill(CubeFace[key as Colors].code)
        }
        return this.cubeState;
    }

    rotateFace(faceIndex: number, clockwise: boolean = true) {
        this.cubeState[faceIndex] = rotateMatrix(this.cubeState[faceIndex], this.size, clockwise);
    
        this.pivotFace(faceIndex, clockwise);
    }

    pivotFace(faceIndex: number, clockwise: boolean = true) {
        // ganjil 
        // top, right = row 2
        // bottom, left = col 2
        // genap
        // top, left = col 0
        // bottom, right = row 0

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
            const matrixIndex = isOddFace ? 0 : 2;
           
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
        const emptySpace = Array(this.size).fill(' ').join(' ');

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

    animate() {
        if (this.currRotate >= this.rotateThreshold) {
            return;
        }

        const seconds = 0.5;
        const step = this.rotateThreshold / (seconds * 60); // Assuming 60 FPS
        this.groupRotate.rotation.z += step;
        this.currRotate += step;
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