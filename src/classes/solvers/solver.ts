
export abstract class Solver {
    abstract isSolved(): boolean;
    abstract solve(): Promise<void>;
}