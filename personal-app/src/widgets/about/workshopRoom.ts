import { getSeamPoint } from './workshopEvents';
import { drawIsoBox, drawPoly, projectIso, rgb } from './workshopIso';
import type { DrawItem, WorkshopPalette, WorkshopWorld } from './workshopTypes';

function drawWindow(ctx: CanvasRenderingContext2D, palette: WorkshopPalette, time: number): void {
	const tl = projectIso(1.6, 0.02, 6.4);
	const tr = projectIso(4.6, 0.02, 6.4);
	const br = projectIso(4.6, 0.02, 2.7);
	const bl = projectIso(1.6, 0.02, 2.7);

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(tl.x, tl.y);
	ctx.lineTo(tr.x, tr.y);
	ctx.lineTo(br.x, br.y);
	ctx.lineTo(bl.x, bl.y);
	ctx.closePath();
	ctx.clip();

	const grad = ctx.createLinearGradient(0, tl.y, 0, br.y);
	grad.addColorStop(0, palette.skyTop);
	grad.addColorStop(1, palette.skyBottom);
	ctx.fillStyle = grad;
	ctx.fillRect(tl.x - 4, tl.y - 4, tr.x - tl.x + 8, br.y - tl.y + 8);

	const sun = projectIso(3.8, 0.02, 5.2);
	ctx.beginPath();
	ctx.arc(sun.x, sun.y, 10, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.akaRgb, 0.8);
	ctx.fill();

	const buildings: Array<[number, number]> = [
		[1.7, 4.0], [2.2, 4.7], [2.8, 3.8], [3.3, 4.5], [3.9, 4.1], [4.3, 3.7],
	];
	ctx.fillStyle = palette.city;
	for (const [bx, topZ] of buildings) {
		const a = projectIso(bx, 0.02, topZ);
		const b = projectIso(bx + 0.48, 0.02, 2.6);
		ctx.fillRect(a.x, a.y, b.x - a.x + 2, b.y - a.y + 4);
	}
	if (Math.sin(time * 2.8) > 0) {
		const beacon = projectIso(2.45, 0.02, 4.85);
		ctx.beginPath();
		ctx.arc(beacon.x, beacon.y, 1.8, 0, Math.PI * 2);
		ctx.fillStyle = palette.aka;
		ctx.fill();
	}
	ctx.restore();

	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
	ctx.closePath();
	const midTop = projectIso(3.1, 0.02, 6.4); const midBot = projectIso(3.1, 0.02, 2.7);
	const midL = projectIso(1.6, 0.02, 4.55); const midR = projectIso(4.6, 0.02, 4.55);
	ctx.moveTo(midTop.x, midTop.y); ctx.lineTo(midBot.x, midBot.y);
	ctx.moveTo(midL.x, midL.y); ctx.lineTo(midR.x, midR.y);
	ctx.stroke();
}

