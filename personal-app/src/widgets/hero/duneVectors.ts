import type { Quad3, SlabFace, Vec3 } from './duneTypes';

export function vNorm(v: Vec3): Vec3 {
	const len = Math.hypot(v[0], v[1], v[2]) || 1;
	return [v[0] / len, v[1] / len, v[2] / len];
}

export function vAdd(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vSub(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vScale(v: Vec3, s: number): Vec3 {
	return [v[0] * s, v[1] * s, v[2] * s];
}

export function vDot(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vCross(a: Vec3, b: Vec3): Vec3 {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function bilerp(p00: Vec3, p10: Vec3, p11: Vec3, p01: Vec3, u: number, v: number): Vec3 {
	return vLerp(vLerp(p00, p10, u), vLerp(p01, p11, u), v);
}

export function rotateXYZ(p: Vec3, rx: number, ry: number, rz: number): Vec3 {
	let [x, y, z] = p;
	if (rx) {
		const c = Math.cos(rx);
		const s = Math.sin(rx);
		const ny = y * c - z * s;
		const nz = y * s + z * c;
		y = ny;
		z = nz;
	}
	if (ry) {
		const c = Math.cos(ry);
		const s = Math.sin(ry);
		const nx = x * c + z * s;
		const nz = -x * s + z * c;
		x = nx;
		z = nz;
	}
	if (rz) {
		const c = Math.cos(rz);
		const s = Math.sin(rz);
		const nx = x * c - y * s;
		const ny = x * s + y * c;
		x = nx;
		y = ny;
	}
	return [x, y, z];
}

export function makeSlab(cornersBottom: Quad3, cornersTop: Quad3): SlabFace[] {
	const [bFL, bFR, bBR, bBL] = cornersBottom;
	const [tFL, tFR, tBR, tBL] = cornersTop;
	const center = vScale(
		[bFL, bFR, bBR, bBL, tFL, tFR, tBR, tBL].reduce((a, b) => vAdd(a, b), [0, 0, 0] as Vec3),
		1 / 8,
	);
	const rawFaces: SlabFace[] = [
		{ pts: [bFL, bFR, tFR, tFL], kind: 'front' },
		{ pts: [bFR, bBR, tBR, tFR], kind: 'right' },
		{ pts: [bBR, bBL, tBL, tBR], kind: 'back' },
		{ pts: [bBL, bFL, tFL, tBL], kind: 'left' },
		{ pts: [tFL, tFR, tBR, tBL], kind: 'top' },
		{ pts: [bBL, bBR, bFR, bFL], kind: 'bottom' },
	];
	return rawFaces.map((f) => {
		const c = vScale(
			f.pts.reduce((a, b) => vAdd(a, b), [0, 0, 0] as Vec3),
			0.25,
		);
		const n = vNorm(vCross(vSub(f.pts[1], f.pts[0]), vSub(f.pts[2], f.pts[0])));
		const outDir = vSub(c, center);
		const pts = vDot(n, outDir) < 0 ? f.pts.slice().reverse() : f.pts;
		return { pts, kind: f.kind };
	});
}
