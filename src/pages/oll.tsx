import { CubeFacePOVTop, type CubeFacePOVTopProps, type TailToggle } from '@/components/cubes/pov/CubeFacePOVTop'
import type { FillAllColors } from '@/consts/cube'


type Join<T extends string[], Acc extends string = ''> = 
  T extends [infer F extends string, ...infer R extends string[]]
    ? Join<R, `${Acc}${F}`>
    : Acc;

type Binary<T extends number, Acc extends string[] = []> =
  Acc['length'] extends T
    ? Join<Acc>
    : Binary<T, [...Acc, '0']> | Binary<T, [...Acc, '1']>;

type Binary9 = Binary<9>;

const fillColor: FillAllColors = 'yellow'
const emptyColor: FillAllColors = 'white'

type FormulaPattern = {
    group: string
    patterns: {
        tails: TailToggle | Binary9
        sides: CubeFacePOVTopProps['sides']
        formulas: string[][]
    }[]
}
const formulas: FormulaPattern[] = [
        {
            group: 'Fish',
            patterns: [
                {
                    tails: '010111110',
                    sides: {
                        top: [1,0,0],
                        right: [1,0,0],
                        bottom: [0,0,1],
                    },
                    formulas: [["R U R' U R U2 R'"]],
                },
                {
                    tails: '010111011',
                    sides: {
                        top: [0,0,1],
                        left: [1,0,0],
                        bottom: [1,0,0],
                    },
                    formulas: [["L' U' L U' L' U2 L"]],
                },
            ],
        }
    ]

export default function PageOLL() {
    return (
        <div>
            <h1 className="text-white text-2xl text-center font-semibold">OLL (Orientation of the Last Layer)</h1>
            <p className="text-white text-center mt-4">This page will contain the OLL cube face with POV top view.</p>

            <div className="flex justify-center gap-y-2">
                {formulas.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        <h2 className="text-white text-xl font-semibold mb-2">{group.group}</h2>
                        <div className="flex flex-col gap-y-1 -ml-7">
                            {group.patterns.map((pattern, index) => (
                                <FormulaPattern key={index} pattern={pattern} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    )
}

function FormulaPattern({ pattern }: { pattern: FormulaPattern['patterns'][number] }) {
    let tails: TailToggle = pattern.tails as TailToggle;
    if (typeof pattern.tails === 'string') {
        tails = pattern.tails.split('').map(Number) as TailToggle;
    }

    return (
        <div className='flex items-center mb-8 w-fit h-fit'>
            <div className="h-10 w-max">
                <CubeFacePOVTop
                    className='scale-40 origin-top'
                    color={fillColor}
                    emptyColor={emptyColor}
                    tails={tails}
                    sides={pattern.sides}
                />
            </div>
            <div>
                <p className="text-white mt-2">{pattern.formulas.join(', ')}</p>
            </div>
        </div>
    )
}