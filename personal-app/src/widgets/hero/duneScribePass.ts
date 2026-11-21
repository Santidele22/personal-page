import { transformGatePoint } from './duneFrame';
import type { DuneFrame } from './duneFrame';
import { getScribeVisibility, getScribeWorldPos } from './duneFsm';
import { rgba } from './dunePalette';
import type { DunePalette, Vec3 } from './duneTypes';

function drawWalkingStaff(
	c: CanvasRenderingContext2D,
	top: [number, number, number, number],
	bot: [number, number, number, number],
	emberBoost: number,
	palette: DunePalette,
): void {
	const scaleRef = top[3];
	c.strokeStyle = rgba(palette.fg, 0.92);
	c.lineWidth = Math.max(1.15, 1.3 * scaleRef);
	c.lineCap = 'round';
	c.beginPath();
	c.moveTo(top[0], top[1]);
	c.lineTo(bot[0], bot[1]);
	c.stroke();

	const bandX = top[0] + (bot[0] - top[0]) * 0.14;
	const bandY = top[1] + (bot[1] - top[1]) * 0.14;
	c.strokeStyle = rgba(palette.aka, 0.72);
	c.lineWidth = Math.max(1.4, 1.65 * scaleRef);
	c.beginPath();
	c.moveTo(bandX - 1.3 * scaleRef, bandY);
	c.lineTo(bandX + 1.3 * scaleRef, bandY);
	c.stroke();

	const haloR = (6 + emberBoost * 5) * scaleRef;
	const emberGlow = c.createRadialGradient(top[0], top[1], 0.5, top[0], top[1], haloR);
	emberGlow.addColorStop(0, rgba(palette.aka, 0.38 + emberBoost * 0.28));
	emberGlow.addColorStop(1, rgba(palette.aka, 0));
	c.fillStyle = emberGlow;
	c.beginPath();
	c.arc(top[0], top[1], haloR, 0, Math.PI * 2);
	c.fill();

	c.fillStyle = rgba(palette.aka, 0.96);
	c.beginPath();
	c.arc(top[0], top[1], Math.max(1.5, 1.9 * scaleRef), 0, Math.PI * 2);
	c.fill();
}

