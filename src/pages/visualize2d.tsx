import { Rubiks } from "@/classes/rubiks";
import type { KeyColors, Notation, NotationDouble, NotationInverse } from "@/consts/cube";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const notations: Record<Notation|NotationInverse|NotationDouble, string> = {
    'F': 'Front',
    'B': 'Back',
    'R': 'Right',
    'L': 'Left',
    'U': 'Up',
    'D': 'Down',
    'Fi': 'Front Inverse',
    'Bi': 'Back Inverse',
    'Ri': 'Right Inverse',
    'Li': 'Left Inverse',
    'Ui': 'Up Inverse',
    'Di': 'Down Inverse',
    'F2': 'Front Double',
    'B2': 'Back Double',
    'R2': 'Right Double',
    'L2': 'Left Double',
    'U2': 'Up Double',
    'D2': 'Down Double',
}

export default function Visualize2D() {
    const rubiksRef = useRef<Rubiks>(null!);
    const [cubeState, setCubeState] = useState<KeyColors[][]>([[], [], [], [], [], []]);

    useEffect(() => {
        const rubiks = new Rubiks();
        rubiksRef.current = rubiks;
        rubiks.makeCubeState(); // initialize cube state
        console.log('rubiks', rubiks.getState());
        setCubeState(rubiks.getState()); // snapshot awal

        
    }, []);

    // panggil ini setiap selesai melakukan move pada rubiksRef.current
    const refreshCubeState = () => setCubeState(rubiksRef.current.getState());

    function turnCube(notation: Notation) {
        if (rubiksRef.current) {
            rubiksRef.current.turn(notation);
            refreshCubeState();
        }
    }

    return (
        <div className='w-screen min-h-screen select-none'>
            <h1 className='text-2xl text-center mt-4'>Visualize 2D Rubik's</h1>

            <div className="mt-15">
                <div className="grid grid-rows-3 mx-auto w-fit mb-10">
                    <div className="grid grid-cols-4 w-fit">
                        <div></div>
                        <Face pieces={cubeState[2]} className="-rotate-90" />
                        <div></div>
                        <div></div>
                    </div>
                    <div className="grid grid-cols-4 w-fit">
                        <Face pieces={cubeState[4]} className="rotate-90" />
                        <Face pieces={cubeState[0]} className="" />
                        <Face pieces={cubeState[1]} className="" />
                        <Face pieces={cubeState[3]} className="rotate-90" />
                    </div>
                    <div className="grid grid-cols-4 w-fit">
                        <div></div>
                        <Face pieces={cubeState[5]} />
                        <div></div>
                        <div></div>
                    </div>
                </div>

                <div>
                    <h2 className='text-xl text-center mt-4'>Controls</h2>
                    <div className='grid grid-cols-6 gap-4 justify-center mt-5 w-fit mx-auto'>
                        {Object.entries(notations).map(([notation, label]) => (
                            <button
                                key={notation}
                                className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700'
                                onClick={() => turnCube(notation as Notation)}
                            >
                                <div>{notation}</div>
                                <div className="text-xs">({label})</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Face(props: { pieces: string[], className?: string }) {
    return (
        <div className={cn('border grid grid-cols-3', props.className)}>
            {props.pieces.map((color, index) => (
                <Piece key={index} className={cn({
                    'bg-red-500': color.startsWith('R'),
                    'bg-blue-500': color.startsWith('B'),
                    'bg-green-500': color.startsWith('G'),
                    'bg-yellow-400 text-yellow-950': color.startsWith('Y'),
                    'bg-orange-500': color.startsWith('O'),
                    'bg-white text-slate-700': color.startsWith('W'),
                })} value={color} />
            ))}
        </div>
    );
}

function Piece(props: { className: string, value: string }) {
    return (
        <div className={cn('size-10 border border-black rounded flex items-center justify-center', props.className)}>{props.value}</div>
    );
}