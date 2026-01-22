/*


	GROUPS

	Groups are collections of an arbitrary number of Cubelets.
	They have no concept of Cubelet location or orientation
	and therefore are not capable of rotation around any axis.


*/

import { Cubelet, CubeletAction } from "./cubelet"

export class Group extends CubeletAction {
	public cubelets: Cubelet[] = []
	
    constructor() {
        super()
    }

    add(cubelet: Cubelet | Cubelet[]) {
        if (Array.isArray(cubelet)) this.cubelets.push(...cubelet)
        else this.cubelets.push(cubelet)
    }
}
