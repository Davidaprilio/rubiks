import { colors, type Colors, type KeyColors } from "@/consts/cube";

export function getColor(key: Colors | KeyColors): Colors {
  return colors[key as KeyColors] ?? key;
}