export function drawScribePass(frame: DuneFrame): void {
	const { palette, state, project, drawList } = frame;

	const [figX, figFootY, figZ] = getScribeWorldPos(state);
	const isWalking = state.scribeState === 'ENTRANDO' || state.scribeState === 'SALIENDO';
	const walkSway = isWalking ? Math.sin(state.time * 7.5) * 0.008 * (1 - state.insideDepth * 0.5) : 0;
	const isBracing = state.scribeState === 'AGUANTANDO';
	const leanX = isBracing
		? state.gustStrength * 0.022 * (1 - state.insideDepth)
		: state.scribeState === 'PENSANDO'
			? 0.007
			: state.gustStrength * 0.016 * (1 - state.insideDepth) + walkSway;
	const headOffset = isBracing ? 0.009 : state.scribeState === 'PENSANDO' ? 0.004 : 0;
	const figHeadY = figFootY - 0.165 + headOffset;

	const spHead = project(transformGatePoint(frame, [figX + leanX, figHeadY, figZ], 0));
	frame.scribeScreenPos = [spHead[0], spHead[1]];

	if (state.staffPlanted) {
		const plantedTop = project(transformGatePoint(frame, [0.145, 0.745, 0.42], 0));
		const plantedBot = project(transformGatePoint(frame, [0.13, 0.94, 0.42], 0));
		const emberBoost = 0.35 + state.breathPulse * 0.65;
		drawList.push({
			z: 1.36,
			draw: (c) => {
				c.fillStyle = rgba(palette.isDark ? palette.bg : palette.fg, palette.isDark ? 0.65 : 0.32);
				c.beginPath();
				c.ellipse(
					plantedBot[0] + 2.5 * plantedBot[3],
					plantedBot[1] + 0.8 * plantedBot[3],
					3.4 * plantedBot[3],
					1.3 * plantedBot[3],
					0,
					0,
					Math.PI * 2,
				);
				c.fill();
				drawWalkingStaff(c, plantedTop, plantedBot, emberBoost, palette);
			},
		});
	}

	const visibility = getScribeVisibility(state);
	if (visibility <= 0.01) return;

	const shadowScale = (1 - state.stairProgress * 0.52) * (1 - state.insideDepth * 0.85);
	const figShadowPts = (
		[
			[figX - 0.024, figFootY, figZ],
			[figX + 0.024, figFootY, figZ],
			[figX + 0.36 * shadowScale, figFootY + 0.038 * shadowScale, figZ + 0.26 * shadowScale],
			[figX + 0.24 * shadowScale, figFootY + 0.038 * shadowScale, figZ + 0.32 * shadowScale],
		] as Vec3[]
	).map((p) => transformGatePoint(frame, p, 0));
	const spFigShadow = figShadowPts.map(project);

	const coatPts = (
		[
			[figX + leanX - 0.014, figHeadY + 0.028, figZ],
			[figX + leanX + 0.014, figHeadY + 0.028, figZ],
			[figX + 0.038, figFootY, figZ + 0.012],
			[figX + 0.006, figFootY + 0.005, figZ],
			[figX - 0.034, figFootY, figZ - 0.008],
		] as Vec3[]
	).map((p) => transformGatePoint(frame, p, 0));
	const spCoat = coatPts.map(project);

	const windCalm = Math.max(0.15, (1 - state.shieldStrength * 0.65) * (1 - state.insideDepth));
	const gustBoost = 1 + state.gustStrength * 1.1;
	const windFlutter = Math.sin(state.time * (3.6 + state.gustStrength * 3.4)) * 0.016 * windCalm * gustBoost;
	const scarfReach = (1 + state.gustStrength * 0.32) * (1 - state.insideDepth * 0.45);
	const scarfPts = (
		[
			[figX + leanX - 0.01, figHeadY + 0.034, figZ],
			[figX + leanX - 0.095 * scarfReach, figHeadY + 0.05 + windFlutter, figZ + 0.018],
			[figX + leanX - 0.175 * scarfReach, figHeadY + 0.072 - windFlutter, figZ + 0.036],
		] as Vec3[]
	).map((p) => transformGatePoint(frame, p, 0));
	const spScarf = scarfPts.map(project);

	const strideSwing = isWalking ? Math.sin(state.scribeTime * 6.5) * 0.022 : 0;
	const carriedStaffTop = project(
		transformGatePoint(
			frame,
			isBracing
				? [figX + leanX + 0.012, figHeadY - 0.02, figZ]
				: [figX + leanX - 0.04 + strideSwing * 0.45, figHeadY - 0.032, figZ],
			0,
		),
	);
	const carriedStaffBot = project(
		transformGatePoint(
			frame,
			isBracing
				? [figX + 0.055, figFootY + 0.005, figZ + 0.02]
				: [figX - 0.03 - strideSwing, figFootY + 0.004, figZ],
			0,
		),
	);

	const painterZ = 1.55 - state.stairProgress * 0.22 - state.insideDepth * 1.75;

	drawList.push({
		z: painterZ,
		draw: (c) => {
			c.save();
			c.globalAlpha *= visibility;

			c.fillStyle = rgba(
				palette.isDark ? palette.bg : palette.fg,
				(palette.isDark ? 0.68 : 0.34) * (1 - state.insideDepth * 0.8),
			);
			c.beginPath();
			c.moveTo(spFigShadow[0][0], spFigShadow[0][1]);
			for (let k = 1; k < spFigShadow.length; k++) c.lineTo(spFigShadow[k][0], spFigShadow[k][1]);
			c.closePath();
			c.fill();

			const haloR = (13 + state.codexGlow * 4) * spHead[3];
			const gRim = c.createRadialGradient(
				spHead[0],
				spHead[1] + 6 * spHead[3],
				1,
				spHead[0],
				spHead[1] + 6 * spHead[3],
				haloR,
			);
			gRim.addColorStop(0, rgba(palette.aka, 0.28 + state.shieldStrength * 0.22 + state.codexGlow * 0.12));
			gRim.addColorStop(1, rgba(palette.aka, 0));
			c.fillStyle = gRim;
			c.beginPath();
			c.arc(spHead[0], spHead[1] + 6 * spHead[3], haloR, 0, Math.PI * 2);
			c.fill();

			if (!state.staffPlanted) {
				drawWalkingStaff(c, carriedStaffTop, carriedStaffBot, state.codexGlow * 0.6, palette);
			}

			const silColor = palette.fg;
			c.fillStyle = rgba(silColor, 0.98);
			c.strokeStyle = rgba(palette.aka, 0.68 + state.shieldStrength * 0.22);
			c.lineWidth = 1.0;
			c.lineJoin = 'round';
			c.beginPath();
			c.moveTo(spCoat[0][0], spCoat[0][1]);
			for (let k = 1; k < spCoat.length; k++) c.lineTo(spCoat[k][0], spCoat[k][1]);
			c.closePath();
			c.fill();
			c.stroke();

			c.fillStyle = rgba(silColor, 0.99);
			c.strokeStyle = rgba(palette.aka, 0.8);
			c.lineWidth = 0.95;
			c.beginPath();
			c.arc(spHead[0], spHead[1], Math.max(2.4, 2.9 * spHead[3]), 0, Math.PI * 2);
			c.fill();
			c.stroke();

			c.strokeStyle = rgba(palette.aka, 0.92);
			c.lineWidth = Math.max(1.5, 1.85 * spHead[3]);
			c.lineCap = 'round';
			c.beginPath();
			c.moveTo(spScarf[0][0], spScarf[0][1]);
			c.quadraticCurveTo(spScarf[1][0], spScarf[1][1], spScarf[2][0], spScarf[2][1]);
			c.stroke();

			c.restore();
		},
	});
}
