import { PIECES_COLOR_MAP, RUBIKS_THREE_COLORS } from '@/consts/cube';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
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

    private readonly totalPiece = 27;
    readonly groupPieces: THREE.Group = new THREE.Group();
    readonly groupRotate: THREE.Group = new THREE.Group();
    readonly cubeGeometries: THREE.BufferGeometry[] = [];
    private _piecePositions: [number, number, number][] = [];
    constructor() {
    }

    async generateCube() {
        const sizePiece = 0.90;
        const meshPieces: Record<number, THREE.Mesh> = {}

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
                        color = RUBIKS_THREE_COLORS.base;
                    }

                    colors.push(...this.makeVerticesColorFace(color));
                }
            }

            boxPiece.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            console.log({
                piece,
                boxPiece,
                colors,
            });


            meshPieces[piece] = new THREE.Mesh(boxPiece, material);
            this.groupPieces.add(meshPieces[piece]);

        }

        this.groupPieces.add(this.groupRotate);

        for (const pieceNum in meshPieces) {
            const posOfPiece = this.piecePos(parseInt(pieceNum))
            if (!posOfPiece) {
                throw new Error(`Position for piece ${pieceNum} not found.`);
            }
            meshPieces[pieceNum].position.set(...posOfPiece);
        }

        this.groupPieces.position.x = 0.25;
        this.groupPieces.position.y = 0.75;
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
}


function CubeObj() {
    const { scene } = useThree();
    // camera.position.set(0, 0, 5);

    const cube = useMemo(() => {
        const cube = new RubiksCube();
        cube.generateCube();
        return cube;
    }, []);

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

