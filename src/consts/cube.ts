
export const colors = {
  'w': 'white',
  'r': 'red',
  'b': 'blue',
  'g': 'green',
  'y': 'yellow',
  'o': 'orange',
  'e': 'empty',
} as const;

export type KeyColors = keyof typeof colors;
export type Colors = (typeof colors)[KeyColors];
export type AllColors = KeyColors | Colors;
export type FillAllColors = Exclude<AllColors, 'e' | 'empty'>;
