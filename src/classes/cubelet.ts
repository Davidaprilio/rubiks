/*
	CUBELETS or pieces are the smaller cubes that make up the Rubik's Cube.
	Faces are mapped in a clockwise spiral from Front to Back:

                  Back
                   5
              -----------
            /    Up     /|
           /     1     / |
           -----------  Right
          |           |  2
    Left  |   Front   |  .
     4    |     0     | /
          |           |/
           -----------
               Down
                3
	
	The faces[] Array is mapped to names for convenience:

	  faces[0] === front
	  faces[1] === up
	  faces[2] === right
	  faces[3] === down
	  faces[4] === left
	  faces[5] === back
*/


import * as THREE from 'three';
import { colors, cubieFaceCfg, type CubeColor, type FaceConfigKey } from './colors';
import { Text } from "troika-three-text";
import type { Cube } from './cube';
import { gsap } from "gsap";

const GSAP_SEC = 1
const boxGeometry = new THREE.BoxGeometry();

interface CubeletSticker {
    id: number;
    color: CubeColor;
    mesh: THREE.Mesh;
}

// many stickers on one cubelet mean it's an edge or corner piece
export type CubeletTypeKey = 'core' | 'center' | 'edge' | 'corner';
const CubeletType: CubeletTypeKey[] = [
	'core',
	'center',
	'edge',
	'corner',
]

export class Cubelet {
    readonly id: number;
	public obj: THREE.Object3D;
    private mesh: THREE.Mesh;
    protected size: number = 1;
    protected stickers: CubeletSticker[] = [];
    protected cube?: Cube;
    public address = { x: 0, y: 0, z: 0 };
    private radius: number = 0;
	public type: CubeletTypeKey = 'core';
	
	//  We need to know if we're "engaged" on an axis 
	//  which at first seems indentical to isTweening,
	//  until you consider partial rotations. 
    private isTweening: boolean = false;
	private isEngagedX: boolean = false;
	private isEngagedY: boolean = false;
	private isEngagedZ: boolean = false;


	//  Remember our separation of state code and visual code?
	//  Well here's some slightly (though not entirely!) redundant
	//  rotation tracking. 
	//  It's actually this that makes partial rotations possible...
	private x: number = 0
	private xPrevious: number = 0
	private y: number = 0
	private yPrevious: number = 0
	private z: number = 0
	private zPrevious: number = 0

    public stickerTextVisible: boolean = true;
    public stickerTexts: Text[] = [];

    constructor(cube?: Cube, id: number = 0, faceColor: number[] = []) {
        this.id = id;
		this.obj = new THREE.Object3D();
		this.obj.name = `obj-cubelet-${this.id}`;
        const baseCubematerial = new THREE.MeshPhongMaterial({color: colors.COLORLESS.hex});
        this.mesh = new THREE.Mesh(boxGeometry, baseCubematerial);
		this.mesh.name = `cubelet-${this.id}`;
        this.coloring(faceColor);
        if (cube) {
            this.cube = cube;
            cube.threeObj.add( this.obj );
        }
		this.obj.add( this.mesh );
        this.setAddress(this.id);
        const 
        x = this.address.x * this.size,
        y = this.address.y * this.size,
        z = this.address.z * this.size
        this.mesh.position.set( x, y, z )
    }

