import type { Facelet } from "@/classes/models/facelet";
import { Rubiks } from "@/classes/rubiks";
import { Rubiks3x3Solver } from "@/classes/solvers/Rubiks3x3.solver";
import type { Notation, NotationDouble, NotationInverse } from "@/consts/cube";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        solver: Rubiks3x3Solver;
        rubiks: Rubiks;
    }
}

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
    const rubiksRef = useRef<Rubiks>(null);
    const solverRef = useRef<Rubiks3x3Solver>(null!);
    const [, setRefresh] = useState<boolean>(false);
    const [step, setStep] = useState<string>('');
    useEffect(() => {
        const rubiks = new Rubiks();
        rubiksRef.current = rubiks;
        rubiks.makeCubeState(); // initialize cube state
        // rubiks.turns('L R Bi Ri Fi F Li L2 R2 Ri Di U Ri R2 B2 B F Li Ui Di U2 U2 Fi F2 U Li U2 Ri');
        rubiks.turns('R U Ri U R U2 Ri');

        const solver = new Rubiks3x3Solver(rubiks);
        solverRef.current = solver;
        window.solver = solver;
        window.rubiks = rubiks;

        console.log({
            // hasCross: solver.hasCross()
            // getFaceF2L: solver.getFaceF2L(4)
        });
        setRefresh(true);
    }, []);

    useEffect(() => {
        if(step.length) console.log(step);
    }, [step]);

    // panggil ini setiap selesai melakukan move pada rubiksRef.current
    const refreshCubeState = () => setRefresh((r) => !r);
    
    function turnCube(notation: Notation) {
        if (rubiksRef.current) {
            setStep((prevStep) => `${prevStep} ${notation}`.trimStart());
            rubiksRef.current.turn(notation);
            refreshCubeState();
        }
    }
    
    if (rubiksRef.current == null) {
        return null;
    }

    return (
        <div className='w-screen min-h-screen select-none'>
            <h1 className='text-2xl text-center mt-4'>Visualize 2D Rubik's</h1>

            <div className="mt-15">
                <div className="grid grid-rows-3 mx-auto w-fit mb-10">
                    <div className="grid grid-cols-4 w-fit">
                        <div></div>
                        <Face pieces={rubiksRef.current.facelets[2]} className="-rotate-90" />
                        <div></div>
                        <div></div>
                    </div>
                    <div className="grid grid-cols-4 w-fit">
                        <Face pieces={rubiksRef.current.facelets[4]} className="rotate-90" />
                        <Face pieces={rubiksRef.current.facelets[0]} className="" />
                        <Face pieces={rubiksRef.current.facelets[1]} className="" />
                        <Face pieces={rubiksRef.current.facelets[3]} className="rotate-90" />
                    </div>
                    <div className="grid grid-cols-4 w-fit">
                        <div></div>
                        <Face pieces={rubiksRef.current.facelets[5]} />
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

function Face(props: { pieces: Facelet[], className?: string }) {
    return (
        <div className={cn('border grid grid-cols-3', props.className)}>
            {props.pieces.map((facelet, index) => (
                <FaceletEl 
                    key={index} 
                    facelet={facelet} 
                    onClick={() => console.log(facelet)}
                    className={cn({
                        'bg-red-500': facelet.color.startsWith('R'),
                        'bg-blue-500': facelet.color.startsWith('B'),
                        'bg-green-500': facelet.color.startsWith('G'),
                        'bg-yellow-400 text-yellow-950': facelet.color.startsWith('Y'),
                        'bg-orange-500': facelet.color.startsWith('O'),
                        'bg-white text-slate-700': facelet.color.startsWith('W'),
                    })} 
                />
            ))}
        </div>
    );
}

function FaceletEl(props: { className: string, facelet: Facelet, onClick: () => void }) {
    return (
        <div 
            className={cn('size-10 border border-black rounded flex items-center justify-center', props.className)} 
            onClick={props.onClick}
            title={`${props.facelet.piece?.hash || props.facelet.toString()} (${props.facelet.piece?.getType() || 'center'})`}
        >
            {props.facelet.toString()}
        </div>
    );
}