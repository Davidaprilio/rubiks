import { Cubelet, CubeletAction } from "./cubelet";

export class Slice extends CubeletAction {
    public cubelets: Cubelet[] = []

    constructor(
        readonly name: string, 
        ...cubelets: Cubelet[]
    ) {
        super()
        this.add(...cubelets)
    }

    add(...cubelets: Cubelet[]) {
        this.cubelets.push(...cubelets)
    }

    replace(...cubelets: Cubelet[]) {
        this.cubelets = cubelets
    }

    getIdCubelets(): number[] {
        return this.cubelets.map( c => c.id )
    }
}
