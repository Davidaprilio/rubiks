import { Cubelet } from "./cubelet";
import * as THREE from "three";
import { Group } from "./group";
import { Slice } from "./slice";

export class Cube {
    public size = 3;
    public cubelets: Cubelet[] = [];
    readonly threeObj: THREE.Object3D;
    public twistDuration: number = 1; // in seconds
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


        this.side.up.add(...this.getIndexRange('y', 0).map(i => this.cubelets[i]))
        this.side.equator.add(...this.getIndexRange('y', 1).map(i => this.cubelets[i]))
        this.side.down.add(...this.getIndexRange('y', 2).map(i => this.cubelets[i]))

        this.side.right.add(...this.getIndexRange('x', 0).map(i => this.cubelets[i]))
        this.side.middle.add(...this.getIndexRange('x', 1).map(i => this.cubelets[i]))
        this.side.left.add(...this.getIndexRange('x', 2).map(i => this.cubelets[i]))

        this.side.front.add(...this.getIndexRange('z', 0).map(i => this.cubelets[i]))
        this.side.standing.add(...this.getIndexRange('z', 1).map(i => this.cubelets[i]))
        this.side.back.add(...this.getIndexRange('z', 2).map(i => this.cubelets[i]))
    }

    twist(notation: TwistNotation, onComplete?: (() => void)) {
        const DEG = 90;
        const DEG2 = 180;
        if (notation === 'U') {
            this.side.up.rotate('Y', DEG, onComplete);
        } else if (notation === "U'") {
            this.side.up.rotate('Y', -DEG, onComplete);
        } else if (notation === 'U2') {
            this.side.up.rotate('Y', DEG2, onComplete);
        } else if (notation === 'D') {
            this.side.down.rotate('Y', -DEG, onComplete);
        } else if (notation === "D'") {
            this.side.down.rotate('Y', DEG, onComplete);
        } else if (notation === 'D2') {
            this.side.down.rotate('Y', DEG2, onComplete);
        } else if (notation === 'L') {
            this.side.left.rotate('X', -DEG, onComplete);
        } else if (notation === "L'") {
            this.side.left.rotate('X', DEG, onComplete);
        } else if (notation === 'L2') {
            this.side.left.rotate('X', DEG2, onComplete);
        } else if (notation === 'R') {
            this.side.right.rotate('X', DEG, onComplete);
        } else if (notation === "R'") {
            this.side.right.rotate('X', -DEG, onComplete);
        } else if (notation === 'R2') {
            this.side.right.rotate('X', DEG2, onComplete);
        } else if (notation === 'F') {
            this.side.front.rotate('Z', DEG, onComplete);
        } else if (notation === "F'") {
            this.side.front.rotate('Z', -DEG, onComplete);
        } else if (notation === 'F2') {
            this.side.front.rotate('Z', DEG2, onComplete);
        } else if (notation === 'B') {
            this.side.back.rotate('Z', -DEG, onComplete);
        } else if (notation === "B'") {
            this.side.back.rotate('Z', DEG, onComplete);
        } else if (notation === 'B2') {
            this.side.back.rotate('Z', DEG2, onComplete);
        }
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