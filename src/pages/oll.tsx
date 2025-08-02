import PieceOll, { type PiecePllProps } from '@/components/cubes/PieceOll'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import type { AllColors, FillAllColors } from '@/consts/cube'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { create } from 'zustand'


type FormulaPattern = {
    group: string
    patterns: {
        tails: PiecePllProps['tails'] | string //  9 digits
        formulas: string[][]
    }[]
}

const formulas: FormulaPattern[] = [
    {
        group: 'ikan',
        patterns: [
            { tails: '401000300', formulas: [["L' U' L U' L' U2 L"]] },
            { tails: '102000003', formulas: [["R U R' U R U2 R'"]] },
            { tails: '400000302', formulas: [["R U2 R' U' R U' R'"]] },
            { tails: '002000403', formulas: [["L' U2 L U L' U L"]] },
            { tails: '001000302', formulas: [["R' U' R U' R' U2 R"]] },
            { tails: '401000002', formulas: [["L U2 L' U' L U' L'"]] },
        ],
    },
    {
        group: 'TANK',
        patterns: [
            { tails: '000000303', formulas: [["R U R' U R U2 R2 U' R U' R' U2 R"]] },
            { tails: '101000000', formulas: [["R2 D' R U2 R' D R U2 R"]] },
            { tails: '100000300', formulas: [["r U R' U' L' U R U' x'"]] },
            { tails: '001000003', formulas: [["l' U' L U R U' L' U x'"]] },
        ],
    },
    {
        group: 'PLUS',
        patterns: [
            { tails: '401000403', formulas: [["R U2 R2 U' R2 U' R2 U2 R"]] },
            { tails: '102000302', formulas: [["L' U2 L2 U R2 U L2 U2 L'"]] },
            { tails: '402000402', formulas: [["R U R' U R U' R' U R U2 R'"]] },
        ],
    },
    {
        group: 'P',
        patterns: [
            { tails: '002002032', formulas: [["F U R U' R' F'"]] },
            { tails: '400400430', formulas: [["F' U' L' U L F"]] },
            { tails: '000400432', formulas: [["x U' L U r' U' L' U' L U L' U L"]] },
            { tails: '000002432', formulas: [["x U R' U' l U R U R' U' R U' R'"]] },
        ],
    },
    {
        group: 'T',
        patterns: [
            { tails: '410000430', formulas: [["F R U R' U' F'"]] },
            { tails: '110000330', formulas: [["R U R' U' R' F R F'"]] },
        ],
    },
    {
        group: 'M/W',
        patterns: [
            { tails: '100002032', formulas: [["R U R' U R U' R' U' R' F R F'"]] },
            { tails: '001400430', formulas: [["L' U' L U' L' U L U L F' L' F"]] },
        ],
    },
    {
        group: 'PITA',
        patterns: [
            { tails: '002000300', formulas: [["x U R' U' L U R U' L' x'"]] },
            { tails: '400000003', formulas: [["x U' L U R' U' L' U R x'"]] },
            { tails: '100000002', formulas: [["x' U' R U L' U' R' U L x"]] },
            { tails: '001000400', formulas: [["x' U L' U' R U L U' R' x"]] },
        ],
    },
    {
        group: 'KOTAK',
        patterns: [
            { tails: '400400332', formulas: [["r U2 R' U' R U' r'"]] },
            { tails: '002002433', formulas: [["l' U2 L U L' U l"]] },
        ],
    },
    {
        group: 'PETIR',
        patterns: [
            { tails: '102002033', formulas: [["r U R' U R U2 r'"]] },
            { tails: '401400330', formulas: [["l' U' L U' L' U2 l"]] },
        ],
    },
    {
        group: 'Tanda Panah',
        patterns: [
            { tails: '112002302', formulas: [["R B' R2 F R2 B R2 F' R"]] },
            { tails: '411400403', formulas: [["L' B L2 F' L2 B' L2 F L'"]] },
        ],
    },
    {
        group: 'strip',
        patterns: [
            { tails: '112000332', formulas: [["F R U R' U' F'"]] },
        ],
    },
];

