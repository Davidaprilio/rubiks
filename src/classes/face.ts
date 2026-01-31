import { Text } from "troika-three-text";
import type { Cubelet } from "./cubelet";
import type { Cube } from "./cube";
import { Slice } from "./slice";
import gsap from "gsap";

type Position = { x: number, y: number, z: number };
type FaceKey = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK';

export class Face extends Slice {
    public cubelets: Cubelet[] = [];
    public position: Position = { x: 0, y: 0, z: 0 };
    private modifierPos = 2;
    private textObj: Text = new Text();

    constructor(
        public cube: Cube,
        readonly name: FaceKey,
    ) {
        super(name);
        this.setPosition();
        this.makeObjLabel();
    }

    setPosition(position?: Position) {
        if (position) {
            this.position = position;
            return;
        }
        const rad = Math.floor(this.cube.size / 2)
        switch (this.name.toUpperCase()) {
            case 'UP': this.position = { x: 0, y: rad, z: 0 }; break;
            case 'DOWN': this.position = { x: 0, y: -rad, z: 0 }; break;
            case 'LEFT': this.position = { x: -rad, y: 0, z: 0 }; break;
            case 'RIGHT': this.position = { x: rad, y: 0, z: 0 }; break;
            case 'FRONT': this.position = { x: 0, y: 0, z: rad }; break;
            case 'BACK': this.position = { x: 0, y: 0, z: -rad }; break;
        }
    }

    getCenter(): Cubelet | null {
        if (this.cubelets.length !== 9) return null;
        return this.cubelets[4];
    }

    makeObjLabel(): Text {
        this.textObj.name = `face-label-${this.name.toLowerCase()}`;
        this.textObj.text = this.name.toUpperCase();
        this.textObj.visible = false;
        this.textObj.fillOpacity = 0;
        this.textObj.fontSize = 0.5;
        this.textObj.textAlign = 'center';
        this.textObj.color = 'white';
        this.textObj.anchorX = 'center';
        this.textObj.anchorY = 'middle';
        switch (this.name.toUpperCase()) {
            case 'UP': this.textObj.rotation.x = -Math.PI / 2; break;
            case 'DOWN': this.textObj.rotation.x = Math.PI / 2; break;
            case 'LEFT': this.textObj.rotation.y = -Math.PI / 2; break;
            case 'RIGHT': this.textObj.rotation.y = Math.PI / 2; break;
            case 'BACK': this.textObj.rotation.y = Math.PI; break;
        }
        this.textObj.position.set(
            this.position.x * this.modifierPos, 
            this.position.y * this.modifierPos, 
            this.position.z * this.modifierPos,
        );
        this.cube.threeObj.add(this.textObj);
        return this.textObj;
    }

    get isLabelShow(): boolean {
        return this.textObj.visible;
    }

    label(show: boolean) {
        if (show) this.showLabel()
        else this.hideLabel()
    }

    async hideLabel() {
        gsap.to(this.textObj, {
            duration: 0.3,
            ease: "power2.out",
            fillOpacity: 0,
            onComplete: () => {
                this.textObj.visible = false;
            }
        });
    }

    async showLabel() {
        gsap.to(this.textObj, {
            duration: 0.3,
            ease: "power2.out",
            fillOpacity: 1,
            onStart: () => {
                this.textObj.visible = true;
            }
        });
    }
}


export class Faces {
    public sides: Record<FaceKey, Face>;

    constructor(
        cube: Cube
    ) {
        this.sides = {
            UP: new Face(cube, 'UP'),
            DOWN: new Face(cube, 'DOWN'),
            LEFT: new Face(cube, 'LEFT'),
            RIGHT: new Face(cube, 'RIGHT'),
            FRONT: new Face(cube, 'FRONT'),
            BACK: new Face(cube, 'BACK'),
        };
    }

    get up () { return this.sides.UP; }
    get down () { return this.sides.DOWN; }
    get left () { return this.sides.LEFT; }
    get right () { return this.sides.RIGHT; }
    get front () { return this.sides.FRONT; }
    get back () { return this.sides.BACK; }

    get(name: FaceKey): Face {
        return this.sides[name];
    }

    label(show: boolean) {
        if (show) this.showLabel()
        else this.hideLabel()
    }

    showLabel() {
        this.toArray().forEach( f => f.showLabel() );
    }

    hideLabel() {
        this.toArray().forEach( f => f.hideLabel() );
    }

    toArray(): Face[] {
        return Object.values(this.sides);
    }
}