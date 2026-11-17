export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
export type Quad3 = [Vec3, Vec3, Vec3, Vec3];

export interface SlabFace {
	pts: Vec3[];
	kind: 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';
}

export interface DunePalette {
	isDark: boolean;
	bg: RGB;
	card: RGB;
	secondary: RGB;
	muted: RGB;
	border: RGB;
	fg: RGB;
	mutedFg: RGB;
	aka: RGB;
	akaDeep: RGB;
}

export interface DuneState {
	rotX: number;
	rotY: number;
	velX: number;
	velY: number;
	hoverX: number;
	hoverY: number;
	isDragging: boolean;
	isPointerHold: boolean;
	shieldLocked: boolean;
	dragDist: number;
	lastPtrX: number;
	lastPtrY: number;
	shieldStrength: number;
	pulse: number;
	time: number;
}

const DEFAULT_ROT_X = 0.14;
const DEFAULT_ROT_Y = -0.32;
const MIN_ROT_X = -0.22;
const MAX_ROT_X = 0.42;

export function hexToRgb(hex: string): RGB {
	const clean = hex.trim().replace('#', '');
	if (clean.length === 3 && /^[0-9a-fA-F]{3}$/.test(clean)) {
		return [
			parseInt(clean[0] + clean[0], 16),
			parseInt(clean[1] + clean[1], 16),
			parseInt(clean[2] + clean[2], 16),
		];
	}
	if (clean.length === 6 && /^[0-9a-fA-F]{6}$/.test(clean)) {
		return [
			parseInt(clean.slice(0, 2), 16),
			parseInt(clean.slice(2, 4), 16),
			parseInt(clean.slice(4, 6), 16),
		];
	}
	return [35, 32, 26];
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
	const k = Math.max(0, Math.min(1, t));
	return [
		Math.round(a[0] + (b[0] - a[0]) * k),
		Math.round(a[1] + (b[1] - a[1]) * k),
		Math.round(a[2] + (b[2] - a[2]) * k),
	];
}

