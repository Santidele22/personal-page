import type { Point2D, RGB, WorkshopPalette, WorkshopStation, WorkshopWorld } from './workshopTypes';

export const WORLD_W = 400;
export const WORLD_H = 500;
const OX = 200;
const OY = 216;
const UX = 19.2;
const UY = 11.1;
const UZ = 23.0;

export function projectIso(x: number, y: number, z = 0): Point2D {
	return {
		x: OX + (x - y) * UX,
		y: OY + (x + y) * UY - z * UZ,
	};
}

export function getStageTransform(w: number, h: number): { scale: number; offsetX: number; offsetY: number } {
	const scale = Math.min(w / WORLD_W, h / WORLD_H);
	return {
		scale,
		offsetX: (w - WORLD_W * scale) * 0.5,
		offsetY: (h - WORLD_H * scale) * 0.5,
	};
}

export function clientToLogical(clientX: number, clientY: number, rect: DOMRect): Point2D {
	const { scale, offsetX, offsetY } = getStageTransform(rect.width, rect.height);
	return {
		x: (clientX - rect.left - offsetX) / Math.max(0.01, scale),
		y: (clientY - rect.top - offsetY) / Math.max(0.01, scale),
	};
}

export function hitTestStation(logicalX: number, logicalY: number): WorkshopStation | null {
	const pcCenter = projectIso(7.1, 2.0, 2.4);
	const benchCenter = projectIso(3.2, 5.3, 2.0);
	const dPc = Math.hypot(logicalX - pcCenter.x, logicalY - pcCenter.y);
	const dBench = Math.hypot(logicalX - benchCenter.x, logicalY - benchCenter.y);
	if (dPc <= 68 && dPc <= dBench) return 'pc';
	if (dBench <= 68) return 'bench';
	return null;
}

export function hitTestActor(
	world: WorkshopWorld,
	logicalX: number,
	logicalY: number,
): 'artisan' | 'drone' | 'carrier' | null {
	const dPos = projectIso(world.drone.x, world.drone.y, world.drone.z);
	if (Math.hypot(logicalX - dPos.x, logicalY - dPos.y) <= 20) return 'drone';
	const aPos = projectIso(world.artisan.x, world.artisan.y, 1.8 + world.artisan.jumpZ);
	if (Math.hypot(logicalX - aPos.x, logicalY - aPos.y) <= 26) return 'artisan';
	const cPos = projectIso(world.carrier.x, world.carrier.y, 0.36 + world.carrier.jumpZ);
	if (Math.hypot(logicalX - cPos.x, logicalY - cPos.y) <= 18) return 'carrier';
	return null;
}

function parseHex(color: string, fallback: RGB): RGB {
	const clean = color.trim().replace('#', '');
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
	return fallback;
}

export function rgb(c: RGB, alpha = 1): string {
	return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export function shade(c: RGB, factor: number): RGB {
	return [
		Math.max(0, Math.min(255, Math.round(c[0] * factor))),
		Math.max(0, Math.min(255, Math.round(c[1] * factor))),
		Math.max(0, Math.min(255, Math.round(c[2] * factor))),
	];
}

export function readWorkshopPalette(): WorkshopPalette {
	const styles = getComputedStyle(document.documentElement);
	const isDark = document.documentElement.classList.contains('dark');
	const bg = styles.getPropertyValue('--background').trim() || (isDark ? '#14110d' : '#f4efe4');
	const card = styles.getPropertyValue('--card').trim() || (isDark ? '#1c1812' : '#fbf8f0');
	const fg = styles.getPropertyValue('--foreground').trim() || (isDark ? '#eae3d3' : '#23201a');
	const mutedFg = styles.getPropertyValue('--muted-foreground').trim() || (isDark ? '#a29681' : '#6f6657');
	const border = styles.getPropertyValue('--border').trim() || (isDark ? '#322b20' : '#ddd2bc');
	const aka = styles.getPropertyValue('--aka').trim() || (isDark ? '#d95448' : '#c73e3a');
	const ok = isDark ? '#7aa874' : '#4a7a45';
	const gold = isDark ? '#d9a441' : '#b88322';

	const isoTop: RGB = isDark ? [142, 135, 124] : [217, 207, 187];
	const isoLeft: RGB = isDark ? [111, 105, 95] : [194, 182, 158];
	const isoRight: RGB = isDark ? [87, 82, 74] : [169, 156, 131];
	const isoDark: RGB = isDark ? [58, 53, 46] : [141, 128, 105];

	return {
		isDark,
		bg,
		card,
		fg,
		mutedFg,
		border,
		aka,
		akaRgb: parseHex(aka, isDark ? [217, 84, 72] : [199, 62, 58]),
		ok,
		okRgb: isDark ? [122, 168, 116] : [74, 122, 69],
		gold,
		goldRgb: isDark ? [217, 164, 65] : [184, 131, 34],
		fgRgb: parseHex(fg, isDark ? [234, 227, 211] : [35, 32, 26]),
		isoTop,
		isoLeft,
		isoRight,
		isoDark,
		isoEdge: isDark ? 'rgba(234,227,211,0.52)' : 'rgba(35,32,26,0.52)',
		skyTop: isDark ? '#2f2b27' : '#cfc8bb',
		skyBottom: isDark ? '#4a443d' : '#e8e1d2',
		city: isDark ? '#1e1b17' : '#9d958a',
		woodTop: isDark ? [126, 104, 82] : [206, 184, 152],
		woodLeft: isDark ? [98, 80, 62] : [180, 158, 128],
		woodRight: isDark ? [76, 62, 48] : [154, 134, 106],
		pcbTop: isDark ? [48, 72, 56] : [78, 108, 86],
	};
}

export type BoxMaterial = 'base' | 'dark' | 'iron' | 'aka' | 'wood' | 'pcb';

function boxFaces(palette: WorkshopPalette, material: BoxMaterial): [RGB, RGB, RGB] {
	if (material === 'dark') return [palette.isoLeft, palette.isoRight, palette.isoDark];
	if (material === 'iron') return [palette.isoRight, palette.isoDark, shade(palette.isoDark, 0.7)];
	if (material === 'aka') return [palette.akaRgb, shade(palette.akaRgb, 0.8), shade(palette.akaRgb, 0.65)];
	if (material === 'wood') return [palette.woodTop, palette.woodLeft, palette.woodRight];
	if (material === 'pcb') return [palette.pcbTop, palette.isoDark, shade(palette.isoDark, 0.75)];
	return [palette.isoTop, palette.isoLeft, palette.isoRight];
}

export function drawPoly(
	ctx: CanvasRenderingContext2D,
	pts: Point2D[],
	fill: string,
	stroke?: string,
	lineWidth = 0.75,
): void {
	if (pts.length === 0) return;
	ctx.beginPath();
	ctx.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = lineWidth;
		ctx.lineJoin = 'round';
		ctx.stroke();
	}
}

