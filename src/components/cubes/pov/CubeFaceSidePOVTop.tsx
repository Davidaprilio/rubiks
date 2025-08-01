import type { AllColors } from "@/consts/cube";
import { getColor } from "@/lib/cube";
import { cn } from "@/lib/utils";
import { memo } from "react";


type CubeFaceSidePOVTopProps = {
  side: 'top' | 'bottom' | 'left' | 'right',
  colors?: [AllColors | null, AllColors | null, AllColors | null]
}

export const CubeFaceSidePOVTop = memo(function ({ side, colors }: CubeFaceSidePOVTopProps) {
  console.log(`Rendering side: ${side}`);

  if (colors === undefined) {
    return null;
  }
  
  return (
    <div className={cn('absolute grid gap-1', {
      'grid-cols-3 left-0 right-0': ['top', 'bottom'].includes(side),
      'grid-rows-3 top-0 bottom-0': ['left', 'right'].includes(side),
      '-top-3': side === 'top',
      '-bottom-3': side === 'bottom',
      '-left-3': side === 'left',
      '-right-3': side === 'right',
    })}>
      {[...Array(3)].map((_, index) => (
        <div key={index} className={cn(`rounded`, {
          'h-2': ['top', 'bottom'].includes(side),
          'w-2': ['left', 'right'].includes(side),
          [`bg-face-${getColor(colors[index] ?? 'e')}`]: !['e', 'empty', null].includes(colors[index] ?? null),
        })}></div>
      ))}
    </div>
  )
})