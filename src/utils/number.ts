declare global {
    interface Number {
        modulo(n: number): number;
        subtract(n: number): number;
        divide(n: number): number;
        roundDown(): number;
        roundUp(): number;
        abs(): number;
        scale(a0: number, a1: number, b0: number, b1: number): number;
        normalize(a: number, b: number): number;
        round(decimals?: number): number;
        degreesToRadians(): number;
    }
}

Number.prototype.modulo = function (this: number, n: number): number {
    return ((this % n) + n) % n;
};

Number.prototype.subtract = function (this: number, n: number): number {
    return this - n;
}

Number.prototype.divide = function (this: number, n: number): number {
    return this / n;
}

Number.prototype.roundDown = function (this: number): number {
    return Math.floor(this);
}

Number.prototype.roundUp = function (this: number): number {
    return Math.ceil(this);
}

Number.prototype.abs = function (this: number): number {
    return Math.abs(this)
}

Number.prototype.scale = function (this: number, a0: number, a1: number, b0: number, b1: number): number {
    let phase = this.normalize(a0, a1)
    if (b0 == b1) return b1
    return b0 + phase * (b1 - b0)
}

Number.prototype.normalize = function (this: number, a: number, b: number): number {
    if (a == b) return 1.0
    return (this - a) / (b - a)
}

Number.prototype.round = function (this: number, decimals: number = 0): number {
    let n = this
    decimals = decimals || 0
    n *= Math.pow(10, decimals)
    n = Math.round(n)
    n /= Math.pow(10, decimals)
    return n
}

Number.prototype.degreesToRadians = function (this: number): number {
    return this * Math.PI / 180
}