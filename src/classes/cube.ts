import { Cubelet } from "./cubelet";
import * as THREE from "three";
import { Group } from "./group";
import { Slice } from "./slice";
import { Faces } from "./face";
import type { CubeColor } from "./colors";

export class Cube {
    public size = 3;
    public cubelets: Cubelet[] = [];
    public cubeletsMapId: { [id: number]: number } = {}; // id to index map
    readonly threeObj: THREE.Object3D = new THREE.Object3D();
    public twistDuration: number = .5; // in seconds
    public doubleTwistDuration: number = .8; // in seconds
    private queueTwist: TwistNotation[] = [];
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
    
    public faces = new Faces(this);

    constructor() {
        // const domEl = document.createElement( 'div' )
        // domEl.classList.add( 'cube' )
        // this.threeObj = new CSS3DObject(domEl);
        this.threeObj.name = 'cube';
        this.makeCubelet();
    }

    makeCubelet() {
        const cube = this;
        ([
            //  Front slice
            [1, 1, 0, 0, 1, 0], [1, 1, 0, 0, 0, 0], [1, 1, 1, 0, 0, 0],//   0,  1,  2
            [1, 0, 0, 0, 1, 0], [1, 0, 0, 0, 0, 0], [1, 0, 1, 0, 0, 0],//   3,  4,  5
            [1, 0, 0, 1, 1, 0], [1, 0, 0, 1, 0, 0], [1, 0, 1, 1, 0, 0],//   6,  7,  8
            //  Standing slice
            [0, 1, 0, 0, 1, 0], [0, 1, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0],//   9, 10, 11
            [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],//  12, XX, 14
            [0, 0, 0, 1, 1, 0], [0, 0, 0, 1, 0, 0], [0, 0, 1, 1, 0, 0],//  15, 16, 17
            //  Back slice
            [0, 1, 0, 0, 1, 1], [0, 1, 0, 0, 0, 1], [0, 1, 1, 0, 0, 1],//  18, 19, 20
            [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 1], [0, 0, 1, 0, 0, 1],//  21, 22, 23
            [0, 0, 0, 1, 1, 1], [0, 0, 0, 1, 0, 1], [0, 0, 1, 1, 0, 1] //  24, 25, 26
        ]).forEach(function (cubeletColorMap, cubeletId) {
            cube.cubelets.push(new Cubelet(cube, cubeletId, cubeletColorMap))
        })

        this.map();

        for (const key in this.faces) {
            const face = this.faces[key as keyof typeof this.faces];
            
        }
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

        this.faces.up.replace(...this.side.up.cubelets);
        this.faces.down.replace(...this.side.down.cubelets);
        this.faces.left.replace(...this.side.left.cubelets);
        this.faces.right.replace(...this.side.right.cubelets);
        this.faces.front.replace(...this.side.front.cubelets);
        this.faces.back.replace(...this.side.back.cubelets);

        this.cubelets.forEach((cubelet, index) => {
            this.cubeletsMapId[cubelet.id] = index;
        });
    }

    getCubelet(id: number): Cubelet | null {
        const index = this.cubeletsMapId[id];
        if (index !== undefined) {
            return this.cubelets[index];
        }
        return null;
    }

