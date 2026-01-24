import { Cubelet } from "./cubelet";
import * as THREE from "three";
import { Group } from "./group";
import { Slice } from "./slice";

export class Cube {
    public size = 3;
    public cubelets: Cubelet[] = [];
    readonly threeObj: THREE.Object3D;
    public twistDuration: number = .5; // in seconds
    public doubleTwistDuration: number = .8; // in seconds
    public groups = {
        core: new Group(),
        centers: new Group(),
        edges: new Group(),
        corners: new Group(),
        crosses: new Group(),
    }
    public side = {
        up: new Slice('up'),
        equator: new Slice('equator'),
        down: new Slice('down'),
        left: new Slice('left'),
        middle: new Slice('middle'),
        right: new Slice('right'),
        front: new Slice('front'),
        standing: new Slice('standing'),
        back: new Slice('back'),
    }

    constructor() {
        // const domEl = document.createElement( 'div' )
		// domEl.classList.add( 'cube' )
        // this.threeObj = new CSS3DObject(domEl);

        this.threeObj = new THREE.Object3D();
        this.threeObj.name = 'cube';
        this.makeCubelet();
    }

    makeCubelet() {
        const cube = this;
        ([
            //  Front slice
            [1,1,0,0,1,0], [1,1,0,0,0,0], [1,1,1,0,0,0],//   0,  1,  2
            [1,0,0,0,1,0], [1,0,0,0,0,0], [1,0,1,0,0,0],//   3,  4,  5
            [1,0,0,1,1,0], [1,0,0,1,0,0], [1,0,1,1,0,0],//   6,  7,  8
            //  Standing slice
            [0,1,0,0,1,0], [0,1,0,0,0,0], [0,1,1,0,0,0],//   9, 10, 11
            [0,0,0,0,1,0], [0,0,0,0,0,0], [0,0,1,0,0,0],//  12, XX, 14
            [0,0,0,1,1,0], [0,0,0,1,0,0], [0,0,1,1,0,0],//  15, 16, 17
            //  Back slice
            [0,1,0,0,1,1], [0,1,0,0,0,1], [0,1,1,0,0,1],//  18, 19, 20
            [0,0,0,0,1,1], [0,0,0,0,0,1], [0,0,1,0,0,1],//  21, 22, 23
            [0,0,0,1,1,1], [0,0,0,1,0,1], [0,0,1,1,0,1] //  24, 25, 26
        ]).forEach(function( cubeletColorMap, cubeletId ){
            cube.cubelets.push( new Cubelet(cube, cubeletId, cubeletColorMap))
        })

        this.map();
    }

    map() {
        this.cubelets.forEach(cubelet => {
            switch (cubelet.type) {
                case 'center': 
                    this.groups.centers.add(cubelet); 
                    this.groups.crosses.add(cubelet); 
                    break;
                case 'edge': 
                    this.groups.edges.add(cubelet); 
                    this.groups.crosses.add(cubelet);
                    break;
                case 'corner': this.groups.corners.add(cubelet); break
                case 'core': this.groups.core.add(cubelet); break
            }
        })


        this.side.up.replace(...this.getIndexRange('y', 0).map(i => this.cubelets[i]))
        this.side.equator.replace(...this.getIndexRange('y', 1).map(i => this.cubelets[i]))
        this.side.down.replace(...this.getIndexRange('y', 2).map(i => this.cubelets[i]))

        this.side.right.replace(...this.getIndexRange('x', 0).map(i => this.cubelets[i]))
        this.side.middle.replace(...this.getIndexRange('x', 1).map(i => this.cubelets[i]))
        this.side.left.replace(...this.getIndexRange('x', 2).map(i => this.cubelets[i]))

        this.side.front.replace(...this.getIndexRange('z', 0).map(i => this.cubelets[i]))
        this.side.standing.replace(...this.getIndexRange('z', 1).map(i => this.cubelets[i]))
        this.side.back.replace(...this.getIndexRange('z', 2).map(i => this.cubelets[i]))
    }

    async runNotation(sequence: string, onComplete?: ((cubelets: Cubelet[]) => void)) {
        const moves = sequence.trim().split('')
        for( let i = 0; i < moves.length; i++ ) {
            let move = moves[i]
            const nextMove = moves[i+1]
            if (nextMove === "'" || nextMove === "2") {
                move += nextMove
                i++;
            }
            console.log(move);
            await this.twist(move as TwistNotation)
        }
        if( onComplete ) onComplete( this.cubelets )
    }

