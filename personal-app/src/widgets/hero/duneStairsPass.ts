import { transformGatePoint } from './duneFrame';
import type { DuneFrame } from './duneFrame';
import { mixRgb, rgba } from './dunePalette';
import type { Vec3 } from './duneTypes';

export function drawStairsPass(frame: DuneFrame): void {
	const { palette, state, project, drawList } = frame;

	// 4b. Ceremonial Stone Stairway Carvings
	const stepCount = 10;
	const stairBasePts = [
		transformGatePoint(frame, [-0.26, 0.96, 0.36], 0),
		transformGatePoint(frame, [0.26, 0.96, 0.36], 0),
		transformGatePoint(frame, [0.52, 1.25, 1.48], 0),
		transformGatePoint(frame, [-0.52, 1.25, 1.48], 0),
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
		).map((p) => transformGatePoint(frame, p, 0));
		const spTread = treadPts.map(project);

		const riserPts = (
			[
				[-halfW * 1.03, yTop, zFront],
				[halfW * 1.03, yTop, zFront],
				[halfW * 1.03, yBot, zFront],
				[-halfW * 1.03, yBot, zFront],
			] as Vec3[]
		).map((p) => transformGatePoint(frame, p, 0));
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
}
