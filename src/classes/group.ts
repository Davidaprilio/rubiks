/*
	GROUPS

	Groups are collections of an arbitrary number of Cubelets.
	They have no concept of Cubelet location or orientation
	and therefore are not capable of rotation around any axis.
*/

import type { CubeColor } from "@/classes/colors"
import { Cubelet, CubeletAction, type CubeletPropertyKey } from "@/classes/cubelet"

export class Group extends CubeletAction {
	public cubelets: Cubelet[] = []
	
    constructor() {
        super()
    }

    updated() {}

    add(cubelet: Cubelet | Cubelet[]) {
        if (Array.isArray(cubelet)) this.cubelets.push(...cubelet)
        else this.cubelets.push(cubelet)
        this.updated()
    }

    replace(...cubelets: Cubelet[]) {
        this.cubelets = cubelets
        this.updated()
    }


    hasColor(color: string|CubeColor) {
        let results = new Group()
        this.cubelets.forEach((cubelet) => {
            if(cubelet.hasColor( color )) results.add(cubelet);
        })
        return results
    }

    //  this function implies AND rather than OR, XOR, etc.
    hasColors(...colors: (string|CubeColor)[]) {
        let results = new Group();
        this.cubelets.forEach((cubelet) => {
            if(cubelet.hasColors(...colors)) results.add(cubelet);
        })
        return results;
    }

    hasProperty<T extends CubeletPropertyKey>(property: T, ...value: (Cubelet[T])[]) {
        const results = new Group()
        this.cubelets.forEach((cubelet) => {
            if(value.includes(cubelet[property])) results.add(cubelet)
        })
        return results
    }

    hasType(...type: (Cubelet['type'])[]) {
        return this.hasProperty('type', ...type)
    }
}