    async twist(notation: TwistNotation, onComplete?: ((cubelets: Cubelet[]) => void)) {
        const DEG = 90;
        const DEG2 = 180;

        const doSwap = (fnCallback: () => void) => {
            fnCallback();
            if (onComplete) onComplete(this.cubelets);
        }


        const swap = this.cubelets.slice();
        if (notation === 'U') {
            await this.side.up.rotate('Y', DEG)
            doSwap(() => {
                this.cubelets[0] = swap[2];
                this.cubelets[1] = swap[11];
                this.cubelets[2] = swap[20];
                this.cubelets[11] = swap[19];
                this.cubelets[20] = swap[18];
                this.cubelets[19] = swap[9];
                this.cubelets[18] = swap[0];
                this.cubelets[9] = swap[1];
            });
        } else if (notation === "U'") {
            await this.side.up.rotate('Y', -DEG);
            doSwap(() => {
                this.cubelets[0] = swap[18];
                this.cubelets[1] = swap[9];
                this.cubelets[2] = swap[0];
                this.cubelets[9] = swap[19];
                this.cubelets[18] = swap[20];
                this.cubelets[19] = swap[11];
                this.cubelets[20] = swap[2];
                this.cubelets[11] = swap[1];
            });
        } else if (notation === 'U2') {
            await this.side.up.rotate('Y', DEG2);
            doSwap(() => {
                this.cubelets[0] = swap[20];
                this.cubelets[20] = swap[0];
                this.cubelets[2] = swap[18];
                this.cubelets[18] = swap[2];
                this.cubelets[1] = swap[19];
                this.cubelets[19] = swap[1];
                this.cubelets[9] = swap[11];
                this.cubelets[11] = swap[9];
            });
        } else if (notation === 'D') {
            await this.side.down.rotate('Y', -DEG);
            doSwap(() => {
                this.cubelets[6] = swap[24];
                this.cubelets[7] = swap[15];
                this.cubelets[8] = swap[6];
                this.cubelets[15] = swap[25];
                this.cubelets[24] = swap[26];
                this.cubelets[25] = swap[17];
                this.cubelets[26] = swap[8];
                this.cubelets[17] = swap[7];
            });
        } else if (notation === "D'") {
            await this.side.down.rotate('Y', DEG);
            doSwap(() => {
                this.cubelets[6] = swap[8];
                this.cubelets[7] = swap[17];
                this.cubelets[8] = swap[26];
                this.cubelets[17] = swap[25];
                this.cubelets[26] = swap[24];
                this.cubelets[25] = swap[15];
                this.cubelets[24] = swap[6];
                this.cubelets[15] = swap[7];
            });
        } else if (notation === 'D2') {
            await this.side.down.rotate('Y', DEG2);
            doSwap(() => {
                this.cubelets[26] = swap[6];
                this.cubelets[6] = swap[26];
                this.cubelets[8] = swap[24];
                this.cubelets[24] = swap[8];
                this.cubelets[17] = swap[15];
                this.cubelets[15] = swap[17];
                this.cubelets[7] = swap[25];
                this.cubelets[25] = swap[7];
            });
        } else if (notation === 'L') {
            await this.side.left.rotate('X', -DEG);
            doSwap(() => {
                this.cubelets[0] = swap[18];
                this.cubelets[6] = swap[0];
                this.cubelets[18] = swap[24];
                this.cubelets[24] = swap[6];
                this.cubelets[3] = swap[9];
                this.cubelets[9] = swap[21];
                this.cubelets[15] = swap[3];
                this.cubelets[21] = swap[15];
            });
        } else if (notation === "L'") {
            await this.side.left.rotate('X', DEG);
            doSwap(() => {
                this.cubelets[0] = swap[6];
                this.cubelets[6] = swap[24];
                this.cubelets[18] = swap[0];
                this.cubelets[24] = swap[18];
                this.cubelets[3] = swap[15];
                this.cubelets[9] = swap[3];
                this.cubelets[15] = swap[21];
                this.cubelets[21] = swap[9];
            });
        } else if (notation === 'L2') {
            await this.side.left.rotate('X', DEG2);
            doSwap(() => {
                this.cubelets[0] = swap[24];
                this.cubelets[6] = swap[18];
                this.cubelets[18] = swap[6];
                this.cubelets[24] = swap[0];
                this.cubelets[3] = swap[21];
                this.cubelets[9] = swap[15];
                this.cubelets[15] = swap[9];
                this.cubelets[21] = swap[3];
            });
        } else if (notation === 'R') {
            await this.side.right.rotate('X', DEG);
            doSwap(() => {
                this.cubelets[2] = swap[8];
                this.cubelets[5] = swap[17];
                this.cubelets[8] = swap[26];
                this.cubelets[17] = swap[23];
                this.cubelets[26] = swap[20];
                this.cubelets[23] = swap[11];
                this.cubelets[20] = swap[2];
                this.cubelets[11] = swap[5];
            }); 
        } else if (notation === "R'") {
            await this.side.right.rotate('X', -DEG);
            doSwap(() => {
                this.cubelets[2] = swap[20];
                this.cubelets[5] = swap[11];
                this.cubelets[8] = swap[2];
                this.cubelets[11] = swap[23];
                this.cubelets[20] = swap[26];
                this.cubelets[23] = swap[17];
                this.cubelets[26] = swap[8];
                this.cubelets[17] = swap[5];
            });
        } else if (notation === 'R2') {
            await this.side.right.rotate('X', DEG2);
            doSwap(() => {
                this.cubelets[8] = swap[20];
                this.cubelets[20] = swap[8];
                this.cubelets[2] = swap[26];  
                this.cubelets[26] = swap[2];
                this.cubelets[5] = swap[23];
                this.cubelets[23] = swap[5];
                this.cubelets[17] = swap[11];
                this.cubelets[11] = swap[17];
            });
        } else if (notation === 'F') {
            await this.side.front.rotate('Z', DEG);
            doSwap(() => {
                this.cubelets[0] = swap[6];
                this.cubelets[1] = swap[3];
                this.cubelets[2] = swap[0];
                this.cubelets[3] = swap[7];
                this.cubelets[6] = swap[8];
                this.cubelets[7] = swap[5];
                this.cubelets[8] = swap[2];
                this.cubelets[5] = swap[1];
            });
        } else if (notation === "F'") {
            await this.side.front.rotate('Z', -DEG);
            doSwap(() => {
                this.cubelets[0] = swap[2];
                this.cubelets[1] = swap[5];
                this.cubelets[2] = swap[8];
                this.cubelets[3] = swap[1];
                this.cubelets[6] = swap[0];
                this.cubelets[7] = swap[3];
                this.cubelets[8] = swap[6];
                this.cubelets[5] = swap[7];
            });
        } else if (notation === 'F2') {
            await this.side.front.rotate('Z', DEG2);
            doSwap(() => {
                this.cubelets[0] = swap[8];
                this.cubelets[1] = swap[7];
                this.cubelets[2] = swap[6];
                this.cubelets[3] = swap[5];
                this.cubelets[6] = swap[2];
                this.cubelets[7] = swap[1];
                this.cubelets[8] = swap[0];
                this.cubelets[5] = swap[3];
            });
        } else if (notation === 'B') {
            await this.side.back.rotate('Z', -DEG);
            doSwap(() => {
                this.cubelets[18] = swap[20];
                this.cubelets[19] = swap[23];
                this.cubelets[20] = swap[26];
                this.cubelets[21] = swap[19];
                this.cubelets[24] = swap[18];
                this.cubelets[25] = swap[21];
                this.cubelets[26] = swap[24];
                this.cubelets[23] = swap[25];
            });
        } else if (notation === "B'") {
            await this.side.back.rotate('Z', DEG);
            doSwap(() => {
                this.cubelets[18] = swap[24];
                this.cubelets[19] = swap[21];
                this.cubelets[20] = swap[18];
                this.cubelets[21] = swap[25];
                this.cubelets[24] = swap[26];
                this.cubelets[25] = swap[23];
                this.cubelets[26] = swap[20];
                this.cubelets[23] = swap[19];
            });
        } else if (notation === 'B2') {
            await this.side.back.rotate('Z', DEG2);
            doSwap(() => {
                this.cubelets[18] = swap[26];
                this.cubelets[19] = swap[25];
                this.cubelets[20] = swap[24];
                this.cubelets[21] = swap[23];
                this.cubelets[24] = swap[20];
                this.cubelets[25] = swap[19];
                this.cubelets[26] = swap[18];
                this.cubelets[23] = swap[21];
            });
        }
        this.map()
    }