    private coloring(faceColor: number[], size = 1) {
        const planeGeometry = new THREE.PlaneGeometry(size, size);
        const indexFaceMap: (FaceConfigKey)[] = ['FRONT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'BACK'];
		let totalColoredFaces = 0;
        for (let i = 0; i < 6; i++) {
            const pos = indexFaceMap[i]
            const cfgPos = cubieFaceCfg[pos as keyof typeof cubieFaceCfg];
            const colorSet = faceColor[i] ? cfgPos.colorSet : colors.COLORLESS;
            const color = colorSet.hex;
			if (faceColor[i]) {
				totalColoredFaces++;
			}
            const material = new THREE.MeshPhongMaterial({ 
                color,
                side: THREE.FrontSide, 
            });
            const planeMesh = new THREE.Mesh(planeGeometry, material);
            planeMesh.up.set(...cfgPos.up);
            planeMesh.lookAt(...cfgPos.position);
            planeMesh.scale.setScalar(0.90);
            planeMesh.position.set(...cfgPos.position).multiplyScalar(size * .501);
            this.mesh.add(planeMesh);

            const textFace = new Text()
            textFace.text = i.toString();
            textFace.fontSize = 0.1;
            textFace.color = 'white';
            textFace.anchorX = 'center';
            textFace.anchorY = 'middle';
            this.mesh.add(textFace);
            textFace.position.set(...cfgPos.position.map(v => -v) as [number, number, number]).multiplyScalar(size * .55);
            textFace.sync();

            const stickerText = new Text()
            stickerText.text = this.id.toString();
            stickerText.fontSize = 0.3;
            stickerText.color = cfgPos.colorSet.font;
            stickerText.anchorX = 'center';
            stickerText.anchorY = 'middle';
            planeMesh.add(stickerText);
            stickerText.position.set(0, 0, 0.01); // buat teksnya sedikit menjauh dari permukaan stiker
            stickerText.visible = this.stickerTextVisible
            stickerText.sync();
            this.stickerTexts.push(stickerText);

            this.stickers.push({
                color: colorSet,
                id: i,
                mesh: planeMesh
            });
        }
		this.type = CubeletType[totalColoredFaces];
    }

    private setAddress(address: number){
        this.address.x = address.modulo( 3 ).subtract( 1 )
        this.address.y = address.modulo( 9 ).divide( 3 ).roundDown().subtract( 1 ) * -1
        this.address.z = address.divide( 9 ).roundDown().subtract( 1 ) * -1
    }

    public showStickerText(visible: boolean) {
        this.stickerTextVisible = visible;
        console.log('render text', this.stickerTextVisible);
        this.stickerTexts.forEach( text => {
            text.visible = this.stickerTextVisible;
            text.sync();
        });
    }


    public setRadius(radius: number = 0, onComplete?: (() => void)) {
        //  @@
        //  It's a shame that we can't do this whilst tweening
        //  but it's because the current implementation is altering the actual X, Y, Z
        //  rather than the actual radius. Can fix later.

        //  Current may produce unexpected results while shuffling. For example:
        //    cube.corners.setRadius( 90 )
        //  may cause only 4 corners instead of 6 to setRadius()
        //  because one side is probably engaged in a twist tween.
        if(this.isTweening) {
            return;
        }

        radius = radius || 0
        if(this.radius !== radius) {
            //  each 1 distance per cubie will take 1 second 
            const duration = (this.radius - radius).abs().scale(0, this.size, 0, GSAP_SEC)
            gsap.to(this.mesh.position, {
                duration,
                ease: "quart.out",
                x: this.address.x * ( this.size + radius ),
                y: this.address.y * ( this.size + radius ),
                z: this.address.z * ( this.size + radius ),
                onComplete: () => {
                    this.radius = radius
                    if( onComplete instanceof Function ) onComplete()
                }
            })
        }
    }

    //  We can rotate this Cublet on the X, Y, and Z axes
	//  both clockwise and anticlockwise.
	public rotate(rotation: 'X'|'Y'|'Z', degrees: number, cubeCallback?: ((cubelet: Cubelet, remaps: { x: number, y: number, z: number }) => void)) {

			let
			xTarget = 0,
			yTarget = 0,
			zTarget = 0,			
			rotationUpperCase = rotation.toUpperCase(),
			threshold = 0.001

            const toDegreScale = (degrees > 90) ? 180 : 90

			//  We need to signal to the world that we cannot accept more rotation() commands.
			//  This will also cause all Groups (and Slices) containing this Cubelet
			//  to refuse all twist() commands until further notice.

			this.isTweening = true


			//  Logically rotating our Cubelet is a matter of swapping the order
			//  of the faces in the this.faces Array. The order is interpreted as:
			//  Front, Up, Right, Down, Left, Back.

			if( rotationUpperCase === 'X' ){
				this.isEngagedX = true
				if( rotation === 'X' ) xTarget = degrees
				else xTarget = -degrees
			} else if( rotationUpperCase === 'Y' ){
				this.isEngagedY = true
				if( rotation === 'Y' ) yTarget = degrees
				else yTarget = -degrees
			} else if( rotationUpperCase === 'Z' ){
				this.isEngagedZ = true
				if( rotation === 'Z' ) zTarget = degrees
				else zTarget = -degrees
			}


			//  At every steps let's try to keep our values tidy.
			this.x += xTarget.round()
			this.y += yTarget.round()
			this.z += zTarget.round()


			//  Our Cube's twistDuration is the amount of time (in miliseconds)
			//  that it should take to rotate 90 dgrees.
			//  We're going to scale that to match whatever number of degrees we're actually rotating:
			let
			twistDuration = this.cube !== undefined ? (toDegreScale == 90 ? this.cube.twistDuration : this.cube.doubleTwistDuration) : GSAP_SEC,
			twistDurationScaled = Math.max(degrees.abs().scale(0, toDegreScale, 0, twistDuration), 0.1)

			//  And now for the rotation tween itself...
			//  It feels very wrong to me that we're going to invert the coordinate space here
			//  but that's how the cookie crumbles. Sorry. 
			gsap.to(this.obj.rotation, {
				duration: twistDurationScaled,
				ease: "quart.out",
				x: -xTarget.degreesToRadians(),
				y: -yTarget.degreesToRadians(),
				z: -zTarget.degreesToRadians(),	
				onComplete: () => {
					//  First up, we need to apply the rotation to the Cubelet's mesh
					this.mesh.applyMatrix4(this.obj.matrix)
		
					//  And now that we've retained that rotation information
					//  we can safely reset the anchor's rotation:
					this.obj.rotation.set(0, 0, 0)

                    //  Here's some complexity.
                    //  We need to support partial rotations of arbitrary degrees
                    //  yet ensure our internal model is always in a valid state.
                    //  This means only remapping the Cubelet when it makes sense
                    //  and also remapping the Cube if this Cubelet is allowed to do so.
                    let
                    xRemaps = this.x.divide(90).round().subtract(this.xPrevious.divide(90).round()).abs(),
                    yRemaps = this.y.divide(90).round().subtract(this.yPrevious.divide(90).round()).abs(),
                    zRemaps = this.z.divide(90).round().subtract(this.zPrevious.divide(90).round()).abs()
                    const remaps = { x: xRemaps, y: yRemaps, z: zRemaps }

					if(this.x.modulo( 90 ).abs() < threshold ) {
						this.x = 0
						this.xPrevious = this.x
						this.isEngagedX = false
					}

					if(this.y.modulo( 90 ).abs() < threshold) {
						this.y = 0
						this.yPrevious = this.y
						this.isEngagedY = false
					}

		
					if(this.z.modulo( 90 ).abs() < threshold) {
						this.z = 0
						this.zPrevious = this.z
						this.isEngagedZ = false
					}

                    if (cubeCallback instanceof Function )cubeCallback(this, remaps)

					//  Phew! Now we can turn off the tweening flag.
					this.isTweening = false
				}
			})
    }

    //  Does this Cubelet contain a certain color?
    //  If so, return a String decribing what face that color is on.
    //  Otherwise return false.
    hasColor(color: string | CubeColor): 'up' | 'down' | 'left' | 'right' | 'front' | 'back' | false {
        let i, face
        if (typeof color === 'object') {
            color = color.initial;
        }

        for( i = 0; i < 6; i ++ ){
            if(this.stickers[i].color.initial === color.toUpperCase() || this.stickers[i].color.name === color){
                face = i
                break
            }
        }

        if( face !== undefined ){
            return [
                'front',
                'up',
                'right',
                'down',
                'left',
                'back'
            ][face] as 'up' | 'down' | 'left' | 'right' | 'front' | 'back'
        }
        else return false
    }

    // if 
    hasColors(...colors: (string | CubeColor)[]): boolean {
        let result  = true
        colors.forEach((color) => {
            result = result && !!this.hasColor(color)
        })
        return result
    }
}

export abstract class CubeletAction {
    public cubelets: Cubelet[] = []


    private async applyToCubelets<T>(action: (cubelet: Cubelet, i: number) => Promise<T> ) {
        return Promise.all(this.cubelets.map((c, i) => {
            return action(c, i)
        }))
    }

    async setRadius(radius: number, onEachComplete?: ((cubelet: Cubelet, i: number) => void)) {
        return this.applyToCubelets((cubelet, i) => {
            return new Promise<Cubelet>((resolve) => {
                cubelet.setRadius(radius, () => {
                    if (onEachComplete) onEachComplete(cubelet, i);
                    resolve(cubelet);
                })
            })
        })
    }

    rotate(rotation: 'X'|'Y'|'Z', degrees: number, onEachComplete?: ((cubelet: Cubelet, i: number) => void)) {
        return this.applyToCubelets((cubelet, i) => {
            return new Promise<Cubelet>((resolve) => {
                cubelet.rotate(rotation, degrees, () => {
                    if (onEachComplete) onEachComplete(cubelet, i);
                    resolve(cubelet);                    
                })
            })
        })
    }
}