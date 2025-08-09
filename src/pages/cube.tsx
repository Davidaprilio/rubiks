import { CubeFace, mapCubeFaceByIndex, mapCubeFaceByName, PIECES_COLOR_MAP, RUBIKS_THREE_COLORS, type Colors, type CubeFaceType, type KeyColors } from '@/consts/cube';
import { getArrMatrixIndex, rotateMatrix } from '@/lib/utils';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/Addons.js';

const fontLoader = new FontLoader();
fontLoader.load('fonts/helvetiker_regular.typeface.json',
    function (font) {
        // Font loaded successfully, now use it to create TextGeometry
        console.log('Font loaded:', font);
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (err) {
        console.log('An error happened:', err);
    });

const AXIS_COLORS = {
    X: RUBIKS_THREE_COLORS.red,
    Y: RUBIKS_THREE_COLORS.green,
    Z: RUBIKS_THREE_COLORS.blue,
} as const;

const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: 0xffffff,
});

export class RubiksCube {

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
        // side faces rotation
        if (mapCubeFaceByIndex[faceIndex].adjacent) {
            let tmpPieces: [number, KeyColors][] = [];
            const adjacent = [...mapCubeFaceByIndex[faceIndex].adjacent]
            if (!clockwise) {
                adjacent.reverse();
                adjacent.unshift(adjacent.pop()!); // Move last to first
            }
            adjacent.forEach((adjacentFaceName, index, arrAdjacent) => {
                if (index === 0) {
                    // get left face pieces
                    const lastFaceIndex = CubeFace[arrAdjacent[3]].faceIndex
                    console.log({
                        cubeState: this.cubeState[lastFaceIndex],
                        adjacentFaceName,
                        arrAdjacent,
                        lastFaceIndex,
                        state: this.cubeState,
                    });

                    tmpPieces = getArrMatrixIndex(this.cubeState[lastFaceIndex], clockwise ? 'row' : 'col', this.size, 0);
                }
                const sideFaceIndex = CubeFace[adjacentFaceName].faceIndex
                let direction: 'row' | 'col' = index > 1 ? 'row' : 'col'
                if (!clockwise) {
                    direction = [1,2].includes(index) ? 'row' : 'col';
                }
                const safePieces = getArrMatrixIndex(this.cubeState[sideFaceIndex], direction, this.size, 0);
                tmpPieces.forEach(([, color], i) => {
                    this.cubeState[sideFaceIndex][safePieces[i][0]] = color;
                });
                tmpPieces = safePieces;
            });
        }
    }

    printState() {
        if (this.cubeState.length === 0) {
            this.makeCubeState();
        }
        console.log('Current Cube State:');
        let faceStatePosition = '';
        for (let i = 0; i < this.cubeState.length; i++) {
            faceStatePosition += `${i} ${mapCubeFaceByIndex[i].name[0]}: ${this.cubeState[i].join(' ')}\n`;
        }

        console.log(faceStatePosition);

        // maps 3d to 2d
        //       | U(Y) |
        // L(B) | F(R) | R(G) | B(O)
        //     | D(W) |
        const emptySpace = Array(this.size).fill(' ').join(' ');

        const getStateByName = (name: CubeFaceType['name']) => [...this.cubeState[mapCubeFaceByName[name].faceIndex!]];
        const c2dArr = [
            [null, getStateByName('Up'), null, null],
            [getStateByName('Left'), getStateByName('Front'), getStateByName('Right'), getStateByName('Back')],
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
}

export const rubiks = new RubiksCube();
rubiks.makeCubeState();
window.rubiks = rubiks; // Expose for debugging

function CubeObj() {
    const { scene } = useThree();
    // camera.position.set(0, 0, 5);

    const cube = useMemo(() => {
        const cube = new RubiksCube();
        cube.generateCube();
        // cube.groupPieces.traverse(child => {
        //     if ((child as THREE.Mesh).isMesh) {
        //         const mesh = child as THREE.Mesh;
        //         const wireframe = new THREE.LineSegments(
        //             new THREE.WireframeGeometry(mesh.geometry),
        //             new THREE.LineBasicMaterial({ color: 0x00ff00 })
        //         );
        //         wireframe.position.copy(mesh.position);
        //         wireframe.rotation.copy(mesh.rotation);
        //         wireframe.scale.copy(mesh.scale);
        //         scene.add(wireframe);
        //     }
        // });
        return cube;
    }, []);
    
    useFrame(() => {        
        cube.animate();

    });

    useEffect(() => {
        scene.add(cube.groupPieces);
        return () => {
            scene.remove(cube.groupPieces);
        };
    }, [scene, cube]);

    return (
        <primitive object={cube.groupPieces} />
    );
}


export default function Cube() {
    return (
        <div className='w-screen min-h-screen'>
            <Canvas className='!h-screen'
                camera={{
                    position: [0, 0, 5],
                    fov: 90,
                    near: 0.1,
                    far: 1000
                }}
                style={{ backgroundColor: '#000' }}
            >
                <ambientLight intensity={Math.PI / 2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
                <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

                <CubeObj />

                <mesh 
                    position={[0, 0, 0]} 
                    // rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                    castShadow
                >
                    {/* <planeGeometry args={[1_000, 1_000, 500, 500]} />
                    <meshLambertMaterial color={new THREE.Color('#aaffa')} />
                    <gridHelper 
                        args={[1_000, 100, '#888888', '#444444']} 
                        position={[0, 0, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    /> */}

                    <axesHelper
                        position={[0, 0, 0]}
                        args={[3.5]}
                        setColors={[AXIS_COLORS.X, AXIS_COLORS.Y, AXIS_COLORS.Z]}
                    />
                </mesh>

                <OrbitControls />
            </Canvas>
        </div>
    )
}

