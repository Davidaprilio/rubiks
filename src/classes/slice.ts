import { Group } from "@/classes/group";
import { Cubelet } from "@/classes/cubelet";

export class Slice extends Group {
    public cubelets: Cubelet[] = []

    public edges: Group = new Group()
    public corners: Group = new Group()
    public centers: Group = new Group()
    public crosses: Group = new Group()

    constructor(
        readonly name: string, 
        ...cubelets: Cubelet[]
    ) {
        super()
        this.add(cubelets)
        this.map()
    }

    updated(): void {
        this.map()
    }

    getIdCubelets(): number[] {
        return this.cubelets.map( c => c.id )
    }

    map() {
        this.centers = this.hasType('center');
        this.edges = this.hasType('edge');
        this.corners = this.hasType('corner');
        this.crosses.replace(...this.edges.cubelets, ...this.corners.cubelets);
    }
}
