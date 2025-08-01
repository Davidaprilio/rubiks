import { colors, type AllColors, type FillAllColors, type KeyColors } from "@/consts/cube";
import { getColor } from "@/lib/cube";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { CubeFaceSidePOVTop } from "./CubeFaceSidePOVTop";


type BoolNum = 1 | 0;
type SideFaceToggle = [BoolNum, BoolNum, BoolNum];
type CubeFacePOVTopProps = {
  color: FillAllColors
  emptyColor?: AllColors
  tails?: [BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum]
  sides?: {
    top?: SideFaceToggle
    bottom?: SideFaceToggle
    left?: SideFaceToggle
    right?: SideFaceToggle
  }
}



export const CubeFacePOVTop = memo(function ({ color, tails, sides, emptyColor = 'e' }: CubeFacePOVTopProps) {
  console.log('Rendering CubeFacePOVTop');
  emptyColor = getColor(emptyColor);

  return (
    <div className="rounded shadow-lg relative">
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, index) => (
          <div key={index} className={cn(`size-10 rounded bg-face-${emptyColor}`, {
            [`bg-face-${getColor(color)}`]: tails ? tails[index] === 1 : true,
          })}></div>
        ))}
      </div>
      {sides && Object.entries(sides).map(([side, toggle]) => (
        <CubeFaceSidePOVTop 
          key={side} 
          side={side as 'top' | 'bottom' | 'left' | 'right'} 
          colors={toggle.map(
            (active) => (active === 1 ? colors[color as KeyColors] : colors.e)
          ) as [AllColors | null, AllColors | null, AllColors | null]} 
        />
      ))}
    </div>
  )
})