import type { AllColors, Colors, KeyColors } from "@/consts/cube";
import { colors } from "@/consts/cube";

export function getColor(key: AllColors): Colors {
  return colors[key as KeyColors] ?? key;
}