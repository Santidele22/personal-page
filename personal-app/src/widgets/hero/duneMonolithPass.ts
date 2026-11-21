import { transformGatePoint } from './duneFrame';
import type { DuneFrame } from './duneFrame';
import type { KintsugiSeam, StoneInscription } from './duneGeometry';
import { mixRgb, rgba } from './dunePalette';
import type { SlabFace } from './duneTypes';
import { vCross, vDot, vNorm, vSub } from './duneVectors';

export function drawMonolithPass(
	frame: DuneFrame,
	pylonFaces: SlabFace[],
	kintsugiSeams: KintsugiSeam[],
	stoneInscriptions: StoneInscription[],
): void {
	const { palette, state, project, sunDir, drawList } = frame;
	const stepPulse =
		state.scribeState === 'ENTRANDO' && state.insideDepth === 0
			? Math.abs(Math.sin(state.stairProgress * Math.PI * 5)) * 0.24
			: 0;

	// Render left and right brutalist pylons
	for (let idx = 0; idx < pylonFaces.length; idx++) {
		const f = pylonFaces[idx];
		const sideSign = idx < 6 ? -1 : 1;
		const wPts = f.pts.map((p) => transformGatePoint(frame, p, sideSign));
		const n = vCross(vSub(wPts[1], wPts[0]), vSub(wPts[2], wPts[0]));
		if (n[2] <= 0) continue;
		const unitN = vNorm(n);
		const diff = Math.max(0, vDot(unitN, sunDir));
		const isInnerWall = (sideSign === -1 && f.kind === 'right') || (sideSign === 1 && f.kind === 'left');

		let stoneTone = palette.isDark
			? mixRgb(palette.bg, palette.fg, 0.12 + diff * 0.32)
			: mixRgb(mixRgb(palette.fg, palette.muted, 0.25), palette.card, 0.22 + diff * 0.74);

		if (isInnerWall) {
			stoneTone = mixRgb(
				stoneTone,
				palette.aka,
				Math.min(0.85, 0.28 + state.shieldStrength * 0.38 + state.breathPulse * 0.22 + stepPulse * 0.2),
			);
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
		const wQuad = seam.quad.map((p) => transformGatePoint(frame, p, sideSign));
		const qN = vCross(vSub(wQuad[3], wQuad[0]), vSub(wQuad[1], wQuad[0]));
		if (qN[2] <= 0) continue;

		const wPts = seam.pts.map((p) => transformGatePoint(frame, p, sideSign));
		const sPts = wPts.map(project);
		const avgZ = wQuad.reduce((acc, p) => acc + p[2], 0) / 4 + 0.04;

		drawList.push({
			z: avgZ,
			draw: (c) => {
				const kGlow = Math.min(
					1,
					Math.max(state.shieldStrength, state.pulse, state.kintsugiWave) + state.breathPulse * 0.32 + stepPulse,
				);
				if (kGlow > 0.05) {
					c.strokeStyle = rgba(palette.aka, 0.42 * kGlow);
					c.lineWidth = 5.2;
					c.lineCap = 'round';
					c.lineJoin = 'round';
					c.beginPath();
					c.moveTo(sPts[0][0], sPts[0][1]);
					for (let k = 1; k < sPts.length; k++) c.lineTo(sPts[k][0], sPts[k][1]);
					c.stroke();
				}
				c.strokeStyle = rgba(palette.aka, 0.92);
				c.lineWidth = 2.0 + Math.max(state.shieldStrength, state.kintsugiWave * 0.7) * 0.7;
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
	for (let iIdx = 0; iIdx < stoneInscriptions.length; iIdx++) {
		const inscr = stoneInscriptions[iIdx];
		const wQuad = inscr.quad.map((p) => transformGatePoint(frame, p, inscr.side));
		const qN = vCross(vSub(wQuad[3], wQuad[0]), vSub(wQuad[1], wQuad[0]));
		if (qN[2] <= 0) continue;

		const wPts = inscr.pts.map((p) => transformGatePoint(frame, p, inscr.side));
		const sPts = wPts.map(project);
		const avgZ = wQuad.reduce((acc, p) => acc + p[2], 0) / 4 + 0.032;

		drawList.push({
			z: avgZ,
			draw: (c) => {
				const runeWave =
					Math.max(0, Math.sin(state.time * 2.4 - iIdx * 0.55)) *
					Math.max(state.codexGlow, state.kintsugiWave);
				const isGlow = inscr.accent || runeWave > 0.35;
				c.strokeStyle = isGlow
					? rgba(palette.aka, 0.48 + state.shieldStrength * 0.32 + runeWave * 0.35)
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

	if (state.dustBurst > 0.02) {
		const progress = 1 - state.dustBurst;
		const specks: { x: number; y: number; r: number }[] = [];
		for (let i = 0; i < 14; i++) {
			const sideSign = i % 2 === 0 ? -1 : 1;
			const frac = (i % 7) / 6;
			const fallY = -1.35 + frac * 1.15 + progress * (0.55 + (i % 5) * 0.18);
			const driftX = sideSign * 0.16 - progress * (0.04 + state.gustStrength * 0.14) + Math.sin(i * 1.9 + progress * 6) * 0.015;
			const pt = project(transformGatePoint(frame, [driftX, fallY, 0.22 + (i % 3) * 0.05], sideSign));
			specks.push({ x: pt[0], y: pt[1], r: Math.max(0.85, (1.0 + (i % 3) * 0.35) * pt[3]) });
		}
		drawList.push({
			z: 0.42,
			draw: (c) => {
				c.fillStyle = rgba(palette.fg, state.dustBurst * (palette.isDark ? 0.46 : 0.38));
				for (const sp of specks) {
					c.beginPath();
					c.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
					c.fill();
				}
			},
		});
	}
}
