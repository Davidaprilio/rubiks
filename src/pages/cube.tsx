import { Rubiks } from '@/classes/rubiks';
import { RUBIKS_THREE_COLORS } from '@/consts/cube';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

declare global {
    interface Window {
        rubiks: Rubiks;
    }
}
// import { FontLoader } from 'three/examples/jsm/Addons.js';

// const fontLoader = new FontLoader();
// fontLoader.load('fonts/helvetiker_regular.typeface.json',
//     function (font) {
//         // Font loaded successfully, now use it to create TextGeometry
//         console.log('Font loaded:', font);
//     },
//     function (xhr) {
//         console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//     },
//     function (err) {
//         console.log('An error happened:', err);
//     });

const AXIS_COLORS = {
    X: RUBIKS_THREE_COLORS.red,
    Y: RUBIKS_THREE_COLORS.green,
    Z: RUBIKS_THREE_COLORS.blue,
} as const;


(() => {
    console.clear();
    const rubiks = new Rubiks();
    rubiks.makeCubeState();
    window.rubiks = rubiks; // Expose for debugging
   

    // rubiks.turns("R U R' U'");
    // rubiks.turns("F2");
    rubiks.turns("R U R' U R U2 R'");
    rubiks.printState();
    rubiks.turns("R U2 R' U' R U' R");
    rubiks.printState();
})()


// function CubeObj() {
//     const { scene } = useThree();
//     // camera.position.set(0, 0, 5);

//     const cube = useMemo(() => {
//         const cube = new RubiksCube();
//         cube.generateCube();
//         // cube.groupPieces.traverse(child => {
//         //     if ((child as THREE.Mesh).isMesh) {
//         //         const mesh = child as THREE.Mesh;
//         //         const wireframe = new THREE.LineSegments(
//         //             new THREE.WireframeGeometry(mesh.geometry),
//         //             new THREE.LineBasicMaterial({ color: 0x00ff00 })
//         //         );
//         //         wireframe.position.copy(mesh.position);
//         //         wireframe.rotation.copy(mesh.rotation);
//         //         wireframe.scale.copy(mesh.scale);
//         //         scene.add(wireframe);
//         //     }
//         // });
//         return cube;
//     }, []);
    
//     useFrame(() => {        
//         cube.animate();

//     });

//     useEffect(() => {
//         scene.add(cube.groupPieces);
//         return () => {
//             scene.remove(cube.groupPieces);
//         };
//     }, [scene, cube]);

//     return (
//         <primitive object={cube.groupPieces} />
//     );
// }


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

                {/* <CubeObj /> */}

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