    async runNotation(sequence: string|TwistNotation[], onComplete?: ((cubelets: Cubelet[]) => void)) {
        const emptyQueue = this.queueTwist.length === 0;
        if (typeof sequence === 'string') {
            const moves = sequence.trim().split('')
            for (let i = 0; i < moves.length; i++) {
                let move = moves[i]
                const nextMove = moves[i + 1]
                if (nextMove === "'" || nextMove === "2") {
                    move += nextMove
                    i++;
                }
                this.queueTwist.push(move as TwistNotation);
            }
        } else {
            this.queueTwist.push(...sequence);
        }
        if (!emptyQueue) {
            return;
        }
        while (this.queueTwist.length > 0) {
            await this.twist(this.queueTwist.shift() as TwistNotation)
        }
        if (onComplete) onComplete(this.cubelets)
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
        } else if (notation === 'E') {
            await this.side.equator.rotate('Y', -DEG);
            doSwap(() => {
                this.cubelets[3] = swap[21];
                this.cubelets[5] = swap[3];
                this.cubelets[23] = swap[5];
                this.cubelets[21] = swap[23];
                this.cubelets[4] = swap[12];
                this.cubelets[14] = swap[4];
                this.cubelets[22] = swap[14];
                this.cubelets[12] = swap[22];
            });
        } else if (notation === "E'") {
            await this.side.equator.rotate('Y', DEG);
            doSwap(() => {
                this.cubelets[3] = swap[5];
                this.cubelets[5] = swap[23];
                this.cubelets[23] = swap[21];
                this.cubelets[21] = swap[3];
                this.cubelets[4] = swap[14];
                this.cubelets[14] = swap[22];
                this.cubelets[22] = swap[12];
                this.cubelets[12] = swap[4];
            });
        } else if (notation === 'E2') {
            await this.side.equator.rotate('Y', DEG2);
            doSwap(() => {
                this.cubelets[3] = swap[23];
                this.cubelets[5] = swap[21];
                this.cubelets[23] = swap[3];
                this.cubelets[21] = swap[5];
                this.cubelets[4] = swap[22];
                this.cubelets[14] = swap[12];
                this.cubelets[22] = swap[4];
                this.cubelets[12] = swap[14];
            });
        } else if (notation === 'M') {
            await this.side.middle.rotate('X', -DEG);
            doSwap(() => {
                this.cubelets[1] = swap[19];
                this.cubelets[7] = swap[1];
                this.cubelets[25] = swap[7];
                this.cubelets[19] = swap[25];
                this.cubelets[4] = swap[10];
                this.cubelets[16] = swap[4];
                this.cubelets[22] = swap[16];
                this.cubelets[10] = swap[22];
            });
        } else if (notation === "M'") {
            await this.side.middle.rotate('X', DEG);
            doSwap(() => {
                this.cubelets[1] = swap[7];
                this.cubelets[7] = swap[25];
                this.cubelets[25] = swap[19];
                this.cubelets[19] = swap[1];
                this.cubelets[4] = swap[16];
                this.cubelets[16] = swap[22];
                this.cubelets[22] = swap[10];
                this.cubelets[10] = swap[4];
            });
        } else if (notation === 'M2') {
            await this.side.middle.rotate('X', DEG2);
            doSwap(() => {
                this.cubelets[1] = swap[25];
                this.cubelets[25] = swap[1];
                this.cubelets[7] = swap[19];
                this.cubelets[19] = swap[7];
                this.cubelets[4] = swap[22];
                this.cubelets[16] = swap[10];
                this.cubelets[22] = swap[4];
                this.cubelets[10] = swap[16];
            });
        } else if (notation === 'S') {
            await this.side.standing.rotate('Z', DEG);
            doSwap(() => {
                this.cubelets[9] = swap[15];
                this.cubelets[11] = swap[9];
                this.cubelets[17] = swap[11];
                this.cubelets[15] = swap[17];
                this.cubelets[10] = swap[12];
                this.cubelets[14] = swap[10];
                this.cubelets[16] = swap[14];
                this.cubelets[12] = swap[16];
            });
        } else if (notation === "S'") {
            await this.side.standing.rotate('Z', -DEG);
            doSwap(() => {
                this.cubelets[9] = swap[11];
                this.cubelets[11] = swap[17];
                this.cubelets[17] = swap[15];
                this.cubelets[15] = swap[9];
                this.cubelets[10] = swap[14];
                this.cubelets[14] = swap[16];
                this.cubelets[16] = swap[12];
                this.cubelets[12] = swap[10];
            });
        } else if (notation === 'S2') {
            await this.side.standing.rotate('Z', DEG2);
            doSwap(() => {
                this.cubelets[9] = swap[17];
                this.cubelets[11] = swap[15];
                this.cubelets[17] = swap[9];
                this.cubelets[15] = swap[11];
                this.cubelets[10] = swap[16];
                this.cubelets[14] = swap[12];
                this.cubelets[16] = swap[10];
                this.cubelets[12] = swap[14];
            });
        } else if (notation === 'u') {
            await Promise.all([
                this.twist("U"),
                this.twist("E'")
            ]);
        } else if (notation === 'd') {
            await Promise.all([
                this.twist("D"),
                this.twist("E")
            ]);
        } else if (notation === 'l') {
            await Promise.all([
                this.twist("L"),
                this.twist("M")
            ]);
        } else if (notation === 'r') {
            await Promise.all([
                this.twist("R"),
                this.twist("M'")
            ]);
        } else if (notation === 'f') {
            await Promise.all([
                this.twist("F"),
                this.twist("S")
            ]);
        } else if (notation === 'b') {
            await Promise.all([
                this.twist("B"),
                this.twist("S'")
            ]);
        } else if (notation === "f'") {
            await Promise.all([
                this.twist("F'"),
                this.twist("S'")
            ]);
        } else if (notation === "b'") {
            await Promise.all([
                this.twist("B'"),
                this.twist("S")
            ]);
        } else if (notation === "u'") {
            await Promise.all([
                this.twist("U'"),
                this.twist("E")
            ]);
        } else if (notation === "d'") {
            await Promise.all([
                this.twist("D'"),
                this.twist("E'")
            ]);
        } else if (notation === "l'") {
            await Promise.all([
                this.twist("L'"),
                this.twist("M'")
            ]);
        } else if (notation === "r'") {
            await Promise.all([
                this.twist("R'"),
                this.twist("M")
            ]);
        } else {
            console.warn(`Unsupported notation: ${notation}`);
            return;
        }