export function drawIsoBox(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	z: number,
	dx: number,
	dy: number,
	dz: number,
	palette: WorkshopPalette,
	material: BoxMaterial = 'base',
): void {
	const [top, left, right] = boxFaces(palette, material);
	const p001 = projectIso(x, y, z + dz);
	const p101 = projectIso(x + dx, y, z + dz);
	const p111 = projectIso(x + dx, y + dy, z + dz);
	const p011 = projectIso(x, y + dy, z + dz);
	const p010 = projectIso(x, y + dy, z);
	const p110 = projectIso(x + dx, y + dy, z);
	const p100 = projectIso(x + dx, y, z);

	drawPoly(ctx, [p011, p111, p110, p010], rgb(left), palette.isoEdge);
	drawPoly(ctx, [p101, p111, p110, p100], rgb(right), palette.isoEdge);
	drawPoly(ctx, [p001, p101, p111, p011], rgb(top), palette.isoEdge);
}

export function drawGroundShadow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	alpha = 0.25,
): void {
	const p = projectIso(x, y, 0.02);
	ctx.save();
	ctx.beginPath();
	ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(0,0,0,${alpha})`;
	ctx.fill();
	ctx.restore();
}

export function drawElectricArc(
	ctx: CanvasRenderingContext2D,
	pt: Point2D,
	time: number,
	intensity = 1,
): void {
	const flicker = 0.72 + 0.28 * Math.sin(time * 53) * Math.cos(time * 31);
	const power = intensity * flicker;
	ctx.save();

	const bloom = ctx.createRadialGradient(pt.x, pt.y, 0.5, pt.x, pt.y, 18 * intensity);
	bloom.addColorStop(0, `rgba(220,248,255,${0.48 * power})`);
	bloom.addColorStop(0.42, `rgba(135,212,255,${0.22 * power})`);
	bloom.addColorStop(1, 'rgba(135,212,255,0)');
	ctx.fillStyle = bloom;
	ctx.beginPath();
	ctx.arc(pt.x, pt.y, 18 * intensity, 0, Math.PI * 2);
	ctx.fill();

	// Molten weld pool on the seam.
	ctx.beginPath();
	ctx.ellipse(pt.x, pt.y + 0.6, 3.6 * intensity, 2.0 * intensity, 0, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(255,156,64,${0.85 * intensity})`;
	ctx.fill();

	// Crisp jittering arc rays.
	ctx.strokeStyle = `rgba(232,250,255,${0.92 * power})`;
	ctx.lineWidth = 0.9;
	for (let i = 0; i < 4; i++) {
		const ang = time * (19 + i * 7) + i * 1.57;
		const len = (2.8 + (i % 2) * 1.8) * intensity * flicker;
		ctx.beginPath();
		ctx.moveTo(pt.x, pt.y);
		ctx.lineTo(pt.x + Math.cos(ang) * len, pt.y + Math.sin(ang) * len * 0.75);
		ctx.stroke();
	}

	// Blinding core.
	ctx.beginPath();
	ctx.arc(pt.x, pt.y, (1.8 + 0.8 * flicker) * intensity, 0, Math.PI * 2);
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.restore();
}
