import type { AllColors } from "@/consts/cube";
import { getColor } from "@/lib/cube";
import { cn } from "@/lib/utils";

export type DigitPiece = 0 | 1 | 2 | 3 | 4;

export type PiecePllProps = {
    classNamePiece?: string;
    color: AllColors;
    emptyColor?: string;
    tails: [DigitPiece, DigitPiece, DigitPiece, DigitPiece, DigitPiece, DigitPiece, DigitPiece, DigitPiece, DigitPiece];
}

export default function PieceOll({ color, emptyColor = 'e', tails, classNamePiece }: PiecePllProps) {
    color = getColor(color);
    emptyColor = getColor(emptyColor as AllColors);
    return (
        <div>
            <div className="grid grid-cols-3 gap-0.5">
                {tails.map((tail, index) => (
                    <div key={index} className={cn(
                        `size-10 rounded-xs bg-face-${tail === 0 ? color : emptyColor}`, classNamePiece,
                        {
                            [`before:bg-face-${color} relative before:absolute before:rounded-xs before:content-[""]`]: tail > 0,
                            'before:-top-1.5 before:left-0 before:right-0 before:h-1/5': tail === 1,
                            'before:-right-1.5 before:top-0 before:bottom-0 before:w-1/5': tail === 2,
                            'before:-bottom-1.5 before:left-0 before:right-0 before:h-1/5': tail === 3,
                            'before:-left-1.5 before:top-0 before:bottom-0 before:w-1/5': tail === 4,
                        })
                    }></div>
                ))}
            </div>
        </div>
    )
}
