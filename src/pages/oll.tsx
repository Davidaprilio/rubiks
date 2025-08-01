import PieceOll, { type PiecePllProps } from '@/components/cubes/PieceOll'
import type { FillAllColors } from '@/consts/cube'



const fillColor: FillAllColors = 'yellow'
const emptyColor: FillAllColors = 'white'

type FormulaPattern = {
    group: string
    patterns: {
        tails: PiecePllProps['tails'] | string //  9 digits
        formulas: string[][]
    }[]
}

const formulas: FormulaPattern[] = [
    {
        group: 'Fish',
        patterns: [
            {
                tails: '102000003',
                formulas: [["R U R' U R U2 R'"]],
            },
            {
                tails: '401000300',
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
                        <div className="flex flex-col gap-y-8">
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
                <p className="text-white mt-2">{pattern.formulas.join(', ')}</p>
            </div>
        </div>
    )
}