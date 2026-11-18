import { transformGroundPoint, transformGatePoint } from './duneFrame';
import type { DuneFrame } from './duneFrame';
import { rgba } from './dunePalette';

export function drawGatePass(frame: DuneFrame): void {
	const { palette, state, project, splitGap, drawList } = frame;

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
		const wSh = shLoop.map(([lx, lz]) => transformGroundPoint(frame, lx, lz));
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
		transformGroundPoint(frame, -fanNearW, 0.18),
		transformGroundPoint(frame, fanNearW, 0.18),
		transformGroundPoint(frame, fanFarW, 1.96),
		transformGroundPoint(frame, -fanFarW, 1.96),
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
		transformGatePoint(frame, [-0.15, -1.5, -0.18], -1),
		transformGatePoint(frame, [0.15, -1.5, 0.18], 1),
		transformGatePoint(frame, [0.16, 1.06, 0.3], 1),
		transformGatePoint(frame, [-0.16, 1.06, -0.3], -1),
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
		transformGatePoint(frame, [-0.14, -0.75, -0.16], -1),
		transformGatePoint(frame, [-0.15, 1.02, 0.18], -1),
		transformGroundPoint(frame, -fanFarW * 0.78, 1.72),
		transformGroundPoint(frame, fanFarW * 0.78, 1.72),
		transformGatePoint(frame, [0.15, 1.02, 0.18], 1),
		transformGatePoint(frame, [0.14, -0.75, 0.16], 1),
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
}
