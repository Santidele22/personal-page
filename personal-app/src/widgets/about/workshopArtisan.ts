import { getSeamPoint } from './workshopEvents';
import { drawElectricArc, drawGroundShadow, drawIsoBox, projectIso, rgb } from './workshopIso';
import type { Point2D, WorkshopPalette, WorkshopWorld } from './workshopTypes';

type HandPose = 'relaxed' | 'type' | 'grip' | 'open';
type ToolKind = 'torch' | 'probe' | 'rod';

interface ArmSpec {
	shoulder: Point2D;
	elbow: Point2D;
	wrist: Point2D;
	depth: number;
	pose: HandPose;
	flipThumb: number;
	holdTool?: ToolKind;
}

function drawCapsuleLimb(ctx: CanvasRenderingContext2D, a: Point2D, b: Point2D, width: number, fill: string, edge: string): void {
	ctx.save();
	ctx.lineCap = 'round';
	ctx.strokeStyle = edge;
	ctx.lineWidth = width + 1.5;
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();

	ctx.strokeStyle = fill;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	ctx.restore();
}

function drawHand(ctx: CanvasRenderingContext2D, wrist: Point2D, angle: number, pose: HandPose, flipThumb: number, palette: WorkshopPalette): void {
	ctx.save();
	ctx.translate(wrist.x, wrist.y);
	ctx.rotate(angle);

	ctx.fillStyle = rgb(palette.isoTop);
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.85;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	ctx.beginPath();
	ctx.moveTo(-0.4, -1.5);
	ctx.lineTo(2.4, -1.4);
	ctx.quadraticCurveTo(3.4, 0, 2.4, 1.4);
	ctx.lineTo(-0.4, 1.5);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0.7, 1.1 * flipThumb);
	ctx.lineTo(2.1, 2.7 * flipThumb);
	ctx.stroke();

	if (pose === 'open') {
		for (const fy of [-1.25, -0.42, 0.42, 1.25]) {
			ctx.beginPath();
			ctx.moveTo(2.5, fy * 0.85);
			ctx.lineTo(4.7, fy * 1.15);
			ctx.stroke();
		}
	} else if (pose === 'type') {
		for (const fy of [-0.95, 0, 0.95]) {
			ctx.beginPath();
			ctx.moveTo(2.4, fy);
			ctx.lineTo(3.8, fy + 0.25);
			ctx.lineTo(4.3, fy + 1.05);
			ctx.stroke();
		}
	} else if (pose === 'grip') {
		for (const fy of [-0.85, 0.1, 1.0]) {
			ctx.beginPath();
			ctx.moveTo(2.2, fy);
			ctx.quadraticCurveTo(3.5, fy + 0.3, 2.6, fy + 0.9);
			ctx.stroke();
		}
	} else {
		for (const fy of [-0.65, 0.45]) {
			ctx.beginPath();
			ctx.moveTo(2.4, fy);
			ctx.lineTo(3.7, fy + 0.15);
			ctx.stroke();
		}
	}

	ctx.restore();
}

function drawArmTool(ctx: CanvasRenderingContext2D, wrist: Point2D, tip: Point2D, tool: ToolKind, arcActive: boolean, palette: WorkshopPalette): void {
	ctx.save();
	ctx.lineCap = 'round';
	if (tool === 'torch') {
		const mid = { x: (wrist.x + tip.x) * 0.45, y: (wrist.y + tip.y) * 0.45 };
		const cord = projectIso(4.05, 5.9, 2.15);
		ctx.strokeStyle = 'rgba(20,17,13,0.7)';
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.moveTo(wrist.x, wrist.y + 1);
		ctx.quadraticCurveTo(wrist.x + 8, cord.y + 4, cord.x, cord.y);
		ctx.stroke();

		ctx.strokeStyle = rgb(palette.isoDark);
		ctx.lineWidth = 2.8;
		ctx.beginPath();
		ctx.moveTo(wrist.x, wrist.y);
		ctx.lineTo(mid.x, mid.y);
		ctx.stroke();

		ctx.strokeStyle = arcActive ? '#d8e8f2' : rgb(palette.isoTop);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(mid.x, mid.y);
		ctx.lineTo(tip.x, tip.y);
		ctx.stroke();
	} else if (tool === 'rod') {
		ctx.strokeStyle = palette.gold;
		ctx.lineWidth = 1.05;
		ctx.beginPath();
		ctx.moveTo(wrist.x, wrist.y);
		ctx.lineTo(tip.x, tip.y);
		ctx.stroke();
	} else {
		const mid = { x: (wrist.x + tip.x) * 0.5, y: (wrist.y + tip.y) * 0.5 };
		ctx.strokeStyle = rgb(palette.isoDark);
		ctx.lineWidth = 2.2;
		ctx.beginPath();
		ctx.moveTo(wrist.x, wrist.y);
		ctx.lineTo(mid.x, mid.y);
		ctx.stroke();

		ctx.strokeStyle = palette.ok;
		ctx.lineWidth = 1.25;
		ctx.beginPath();
		ctx.moveTo(mid.x, mid.y);
		ctx.lineTo(tip.x, tip.y);
		ctx.stroke();
	}
	ctx.restore();
}

