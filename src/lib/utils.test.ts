import { describe, expect, it } from 'vitest';
import { getArrMatrixIndex, rotateMatrix } from './utils';


describe('Test rotateMatrix()', () => {
    it('should rotate a 2x2 matrix clockwise', () => {
        const matrix = ['1', '2', 
                        '3', '4'];
        const result = rotateMatrix(matrix, 2, true);
        expect(result).toEqual(['3', '1', 
                                '4', '2']);
    });

    it('should rotate a 2x2 matrix counter-clockwise', () => {
        const matrix = ['1', '2', 
                        '3', '4'];
        const result = rotateMatrix(matrix, 2, false);
        expect(result).toEqual(['2', '4', 
                                '1', '3']);
    });

    it('should rotate a 3x3 matrix clockwise', () => {
        const matrix = ['1', '2', '3', 
                        '4', '5', '6', 
                        '7', '8', '9'];
        const result = rotateMatrix(matrix, 3, true);
        expect(result).toEqual(['7', '4', '1', 
                                '8', '5', '2', 
                                '9', '6', '3']);
    });

    it('should rotate a 3x3 matrix counter-clockwise', () => {
        const matrix = ['1', '2', '3', 
                        '4', '5', '6', 
                        '7', '8', '9'];
        const result = rotateMatrix(matrix, 3, false);
        expect(result).toEqual(['3', '6', '9', 
                                '2', '5', '8', 
                                '1', '4', '7']);
    });

    it('should rotate a 4x4 matrix clockwise', () => {
        const matrix = ['1', '2', '3', '4', 
                        '5', '6', '7', '8', 
                        '9', '10', '11', '12', 
                        '13', '14', '15', '16'];
        const result = rotateMatrix(matrix, 4, true);
        expect(result).toEqual(['13', '9', '5', '1', 
                                '14', '10', '6', '2', 
                                '15', '11', '7', '3', 
                                '16', '12', '8', '4']);
    });

    it('should rotate a 4x4 matrix counter-clockwise', () => {
        const matrix = ['1', '2', '3', '4', 
                        '5', '6', '7', '8', 
                        '9', '10', '11', '12', 
                        '13', '14', '15', '16'];
        const result = rotateMatrix(matrix, 4, false);
        expect(result).toEqual(['4', '8', '12', '16', 
                                '3', '7', '11', '15', 
                                '2', '6', '10', '14', 
                                '1', '5', '9', '13']);
    });

    it('should rotate a 5x5 matrix clockwise', () => {
        const matrix = ['1', '2', '3', '4', '5',
                        '6', '7', '8', '9', '10',
                        '11', '12', '13', '14', '15',
                        '16', '17', '18', '19', '20',
                        '21', '22', '23', '24', '25'];
        const result = rotateMatrix(matrix, 5, true);
        expect(result).toEqual(['21', '16', '11', '6', '1',
                                 '22', '17', '12', '7', '2',
                                 '23', '18', '13', '8', '3',
                                 '24', '19', '14', '9', '4',
                                 '25', '20', '15', '10', '5']);
    });

    it('should rotate a 5x5 matrix counter-clockwise', () => {
        const matrix = ['1', '2', '3', '4', '5',
                        '6', '7', '8', '9', '10',
                        '11', '12', '13', '14', '15',
                        '16', '17', '18', '19', '20',
                        '21', '22', '23', '24', '25'];
        const result = rotateMatrix(matrix, 5, false);
        expect(result).toEqual(['5', '10', '15', '20', '25',
                                 '4', '9', '14', '19', '24',
                                 '3', '8', '13', '18', '23',
                                 '2', '7', '12', '17', '22',
                                 '1', '6', '11', '16', '21']);
    });
});

describe('Test getArrMatrixIndex() with 3x3', () => {
    const arr = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const size = 3;

    it('should throw an error for non-square matrix', () => {
        expect(() => getArrMatrixIndex(arr, 'row', 4, 0))
            .toThrow('expected square matrix of 4x4, got arr.length=9');
    });

    it('should throw an error for out of bounds index', () => {
        expect(() => getArrMatrixIndex(arr, 'row', size, 3))
            .toThrow('position 3 is out of bounds for size 3');
    });

    it('should throw an error for negative index', () => {
        expect(() => getArrMatrixIndex(arr, 'row', size, -1))
            .toThrow('position -1 is out of bounds for size 3');
    });

    it('should correct return indices for row direction', () => {
        const result = getArrMatrixIndex(arr, 'row', size, 0);
        expect(result).toEqual([[0, '1'], [1, '2'], [2, '3']]);
    });

    it('should correct return indices for column direction', () => {
        const result = getArrMatrixIndex(arr, 'col', size, 0);
        expect(result).toEqual([[0, '1'], [3, '4'], [6, '7']]);
    });
});

describe('Test getArrMatrixIndex() with 4x4', () => {
    const arr = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
    const size = 4;

    it('row direction should return correct indices', () => {
        // Test row direction
        const result = getArrMatrixIndex(arr, 'row', size, 0);
        expect(result).toEqual([[0, '1'], [1, '2'], [2, '3'], [3, '4']]);
    });

    it('col direction should return correct indices', () => {
        // Test column direction
        const result = getArrMatrixIndex(arr, 'col', size, 0);
        expect(result).toEqual([[0, '1'], [4, '5'], [8, '9'], [12, '13']]);
    });
});

describe('Test getArrMatrixIndex() with 5x5', () => {
    const arr = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'];
    const size = 5;

    it('row direction should return correct indices', () => {
        // Test row direction
        const result = getArrMatrixIndex(arr, 'row', size, 0);
        expect(result).toEqual([[0, '1'], [1, '2'], [2, '3'], [3, '4'], [4, '5']]);
    });

    it('col direction should return correct indices', () => {
        // Test column direction
        const result = getArrMatrixIndex(arr, 'col', size, 0);
        expect(result).toEqual([[0, '1'], [5, '6'], [10, '11'], [15, '16'], [20, '21']]);
    });
});
