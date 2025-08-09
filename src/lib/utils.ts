import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function rotateMatrix<T>(array: T[], size: number, clockwise: boolean): T[] {
  const result = new Array<T>(size * size);
  if (clockwise) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const fromIndex = row * size + col
        const toRow = col
        const toCol = size - 1 - row
        const toIndex = toRow * size + toCol
        result[toIndex] = array[fromIndex]
      }
    }
  } else {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const fromIndex = row * size + col
        const toRow = size - 1 - col
        const toCol = row
        const toIndex = toRow * size + toCol
        result[toIndex] = array[fromIndex]
      }
    }
  }
  return result;
}

export function getArrMatrixIndex<T>(arr: T[], direction: 'row' | 'col', size: number, index: number): [number, T][] {
  if (arr.length !== size * size) {
    throw new Error(`expected square matrix of ${size}x${size}, got arr.length=${arr.length}`);
  }
  if (index < 0 || index >= size) {
    throw new Error(`position ${index} is out of bounds for size ${size}`);
  }

  const lineIndices: [number, T][] = [];
  let step = 1;
  if (direction == 'row') {
    index = index * size;
  } else {
    step = size;
  }

  for (let i = 0; i < size; i++) {
    lineIndices.push([index, arr[index]]);
    index += step;
  }

  return lineIndices;
}