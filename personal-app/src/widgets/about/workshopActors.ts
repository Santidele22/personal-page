import { drawArtisan } from './workshopArtisan';
import { drawCarrier } from './workshopCarrier';
import { SPEAKER_LABELS } from './workshopDialogue';
import { getSeamPoint } from './workshopEvents';
import { drawElectricArc, drawGroundShadow, drawIsoBox, projectIso, rgb } from './workshopIso';
import { WORKSHOP_OBSTACLES } from './workshopPhysics';
import type { DrawItem, WorkshopPalette, WorkshopWorld } from './workshopTypes';

export function drawDroneShadow(ctx: CanvasRenderingContext2D, world: WorkshopWorld): void {
	const d = world.drone;
	const scale = Math.max(0.45, 1 - d.z * 0.08);
	drawGroundShadow(ctx, d.x, d.y, 11 * scale, 5.5 * scale, 0.22 * scale);
}

function drawDrone(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	const d = world.drone;
	const z = d.z + Math.sin(d.hoverPhase) * 0.12;
	const p = projectIso(d.x, d.y, z);

	if (d.state === 'SCAN_PC' || d.state === 'GREET_VISITOR' || d.state === 'ALERT') {
		const coneTarget = projectIso(d.x, d.y, Math.max(2.2, z - 2.3));
		ctx.beginPath();
		ctx.moveTo(p.x, p.y + 3);
		ctx.lineTo(coneTarget.x - 14, coneTarget.y);
		ctx.lineTo(coneTarget.x + 14, coneTarget.y);
		ctx.closePath();
		const coneAlpha = d.state === 'ALERT' ? 0.18 + Math.sin(world.time * 16) * 0.08 : 0.1;
		ctx.fillStyle = rgb(palette.akaRgb, coneAlpha);
		ctx.fill();
	} else if (d.state === 'PANICKING' || d.state === 'MALFUNCTION') {
		const pulse = 10 + Math.sin(world.time * 24) * 4;
		ctx.beginPath();
		ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
		ctx.strokeStyle = rgb(palette.akaRgb, 0.65);
		ctx.lineWidth = 1.4;
		ctx.stroke();
		if (d.state === 'MALFUNCTION' && Math.sin(world.time * 37) > 0.2) {
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1.1;
			ctx.beginPath();
			ctx.moveTo(p.x - 6, p.y - 3);
			ctx.lineTo(p.x + 5, p.y + 4);
			ctx.stroke();
		}
	} else if (d.state === 'CELEBRATING') {
		ctx.beginPath();
		ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
		ctx.strokeStyle = rgb(palette.okRgb, 0.45);
		ctx.lineWidth = 1.2;
		ctx.stroke();
	}

	if (d.state === 'WELDING_BENCH' || d.weldHeat > 0.08) {
		const nozzleTip = { x: p.x + 1.5, y: p.y + 9.8 };
		if (d.weldingActive) {
			const seam = getSeamPoint(d.weldProgress);
			const seamPt = projectIso(seam.x, seam.y, seam.z);
			const jitter = Math.sin(world.time * 47) * 1.4;
			ctx.save();
			ctx.lineCap = 'round';
			ctx.strokeStyle = 'rgba(145,222,255,0.42)';
			ctx.lineWidth = 3.0;
			ctx.beginPath();
			ctx.moveTo(nozzleTip.x, nozzleTip.y);
			ctx.quadraticCurveTo((nozzleTip.x + seamPt.x) * 0.5 + jitter, (nozzleTip.y + seamPt.y) * 0.5, seamPt.x, seamPt.y);
			ctx.stroke();

			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1.2;
			ctx.stroke();
			ctx.restore();
			drawElectricArc(ctx, seamPt, world.time, 0.92);
		}
		ctx.strokeStyle = palette.isoEdge;
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.moveTo(p.x + 1.0, p.y + 3.5);
		ctx.lineTo(nozzleTip.x, nozzleTip.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(nozzleTip.x, nozzleTip.y, 1.5, 0, Math.PI * 2);
		ctx.fillStyle = d.weldingActive ? '#fff4cc' : palette.aka;
		ctx.fill();
	}

	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 1.2;
	for (const [dx, dy] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
		const tip = projectIso(d.x + dx, d.y + dy, z + 0.08);
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(tip.x, tip.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(tip.x, tip.y, 5.5, 2.2, 0, 0, Math.PI * 2);
		ctx.strokeStyle = rgb(palette.fgRgb, 0.45);
		ctx.stroke();
		ctx.strokeStyle = palette.isoEdge;
	}

	ctx.beginPath();
	ctx.ellipse(p.x, p.y, 7.5, 4.4, 0, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoTop);
	ctx.fill();
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(p.x + 2, p.y + 1, 2, 0, Math.PI * 2);
	ctx.fillStyle = d.state === 'CELEBRATING' ? palette.ok : d.weldingActive ? '#e0f7ff' : palette.aka;
	ctx.fill();

	if (d.carrying !== 'none') {
		drawIsoBox(ctx, d.x - 0.14, d.y - 0.14, z - 0.48, 0.28, 0.28, 0.2, palette, 'pcb');
	}
}

export function drawParticles(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	for (const s of world.sparks) {
		const ratio = 1 - s.life / s.maxLife;
		const p = projectIso(s.x, s.y, s.z);
		if (s.kind === 'smoke') {
			const r = (s.size ?? 3.5) * (0.7 + (1 - ratio) * 1.4);
			ctx.beginPath();
			ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
			ctx.fillStyle = rgb(palette.isoLeft, 0.34 * ratio);
			ctx.fill();
		} else if (s.kind === 'confetti') {
			const col = s.color === 'ok' ? palette.okRgb : s.color === 'gold' ? palette.goldRgb : palette.akaRgb;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(s.life * 7 + s.x);
			ctx.fillStyle = rgb(col, Math.min(1, ratio * 1.3));
			const sz = s.size ?? 2.6;
			ctx.fillRect(-sz * 0.5, -sz * 0.3, sz, sz * 0.6);
			ctx.restore();
		} else {
			const tail = projectIso(s.x - s.vx * 0.04, s.y - s.vy * 0.04, s.z - s.vz * 0.04);
			const age = s.life / s.maxLife;
			if (s.color === 'arc') {
				ctx.strokeStyle =
					age < 0.3
						? `rgba(255,252,224,${ratio})`
						: age < 0.68
							? rgb(palette.goldRgb, ratio)
							: rgb(palette.akaRgb, ratio);
			} else {
				ctx.strokeStyle = rgb(palette.akaRgb, ratio);
			}
			ctx.lineWidth = s.color === 'arc' ? 1.65 : 1.5;
			ctx.beginPath();
			ctx.moveTo(tail.x, tail.y);
			ctx.lineTo(p.x, p.y);
			ctx.stroke();
			if (s.color === 'arc' && age < 0.45) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255,255,240,${ratio})`;
				ctx.fill();
			}
		}
	}
}

export function drawActorEmotes(
	ctx: CanvasRenderingContext2D,
	world: WorkshopWorld,
	palette: WorkshopPalette,
): void {
	const badges: Array<{ emote: string; x: number; y: number; z: number }> = [];
	if (world.artisan.emote !== 'none') {
		badges.push({ emote: world.artisan.emote, x: world.artisan.x, y: world.artisan.y, z: 3.9 + world.artisan.jumpZ });
	}
	if (world.drone.emote !== 'none') {
		badges.push({ emote: world.drone.emote, x: world.drone.x, y: world.drone.y, z: world.drone.z + 0.65 });
	}
	if (world.carrier.emote !== 'none') {
		badges.push({ emote: world.carrier.emote, x: world.carrier.x, y: world.carrier.y, z: 1.2 + world.carrier.jumpZ });
	}
	if (badges.length === 0) return;

	ctx.save();
	ctx.font = '700 7.5px ui-monospace, monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	for (const b of badges) {
		const p = projectIso(b.x, b.y, b.z);
		const symbol = b.emote === 'panic' ? '!!' : b.emote === 'alert' ? '!' : b.emote === 'ok' ? '✓' : 'XD';
		const bg =
			b.emote === 'alert' || b.emote === 'panic' ? palette.aka : b.emote === 'ok' ? palette.ok : palette.gold;
		const r = b.emote === 'panic' ? 7.2 + Math.sin(world.time * 18) * 1.1 : 6.5;
		ctx.beginPath();
		ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
		ctx.fillStyle = bg;
		ctx.fill();
		ctx.fillStyle = '#fdf8ee';
		ctx.fillText(symbol, p.x, p.y + 0.4);
	}
	ctx.restore();
}

export function drawFsmDebugOverlay(
	ctx: CanvasRenderingContext2D,
	world: WorkshopWorld,
	palette: WorkshopPalette,
): void {
	if (!world.debugFsm) return;

	ctx.save();
	// Collision AABBs on the workshop floor.
	ctx.setLineDash([3, 2]);
	ctx.strokeStyle = rgb(palette.okRgb, 0.55);
	ctx.lineWidth = 0.85;
	for (const obs of WORKSHOP_OBSTACLES) {
		const c0 = projectIso(obs.minX, obs.minY, 0.04);
		const c1 = projectIso(obs.maxX, obs.minY, 0.04);
		const c2 = projectIso(obs.maxX, obs.maxY, 0.04);
		const c3 = projectIso(obs.minX, obs.maxY, 0.04);
		ctx.beginPath();
		ctx.moveTo(c0.x, c0.y);
		ctx.lineTo(c1.x, c1.y);
		ctx.lineTo(c2.x, c2.y);
		ctx.lineTo(c3.x, c3.y);
		ctx.closePath();
		ctx.stroke();
	}

	const tags: Array<{
		label: string;
		state: string;
		x: number;
		y: number;
		z: number;
		path?: Array<{ x: number; y: number }>;
	}> = [
		{
			label: SPEAKER_LABELS.artisan,
			state: `${world.artisan.state}${world.artisan.maskProgress >= 0.85 ? '·MASK' : ''}`,
			x: world.artisan.x,
			y: world.artisan.y,
			z: 3.9,
			path: world.artisan.path,
		},
		{ label: SPEAKER_LABELS.drone, state: world.drone.state, x: world.drone.x, y: world.drone.y, z: world.drone.z + 0.55 },
		{ label: SPEAKER_LABELS.carrier, state: world.carrier.state, x: world.carrier.x, y: world.carrier.y, z: 1.25, path: world.carrier.path },
	];

	ctx.font = '600 6.5px ui-monospace, monospace';
	ctx.textBaseline = 'middle';

	for (const tag of tags) {
		if (tag.path && tag.path.length > 0) {
			ctx.setLineDash([2, 2]);
			ctx.strokeStyle = rgb(palette.akaRgb, 0.65);
			ctx.beginPath();
			const start = projectIso(tag.x, tag.y, 0.1);
			ctx.moveTo(start.x, start.y);
			for (const pt of tag.path) {
				const wp = projectIso(pt.x, pt.y, 0.1);
				ctx.lineTo(wp.x, wp.y);
			}
			ctx.stroke();
		}
		ctx.setLineDash([]);

		const p = projectIso(tag.x, tag.y, tag.z);
		const text = `${tag.label} [${tag.state}]`;
		const padX = 4;
		const w = ctx.measureText(text).width + padX * 2;
		const x0 = Math.max(4, Math.min(396 - w, p.x - w * 0.5));
		const y0 = Math.max(10, p.y - 6);
		ctx.fillStyle = palette.isDark ? 'rgba(20,17,13,0.92)' : 'rgba(251,248,240,0.94)';
		ctx.strokeStyle = palette.aka;
		ctx.lineWidth = 0.7;
		ctx.fillRect(x0, y0 - 6, w, 12);
		ctx.strokeRect(x0, y0 - 6, w, 12);
		ctx.fillStyle = palette.fg;
		ctx.fillText(text, x0 + padX, y0);
	}
	ctx.restore();
}

export function buildActorDrawables(world: WorkshopWorld, palette: WorkshopPalette): DrawItem[] {
	const a = world.artisan;
	const c = world.carrier;
	const d = world.drone;
	return [
		{
			depth: a.x + a.y,
			box: { minX: a.x - 0.34, maxX: a.x + 0.34, minY: a.y - 0.28, maxY: a.y + 0.28, minZ: 0, maxZ: 3.45 + a.jumpZ },
			draw: (ctx) => drawArtisan(ctx, world, palette),
		},
		{
			depth: c.x + c.y,
			box: { minX: c.x - 0.32, maxX: c.x + 0.32, minY: c.y - 0.32, maxY: c.y + 0.32, minZ: 0, maxZ: 0.95 + c.jumpZ },
			draw: (ctx) => drawCarrier(ctx, world, palette),
		},
		{
			depth: d.x + d.y + d.z * 0.45,
			box: { minX: d.x - 0.42, maxX: d.x + 0.42, minY: d.y - 0.42, maxY: d.y + 0.42, minZ: d.z - 0.3, maxZ: d.z + 0.3 },
			draw: (ctx) => drawDrone(ctx, world, palette),
		},
	];
}