        if (notation === notation.toLowerCase()) {
            return;
        }
        this.map()
    }

    async scrumble(moves: number = 20, durationPerMoveSec: number = 0.1) {
        const safeTwistDurations = this.twistDuration
        const safeDoubleTwistDurations = this.doubleTwistDuration
        this.twistDuration = durationPerMoveSec
        this.doubleTwistDuration = durationPerMoveSec * 0.8
        let prev = ''
        const notations: TwistNotation[] = [
            'U', "U'", 'U2',
            'D', "D'", 'D2',
            'L', "L'", 'L2',
            'R', "R'", 'R2',
            'F', "F'", 'F2',
            'B', "B'", 'B2',
        ];
        let arr: TwistNotation[] = [];
        for (let i = 0; i < moves; i++) {
            const randIndex = Math.floor(Math.random() * notations.length);
            const notation = notations[randIndex];
            // avoid repeating the same move
            if (prev.includes(notation[0])) {
                i--;
                continue;
            }
            arr.push(notation);
            prev = notation;
        }
        const res = await this.runNotation(arr);
        this.twistDuration = safeTwistDurations
        this.doubleTwistDuration = safeDoubleTwistDurations
        return res;
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
        this.cubelets.forEach(cubelet => {
            cubelet.setRadius(radius, onComplete)
        })
    }

    hasColor(color: string|CubeColor) {
        let results = new Group()
        this.cubelets.forEach((cubelet) => {
            if(cubelet.hasColor( color )) results.add(cubelet);
        })
        return results
    }

    //  this function implies AND rather than OR, XOR, etc.
    hasColors(...colors: (string|CubeColor)[]) {
        let results = new Group();
        this.cubelets.forEach((cubelet) => {
            if(cubelet.hasColors(...colors)) results.add(cubelet);
        })
        return results;
    }
}

type TwistNotation = 'U' | 'D' | 'L' | 'R' | 'F' | 'B' |
    'u' | 'd' | 'l' | 'r' | 'f' | 'b' |
    "u'" | "d'" | "l'" | "r'" | "f'" | "b'" |
    "U'" | "D'" | "L'" | "R'" | "F'" | "B'" |
    'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2' |
    'u2' | 'd2' | 'l2' | 'r2' | 'f2' | 'b2' |
    'M' | 'E' | 'S' | "M'" | "E'" | "S'" | 'M2' | 'E2' | 'S2' |
    'X' | 'Y' | 'Z' |
    "X'" | "Y'" | "Z'" |
    'X2' | 'Y2' | 'Z2';