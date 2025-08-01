import { colors, type AllColors, type FillAllColors } from "@/consts/cube";
import { getColor } from "@/lib/cube";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { CubeFaceSidePOVTop } from "./CubeFaceSidePOVTop";


export type BoolNum = 1 | 0;
export type SideFaceToggle = [BoolNum, BoolNum, BoolNum];
export type TailToggle = [BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum, BoolNum];
export type CubeFacePOVTopProps = {
  color: FillAllColors
  emptyColor?: AllColors
  tails?: TailToggle
  sides?: {
    top?: SideFaceToggle
    bottom?: SideFaceToggle
    left?: SideFaceToggle
    right?: SideFaceToggle
  }
  className?: string
}



export const CubeFacePOVTop = memo(function ({ color, tails, sides, emptyColor = 'e', className }: CubeFacePOVTopProps) {
  emptyColor = getColor(emptyColor);
  color = getColor(color) as FillAllColors;

  return (
    <div className={cn("rounded shadow-lg relative w-fit h-fit", className)}>
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, index) => (
          <div key={index} className={cn(`size-10 rounded bg-face-${emptyColor}`, {
            [`bg-face-${color}`]: tails ? tails[index] === 1 : true,
          })}></div>
        ))}
      </div>
      {sides && Object.entries(sides).map(([side, toggle]) => (
        <CubeFaceSidePOVTop 
          key={side} 
          side={side as 'top' | 'bottom' | 'left' | 'right'} 
          colors={toggle.map(
            (active) => (active === 1 ? color : colors.e)
          ) as [AllColors | null, AllColors | null, AllColors | null]} 
        />
      ))}
    </div>
  )
})