function drawPegboard(ctx: CanvasRenderingContext2D, palette: WorkshopPalette): void {
	const tl = projectIso(0.03, 1.4, 6.1);
	const tr = projectIso(0.03, 5.2, 6.1);
	const br = projectIso(0.03, 5.2, 2.9);
	const bl = projectIso(0.03, 1.4, 2.9);
	drawPoly(ctx, [tl, tr, br, bl], rgb(palette.isoDark, 0.5), palette.isoEdge, 0.8);

	ctx.fillStyle = palette.isoEdge;
	for (let y = 1.8; y <= 4.9; y += 0.65) {
		for (let z = 3.3; z <= 5.7; z += 0.6) {
			const p = projectIso(0.04, y, z);
			ctx.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
		}
	}

	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 1.8;
	const tools: Array<[number, number, number, number]> = [[2.1, 5.6, 2.1, 3.8], [2.7, 5.5, 2.7, 3.9], [3.3, 5.6, 3.3, 4.1]];
	for (const [y1, z1, y2, z2] of tools) {
		const a = projectIso(0.05, y1, z1);
		const b = projectIso(0.05, y2, z2);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
	const spool = projectIso(0.05, 4.3, 4.6);
	ctx.beginPath();
	ctx.arc(spool.x, spool.y, 6, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoLeft);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(spool.x, spool.y, 3, 0, Math.PI * 2);
	ctx.strokeStyle = palette.aka;
	ctx.stroke();
}

function drawWallTerminal(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	const tl = projectIso(6.0, 0.04, 6.7);
	const tr = projectIso(8.6, 0.04, 6.7);
	const br = projectIso(8.6, 0.04, 5.0);
	const bl = projectIso(6.0, 0.04, 5.0);
	drawPoly(ctx, [tl, tr, br, bl], palette.card, palette.isoEdge, 1);

	ctx.save();
	const w = tr.x - tl.x;
	const dy = tr.y - tl.y;
	ctx.translate(tl.x, tl.y);
	ctx.transform(1, dy / Math.max(1, w), 0, 1, 0, 0);
	ctx.font = '6px ui-monospace, monospace';
	ctx.fillStyle = palette.mutedFg;

	const ev = world.event.kind;
	let line1 = world.artisan.state === 'CODING' ? '$ nvim engine.rs' : '$ flash kintsugi';
	let line2 =
		world.artisan.state === 'CODING'
			? `60fps · loc:${world.blackboard.codeLinesCompiled}`
			: `pcb ${Math.round(world.blackboard.kintsugiSeam * 100)}% · ok`;
	let statusColor = palette.aka;

	if (ev === 'build_fail') {
		line1 = '$ cargo test';
		line2 = 'SECTOR 7G · ERR';
	} else if (ev === 'drone_glitch') {
		line1 = '$ drone-pid';
		line2 = 'ATÓMICO · ERR!';
	} else if (ev === 'short_circuit') {
		line1 = '$ rail 5V · pcb';
		line2 = 'CORTO · HUMO!';
	} else if (ev === 'celebration') {
		line1 = '$ boot consola';
		line2 = '60FPS · OK!';
		statusColor = palette.ok;
	}
	ctx.fillText(line1, 5, 11);
	ctx.fillStyle = statusColor;
	ctx.fillText(line2, 5, 22);
	ctx.restore();
}

export function drawRoomShell(
	ctx: CanvasRenderingContext2D,
	world: WorkshopWorld,
	palette: WorkshopPalette,
): void {
	drawIsoBox(ctx, -0.3, -0.3, -0.35, 10.6, 10.6, 0.35, palette, 'base');

	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.45;
	for (let i = 2; i < 10; i += 2) {
		const a = projectIso(i, 0, 0.01);
		const b = projectIso(i, 10, 0.01);
		const c = projectIso(0, i, 0.01);
		const d = projectIso(10, i, 0.01);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.moveTo(c.x, c.y);
		ctx.lineTo(d.x, d.y);
		ctx.stroke();
	}

	drawIsoBox(ctx, -0.35, -0.35, 0, 0.35, 10.65, 8.2, palette, 'base');
	drawIsoBox(ctx, 0, -0.35, 0, 10.3, 0.35, 8.2, palette, 'base');

	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.5;
	for (const z of [2.7, 5.4]) {
		const lw0 = projectIso(0.01, 0, z);
		const lw1 = projectIso(0.01, 10, z);
		const rw1 = projectIso(10, 0.01, z);
		ctx.beginPath();
		ctx.moveTo(lw0.x, lw0.y);
		ctx.lineTo(lw1.x, lw1.y);
		ctx.moveTo(lw0.x, lw0.y);
		ctx.lineTo(rw1.x, rw1.y);
		ctx.stroke();
	}

	drawWindow(ctx, palette, world.time);
	drawPegboard(ctx, palette);
	drawWallTerminal(ctx, world, palette);

	// Wall emergency strobe beacon on panic or failure states.
	const alarmActive = world.event.kind !== 'none' && world.event.kind !== 'celebration';
	const beacon = projectIso(4.95, 0.05, 6.2);
	const pulse = alarmActive ? 0.55 + 0.45 * Math.sin(world.time * 18) : 0;
	if (alarmActive) {
		ctx.beginPath();
		ctx.arc(beacon.x, beacon.y, 18 * pulse, 0, Math.PI * 2);
		ctx.fillStyle = rgb(palette.akaRgb, 0.24 * pulse);
		ctx.fill();
	}
	ctx.beginPath();
	ctx.arc(beacon.x, beacon.y, 3.0, 0, Math.PI * 2);
	ctx.fillStyle = alarmActive && pulse > 0.4 ? palette.aka : rgb(palette.isoDark);
	ctx.fill();
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.7;
	ctx.stroke();
}

function drawPartsRack(ctx: CanvasRenderingContext2D, palette: WorkshopPalette): void {
	for (const [px, py] of [[0.35, 6.2], [1.15, 6.2], [0.35, 8.3], [1.15, 8.3]]) {
		drawIsoBox(ctx, px, py, 0, 0.16, 0.16, 3.6, palette, 'iron');
	}
	drawIsoBox(ctx, 0.3, 6.15, 0.4, 1.05, 2.35, 0.16, palette, 'iron');
	drawIsoBox(ctx, 0.3, 6.15, 1.9, 1.05, 2.35, 0.16, palette, 'iron');
	drawIsoBox(ctx, 0.3, 6.15, 3.4, 1.05, 2.35, 0.16, palette, 'iron');
	drawIsoBox(ctx, 0.45, 6.4, 0.56, 0.7, 0.85, 0.5, palette, 'dark');
	drawIsoBox(ctx, 0.45, 7.45, 0.56, 0.7, 0.75, 0.45, palette, 'pcb');
	drawIsoBox(ctx, 0.45, 6.5, 2.06, 0.7, 0.8, 0.45, palette, 'aka');
	drawIsoBox(ctx, 0.45, 7.5, 2.06, 0.7, 0.7, 0.4, palette, 'base');
}

function drawStandingPcDesk(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	for (const [lx, ly] of [[5.65, 1.15], [8.55, 1.15], [5.65, 2.55], [8.55, 2.55]]) {
		drawIsoBox(ctx, lx, ly, 0, 0.18, 0.18, 2.25, palette, 'iron');
	}
	drawIsoBox(ctx, 7.7, 1.25, 0.05, 0.75, 1.2, 1.65, palette, 'dark');
	const led = projectIso(8.1, 2.47, 1.4);
	ctx.fillStyle = world.event.kind === 'celebration' ? palette.ok : palette.aka;
	ctx.fillRect(led.x - 1.5, led.y - 1.5, 3, 3);

	// Standing tabletop at ergonomic wrist/elbow height z = 2.25..2.49.
	drawIsoBox(ctx, 5.55, 1.05, 2.25, 3.25, 1.75, 0.24, palette, 'wood');
	drawIsoBox(ctx, 6.45, 2.2, 2.49, 1.0, 0.46, 0.09, palette, 'dark');
	drawIsoBox(ctx, 7.65, 2.25, 2.49, 0.28, 0.34, 0.07, palette, 'base');

	if (world.blackboard.coffeeTimer > 0) {
		drawIsoBox(ctx, 5.95, 2.22, 2.49, 0.26, 0.26, 0.22, palette, 'base');
		const cup = projectIso(6.08, 2.35, 2.74);
		ctx.strokeStyle = rgb(palette.fgRgb, 0.45);
		ctx.lineWidth = 0.9;
		ctx.beginPath();
		ctx.moveTo(cup.x, cup.y);
		ctx.quadraticCurveTo(cup.x + Math.sin(world.time * 5) * 2, cup.y - 4, cup.x, cup.y - 7);
		ctx.stroke();
	}

	// Main horizontal monitor at standing eye height.
	drawIsoBox(ctx, 6.85, 1.45, 2.49, 0.25, 0.2, 0.45, palette, 'iron');
	drawIsoBox(ctx, 6.05, 1.28, 2.88, 1.75, 0.18, 1.28, palette, 'dark');
	const s1 = projectIso(6.14, 1.48, 4.02);
	const s2 = projectIso(7.72, 1.48, 4.02);
	const s3 = projectIso(7.72, 1.48, 3.02);
	const s4 = projectIso(6.14, 1.48, 3.02);
	drawPoly(ctx, [s1, s2, s3, s4], palette.isDark ? '#16130f' : '#262119');

	const ev = world.event.kind;
	const coding = world.artisan.state === 'CODING';
	const scrollOffset = coding || ev === 'build_fail' ? Math.floor(world.time * 4) % 4 : 0;
	for (let row = 0; row < 4; row++) {
		const z = 3.82 - row * 0.22;
		const a = projectIso(6.28, 1.5, z);
		const len = (row + scrollOffset) % 3 === 0 ? 0.8 : 1.15;
		const b = projectIso(6.28 + len, 1.5, z);
		ctx.strokeStyle =
			ev === 'build_fail'
				? palette.aka
				: ev === 'celebration'
					? palette.ok
					: row === 1 && coding
						? palette.aka
						: palette.mutedFg;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}

	// Vertical Linux terminal monitor.
	drawIsoBox(ctx, 7.95, 1.38, 2.65, 0.72, 0.18, 1.52, palette, 'dark');
	const t1 = projectIso(8.02, 1.58, 4.02);
	const t2 = projectIso(8.6, 1.58, 4.02);
	const t3 = projectIso(8.6, 1.58, 2.8);
	const t4 = projectIso(8.02, 1.58, 2.8);
	drawPoly(ctx, [t1, t2, t3, t4], palette.isDark ? '#14110d' : '#23201a');
	ctx.strokeStyle = ev === 'celebration' ? palette.ok : palette.aka;
	ctx.lineWidth = 1.2;
	for (let r = 0; r < 3; r++) {
		const a = projectIso(8.1, 1.6, 3.75 - r * 0.26);
		const b = projectIso(8.45, 1.6, 3.75 - r * 0.26);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
}

function drawElectronicsBench(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	for (const [lx, ly] of [[1.65, 4.4], [4.6, 4.4], [1.65, 6.0], [4.6, 6.0]]) {
		drawIsoBox(ctx, lx, ly, 0, 0.18, 0.18, 1.95, palette, 'iron');
	}
	drawIsoBox(ctx, 1.7, 4.45, 0.5, 2.95, 1.6, 0.14, palette, 'iron');
	drawIsoBox(ctx, 2.1, 4.8, 0.64, 0.85, 0.7, 0.45, palette, 'dark');
	drawIsoBox(ctx, 3.2, 4.9, 0.64, 0.9, 0.65, 0.4, palette, 'base');

	drawIsoBox(ctx, 1.55, 4.3, 1.95, 3.3, 1.95, 0.26, palette, 'wood');

	// Homemade oscilloscope / bench power supply.
	drawIsoBox(ctx, 1.7, 4.45, 2.21, 0.85, 0.85, 0.9, palette, 'dark');
	const o1 = projectIso(1.78, 5.32, 2.98);
	const o2 = projectIso(2.45, 5.32, 2.98);
	const o3 = projectIso(2.45, 5.32, 2.43);
	const o4 = projectIso(1.78, 5.32, 2.43);
	drawPoly(ctx, [o1, o2, o3, o4], '#15120e', palette.isoEdge, 0.6);

	const shortCircuit = world.event.kind === 'short_circuit';
	const celebration = world.event.kind === 'celebration';
	ctx.beginPath();
	for (let i = 0; i <= 10; i++) {
		const px = 1.84 + (i / 10) * 0.55;
		const amp = shortCircuit ? ((i % 2 === 0 ? 1 : -1) * 0.18) : Math.sin(i * 0.9 + world.time * 6) * 0.13;
		const pz = 2.71 + amp;
		const pt = projectIso(px, 5.34, pz);
		if (i === 0) ctx.moveTo(pt.x, pt.y);
		else ctx.lineTo(pt.x, pt.y);
	}
	ctx.strokeStyle = celebration ? palette.ok : palette.aka;
	ctx.lineWidth = shortCircuit ? 1.7 : 1.3;
	ctx.stroke();

	// Target handheld console PCB + SoC chip + D-pad traces + Kintsugi seam.
	drawIsoBox(ctx, 2.75, 4.95, 2.21, 1.35, 0.95, 0.08, palette, 'pcb');
	drawIsoBox(ctx, 3.28, 5.26, 2.29, 0.34, 0.32, 0.05, palette, 'dark');
	const padPt = projectIso(2.96, 5.58, 2.31);
	ctx.fillStyle = palette.gold;
	ctx.fillRect(padPt.x - 2.2, padPt.y - 0.7, 4.4, 1.4);
	ctx.fillRect(padPt.x - 0.7, padPt.y - 2.2, 1.4, 4.4);
	const seamPts = [
		projectIso(2.9, 5.2, 2.31),
		projectIso(3.25, 5.2, 2.31),
		projectIso(3.45, 5.55, 2.31),
		projectIso(3.9, 5.55, 2.31),
	];
	const anyWelding = world.artisan.arcActive || world.drone.weldingActive;
	ctx.strokeStyle = shortCircuit
		? palette.aka
		: celebration
			? palette.gold
			: rgb(palette.akaRgb, 0.35 + world.blackboard.kintsugiSeam * 0.65);
	ctx.lineWidth = anyWelding || shortCircuit ? 2.2 : 1.5;
	ctx.beginPath();
	ctx.moveTo(seamPts[0].x, seamPts[0].y);
	for (let i = 1; i < seamPts.length; i++) ctx.lineTo(seamPts[i].x, seamPts[i].y);
	ctx.stroke();

	if (anyWelding) {
		const arcSrc = world.artisan.arcActive
			? getSeamPoint(world.artisan.solderProgress)
			: getSeamPoint(world.drone.weldProgress);
		const arcPt = projectIso(arcSrc.x, arcSrc.y, arcSrc.z);
		const wash = ctx.createRadialGradient(arcPt.x, arcPt.y, 1, arcPt.x, arcPt.y, 24);
		wash.addColorStop(0, 'rgba(190,238,255,0.28)');
		wash.addColorStop(1, 'rgba(190,238,255,0)');
		ctx.fillStyle = wash;
		ctx.beginPath();
		ctx.arc(arcPt.x, arcPt.y, 24, 0, Math.PI * 2);
		ctx.fill();

		ctx.beginPath();
		ctx.arc(arcPt.x, arcPt.y, 2.8, 0, Math.PI * 2);
		ctx.fillStyle = palette.gold;
		ctx.fill();
	}

	drawIsoBox(ctx, 4.25, 4.5, 2.21, 0.42, 0.42, 0.32, palette, 'iron');
	if (world.blackboard.partDeliveredAtBench) {
		drawIsoBox(ctx, 4.3, 5.45, 2.21, 0.34, 0.34, 0.24, palette, 'aka');
	}
}

export function buildStationDrawables(world: WorkshopWorld, palette: WorkshopPalette): DrawItem[] {
	return [
		{
			depth: 8.2,
			box: { minX: 0.25, maxX: 1.40, minY: 6.10, maxY: 8.55, minZ: 0, maxZ: 3.65 },
			draw: (ctx) => drawPartsRack(ctx, palette),
		},
		{
			depth: 8.5,
			box: { minX: 1.50, maxX: 4.90, minY: 4.25, maxY: 6.30, minZ: 0, maxZ: 3.20 },
			draw: (ctx) => drawElectronicsBench(ctx, world, palette),
		},
		{
			depth: 9.0,
			box: { minX: 5.50, maxX: 8.85, minY: 1.00, maxY: 2.85, minZ: 0, maxZ: 4.25 },
			draw: (ctx) => drawStandingPcDesk(ctx, world, palette),
		},
	];
}