function drawArtisanArm(ctx: CanvasRenderingContext2D, arm: ArmSpec, toolTip: Point2D | null, arcActive: boolean, palette: WorkshopPalette): void {
	drawCapsuleLimb(ctx, arm.shoulder, arm.elbow, 4.2, rgb(palette.isoDark), palette.isoEdge);
	drawCapsuleLimb(ctx, arm.elbow, arm.wrist, 3.0, rgb(palette.isoLeft), palette.isoEdge);

	ctx.beginPath();
	ctx.arc(arm.elbow.x, arm.elbow.y, 1.9, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoDark);
	ctx.fill();
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.7;
	ctx.stroke();

	const angle = Math.atan2(arm.wrist.y - arm.elbow.y, arm.wrist.x - arm.elbow.x);
	drawHand(ctx, arm.wrist, angle, arm.pose, arm.flipThumb, palette);

	if (arm.holdTool && toolTip) {
		drawArmTool(ctx, arm.wrist, toolTip, arm.holdTool, arcActive, palette);
	}
}

function drawWeldingMask(ctx: CanvasRenderingContext2D, head: Point2D, progress: number, arcLit: boolean, time: number, palette: WorkshopPalette): void {
	if (progress <= 0.04) return;
	ctx.save();

	const fold = 0.45 + 0.55 * progress;
	const liftY = -5.8 * (1 - progress);
	const shiftX = 1.6 * progress;

	// Retention strap wrapped behind the temple hinge.
	ctx.strokeStyle = 'rgba(24,20,16,0.85)';
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	ctx.moveTo(head.x - 8.6, head.y - 1.5);
	ctx.lineTo(head.x - 4.0, head.y - 2.2 + liftY * 0.3);
	ctx.stroke();

	// Protective welding hood shell tilted toward the front-right face.
	const shellFill = palette.isDark ? '#25211c' : '#3d3730';
	ctx.fillStyle = shellFill;
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.95;
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(head.x - 4.0, head.y - 7.8 + liftY);
	ctx.quadraticCurveTo(head.x + 3.2 + shiftX, head.y - 10.6 + liftY, head.x + 9.2 + shiftX, head.y - 5.4 + liftY);
	ctx.lineTo(head.x + 10.2 + shiftX, head.y + 4.2 * fold + liftY * 0.4);
	ctx.lineTo(head.x + 3.6 + shiftX, head.y + 10.2 * fold + liftY * 0.2);
	ctx.lineTo(head.x - 3.8, head.y + 6.0 * fold + liftY * 0.35);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	// Auto-darkening welding lens window.
	const vx = head.x + 0.2 + shiftX;
	const vy = head.y - 3.4 * fold + liftY * 0.65;
	const vw = 7.4;
	const vh = 4.6 * fold;
	ctx.fillStyle = '#0d1812';
	ctx.strokeStyle = rgb(palette.isoTop, 0.72);
	ctx.lineWidth = 0.75;
	ctx.fillRect(vx, vy, vw, vh);
	ctx.strokeRect(vx, vy, vw, vh);

	if (arcLit && progress >= 0.75) {
		const glint = 0.45 + 0.45 * Math.sin(time * 47);
		ctx.fillStyle = `rgba(185,240,255,${glint})`;
		ctx.fillRect(vx + 1.0, vy + 0.8, vw * 0.55, Math.max(1.2, vh * 0.32));
	}

	// Side pivot hinge rivet.
	ctx.beginPath();
	ctx.arc(head.x - 3.6, head.y - 2.0 + liftY * 0.25, 1.35, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoTop);
	ctx.fill();
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.6;
	ctx.stroke();

	ctx.restore();
}

