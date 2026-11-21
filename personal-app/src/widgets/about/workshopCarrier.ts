import { drawGroundShadow, drawIsoBox, projectIso, rgb } from './workshopIso';
import type { CarryItem, WorkshopPalette, WorkshopWorld } from './workshopTypes';

function drawCarriedItem(
	ctx: CanvasRenderingContext2D,
	item: CarryItem,
	x: number,
	y: number,
	z: number,
	time: number,
	palette: WorkshopPalette,
): void {
	if (item === 'none') return;
	const p = projectIso(x, y, z);

	if (item === 'coffee') {
		drawIsoBox(ctx, x - 0.14, y - 0.14, z, 0.28, 0.28, 0.26, palette, 'base');
		const rim = projectIso(x, y, z + 0.26);
		ctx.beginPath();
		ctx.ellipse(rim.x, rim.y, 3.6, 2.0, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#3a2416';
		ctx.fill();
		ctx.strokeStyle = palette.isoEdge;
		ctx.lineWidth = 0.7;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(rim.x + 4.2, rim.y + 1.5, 1.8, -1.2, 1.3);
		ctx.stroke();
		for (let i = 0; i < 2; i++) {
			const drift = Math.sin(time * 5 + i * 2.1) * 1.6;
			ctx.strokeStyle = rgb(palette.fgRgb, 0.45);
			ctx.beginPath();
			ctx.moveTo(rim.x - 1 + i * 2, rim.y - 2);
			ctx.quadraticCurveTo(rim.x + drift, rim.y - 6, rim.x - drift * 0.5, rim.y - 9);
			ctx.stroke();
		}
		return;
	}

	if (item === 'extinguisher') {
		drawIsoBox(ctx, x - 0.14, y - 0.14, z, 0.28, 0.28, 0.38, palette, 'aka');
		const top = projectIso(x, y, z + 0.38);
		ctx.fillStyle = palette.fg;
		ctx.fillRect(p.x - 3.2, p.y - 4.2, 6.4, 2.0);
		ctx.strokeStyle = palette.isoEdge;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(top.x, top.y);
		ctx.lineTo(top.x + 3.5, top.y - 2.4);
		ctx.stroke();
		return;
	}

	if (item === 'pcb') {
		drawIsoBox(ctx, x - 0.2, y - 0.18, z, 0.4, 0.36, 0.08, palette, 'pcb');
		const top = projectIso(x, y, z + 0.1);
		ctx.strokeStyle = palette.gold;
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.moveTo(top.x - 4, top.y);
		ctx.lineTo(top.x, top.y - 1.5);
		ctx.lineTo(top.x + 4, top.y + 1);
		ctx.stroke();
		ctx.fillStyle = palette.aka;
		ctx.fillRect(top.x - 1.5, top.y - 1.8, 3, 2.4);
		return;
	}

	// Capacitor cylinder look
	drawIsoBox(ctx, x - 0.14, y - 0.14, z + 0.06, 0.28, 0.28, 0.32, palette, 'dark');
	const top = projectIso(x, y, z + 0.38);
	ctx.beginPath();
	ctx.ellipse(top.x, top.y, 4.0, 2.2, 0, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoTop);
	ctx.fill();
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.7;
	ctx.stroke();
}

export function drawCarrier(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	const c = world.carrier;
	const moving =
		c.state === 'CARRYING_TO_BENCH' ||
		c.state === 'CARRYING_TO_PC' ||
		c.state === 'RETURNING' ||
		c.state === 'PANICKING';
	const bob = (moving ? Math.abs(Math.sin(c.walkPhase)) * 0.08 : Math.sin(world.time * 3) * 0.03) + c.jumpZ;
	const working = c.state === 'FETCHING' || c.state === 'DELIVERING';

	drawGroundShadow(ctx, c.x, c.y, 11, 5.5, 0.26);

	if (working) {
		const ring = projectIso(c.x, c.y, 0.03);
		ctx.beginPath();
		ctx.ellipse(ring.x, ring.y, 12.5, 6.2, 0, 0, Math.PI * 2);
		ctx.strokeStyle = rgb(palette.goldRgb, 0.55 + Math.sin(world.time * 8) * 0.25);
		ctx.lineWidth = 1.0;
		ctx.stroke();
	}

	const center = projectIso(c.x + c.wobble * 0.08, c.y, 0.36 + bob);
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 1.3;
	for (let i = 0; i < 6; i++) {
		const ang = (i / 6) * Math.PI * 2 + 0.35 + c.wobble * 0.25;
		const lift = moving && (i % 2 === 0 ? Math.sin(c.walkPhase) : -Math.sin(c.walkPhase)) > 0 ? 0.16 : 0;
		const foot = projectIso(c.x + Math.cos(ang) * 0.46, c.y + Math.sin(ang) * 0.46, lift);
		const knee = projectIso(c.x + Math.cos(ang) * 0.32, c.y + Math.sin(ang) * 0.32, 0.48 + bob);
		ctx.beginPath();
		ctx.moveTo(center.x, center.y);
		ctx.lineTo(knee.x, knee.y);
		ctx.lineTo(foot.x, foot.y);
		ctx.stroke();
	}

	// Body chassis + top cargo plate.
	ctx.beginPath();
	ctx.ellipse(center.x, center.y, 9.5, 5.8, c.wobble * 0.35, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoRight);
	ctx.fill();
	ctx.stroke();

	// Two articulated front pincer arms showing gripping/delivering/panicking.
	const reach = c.state === 'PANICKING' ? Math.sin(world.time * 22) * 0.18 : working ? 0.22 : 0.05;
	const clawZ = c.state === 'PANICKING' ? 0.85 : working ? 0.72 : 0.54;
	const fx = Math.cos(c.facing);
	const fy = Math.sin(c.facing);
	const px = -fy;
	const py = fx;
	for (const side of [-1, 1]) {
		const baseP = projectIso(c.x + fx * 0.18 + px * side * 0.16, c.y + fy * 0.18 + py * side * 0.16, 0.42 + bob);
		const tipP = projectIso(c.x + fx * (0.4 + reach) + px * side * 0.14, c.y + fy * (0.4 + reach) + py * side * 0.14, clawZ + bob);
		ctx.strokeStyle = rgb(palette.isoTop);
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		ctx.moveTo(baseP.x, baseP.y);
		ctx.lineTo(tipP.x, tipP.y);
		ctx.stroke();
	}

	const eye = projectIso(c.x + 0.18, c.y + 0.18, 0.42 + bob);
	ctx.beginPath();
	ctx.arc(eye.x, eye.y, 2.0, 0, Math.PI * 2);
	ctx.fillStyle =
		c.state === 'CELEBRATING'
			? palette.ok
			: c.state === 'PANICKING'
				? palette.aka
				: c.carrying !== 'none'
					? palette.gold
					: palette.aka;
	ctx.fill();

	drawCarriedItem(ctx, c.carrying, c.x + c.wobble * 0.06, c.y, 0.56 + bob, world.time, palette);
}