// bagi formulas menjadi 4 bagian dan lihat child patterns juga hrus rata
const formulasCols = (rowCount: number = 4) => {
    const result: FormulaPattern[][] = [];
    const stepSize: number[] = [];
    let step = 0;

    // sorting by size of patterns
    formulas.sort((a, b) => b.patterns.length - a.patterns.length);

    formulas.forEach((formula) => {
        if (result[step] === undefined) {
            result[step] = [];
            stepSize[step] = 0;
        }

        // cari stepSize yang paling kecil
        if (result.length === rowCount) {
            step = stepSize.indexOf(Math.min(...stepSize));
        }

        stepSize[step] += formula.patterns.length;
        result[step].push(formula);
        step++;
        if (step >= rowCount) {
            step = 0;
        }
    })
    return result;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSelectColors = create<{
    fillColor: FillAllColors;
    emptyColor: AllColors;
    setFillColor: (color: FillAllColors) => void;
    setEmptyColor: (color: AllColors) => void;
}>((set) => {
    return {
        fillColor: localStorage.getItem('fillColor') as FillAllColors || 'yellow',
        emptyColor: (localStorage.getItem('emptyColor') as AllColors) || 'empty',
        setFillColor: (color: FillAllColors) => {
            set({ fillColor: color });
            localStorage.setItem('fillColor', color);
        },
        setEmptyColor: (color: AllColors) => {
            set({ emptyColor: color });
            localStorage.setItem('emptyColor', color);
        },
    }
})

export default function PageOLL() {
    const [col, setCol] = useState(0);
    const { fillColor, setFillColor } = useSelectColors();

    // on window resize, rerender the page
    useEffect(() => {
        const handleResize = () => {
            const screenSize = {
                'max-width: 960px': 1,
                'max-width: 1280px': 2,
                'max-width: 1480px': 3,
                'max-width: 1680px': 4,
            }
            // ambil screen width tailwind
            for (const [key, value] of Object.entries(screenSize)) {
                if (window.matchMedia(`(${key})`).matches) {
                    if (col !== value) {
                        setCol(value);
                    }
                    break;
                }
            }
            if (col === 0) {
                setCol(4); // default to 4 columns if no match
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [col]);

    return (
        <div className="dark">
            <h1 className="text-white text-2xl text-center font-semibold">OLL (Orientation of the Last Layer)</h1>
            <p className="text-white text-center mt-4">This page will contain the OLL cube face with POV top view.</p>
            <Select value={fillColor} onValueChange={(value) => setFillColor(value as FillAllColors)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Color" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="white">
                        <SelectItemColor className="bg-face-white" text="White" />
                    </SelectItem>
                    <SelectItem value="yellow">
                        <SelectItemColor className="bg-face-yellow" text="Yellow" />
                    </SelectItem>
                    <SelectItem value="red">
                        <SelectItemColor className="bg-face-red" text="Red" />
                    </SelectItem>
                    <SelectItem value="orange">
                        <SelectItemColor className="bg-face-orange" text="Orange" />
                    </SelectItem>
                    <SelectItem value="blue">
                        <SelectItemColor className="bg-face-blue" text="Blue" />
                    </SelectItem>
                    <SelectItem value="green">
                        <SelectItemColor className="bg-face-green" text="Green" />
                    </SelectItem>
                </SelectContent>
            </Select>

            <GridFormulas col={col} />
        </div>
    )
}

function SelectItemColor({ className, text }: { className?: string, text: string }) {
    return (
        <div className="flex gap-x-2">
            <div className={cn("size-4 rounded-full", className)}></div>
            <span className="text-white">{text}</span>
        </div>
    )
}

const GridFormulas = ({ col }: { col: number }) => {
    return (
        <div className={cn("grid gap-6 items-start my-10", {
            'grid-cols-2': col === 2,
            'grid-cols-3': col === 3,
            'grid-cols-4': col === 4,
            'grid-cols-1': col === 1,
        })}>
            {formulasCols(col).map((rowFormulas, groupIndex) => (
                <div className="flex flex-col justify-center gap-6" key={groupIndex}>
                    {rowFormulas.map((pattern, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg">
                            {/* <h2 className="text-white text-xl font-semibold mb-2 p-4 pb-0">{pattern.group}</h2> */}
                            <div className="flex flex-col gap-y-8 p-4">
                                {pattern.patterns.map((pattern, index) => (
                                    <FormulaPattern key={index} pattern={pattern} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

function FormulaPattern({ pattern }: { pattern: FormulaPattern['patterns'][number] }) {
    const { fillColor, emptyColor } = useSelectColors();
    let tails = pattern.tails as PiecePllProps['tails'];
    if (typeof pattern.tails === 'string') {
        tails = pattern.tails.split('').map(Number) as PiecePllProps['tails'];
    }

    return (
        <div className='flex items-center w-fit h-fit gap-3'>
            <PieceOll
                classNamePiece="size-5"
                color={fillColor}
                emptyColor={emptyColor}
                tails={tails}
            />
            <div>
                {pattern.formulas.map((formula, index) => (
                    <p key={index} className="text-gray-300">
                        {formula[0].split(' ').map((word, i) => (
                            <span key={i}>
                                {i > 0 && <span className="text-white/15 px-0.5">•</span>}
                                {word}
                            </span>
                        ))}
                    </p>
                ))}
            </div>
        </div>
    )
}