function computeArms(
	world: WorkshopWorld,
	bob: number,
): { left: ArmSpec; right: ArmSpec; toolTip: Point2D | null; seamPos: Point2D } {
	const a = world.artisan;
	const walking = a.state === 'WALKING_TO_BENCH' || a.state === 'WALKING_TO_PC';
	const swing = walking ? Math.sin(a.walkPhase) * 0.42 : 0;
	const px = -Math.sin(a.facing);
	const py = Math.cos(a.facing);
	const fx = Math.cos(a.facing);
	const fy = Math.sin(a.facing);

	const ls3 = { x: a.x - px * 0.34, y: a.y - py * 0.34, z: 2.72 + bob };
	const rs3 = { x: a.x + px * 0.34, y: a.y + py * 0.34, z: 2.72 + bob };

	let le3 = { x: ls3.x - px * 0.08 + fx * 0.14, y: ls3.y - py * 0.08 + fy * 0.14, z: 2.18 + bob };
	let re3 = { x: rs3.x + px * 0.08 + fx * 0.14, y: rs3.y + py * 0.08 + fy * 0.14, z: 2.18 + bob };
	let lw3 = { x: ls3.x - px * 0.06 + fx * (0.28 + swing), y: ls3.y - py * 0.06 + fy * (0.28 + swing), z: 1.72 + bob };
	let rw3 = { x: rs3.x + px * 0.06 + fx * (0.28 - swing), y: rs3.y + py * 0.06 + fy * (0.28 - swing), z: 1.72 + bob };
	let lPose: HandPose = 'relaxed';
	let rPose: HandPose = 'relaxed';
	let leftTool: ToolKind | undefined;
	let rightTool: ToolKind | undefined;
	const seam3 = getSeamPoint(a.solderProgress);
	const seamPos = projectIso(seam3.x, seam3.y, seam3.z);
	let toolTip: Point2D | null = null;

	if (a.state === 'CODING' || (a.state === 'TROUBLESHOOTING' && a.activeStation === 'pc')) {
		const speed = a.state === 'TROUBLESHOOTING' ? 22 : 14;
		le3 = { x: 6.62, y: 2.94, z: 2.24 };
		re3 = { x: 7.52, y: 2.96, z: 2.24 };
		lw3 = { x: 6.72, y: 2.5, z: 2.6 + Math.sin(world.time * speed) * 0.06 };
		rw3 = { x: 7.35, y: 2.48, z: 2.59 + Math.cos(world.time * speed) * 0.06 };
		lPose = 'type';
		rPose = 'type';
	} else if (
		a.state === 'SOLDERING' ||
		a.state === 'ELECTRONICS_TEST' ||
		(a.state === 'TROUBLESHOOTING' && a.activeStation === 'bench')
	) {
		re3 = { x: 3.9, y: 6.24, z: 2.38 };
		rw3 = {
			x: seam3.x + 0.26,
			y: seam3.y + 0.36,
			z: a.state === 'SOLDERING' ? 2.46 : 2.42 + Math.sin(world.time * 4) * 0.05,
		};
		rPose = 'grip';
		rightTool = a.state === 'SOLDERING' ? 'torch' : 'probe';
		toolTip = seamPos;

		if (a.maskProgress > 0.08 && a.maskProgress < 0.85) {
			le3 = { x: a.x - px * 0.42, y: a.y - py * 0.42, z: 2.75 + bob };
			lw3 = { x: a.x - px * 0.22 + 0.14, y: a.y - py * 0.22 - 0.12, z: 3.24 + bob };
			lPose = 'grip';
		} else {
			le3 = { x: 3.02, y: 6.26, z: 2.36 };
			lw3 = { x: seam3.x - 0.26, y: seam3.y + 0.34, z: 2.42 };
			lPose = a.state === 'SOLDERING' ? 'grip' : 'open';
			leftTool = a.state === 'SOLDERING' && a.arcActive ? 'rod' : undefined;
		}
	} else if (a.state === 'GREETING') {
		re3 = { x: a.x + px * 0.44 + 0.14, y: a.y + py * 0.44 + 0.14, z: 2.75 + bob };
		rw3 = { x: a.x + px * 0.56 + 0.25, y: a.y + py * 0.56 + 0.25, z: 3.35 + Math.sin(world.time * 9) * 0.18 + bob };
		rPose = 'open';
	} else if (a.state === 'PANICKING') {
		const wave = Math.sin(world.time * 22) * 0.25;
		le3 = { x: ls3.x - px * 0.28, y: ls3.y - py * 0.28, z: 2.9 + bob };
		re3 = { x: rs3.x + px * 0.28, y: rs3.y + py * 0.28, z: 2.9 + bob };
		lw3 = { x: ls3.x - px * 0.36, y: ls3.y - py * 0.36, z: 3.45 + wave + bob };
		rw3 = { x: rs3.x + px * 0.36, y: rs3.y + py * 0.36, z: 3.45 - wave + bob };
		lPose = 'open';
		rPose = 'open';
	} else if (a.state === 'CELEBRATING') {
		const pump = Math.sin(world.time * 12) * 0.14;
		le3 = { x: ls3.x - px * 0.26, y: ls3.y - py * 0.26, z: 2.95 + bob };
		re3 = { x: rs3.x + px * 0.26, y: rs3.y + py * 0.26, z: 2.95 + bob };
		lw3 = { x: ls3.x - px * 0.34, y: ls3.y - py * 0.34, z: 3.55 + pump + bob };
		rw3 = { x: rs3.x + px * 0.34, y: rs3.y + py * 0.34, z: 3.55 - pump + bob };
		lPose = 'open';
		rPose = 'open';
	}

	return {
		left: {
			shoulder: projectIso(ls3.x, ls3.y, ls3.z),
			elbow: projectIso(le3.x, le3.y, le3.z),
			wrist: projectIso(lw3.x, lw3.y, lw3.z),
			depth: (ls3.x + ls3.y + lw3.x + lw3.y) * 0.5,
			pose: lPose,
			flipThumb: 1,
			holdTool: leftTool,
		},
		right: {
			shoulder: projectIso(rs3.x, rs3.y, rs3.z),
			elbow: projectIso(re3.x, re3.y, re3.z),
			wrist: projectIso(rw3.x, rw3.y, rw3.z),
			depth: (rs3.x + rs3.y + rw3.x + rw3.y) * 0.5,
			pose: rPose,
			flipThumb: -1,
			holdTool: rightTool,
		},
		toolTip,
		seamPos,
	};
}

