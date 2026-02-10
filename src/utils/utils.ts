import type { FaceState } from "@/classes/solvers/cfop";

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function ollKeyToStateFaceTop(key: string): FaceState {
return key.split('').map(c => {
    const state = ['X','X','X','X','X','X']
    const i = parseInt(c)
    let ki = {0:1, 1:5, 3:0}[i]
    if (ki === undefined) ki = i
    state[ki] = 'Y'
    return state.join('')
}) as FaceState
}