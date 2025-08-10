import { describe, expect, it } from "vitest";
import { Rubiks } from "./rubiks";

describe('Rubiks', () => {

    describe('makeCubeState & navigate basic rotations', () => {
        it('should create a cube state', () => {
            const rubiks = new Rubiks();
            const state = rubiks.makeCubeState();
            expect(state).toBeDefined();
            expect(state.length).toBe(6); // Assuming 6 faces
            expect(state[0].length).toBe(9); // Each face should have 9 pieces
            expect(state).toEqual(expect.arrayContaining([
                expect.arrayContaining(['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']),
                expect.arrayContaining(['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G']),
                expect.arrayContaining(['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y']),
                expect.arrayContaining(['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']),
                expect.arrayContaining(['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B']),
                expect.arrayContaining(['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W']),
            ]));
        });

        it('should rotate a Red face clockwise', () => {
            const rubiks = new Rubiks();
            rubiks.makeCubeState();
            rubiks.rotateFace(0, true);
            const state = rubiks.getState();
            expect(state).toBeDefined();
            expect(state).toEqual(expect.arrayContaining([
                expect.arrayContaining(['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']),
                expect.arrayContaining(['Y', 'G', 'G', 'Y', 'G', 'G', 'Y', 'G', 'G']),
                expect.arrayContaining(['B', 'Y', 'Y', 'B', 'Y', 'Y', 'B', 'Y', 'Y']),
                expect.arrayContaining(['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']),  
                expect.arrayContaining(['W', 'W', 'W', 'B', 'B', 'B', 'B', 'B', 'B']),
                expect.arrayContaining(['G', 'G', 'G', 'W', 'W', 'W', 'W', 'W', 'W']),
            ]));
        });

        it('should rotate a Red face counter-clockwise', () => {
            const rubiks = new Rubiks();
            rubiks.makeCubeState();
            rubiks.rotateFace(0, false);
            const state = rubiks.getState();
            expect(state).toBeDefined();
            expect(state).toEqual(expect.arrayContaining([
                expect.arrayContaining(['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']),
                expect.arrayContaining(['W', 'G', 'G', 'W', 'G', 'G', 'W', 'G', 'G']),
                expect.arrayContaining(['G', 'Y', 'Y', 'G', 'Y', 'Y', 'G', 'Y', 'Y']),
                expect.arrayContaining(['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']),
                expect.arrayContaining(['Y', 'Y', 'Y', 'B', 'B', 'B', 'B', 'B', 'B']),
                expect.arrayContaining(['B', 'B', 'B', 'W', 'W', 'W', 'W', 'W', 'W']),
            ]));
        });
    });

    describe('should rotate many steps', () => {
        it('R U Ri Ui', () => {
            const rubiks = new Rubiks();
            rubiks.makeCubeState();
            rubiks.rotateFace(1, true);
            rubiks.rotateFace(2, true);
            rubiks.rotateFace(1, false);
            rubiks.rotateFace(2, false);
            const state = rubiks.getState();
            expect(state).toBeDefined();
            expect(state).toEqual(expect.arrayContaining([
                expect.arrayContaining(['R', 'R', 'W', 'R', 'R', 'Y', 'R', 'R', 'R']),
                expect.arrayContaining(['G', 'G', 'Y', 'O', 'G', 'G', 'Y', 'G', 'G']),
                expect.arrayContaining(['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'R', 'R', 'B']),
                expect.arrayContaining(['G', 'O', 'O', 'G', 'O', 'O', 'O', 'O', 'O']),
                expect.arrayContaining(['B', 'B', 'B', 'B', 'B', 'B', 'O', 'B', 'B']),
                expect.arrayContaining(['W', 'W', 'G', 'W', 'W', 'W', 'W', 'W', 'W']),
            ]));
        });
    });

});