export function drawArtisan(ctx: CanvasRenderingContext2D, world: WorkshopWorld, palette: WorkshopPalette): void {
	const a = world.artisan;
	const walking = a.state === 'WALKING_TO_BENCH' || a.state === 'WALKING_TO_PC';
	const stride = walking ? Math.sin(a.walkPhase) * 0.16 : 0;
	const bob = (walking ? Math.abs(Math.sin(a.walkPhase)) * 0.08 : Math.sin(world.time * 2.2) * 0.02) + a.jumpZ;
	const torsoDepth = a.x + a.y;
	const arms = computeArms(world, bob);

	drawGroundShadow(ctx, a.x, a.y, Math.max(8, 14 - a.jumpZ * 10), Math.max(4, 7 - a.jumpZ * 5), 0.28);

	if (arms.left.depth < torsoDepth - 0.04) drawArtisanArm(ctx, arms.left, arms.toolTip, a.arcActive, palette);
	if (arms.right.depth < torsoDepth - 0.04) drawArtisanArm(ctx, arms.right, arms.toolTip, a.arcActive, palette);

	drawIsoBox(ctx, a.x - 0.22 + stride * 0.4, a.y - 0.12 - stride * 0.4, a.jumpZ, 0.22, 0.22, 1.52, palette, 'iron');
	drawIsoBox(ctx, a.x + 0.04 - stride * 0.4, a.y + 0.06 + stride * 0.4, a.jumpZ, 0.22, 0.22, 1.52, palette, 'iron');
	drawIsoBox(ctx, a.x - 0.28, a.y - 0.2, 1.52 + bob, 0.56, 0.42, 1.34, palette, 'dark');

	const headShake = a.state === 'PANICKING' ? Math.sin(world.time * 28) * 0.08 : 0;
	const head = projectIso(a.x + headShake, a.y - headShake * 0.5, 3.28 + bob);
	ctx.beginPath();
	ctx.arc(head.x, head.y, 9.2, 0, Math.PI * 2);
	ctx.fillStyle = rgb(palette.isoLeft);
	ctx.fill();
	ctx.strokeStyle = palette.isoEdge;
	ctx.lineWidth = 0.85;
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(head.x - 8.7, head.y - 1);
	ctx.quadraticCurveTo(head.x, head.y + 2.4, head.x + 8.7, head.y - 1);
	ctx.strokeStyle = palette.aka;
	ctx.lineWidth = 2.2;
	ctx.stroke();

	const arcLit = a.arcActive || world.drone.weldingActive;
	drawWeldingMask(ctx, head, a.maskProgress, arcLit, world.time, palette);

	if (arms.left.depth >= torsoDepth - 0.04) drawArtisanArm(ctx, arms.left, arms.toolTip, a.arcActive, palette);
	if (arms.right.depth >= torsoDepth - 0.04) drawArtisanArm(ctx, arms.right, arms.toolTip, a.arcActive, palette);

	if (a.arcActive) drawElectricArc(ctx, arms.seamPos, world.time, 1.0);
}