    /**
     * Get range indexes for cubelets along a given axis and layer
     *    y0
     *    \__x0
     * z0/
     * @param axis 'x' | 'y' | 'z'
     * @param layer 0 is start of axis
     * @return number[] Array of cubelet indexes representing the slice cubelets
     * 
     */
    getIndexRange(axis: 'x' | 'y' | 'z', layer: number): number[] {
        const arr: number[] = [];
        if (axis === 'z') {
            const size = this.size * this.size;
            const start = layer * size;
            for (let i = 0; i < size; i++) {
                arr.push(start + i);
            }
        } else if (axis === 'y') {
            for (let i = 0; i < this.size; i++) {
                const start = i * this.size * this.size + layer * this.size;
                for (let j = 0; j < this.size; j++) {
                    arr.push(start + j);
                }
            }
        } else { // axis === 'x'
            const size = this.size * this.size;
            layer = (this.size - 1) - layer; // invert for x axis
            for (let i = 0; i < this.size; i++) {
                let start = (size * i) + layer
                for (let j = 0; j < this.size; j++) {   
                    arr.push(start);
                    start = start + this.size;
                }
            }
        }
        return arr;
    }

    setRadius(radius: number = 0, onComplete?: (() => void)) {
        this.cubelets.forEach( cubelet => {
            cubelet.setRadius(radius, onComplete)
        })
    }
}

type TwistNotation = 'U' | 'D' | 'L' | 'R' | 'F' | 'B' |
    'u' | 'd' | 'l' | 'r' | 'f' | 'b' |
    "U'" | "D'" | "L'" | "R'" | "F'" | "B'" |
    'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2' |
    'u2' | 'd2' | 'l2' | 'r2' | 'f2' | 'b2' |
    'X' | 'Y' | 'Z' |
    "X'" | "Y'" | "Z'" |
    'X2' | 'Y2' | 'Z2' ;