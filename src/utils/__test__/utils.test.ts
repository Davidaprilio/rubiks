import { describe, it, expect } from 'vitest'
import { ollKeyToStateFaceTop, sleep } from '../utils'

describe('utils module', () => {
    describe('fn sleep', () => {
        it('should resolve after given time', async () => {
            const start = Date.now()
            const delay = 100 // milliseconds
            await sleep(delay)
            const end = Date.now()
            expect(end - start).toBeGreaterThanOrEqual(delay)
        })

        it('should work with zero delay', async () => {
            const start = Date.now()
            const delay = 0 // milliseconds
            await sleep(delay)
            const end = Date.now()
            expect(end - start).toBeGreaterThanOrEqual(delay)
        })
    })

    describe('fn ollKeyToStateFaceTop', () => {
        it('should return correct state for key 100000300', async () => {
            const state = ollKeyToStateFaceTop('100000300')
            console.log(state);

            expect(state).toEqual([
                "XXXXXY", "XYXXXX", "XYXXXX",
                "XYXXXX", "XYXXXX", "XYXXXX",
                "YXXXXX", "XYXXXX", "XYXXXX"
            ])
        })

        it('should return correct state for key 401402002', async () => {
            const state = ollKeyToStateFaceTop('401402002')
            expect(state).toEqual([
                "XXXXYX", "XYXXXX", "XXXXXY",
                "XXXXYX", "XYXXXX", "XXYXXX",
                "XYXXXX", "XYXXXX", "XXYXXX"
            ])
        })

        it('should return correct state for key 102000302', async () => {
            const state = ollKeyToStateFaceTop('102000302')
            expect(state).toEqual([
                "XXXXXY", "XYXXXX", "XXYXXX",
                "XYXXXX", "XYXXXX", "XYXXXX",
                "YXXXXX", "XYXXXX", "XXYXXX"
            ])
        })
    })
})