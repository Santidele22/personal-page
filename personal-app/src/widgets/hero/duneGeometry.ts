import type { Quad3, SlabFace, Vec3 } from './duneTypes';
import { bilerp, makeSlab, vAdd, vCross, vNorm, vScale, vSub } from './duneVectors';

export function duneHeight(wx: number, wz: number, anchorX: number, t: number): number {
	const dx = wx - anchorX;
	const wavePhase = wx * 0.42 + Math.sin(wz * 0.95) * 0.75 + t * 0.06;
	const ridge1 = Math.pow(1 - Math.abs(Math.sin(wavePhase)), 1.65) * 0.72;
	const ridge2 = Math.pow(1 - Math.abs(Math.cos(wx * 0.28 - wz * 0.65 + 0.8)), 1.8) * 0.45;
	const frontCorridor =
		wz > -0.25 ? Math.exp(-(dx * dx) / 1.85) * Math.min(1, (wz + 0.25) / 0.85) : 0;
	const ridgeScale = 1 - frontCorridor * 0.88;
	const dMono = Math.hypot(dx * 0.65, wz + 0.12);
	const pedestal = Math.exp(-dMono * dMono * 0.42) * 0.34 * (1 - frontCorridor * 0.55);
	const plazaSlope = frontCorridor * Math.max(0, wz - 0.15) * 0.14;
	return 1.38 - (ridge1 + ridge2) * ridgeScale - pedestal + plazaSlope;
}

export function mapQuadPath(quad: Quad3, uvPoints: [number, number][], normalOffset = 0.014): Vec3[] {
	const [p00, p10, p11, p01] = quad;
	const n = vNorm(vCross(vSub(p01, p00), vSub(p10, p00)));
	return uvPoints.map(([u, v]) => vAdd(bilerp(p00, p10, p11, p01, u, v), vScale(n, normalOffset)));
}

export interface DunePylons {
	pylonFaces: SlabFace[];
	leftFrontQuad: Quad3;
	rightFrontQuad: Quad3;
	leftBackQuad: Quad3;
	rightBackQuad: Quad3;
}

export interface KintsugiSeam {
	quad: Quad3;
	pts: Vec3[];
}

export interface StoneInscription {
	quad: Quad3;
	side: -1 | 1;
	accent: boolean;
	pts: Vec3[];
}

export function createDunePylons(): DunePylons {
	const leftPylon = {
		bFL: [-0.96, 1.08, 0.34] as Vec3,
		bFR: [-0.15, 1.08, 0.34] as Vec3,
		bBR: [-0.15, 1.08, -0.34] as Vec3,
		bBL: [-0.96, 1.08, -0.34] as Vec3,
		tFL: [-0.58, -1.36, 0.2] as Vec3,
		tFR: [-0.13, -1.52, 0.2] as Vec3,
		tBR: [-0.13, -1.52, -0.2] as Vec3,
		tBL: [-0.58, -1.36, -0.2] as Vec3,
	};
	const rightPylon = {
		bFL: [0.15, 1.08, 0.34] as Vec3,
		bFR: [0.96, 1.08, 0.34] as Vec3,
		bBR: [0.96, 1.08, -0.34] as Vec3,
		bBL: [0.15, 1.08, -0.34] as Vec3,
		tFL: [0.13, -1.52, 0.2] as Vec3,
		tFR: [0.58, -1.36, 0.2] as Vec3,
		tBR: [0.58, -1.36, -0.2] as Vec3,
		tBL: [0.13, -1.52, -0.2] as Vec3,
	};

	const pylonFaces: SlabFace[] = [
		...makeSlab(
			[leftPylon.bFL, leftPylon.bFR, leftPylon.bBR, leftPylon.bBL],
			[leftPylon.tFL, leftPylon.tFR, leftPylon.tBR, leftPylon.tBL],
		),
		...makeSlab(
			[rightPylon.bFL, rightPylon.bFR, rightPylon.bBR, rightPylon.bBL],
			[rightPylon.tFL, rightPylon.tFR, rightPylon.tBR, rightPylon.tBL],
		),
	];

	const leftFrontQuad: Quad3 = [leftPylon.bFL, leftPylon.bFR, leftPylon.tFR, leftPylon.tFL];
	const rightFrontQuad: Quad3 = [rightPylon.bFL, rightPylon.bFR, rightPylon.tFR, rightPylon.tFL];
	const leftBackQuad: Quad3 = [leftPylon.bBR, leftPylon.bBL, leftPylon.tBL, leftPylon.tBR];
	const rightBackQuad: Quad3 = [rightPylon.bBR, rightPylon.bBL, rightPylon.tBL, rightPylon.tBR];

	return { pylonFaces, leftFrontQuad, rightFrontQuad, leftBackQuad, rightBackQuad };
}

export function createKintsugiSeams(pylons: DunePylons): KintsugiSeam[] {
	const { leftFrontQuad, rightFrontQuad, leftBackQuad, rightBackQuad } = pylons;

	return [
		{
			quad: leftFrontQuad,
			pts: mapQuadPath(leftFrontQuad, [
				[0.22, 0.24],
				[0.56, 0.4],
				[0.34, 0.56],
				[0.68, 0.72],
				[0.46, 0.88],
			]),
		},
		{
			quad: leftFrontQuad,
			pts: mapQuadPath(leftFrontQuad, [
				[0.34, 0.56],
				[0.12, 0.44],
			]),
		},
		{
			quad: rightFrontQuad,
			pts: mapQuadPath(rightFrontQuad, [
				[0.78, 0.22],
				[0.42, 0.4],
				[0.64, 0.58],
				[0.34, 0.74],
				[0.52, 0.88],
			]),
		},
		{
			quad: rightFrontQuad,
			pts: mapQuadPath(rightFrontQuad, [
				[0.64, 0.58],
				[0.88, 0.46],
			]),
		},
		{
			quad: leftBackQuad,
			pts: mapQuadPath(leftBackQuad, [
				[0.28, 0.24],
				[0.58, 0.5],
				[0.38, 0.78],
				[0.68, 0.9],
			]),
		},
		{
			quad: rightBackQuad,
			pts: mapQuadPath(rightBackQuad, [
				[0.72, 0.24],
				[0.42, 0.54],
				[0.62, 0.84],
			]),
		},
	];
}

export function createStoneInscriptions(pylons: DunePylons): StoneInscription[] {
	const { leftFrontQuad, rightFrontQuad } = pylons;

	return [
		...[0.24, 0.28, 0.32, 0.44, 0.48, 0.52, 0.56, 0.68, 0.72].map((v, idx) => ({
			quad: leftFrontQuad,
			side: -1 as const,
			accent: idx === 1 || idx === 5,
			pts: mapQuadPath(
				leftFrontQuad,
				[
					[0.88 - (idx % 3 === 0 ? 0.22 : 0.15), v],
					[0.91, v],
				],
				0.012,
			),
		})),
		...[0.26, 0.3, 0.34, 0.46, 0.5, 0.54, 0.66, 0.7, 0.74].map((v, idx) => ({
			quad: rightFrontQuad,
			side: 1 as const,
			accent: idx === 2 || idx === 6,
			pts: mapQuadPath(
				rightFrontQuad,
				[
					[0.09, v],
					[0.09 + (idx % 3 === 1 ? 0.22 : 0.15), v],
				],
				0.012,
			),
		})),
	];
}
