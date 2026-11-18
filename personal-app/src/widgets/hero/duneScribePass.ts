import { transformGatePoint } from './duneFrame';
import type { DuneFrame } from './duneFrame';
import { rgba } from './dunePalette';
import type { Vec3 } from './duneTypes';

export function drawScribePass(frame: DuneFrame): void {
	const { palette, state, project, drawList } = frame;

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
	).map((p) => transformGatePoint(frame, p, 0));
	const spFigShadow = figShadowPts.map(project);

	const cloakPts = (
		[
			[figX - 0.015, figHeadY + 0.028, figZ],
			[figX + 0.015, figHeadY + 0.028, figZ],
			[figX + 0.044, figFootY, figZ + 0.015],
			[figX + 0.008, figFootY + 0.006, figZ],
			[figX - 0.04, figFootY, figZ - 0.01],
		] as Vec3[]
	).map((p) => transformGatePoint(frame, p, 0));
	const spCloak = cloakPts.map(project);
	const spHead = project(transformGatePoint(frame, [figX, figHeadY, figZ], 0));
	const staffTop = project(transformGatePoint(frame, [figX - 0.044, figHeadY - 0.036, figZ], 0));
	const staffBot = project(transformGatePoint(frame, [figX - 0.032, figFootY + 0.004, figZ], 0));
	const codexCenter = project(
		transformGatePoint(frame, [figX + 0.056, figHeadY + 0.046, figZ + 0.02], 0),
	);

	const windFlutter = Math.sin(state.time * 3.8) * 0.018 * (1 - state.shieldStrength * 0.65);
	const sashPts = (
		[
			[figX - 0.012, figHeadY + 0.034, figZ],
			[figX - 0.105, figHeadY + 0.05 + windFlutter, figZ + 0.02],
			[figX - 0.195, figHeadY + 0.074 - windFlutter, figZ + 0.04],
		] as Vec3[]
	).map((p) => transformGatePoint(frame, p, 0));
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
}
