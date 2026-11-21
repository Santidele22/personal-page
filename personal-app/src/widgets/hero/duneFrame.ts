import { duneHeight } from './duneGeometry';
import type { DunePalette, DuneState, Vec3 } from './duneTypes';
import { rotateXYZ } from './duneVectors';

export interface DrawItem {
	z: number;
	draw: (c: CanvasRenderingContext2D) => void;
}

export type Projector = (p: Vec3) => [number, number, number, number];

export interface DuneView {
	state: DuneState;
	anchorX: number;
	anchorY: number;
	effRx: number;
	effRy: number;
	splitGap: number;
}

export interface DuneFrame extends DuneView {
	ctx: CanvasRenderingContext2D;
	w: number;
	h: number;
	isDesktop: boolean;
	cx: number;
	cy: number;
	scale: number;
	palette: DunePalette;
	drawList: DrawItem[];
	sunDir: Vec3;
	project: Projector;
	scribeScreenPos?: [number, number];
}

export function createProjector(cx: number, cy: number, scale: number, camDist: number): Projector {
	return (p: Vec3): [number, number, number, number] => {
		const zFactor = camDist / (camDist - p[2]);
		return [cx + p[0] * scale * zFactor, cy + p[1] * scale * zFactor, p[2], zFactor];
	};
}

export function transformGatePoint(view: DuneView, p: Vec3, sideSign = 0): Vec3 {
	const { anchorX, anchorY, effRx, effRy, splitGap } = view;
	const rp = rotateXYZ([p[0] + sideSign * splitGap, p[1], p[2]], effRx, effRy, 0);
	return [rp[0] + anchorX, rp[1] + anchorY, rp[2]];
}

export function transformGroundPoint(view: DuneView, lx: number, lz: number): Vec3 {
	const { state, anchorX, effRx, effRy } = view;
	const gp = rotateXYZ([lx, 0, lz], 0, effRy * 0.22, 0);
	const wx = gp[0] + anchorX;
	const wz = gp[2];
	const wy = duneHeight(wx, wz, anchorX, state.time * (1 - state.shieldStrength * 0.7)) - 0.148;
	const rp = rotateXYZ([wx - anchorX, wy, wz], effRx * 0.45, 0, 0);
	return [rp[0] + anchorX, rp[1], rp[2]];
}
