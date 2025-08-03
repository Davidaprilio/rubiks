import { ArcballControls, DragControls, OrbitControls, useHelper, type HelperProps } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { cloneElement, isValidElement, useEffect, useMemo, useRef, type ReactElement, type RefObject } from 'react';
import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const CubeFace = {
    RED: {
        code: "R",
        color: "#B90000",
    },
    ORANGE: {
        code: "O",
        color: "#FF5900",
    },
    YELLOW: {
        code: "Y",
        color: "#FFD500",
    },
    WHITE: {
        code: "W",
        color: "#FFFFFF",
    },
    GREEN: {
        code: "G",
        color: "#009B48",
    },
    BLUE: {
        code: "B",
        color: "#0045AD",
    },
    BASE: {
        code: "X",
        color: "#000000",
    },
} as const;


const THREE_COLORS = {
    red: new THREE.Color(CubeFace.RED.color),
    orange: new THREE.Color(CubeFace.ORANGE.color),
    yellow: new THREE.Color(CubeFace.YELLOW.color),
    white: new THREE.Color(CubeFace.WHITE.color),
    green: new THREE.Color(CubeFace.GREEN.color),
    blue: new THREE.Color(CubeFace.BLUE.color),
    base: new THREE.Color(CubeFace.BASE.color),
}


const gui = new GUI();

export class RubiksCube {

    private readonly totalPiece = 1;
    readonly groupPieces: THREE.Group = new THREE.Group();
    readonly groupRotate: THREE.Group = new THREE.Group();
    readonly cubeGeometries: THREE.BufferGeometry[] = [];
    private _piecePositions: [number, number, number][] = [];    

    async generate() {
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            color: 0xffffff,
        });
        // const material = new THREE.MeshPhongMaterial({ 
        //     emissive: 0x072534, 
        //     color: 0x156289,
        //     side: THREE.DoubleSide, 
        //     flatShading: true 
        // });


        const box = new THREE.BoxGeometry(15, 15, 15, 1, 1, 1);
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(0, 0, 0);
        mesh.castShadow = true;
        
        const colors = [
            ...this.getColorFace(THREE_COLORS.red), // front
            ...this.getColorFace(THREE_COLORS.orange), // back
            ...this.getColorFace(THREE_COLORS.yellow), // top
            ...this.getColorFace(THREE_COLORS.white), // bottom
            ...this.getColorFace(THREE_COLORS.blue), // left
            ...this.getColorFace(THREE_COLORS.green), // right
        ];
        // for (let face = 0; face < 6; face++) {
        //     // set color to all (6) vertices
        //     for (let vertex = 0; vertex < 6; vertex++) {
        //         colors.push(color.r, color.g, color.b);
        //     }
        // }

        box.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // box can dragged control
    
        this.groupPieces.add(mesh);
        // this.groupPieces.add(new THREE.LineSegments(box, lineMaterial));


        // gui.add(this.groupPieces.position, 'x', -50, 50, 0.1).name('Position X');
        // gui.add(material, 'wireframe').name('Wireframe');
    }

    getColorFace(color: THREE.Color): number[] {
        return [
            ...color.toArray(),
            ...color.toArray(),
            ...color.toArray(),
            ...color.toArray(),
        ];
    }
}

function CubeObj() {
    const { scene,  } = useThree();
    // camera.position.set(0, 0, 5);

    const cube = useMemo(() => {
        const cube = new RubiksCube();
        cube.generate();
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

type LightHelperType = typeof THREE.DirectionalLightHelper 
    | typeof THREE.PointLightHelper 
    | typeof THREE.SpotLightHelper;

function LightWithHelper<T extends LightHelperType>({children, helper, args}: {
    helper: T
    children?: ReactElement<{ ref?: RefObject<THREE.Object3D> }>
    args?: HelperProps<T>['args']
}) {
    const lightRef = useRef<THREE.Object3D>(null!);

    useHelper(
        lightRef, 
        helper, 
        ...args!
    );

    if (!isValidElement(children)) return null;
    return cloneElement(children, { ref: lightRef });
}

export default function Studio() {
    return (
        <div className='w-screen min-h-screen'>
            <Canvas className='!h-screen'
                camera={{
                    isPerspectiveCamera: true,
                    position: [50, 0, 0],
                    fov: 90,
                    near: 0.1,
                    far: 1000
                }}
                scene={{ 
                    background: new THREE.Color('#444444')
                }}
                style={{ backgroundColor: '#000' }}
                frameloop='demand'
            >
                <LightWithHelper helper={THREE.DirectionalLightHelper} args={[1, '#ff0000']}>
                    <directionalLight 
                        color={new THREE.Color('#ffffff')} 
                        intensity={1} 
                        position={[30, 100, 0]} 
                    />
                </LightWithHelper>
                <LightWithHelper helper={THREE.SpotLightHelper} args={['#0000ff']}>
                    <spotLight 
                        color={new THREE.Color('#ffffff')} 
                        intensity={3} 
                        position={[0, 45, 0]} 
                        angle={Math.PI / 10}
                        penumbra={0.5}
                        decay={0}
                    />
                </LightWithHelper>
                <LightWithHelper helper={THREE.DirectionalLightHelper} args={[1, '#ff0000']}>
                    <directionalLight 
                        color={new THREE.Color('#ffffff')} 
                        intensity={3} 
                        position={[100, 200, 100]} 
                    />
                </LightWithHelper>
                <LightWithHelper helper={THREE.DirectionalLightHelper} args={[1, '#ff0000']}>
                    <directionalLight 
                        color={new THREE.Color('#ffffff')} 
                        intensity={3} 
                        position={[-30, -30, -60]} 
                    />
                </LightWithHelper>

                <CubeObj />
                
                <mesh 
                    position={[0, 0, 0]} 
                    rotation={[-Math.PI / 2, 0, 0]}
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
                        position={[0, 0, 1]}
                        args={[100]}
                    />
                </mesh>

                <ArcballControls />
                {/* <OrbitControls /> */}
            </Canvas>
        </div>
    )
}