export function rgba(rgb: RGB, alpha: number): string {
	return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

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

function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function bilerp(p00: Vec3, p10: Vec3, p11: Vec3, p01: Vec3, u: number, v: number): Vec3 {
	return vLerp(vLerp(p00, p10, u), vLerp(p01, p11, u), v);
}

function rotateXYZ(p: Vec3, rx: number, ry: number, rz: number): Vec3 {
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

export function createDuneState(): DuneState {
	return {
		rotX: DEFAULT_ROT_X,
		rotY: DEFAULT_ROT_Y,
		velX: 0,
		velY: 0,
		hoverX: 0,
		hoverY: 0,
		isDragging: false,
		isPointerHold: false,
		shieldLocked: false,
		dragDist: 0,
		lastPtrX: 0,
		lastPtrY: 0,
		shieldStrength: 0,
		pulse: 0,
		time: 0,
	};
}

export function isSanctuaryActive(state: Pick<DuneState, 'shieldLocked' | 'isPointerHold' | 'pulse'>): boolean {
	return state.shieldLocked || state.isPointerHold || state.pulse > 0.15;
}

export function getTelemetryLabel(state: Pick<DuneState, 'shieldLocked' | 'isPointerHold' | 'pulse'>): string {
	return isSanctuaryActive(state)
		? 'UMBRAL ABIERTO · ARENA EN CALMA'
		: 'TORMENTA EN LA ARENA · UMBRAL EN PIE';
}

export function toggleSanctuary(state: DuneState): void {
	state.shieldLocked = !state.shieldLocked;
	if (state.shieldLocked) {
		state.pulse = 1;
	}
}

export function releaseInteraction(state: DuneState): boolean {
	if (!state.isDragging) return false;
	state.isDragging = false;
	state.isPointerHold = false;
	if (state.dragDist < 7) {
		state.shieldLocked = !state.shieldLocked;
		state.pulse = 1;
	}
	return true;
}

export function resetCamera(state: DuneState): void {
	state.rotX = DEFAULT_ROT_X;
	state.rotY = DEFAULT_ROT_Y;
	state.velX = 0;
	state.velY = 0;
}

function readPalette(): DunePalette {
	const styles = getComputedStyle(document.documentElement);
	const isDark = document.documentElement.classList.contains('dark');
	return {
		isDark,
		bg: hexToRgb(styles.getPropertyValue('--background') || (isDark ? '#14110d' : '#f4efe4')),
		card: hexToRgb(styles.getPropertyValue('--card') || (isDark ? '#1c1812' : '#fbf8f0')),
		secondary: hexToRgb(styles.getPropertyValue('--secondary') || (isDark ? '#241f17' : '#ece5d4')),
		muted: hexToRgb(styles.getPropertyValue('--muted') || (isDark ? '#231e16' : '#ebe4d2')),
		border: hexToRgb(styles.getPropertyValue('--border') || (isDark ? '#322b20' : '#ddd2bc')),
		fg: hexToRgb(styles.getPropertyValue('--foreground') || (isDark ? '#eae3d3' : '#23201a')),
		mutedFg: hexToRgb(styles.getPropertyValue('--muted-foreground') || (isDark ? '#a29681' : '#6f6657')),
		aka: hexToRgb(styles.getPropertyValue('--aka') || (isDark ? '#d95448' : '#c73e3a')),
		akaDeep: hexToRgb(styles.getPropertyValue('--aka-deep') || (isDark ? '#c73e3a' : '#a02f2b')),
	};
}

function mapQuadPath(quad: Quad3, uvPoints: [number, number][], normalOffset = 0.014): Vec3[] {
	const [p00, p10, p11, p01] = quad;
	const n = vNorm(vCross(vSub(p01, p00), vSub(p10, p00)));
	return uvPoints.map(([u, v]) => vAdd(bilerp(p00, p10, p11, p01, u, v), vScale(n, normalOffset)));
}

export function initDuneHero(): () => void {
	const stageNode = document.getElementById('duneStage');
	const canvasNode = document.getElementById('duneCanvas');
	const telemetryState = document.getElementById('telemetryState');
	const holdHelmBtn = document.getElementById('holdHelmBtn');

	if (!(stageNode instanceof HTMLElement) || !(canvasNode instanceof HTMLCanvasElement)) {
		return () => {};
	}
	const stage: HTMLElement = stageNode;
	const canvas: HTMLCanvasElement = canvasNode;

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

	const kintsugiSeams = [
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

	const stoneInscriptions = [
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

	const SAND_COUNT = 150;
	const sand = Array.from({ length: SAND_COUNT }, (_, i) => {
		const s1 = Math.sin(i * 17.13) * 43758.5453;
		const f1 = s1 - Math.floor(s1);
		const s2 = Math.sin(i * 63.71) * 19341.123;
		const f2 = s2 - Math.floor(s2);
		return {
			x: (f1 - 0.5) * 13.0,
			z: -1.8 + f2 * 3.4,
			yOffset: 0.04 + (i % 6) * 0.06,
			speed: 1.4 + (i % 5) * 0.34,
			len: 0.18 + (i % 4) * 0.11,
			orbitA: (i / SAND_COUNT) * Math.PI * 2,
			isEmber: i % 8 === 0,
		};
	});

	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	let reducedMotion = motionQuery.matches;
	let palette = readPalette();
	const state = createDuneState();
	let lastTs = performance.now();
	let rafId = 0;
	let isVisible = true;
	let pointerStartX = 0;
	let pointerStartY = 0;
	let activePointerId: number | null = null;
	let capturedPointer = false;

	function syncTelemetry(): void {
		if (telemetryState) {
			telemetryState.textContent = getTelemetryLabel(state);
		}
		if (holdHelmBtn) {
			holdHelmBtn.setAttribute('aria-pressed', state.shieldLocked ? 'true' : 'false');
			holdHelmBtn.textContent = state.shieldLocked ? 'Soltar la calma' : 'Calmar la tormenta';
		}
	}

	function updateSand(dt: number): void {
		const target = isSanctuaryActive(state) ? 1 : 0;
		state.shieldStrength += (target - state.shieldStrength) * Math.min(1, dt * 3.6);
		if (state.pulse > 0) {
			state.pulse = Math.max(0, state.pulse - dt * 0.75);
			if (state.pulse === 0) syncTelemetry();
		}

		for (const p of sand) {
			if (state.shieldStrength > 0.45 && p.isEmber) {
				p.orbitA += dt * 0.7;
				p.yOffset += dt * 0.65;
				if (p.yOffset > 2.4) p.yOffset = 0.05;
			} else {
				const speedScale = 1 - state.shieldStrength * 0.78;
				p.x -= p.speed * speedScale * dt;
				if (p.x < -6.8) {
					p.x = 6.8;
					p.yOffset = 0.04 + Math.abs(Math.sin(p.orbitA * 9 + state.time)) * 0.36;
				}
			}
		}
	}

	function renderFrame(): void {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = stage.clientWidth;
		const h = stage.clientHeight;
		if (w === 0 || h === 0) return;

		const targetW = Math.round(w * dpr);
		const targetH = Math.round(h * dpr);
		if (canvas.width !== targetW || canvas.height !== targetH) {
			canvas.width = targetW;
			canvas.height = targetH;
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		const isDesktop = w >= 1024;
		const cx = w * 0.5;
		const cy = isDesktop ? h * 0.5 : h * 0.73;
		const scale = isDesktop ? Math.min(w, h) * 0.215 : Math.min(w, h) * 0.155;
		const camDist = 7.6;
		const anchorX = isDesktop ? 1.85 : 0.0;
		const anchorY = 0.0;

		function project(p: Vec3): [number, number, number, number] {
			const zFactor = camDist / (camDist - p[2]);
			return [cx + p[0] * scale * zFactor, cy + p[1] * scale * zFactor, p[2], zFactor];
		}

		const effRx = state.rotX + state.hoverX;
		const effRy = state.rotY + state.hoverY;

		// 1. Arrakis Low Red Sun behind the Split Monolith Gate
		const sunCenterWorld: Vec3 = [anchorX + 0.15, -0.35, -2.6];
		const sunScreen = project(rotateXYZ(sunCenterWorld, effRx * 0.15, state.hoverY * 0.12, 0));
		const sunR = Math.min(w, h) * (isDesktop ? 0.19 : 0.145);

		const sunHalo = ctx.createRadialGradient(
			sunScreen[0],
			sunScreen[1],
			sunR * 0.15,
			sunScreen[0],
			sunScreen[1],
			sunR * 2.2,
		);
		sunHalo.addColorStop(0, rgba(palette.aka, palette.isDark ? 0.3 : 0.21));
		sunHalo.addColorStop(0.5, rgba(palette.aka, palette.isDark ? 0.1 : 0.07));
		sunHalo.addColorStop(1, rgba(palette.aka, 0));
		ctx.fillStyle = sunHalo;
		ctx.beginPath();
		ctx.arc(sunScreen[0], sunScreen[1], sunR * 2.2, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = rgba(palette.aka, palette.isDark ? 0.25 : 0.16);
		ctx.beginPath();
		ctx.arc(sunScreen[0], sunScreen[1], sunR * 0.8, 0, Math.PI * 2);
		ctx.fill();

		// Eclipse arc (Arrakis second moon motif)
		ctx.strokeStyle = rgba(palette.aka, 0.38);
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.arc(sunScreen[0] - sunR * 0.12, sunScreen[1] + sunR * 0.08, sunR * 0.98, -0.5, Math.PI * 1.25);
		ctx.stroke();

		const drawList: { z: number; draw: (c: CanvasRenderingContext2D) => void }[] = [];
		const sunDir = vNorm([-0.74, -0.52, 0.42]);

		// 2. 3D Sculpted Shaded Desert Dunes
		const cols = 34;
		const rows = 12;
		const xMin = -6.8;
		const xMax = 6.8;
		const zMin = -2.2;
		const zMax = 2.0;
		const duneVerts: Vec3[][] = [];
		for (let r = 0; r <= rows; r++) {
			const wz = zMin + (r / rows) * (zMax - zMin);
			const rowArr: Vec3[] = [];
			for (let c = 0; c <= cols; c++) {
				const wx = xMin + (c / cols) * (xMax - xMin);
				const wy = duneHeight(wx, wz, anchorX, state.time * (1 - state.shieldStrength * 0.7));
				const gp = rotateXYZ([wx - anchorX, wy - 0.15, wz], effRx * 0.45, effRy * 0.22, 0);
				rowArr.push([gp[0] + anchorX, gp[1], gp[2]]);
			}
			duneVerts.push(rowArr);
		}

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const p00 = duneVerts[r][c];
				const p10 = duneVerts[r][c + 1];
				const p11 = duneVerts[r + 1][c + 1];
				const p01 = duneVerts[r + 1][c];

				const tris: [Vec3, Vec3, Vec3][] = [
					[p00, p10, p11],
					[p00, p11, p01],
				];

				for (const tri of tris) {
					let n = vCross(vSub(tri[1], tri[0]), vSub(tri[2], tri[0]));
					if (n[1] > 0) n = vScale(n, -1);
					const unitN = vNorm(n);
					const lit = Math.max(0, Math.min(1, (vDot(unitN, sunDir) + 0.35) / 1.25));
					const avgZ = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;

					const duneColor = palette.isDark
						? mixRgb(palette.bg, mixRgb(palette.secondary, palette.fg, 0.22), lit)
						: mixRgb(mixRgb(palette.fg, palette.muted, 0.56), palette.card, Math.pow(lit, 0.85));

					const sp = tri.map(project);
					drawList.push({
						z: -3.2 + avgZ * 0.22,
						draw: (ctx2) => {
							ctx2.fillStyle = rgba(duneColor, 0.96);
							ctx2.strokeStyle = rgba(duneColor, 0.62);
							ctx2.lineWidth = 0.65;
							ctx2.beginPath();
							ctx2.moveTo(sp[0][0], sp[0][1]);
							ctx2.lineTo(sp[1][0], sp[1][1]);
							ctx2.lineTo(sp[2][0], sp[2][1]);
							ctx2.closePath();
							ctx2.fill();
							ctx2.stroke();
						},
					});
				}

				const cellWx = xMin + (c / cols) * (xMax - xMin);
				if ((r === 5 || r === 8) && Math.abs(cellWx - anchorX) > 1.05) {
					const sA = project(p00);
					const sB = project(p10);
					const avgZ = (p00[2] + p10[2]) * 0.5;
					drawList.push({
						z: -3.15 + avgZ * 0.22,
						draw: (ctx2) => {
							ctx2.strokeStyle = rgba(r === 5 ? palette.aka : palette.fg, r === 5 ? 0.35 : 0.18);
							ctx2.lineWidth = r === 5 ? 1.15 : 0.75;
							ctx2.beginPath();
							ctx2.moveTo(sA[0], sA[1]);
							ctx2.lineTo(sB[0], sB[1]);
							ctx2.stroke();
						},
					});
				}
			}
		}

		// 3. Monumental Brutalist Split Gate + Volumetric Light & Scale
		const splitGap = 0.04 + state.shieldStrength * 0.09;

		function transformGatePoint(p: Vec3, sideSign = 0): Vec3 {
			const rp = rotateXYZ([p[0] + sideSign * splitGap, p[1], p[2]], effRx, effRy, 0);
			return [rp[0] + anchorX, rp[1] + anchorY, rp[2]];
		}

		function transformGroundPoint(lx: number, lz: number): Vec3 {
			const gp = rotateXYZ([lx, 0, lz], 0, effRy * 0.22, 0);
			const wx = gp[0] + anchorX;
			const wz = gp[2];
			const wy = duneHeight(wx, wz, anchorX, state.time * (1 - state.shieldStrength * 0.7)) - 0.148;
			const rp = rotateXYZ([wx - anchorX, wy, wz], effRx * 0.45, 0, 0);
			return [rp[0] + anchorX, rp[1], rp[2]];
		}

		// 3a. Long Monolith Shadows cast across the right/forward dune ridges
		const shReachX = 3.6 + state.shieldStrength * 0.55;
		const leftShadowLoops: [number, number][] = [
			[-0.85 - splitGap, 0.22],
			[-0.14 - splitGap, 0.22],
			[1.95 + splitGap, 1.38],
			[1.15 + splitGap, 1.56],
		];
		const rightShadowLoops: [number, number][] = [
			[0.16 + splitGap, 0.26],
			[0.96 + splitGap, 0.26],
			[shReachX, 0.95],
			[shReachX - 0.65, 1.48],
		];

		for (const shLoop of [leftShadowLoops, rightShadowLoops]) {
			const wSh = shLoop.map(([lx, lz]) => transformGroundPoint(lx, lz));
			const sSh = wSh.map(project);
			drawList.push({
				z: -2.45,
				draw: (c) => {
					const gSh = c.createLinearGradient(sSh[0][0], sSh[0][1], sSh[2][0], sSh[2][1]);
					const shColor = palette.isDark ? palette.bg : palette.fg;
					const shAlpha0 = palette.isDark ? 0.76 : 0.36;
					gSh.addColorStop(0, rgba(shColor, shAlpha0 + state.shieldStrength * 0.1));
					gSh.addColorStop(0.58, rgba(shColor, shAlpha0 * 0.62));
					gSh.addColorStop(1, rgba(shColor, 0));
					c.fillStyle = gSh;
					c.beginPath();
					c.moveTo(sSh[0][0], sSh[0][1]);
					for (let k = 1; k < sSh.length; k++) c.lineTo(sSh[k][0], sSh[k][1]);
					c.closePath();
					c.fill();
				},
			});
		}

		// 3b. Volumetric --aka Light Carpet spilling across the dune parvis
		const fanNearW = 0.14 + state.shieldStrength * 0.1;
		const fanFarW = 0.88 + state.shieldStrength * 0.58;
		const groundBeamPts = [
			transformGroundPoint(-fanNearW, 0.18),
			transformGroundPoint(fanNearW, 0.18),
			transformGroundPoint(fanFarW, 1.96),
			transformGroundPoint(-fanFarW, 1.96),
		];
		const spGroundBeam = groundBeamPts.map(project);
		drawList.push({
			z: -2.35,
			draw: (c) => {
				const midNearX = (spGroundBeam[0][0] + spGroundBeam[1][0]) * 0.5;
				const midNearY = (spGroundBeam[0][1] + spGroundBeam[1][1]) * 0.5;
				const midFarX = (spGroundBeam[2][0] + spGroundBeam[3][0]) * 0.5;
				const midFarY = (spGroundBeam[2][1] + spGroundBeam[3][1]) * 0.5;
				const gFan = c.createLinearGradient(midNearX, midNearY, midFarX, midFarY);
				const baseBoost = 0.32 + state.shieldStrength * 0.36;
				gFan.addColorStop(0, rgba(palette.aka, Math.min(0.85, baseBoost * 1.35)));
				gFan.addColorStop(0.52, rgba(palette.aka, baseBoost * 0.68));
				gFan.addColorStop(1, rgba(palette.aka, 0));
				c.fillStyle = gFan;
				c.beginPath();
				c.moveTo(spGroundBeam[0][0], spGroundBeam[0][1]);
				c.lineTo(spGroundBeam[1][0], spGroundBeam[1][1]);
				c.lineTo(spGroundBeam[2][0], spGroundBeam[2][1]);
				c.lineTo(spGroundBeam[3][0], spGroundBeam[3][1]);
				c.closePath();
				c.fill();
			},
		});

		// Seamless Sanctuary Slit Backlight
		const slitBackWall = [
			transformGatePoint([-0.15, -1.5, -0.18], -1),
			transformGatePoint([0.15, -1.5, 0.18], 1),
			transformGatePoint([0.16, 1.06, 0.3], 1),
			transformGatePoint([-0.16, 1.06, -0.3], -1),
		];
		const spSlitWall = slitBackWall.map(project);
		drawList.push({
			z: -0.95,
			draw: (c) => {
				const gHoriz = c.createLinearGradient(
					spSlitWall[0][0],
					spSlitWall[0][1],
					spSlitWall[1][0],
					spSlitWall[1][1],
				);
				const edgeAlpha = 0.28 + state.shieldStrength * 0.26;
				const coreAlpha = 0.68 + state.shieldStrength * 0.28;
				gHoriz.addColorStop(0, rgba(palette.akaDeep, edgeAlpha));
				gHoriz.addColorStop(0.45, rgba(palette.aka, coreAlpha));
				gHoriz.addColorStop(1, rgba(palette.aka, edgeAlpha * 0.85));
				c.fillStyle = gHoriz;
				c.beginPath();
				c.moveTo(spSlitWall[0][0], spSlitWall[0][1]);
				for (let k = 1; k < 4; k++) c.lineTo(spSlitWall[k][0], spSlitWall[k][1]);
				c.closePath();
				c.fill();
			},
		});

		// Soft Atmospheric God-Ray Wedge
		const rayWedgePts = [
			transformGatePoint([-0.14, -0.75, -0.16], -1),
			transformGatePoint([-0.15, 1.02, 0.18], -1),
			transformGroundPoint(-fanFarW * 0.78, 1.72),
			transformGroundPoint(fanFarW * 0.78, 1.72),
			transformGatePoint([0.15, 1.02, 0.18], 1),
			transformGatePoint([0.14, -0.75, 0.16], 1),
		];
		const spWedge = rayWedgePts.map(project);
		drawList.push({
			z: -0.88,
			draw: (c) => {
				const topMidX = (spWedge[0][0] + spWedge[5][0]) * 0.5;
				const topMidY = (spWedge[0][1] + spWedge[5][1]) * 0.5;
				const botMidX = (spWedge[2][0] + spWedge[3][0]) * 0.5;
				const botMidY = (spWedge[2][1] + spWedge[3][1]) * 0.5;
				const gWedge = c.createLinearGradient(topMidX, topMidY, botMidX, botMidY);
				const wAlpha = 0.18 + state.shieldStrength * 0.24;
				gWedge.addColorStop(0, rgba(palette.aka, wAlpha * 0.75));
				gWedge.addColorStop(0.48, rgba(palette.aka, wAlpha));
				gWedge.addColorStop(1, rgba(palette.aka, 0));
				c.fillStyle = gWedge;
				c.beginPath();
				c.moveTo(spWedge[0][0], spWedge[0][1]);
				for (let k = 1; k < spWedge.length; k++) c.lineTo(spWedge[k][0], spWedge[k][1]);
				c.closePath();
				c.fill();
			},
		});

		// Render left and right brutalist pylons
		for (let idx = 0; idx < pylonFaces.length; idx++) {
			const f = pylonFaces[idx];
			const sideSign = idx < 6 ? -1 : 1;
			const wPts = f.pts.map((p) => transformGatePoint(p, sideSign));
			const n = vCross(vSub(wPts[1], wPts[0]), vSub(wPts[2], wPts[0]));
			if (n[2] <= 0) continue;
			const unitN = vNorm(n);
			const diff = Math.max(0, vDot(unitN, sunDir));
			const isInnerWall = (sideSign === -1 && f.kind === 'right') || (sideSign === 1 && f.kind === 'left');

			let stoneTone = palette.isDark
				? mixRgb(palette.bg, palette.fg, 0.12 + diff * 0.32)
				: mixRgb(mixRgb(palette.fg, palette.muted, 0.25), palette.card, 0.22 + diff * 0.74);

			if (isInnerWall) {
				stoneTone = mixRgb(stoneTone, palette.aka, 0.28 + state.shieldStrength * 0.38);
			}

			const sPts = wPts.map(project);
			const avgZ = wPts.reduce((acc, p) => acc + p[2], 0) / wPts.length;

			drawList.push({
				z: avgZ,
				draw: (c) => {
					c.fillStyle = rgba(stoneTone, 0.99);
					c.strokeStyle = rgba(palette.fg, palette.isDark ? 0.34 : 0.42);
					c.lineWidth = 1.05;
					c.lineJoin = 'round';
					c.beginPath();
					c.moveTo(sPts[0][0], sPts[0][1]);
					for (let k = 1; k < sPts.length; k++) c.lineTo(sPts[k][0], sPts[k][1]);
					c.closePath();
					c.fill();
					c.stroke();
				},
			});
		}

		// Render flush Kintsugi scars
		for (let sIdx = 0; sIdx < kintsugiSeams.length; sIdx++) {
			const seam = kintsugiSeams[sIdx];
			const sideSign = sIdx === 0 || sIdx === 1 || sIdx === 4 ? -1 : 1;
			const wQuad = seam.quad.map((p) => transformGatePoint(p, sideSign));
			const qN = vCross(vSub(wQuad[3], wQuad[0]), vSub(wQuad[1], wQuad[0]));
			if (qN[2] <= 0) continue;

			const wPts = seam.pts.map((p) => transformGatePoint(p, sideSign));
			const sPts = wPts.map(project);
			const avgZ = wQuad.reduce((acc, p) => acc + p[2], 0) / 4 + 0.04;

			drawList.push({
				z: avgZ,
				draw: (c) => {
					if (state.shieldStrength > 0.05 || state.pulse > 0.02) {
						c.strokeStyle = rgba(palette.aka, 0.4 * Math.max(state.shieldStrength, state.pulse));
						c.lineWidth = 5.2;
						c.lineCap = 'round';
						c.lineJoin = 'round';
						c.beginPath();
						c.moveTo(sPts[0][0], sPts[0][1]);
						for (let k = 1; k < sPts.length; k++) c.lineTo(sPts[k][0], sPts[k][1]);
						c.stroke();
					}
					c.strokeStyle = rgba(palette.aka, 0.92);
					c.lineWidth = 2.0 + state.shieldStrength * 0.7;
					c.lineCap = 'round';
					c.lineJoin = 'round';
					c.beginPath();
					c.moveTo(sPts[0][0], sPts[0][1]);
					for (let k = 1; k < sPts.length; k++) c.lineTo(sPts[k][0], sPts[k][1]);
					c.stroke();
				},
			});
		}

		// 4. Carved Stone Inscriptions on the Monolith Faces
		for (const inscr of stoneInscriptions) {
			const wQuad = inscr.quad.map((p) => transformGatePoint(p, inscr.side));
			const qN = vCross(vSub(wQuad[3], wQuad[0]), vSub(wQuad[1], wQuad[0]));
			if (qN[2] <= 0) continue;

			const wPts = inscr.pts.map((p) => transformGatePoint(p, inscr.side));
			const sPts = wPts.map(project);
			const avgZ = wQuad.reduce((acc, p) => acc + p[2], 0) / 4 + 0.032;

			drawList.push({
				z: avgZ,
				draw: (c) => {
					const isGlow = inscr.accent;
					c.strokeStyle = isGlow
						? rgba(palette.aka, 0.58 + state.shieldStrength * 0.32)
						: rgba(palette.fg, (palette.isDark ? 0.32 : 0.26) + state.shieldStrength * 0.12);
					c.lineWidth = isGlow ? 1.25 : 0.9;
					c.lineCap = 'round';
					c.beginPath();
					c.moveTo(sPts[0][0], sPts[0][1]);
					c.lineTo(sPts[1][0], sPts[1][1]);
					c.stroke();
				},
			});
		}

		// 4b. Ceremonial Stone Stairway Carvings
		const stepCount = 10;
		const stairBasePts = [
			transformGatePoint([-0.26, 0.96, 0.36], 0),
			transformGatePoint([0.26, 0.96, 0.36], 0),
			transformGatePoint([0.52, 1.25, 1.48], 0),
			transformGatePoint([-0.52, 1.25, 1.48], 0),
		].map(project);

		drawList.push({
			z: 0.78,
			draw: (c) => {
				const rampTone = palette.isDark
					? mixRgb(palette.bg, palette.secondary, 0.55)
					: mixRgb(palette.secondary, palette.muted, 0.65);
				c.fillStyle = rgba(rampTone, 0.96);
				c.strokeStyle = rgba(palette.fg, 0.28);
				c.lineWidth = 0.9;
				c.beginPath();
				c.moveTo(stairBasePts[0][0], stairBasePts[0][1]);
				for (let k = 1; k < 4; k++) c.lineTo(stairBasePts[k][0], stairBasePts[k][1]);
				c.closePath();
				c.fill();
				c.stroke();
			},
		});

		for (let st = stepCount - 1; st >= 0; st--) {
			const tStep = st / (stepCount - 1);
			const zFront = 1.44 - tStep * 1.02;
			const zBack = zFront - 0.095;
			const yTop = 1.22 - tStep * 0.26;
			const yBot = yTop + 0.026;
			const halfW = 0.44 - tStep * 0.2;

			const treadPts = (
				[
					[-halfW, yTop, zBack],
					[halfW, yTop, zBack],
					[halfW * 1.03, yTop, zFront],
					[-halfW * 1.03, yTop, zFront],
				] as Vec3[]
			).map((p) => transformGatePoint(p, 0));
			const spTread = treadPts.map(project);

			const riserPts = (
				[
					[-halfW * 1.03, yTop, zFront],
					[halfW * 1.03, yTop, zFront],
					[halfW * 1.03, yBot, zFront],
					[-halfW * 1.03, yBot, zFront],
				] as Vec3[]
			).map((p) => transformGatePoint(p, 0));
			const spRiser = riserPts.map(project);

			drawList.push({
				z: 0.85 + (1 - tStep) * 0.45,
				draw: (c) => {
					const treadTone = mixRgb(
						palette.isDark ? palette.secondary : palette.card,
						palette.aka,
						0.2 + state.shieldStrength * 0.28 + Math.pow(tStep, 1.3) * 0.34,
					);
					c.fillStyle = rgba(treadTone, 0.98);
					c.strokeStyle = rgba(palette.aka, 0.42 + state.shieldStrength * 0.26 + tStep * 0.18);
					c.lineWidth = 0.85;
					c.beginPath();
					c.moveTo(spTread[0][0], spTread[0][1]);
					for (let k = 1; k < 4; k++) c.lineTo(spTread[k][0], spTread[k][1]);
					c.closePath();
					c.fill();
					c.stroke();

					const riserTone = palette.isDark
						? mixRgb(palette.bg, palette.fg, 0.08)
						: mixRgb(palette.fg, palette.muted, 0.38);
					c.fillStyle = rgba(riserTone, 0.96);
					c.beginPath();
					c.moveTo(spRiser[0][0], spRiser[0][1]);
					for (let k = 1; k < 4; k++) c.lineTo(spRiser[k][0], spRiser[k][1]);
					c.closePath();
					c.fill();
				},
			});
		}

		// Tiny Scribe / Pilgrim Silhouette holding a miniature Open Codex
		const figX = -0.22;
		const figFootY = 1.45;
		const figHeadY = 1.285;
		const figZ = 1.88;

		const figShadowPts = (
			[
				[figX - 0.026, figFootY, figZ],
				[figX + 0.026, figFootY, figZ],
				[figX + 0.38, figFootY + 0.04, figZ + 0.28],
				[figX + 0.26, figFootY + 0.04, figZ + 0.34],
			] as Vec3[]
		).map((p) => transformGatePoint(p, 0));
		const spFigShadow = figShadowPts.map(project);

		const cloakPts = (
			[
				[figX - 0.015, figHeadY + 0.028, figZ],
				[figX + 0.015, figHeadY + 0.028, figZ],
				[figX + 0.044, figFootY, figZ + 0.015],
				[figX + 0.008, figFootY + 0.006, figZ],
				[figX - 0.04, figFootY, figZ - 0.01],
			] as Vec3[]
		).map((p) => transformGatePoint(p, 0));
		const spCloak = cloakPts.map(project);
		const spHead = project(transformGatePoint([figX, figHeadY, figZ], 0));
		const staffTop = project(transformGatePoint([figX - 0.044, figHeadY - 0.036, figZ], 0));
		const staffBot = project(transformGatePoint([figX - 0.032, figFootY + 0.004, figZ], 0));
		const codexCenter = project(transformGatePoint([figX + 0.056, figHeadY + 0.046, figZ + 0.02], 0));

		const windFlutter = Math.sin(state.time * 3.8) * 0.018 * (1 - state.shieldStrength * 0.65);
		const sashPts = (
			[
				[figX - 0.012, figHeadY + 0.034, figZ],
				[figX - 0.105, figHeadY + 0.05 + windFlutter, figZ + 0.02],
				[figX - 0.195, figHeadY + 0.074 - windFlutter, figZ + 0.04],
			] as Vec3[]
		).map((p) => transformGatePoint(p, 0));
		const spSash = sashPts.map(project);

		drawList.push({
			z: 1.55,
			draw: (c) => {
				c.fillStyle = rgba(palette.isDark ? palette.bg : palette.fg, palette.isDark ? 0.72 : 0.36);
				c.beginPath();
				c.moveTo(spFigShadow[0][0], spFigShadow[0][1]);
				for (let k = 1; k < spFigShadow.length; k++) c.lineTo(spFigShadow[k][0], spFigShadow[k][1]);
				c.closePath();
				c.fill();

				const haloR = 14 * spHead[3];
				const gRim = c.createRadialGradient(
					spHead[0],
					spHead[1] + 6 * spHead[3],
					1,
					spHead[0],
					spHead[1] + 6 * spHead[3],
					haloR,
				);
				gRim.addColorStop(0, rgba(palette.aka, 0.34 + state.shieldStrength * 0.24));
				gRim.addColorStop(1, rgba(palette.aka, 0));
				c.fillStyle = gRim;
				c.beginPath();
				c.arc(spHead[0], spHead[1] + 6 * spHead[3], haloR, 0, Math.PI * 2);
				c.fill();

				c.strokeStyle = rgba(palette.fg, 0.92);
				c.lineWidth = Math.max(1.2, 1.35 * spHead[3]);
				c.lineCap = 'round';
				c.beginPath();
				c.moveTo(staffTop[0], staffTop[1]);
				c.lineTo(staffBot[0], staffBot[1]);
				c.stroke();

				c.fillStyle = rgba(palette.aka, 0.98);
				c.beginPath();
				c.arc(staffTop[0], staffTop[1], Math.max(1.7, 2.0 * spHead[3]), 0, Math.PI * 2);
				c.fill();

				const silColor = palette.fg;
				c.fillStyle = rgba(silColor, 0.98);
				c.strokeStyle = rgba(palette.aka, 0.78 + state.shieldStrength * 0.2);
				c.lineWidth = 1.0;
				c.lineJoin = 'round';
				c.beginPath();
				c.moveTo(spCloak[0][0], spCloak[0][1]);
				for (let k = 1; k < spCloak.length; k++) c.lineTo(spCloak[k][0], spCloak[k][1]);
				c.closePath();
				c.fill();
				c.stroke();

				c.fillStyle = rgba(silColor, 0.99);
				c.strokeStyle = rgba(palette.aka, 0.85);
				c.lineWidth = 0.95;
				c.beginPath();
				c.arc(spHead[0], spHead[1], Math.max(2.4, 2.9 * spHead[3]), 0, Math.PI * 2);
				c.fill();
				c.stroke();

				const shoulderR: [number, number] = [
					spHead[0] + 1.8 * spHead[3],
					spHead[1] + 4.2 * spHead[3],
				];
				c.strokeStyle = rgba(silColor, 0.98);
				c.lineWidth = Math.max(1.6, 1.9 * spHead[3]);
				c.lineCap = 'round';
				c.beginPath();
				c.moveTo(shoulderR[0], shoulderR[1]);
				c.lineTo(codexCenter[0] - 1.2 * spHead[3], codexCenter[1] + 1.0 * spHead[3]);
				c.stroke();

				const cw = Math.max(4.6, 5.4 * codexCenter[3]);
				const ch = Math.max(3.2, 3.8 * codexCenter[3]);
				const bx = codexCenter[0];
				const by = codexCenter[1];

				const gBook = c.createRadialGradient(bx, by, 0.5, bx, by, cw * 1.9);
				gBook.addColorStop(0, rgba(palette.aka, 0.42 + state.shieldStrength * 0.28));
				gBook.addColorStop(1, rgba(palette.aka, 0));
				c.fillStyle = gBook;
				c.beginPath();
				c.arc(bx, by, cw * 1.9, 0, Math.PI * 2);
				c.fill();

				c.fillStyle = rgba(palette.card, 0.98);
				c.strokeStyle = rgba(palette.fg, 0.85);
				c.lineWidth = 0.9;
				c.lineJoin = 'round';
				c.beginPath();
				c.moveTo(bx, by - ch * 0.35);
				c.lineTo(bx - cw, by - ch * 0.75);
				c.lineTo(bx - cw * 0.92, by + ch * 0.45);
				c.lineTo(bx, by + ch * 0.75);
				c.closePath();
				c.fill();
				c.stroke();

				c.beginPath();
				c.moveTo(bx, by - ch * 0.35);
				c.lineTo(bx + cw, by - ch * 0.65);
				c.lineTo(bx + cw * 0.92, by + ch * 0.55);
				c.lineTo(bx, by + ch * 0.75);
				c.closePath();
				c.fill();
				c.stroke();

				c.strokeStyle = rgba(palette.aka, 0.96);
				c.lineWidth = 1.25;
				c.beginPath();
				c.moveTo(bx, by + ch * 0.72);
				c.lineTo(bx + 1.4 * codexCenter[3], by + ch * 1.55);
				c.stroke();

				c.strokeStyle = rgba(palette.aka, 0.95);
				c.lineWidth = Math.max(1.6, 1.95 * spHead[3]);
				c.lineCap = 'round';
				c.beginPath();
				c.moveTo(spSash[0][0], spSash[0][1]);
				c.quadraticCurveTo(spSash[1][0], spSash[1][1], spSash[2][0], spSash[2][1]);
				c.stroke();
			},
		});

		// 5. Windblown Sand off Dune Crests & Spice Embers
		for (const p of sand) {
			if (state.shieldStrength > 0.45 && p.isEmber) {
				const ex = anchorX + Math.sin(p.orbitA) * 0.22;
				const ey = 0.9 - p.yOffset;
				const ez = Math.cos(p.orbitA) * 0.22;
				const sp = project([ex, ey, ez]);
				drawList.push({
					z: ez + 0.25,
					draw: (c) => {
						c.fillStyle = rgba(palette.aka, 0.78);
						c.beginPath();
						c.arc(sp[0], sp[1], 2.1 * sp[3], 0, Math.PI * 2);
						c.fill();
					},
				});
			} else {
				const baseH = duneHeight(p.x, p.z, anchorX, state.time * (1 - state.shieldStrength * 0.7));
				const wy = baseH - p.yOffset - 0.15;
				const gp1 = rotateXYZ([p.x - anchorX, wy, p.z], effRx * 0.45, effRy * 0.22, 0);
				const gp2 = rotateXYZ([p.x - anchorX + p.len, wy + 0.03, p.z], effRx * 0.45, effRy * 0.22, 0);
				const s1 = project([gp1[0] + anchorX, gp1[1], gp1[2]]);
				const s2 = project([gp2[0] + anchorX, gp2[1], gp2[2]]);
				const depth = Math.max(0.12, Math.min(1, (gp1[2] + 2.2) / 3.8));

				drawList.push({
					z: gp1[2] - 0.3,
					draw: (c) => {
						c.strokeStyle = rgba(
							p.isEmber ? palette.aka : palette.fg,
							(p.isEmber ? 0.55 : 0.22) * depth,
						);
						c.lineWidth = p.isEmber ? 1.3 : 0.9;
						c.lineCap = 'round';
						c.beginPath();
						c.moveTo(s1[0], s1[1]);
						c.lineTo(s2[0], s2[1]);
						c.stroke();
					},
				});
			}
		}

		drawList.sort((a, b) => a.z - b.z);
		for (const item of drawList) {
			item.draw(ctx);
		}
	}

	function scheduleNextFrame(): void {
		if (rafId) return;
		if (!isVisible) return;
		if (!reducedMotion || state.pulse > 0 || state.shieldStrength > 0.01) {
			rafId = requestAnimationFrame(tick);
		}
	}

	function tick(ts: number): void {
		rafId = 0;
		const dt = Math.min(0.05, (ts - lastTs) / 1000);
		lastTs = ts;

		if (!reducedMotion) {
			state.time += dt;
			updateSand(dt);
			if (!state.isDragging) {
				const targetYaw = DEFAULT_ROT_Y + Math.sin(state.time * 0.28) * 0.16;
				state.rotY += (targetYaw - state.rotY) * 0.015 + state.velY;
				state.rotX += state.velX;
				state.velX *= 0.9;
				state.velY *= 0.9;
				state.rotX += (DEFAULT_ROT_X - state.rotX) * 0.02;
			}
		} else if (state.pulse > 0 || state.shieldStrength > 0.01) {
			updateSand(dt);
		}

		renderFrame();
		scheduleNextFrame();
	}

	const onHoldHelmClick = () => {
		toggleSanctuary(state);
		syncTelemetry();
		if (reducedMotion) {
			state.shieldStrength = state.shieldLocked ? 1 : 0;
			state.pulse = 0;
			renderFrame();
		} else {
			scheduleNextFrame();
		}
	};

	const onPointerDown = (e: PointerEvent) => {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		state.isDragging = true;
		state.isPointerHold = true;
		state.dragDist = 0;
		state.lastPtrX = e.clientX;
		state.lastPtrY = e.clientY;
		pointerStartX = e.clientX;
		pointerStartY = e.clientY;
		activePointerId = e.pointerId;
		capturedPointer = false;
		if (e.pointerType !== 'touch') {
			try {
				stage.setPointerCapture(e.pointerId);
				capturedPointer = true;
			} catch {
				capturedPointer = false;
			}
		}
		syncTelemetry();
	};

	const onPointerMove = (e: PointerEvent) => {
		const rect = stage.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
			const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
			state.hoverY = nx * 0.12;
			state.hoverX = ny * 0.06;
		}

		if (!state.isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) {
			if (reducedMotion) renderFrame();
			return;
		}

		const dx = e.clientX - state.lastPtrX;
		const dy = e.clientY - state.lastPtrY;

		// On touch devices with pan-y, yield vertical gestures to page scrolling unless horizontal orbit clearly wins.
		if (e.pointerType === 'touch' && !capturedPointer) {
			const totalDx = Math.abs(e.clientX - pointerStartX);
			const totalDy = Math.abs(e.clientY - pointerStartY);
			if (totalDy > 10 && totalDy > totalDx * 1.2) {
				state.isDragging = false;
				state.isPointerHold = false;
				activePointerId = null;
				syncTelemetry();
				return;
			}
			if (totalDx > 8 && totalDx > totalDy) {
				try {
					stage.setPointerCapture(e.pointerId);
					capturedPointer = true;
				} catch {
					capturedPointer = false;
				}
			}
		}

		state.dragDist += Math.hypot(dx, dy);
		state.lastPtrX = e.clientX;
		state.lastPtrY = e.clientY;
		state.rotY += dx * 0.0085;
		state.rotX = Math.max(MIN_ROT_X, Math.min(MAX_ROT_X, state.rotX + dy * 0.0055));
		state.velY = dx * 0.0028;
		state.velX = dy * 0.0018;
		if (reducedMotion) renderFrame();
	};

	const onPointerRelease = (e: PointerEvent) => {
		if (activePointerId !== null && e.pointerId !== activePointerId) return;
		if (capturedPointer) {
			try {
				stage.releasePointerCapture(e.pointerId);
			} catch {
				// Ignore if already released
			}
		}
		activePointerId = null;
		capturedPointer = false;
		if (!releaseInteraction(state)) return;
		syncTelemetry();
		if (reducedMotion) {
			state.shieldStrength = state.shieldLocked ? 1 : 0;
			state.pulse = 0;
			renderFrame();
		} else {
			scheduleNextFrame();
		}
	};

	const onPointerCancel = (e: PointerEvent) => {
		if (activePointerId !== null && e.pointerId !== activePointerId) return;
		activePointerId = null;
		capturedPointer = false;
		state.isDragging = false;
		state.isPointerHold = false;
		syncTelemetry();
	};

	const onPointerLeave = () => {
		state.hoverX = 0;
		state.hoverY = 0;
		if (reducedMotion) renderFrame();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'ArrowLeft') {
			state.rotY -= 0.16;
			e.preventDefault();
		} else if (e.key === 'ArrowRight') {
			state.rotY += 0.16;
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			state.rotX = Math.max(MIN_ROT_X, state.rotX - 0.08);
			e.preventDefault();
		} else if (e.key === 'ArrowDown') {
			state.rotX = Math.min(MAX_ROT_X, state.rotX + 0.08);
			e.preventDefault();
		} else if (e.key === ' ' || e.key === 'Enter') {
			toggleSanctuary(state);
			syncTelemetry();
			e.preventDefault();
		} else if (e.key === 'r' || e.key === 'R') {
			resetCamera(state);
		}
		if (reducedMotion) {
			state.shieldStrength = state.shieldLocked ? 1 : 0;
			state.pulse = 0;
			renderFrame();
		} else {
			scheduleNextFrame();
		}
	};

	const onResize = () => {
		renderFrame();
	};

	const onMotionChange = (e: MediaQueryListEvent) => {
		reducedMotion = e.matches;
		if (reducedMotion && rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
		renderFrame();
		scheduleNextFrame();
	};

	const themeObserver = new MutationObserver(() => {
		palette = readPalette();
		renderFrame();
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class'],
	});

	let intersectionObserver: IntersectionObserver | null = null;
	if ('IntersectionObserver' in window) {
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				isVisible = entries.some((entry) => entry.isIntersecting);
				if (isVisible) {
					lastTs = performance.now();
					scheduleNextFrame();
				} else if (rafId) {
					cancelAnimationFrame(rafId);
					rafId = 0;
				}
			},
			{ threshold: 0.01 },
		);
		intersectionObserver.observe(stage);
	}

	holdHelmBtn?.addEventListener('click', onHoldHelmClick);
	stage.addEventListener('pointerdown', onPointerDown);
	stage.addEventListener('pointermove', onPointerMove);
	stage.addEventListener('pointerup', onPointerRelease);
	stage.addEventListener('pointercancel', onPointerCancel);
	stage.addEventListener('pointerleave', onPointerLeave);
	stage.addEventListener('keydown', onKeyDown);
	window.addEventListener('resize', onResize);
	motionQuery.addEventListener('change', onMotionChange);

	syncTelemetry();
	renderFrame();
	if (!reducedMotion) {
		lastTs = performance.now();
		scheduleNextFrame();
	}

	return () => {
		if (rafId) cancelAnimationFrame(rafId);
		themeObserver.disconnect();
		intersectionObserver?.disconnect();
		holdHelmBtn?.removeEventListener('click', onHoldHelmClick);
		stage.removeEventListener('pointerdown', onPointerDown);
		stage.removeEventListener('pointermove', onPointerMove);
		stage.removeEventListener('pointerup', onPointerRelease);
		stage.removeEventListener('pointercancel', onPointerCancel);
		stage.removeEventListener('pointerleave', onPointerLeave);
		stage.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('resize', onResize);
		motionQuery.removeEventListener('change', onMotionChange);
	};
}
