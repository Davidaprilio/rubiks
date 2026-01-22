declare module 'troika-three-text' {
    import type { Mesh, MeshBasicMaterialParameters, BufferGeometry, Material } from 'three';

    type percentage = `${number}%`;

    export interface TextProps extends MeshBasicMaterialParameters {
        text?: string;
        font?: string;
        fontSize?: number;
        letterSpacing?: number;
        lineHeight?: number;
        maxWidth?: number;
        anchorX?: number | 'left' | 'center' | 'right';
        anchorY?: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
        color?: string | number;
        curveRadius?: number;
        direction?: 'auto' | 'ltr' | 'rtl';
        overflowWrap?: 'normal' | 'break-word';
        whiteSpace?: 'normal' | 'overflowWrap' | 'nowrap';
        outlineWidth?: number;
        outlineColor?: string | number;
        outlineOpacity?: number;
        outlineBlur?: number;
        strokeWidth?: number;
        strokeColor?: string | number;
        strokeOpacity?: number;
        fillOpacity?: number;
        depthOffset?: number;
        sdfGlyphSize?: number;
        material?: Material;
        geometry?: BufferGeometry;
        [key: string]: any;
    }

    export class Text extends Mesh {
        constructor();
        text: string;
        font: string;
        fontSize: number;
        letterSpacing: number;
        lineHeight: number;
        maxWidth: number;
        anchorX: percentage | 'left' | 'center' | 'right';
        anchorY: percentage | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
        color: string | number;
        curveRadius: number;
        direction: 'auto' | 'ltr' | 'rtl';
        overflowWrap: 'normal' | 'break-word';
        whiteSpace: 'normal' | 'overflowWrap' | 'nowrap';
        outlineWidth: number;
        outlineColor: string | number;
        outlineOpacity: number;
        outlineBlur: number;
        strokeWidth: number;
        strokeColor: string | number;
        strokeOpacity: number;
        fillOpacity: number;
        depthOffset: number;
        sdfGlyphSize: number;
        sync: () => void;
        dispose: () => void;
        material: Material;
        geometry: BufferGeometry;
        [key: string]: any;
    }
}