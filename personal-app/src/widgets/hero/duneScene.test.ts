import { describe, expect, it } from 'vitest';
import {
	advanceCameraMotion,
	createDuneState,
	duneHeight,
	getTelemetryLabel,
	hexToRgb,
	makeSlab,
	mixRgb,
	rgba,
	toggleSanctuary,
	vAdd,
	vCross,
	vDot,
	vNorm,
	vScale,
	vSub,
} from './duneScene';

describe('duneScene color helpers', () => {
	it('parses 3-digit and 6-digit hex values and falls back safely', () => {
		expect(hexToRgb('#c73e3a')).toEqual([199, 62, 58]);
		expect(hexToRgb(' #fff ')).toEqual([255, 255, 255]);
		expect(hexToRgb('invalid')).toEqual([35, 32, 26]);
	});

	it('mixes RGB colors and clamps t between 0 and 1', () => {
		expect(mixRgb([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25]);
		expect(mixRgb([10, 20, 30], [100, 200, 250], -2)).toEqual([10, 20, 30]);
		expect(mixRgb([10, 20, 30], [100, 200, 250], 4)).toEqual([100, 200, 250]);
	});

	it('formats rgba strings with clamped alpha', () => {
		expect(rgba([199, 62, 58], 0.5)).toBe('rgba(199,62,58,0.500)');
		expect(rgba([199, 62, 58], 2)).toBe('rgba(199,62,58,1.000)');
		expect(rgba([199, 62, 58], -1)).toBe('rgba(199,62,58,0.000)');
	});
});

describe('duneScene 3D geometry', () => {
	it('builds a closed 6-face slab with strictly outward-pointing normals', () => {
		const bottom: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]] = [
			[-1, 1, 1],
			[1, 1, 1],
			[1, 1, -1],
			[-1, 1, -1],
		];
		const top: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]] = [
			[-0.5, -1, 0.5],
			[0.5, -1, 0.5],
			[0.5, -1, -0.5],
			[-0.5, -1, -0.5],
		];
		const faces = makeSlab(bottom, top);
		expect(faces).toHaveLength(6);

		const allPts = [...bottom, ...top];
		const center = vScale(
			allPts.reduce((acc, p) => vAdd(acc, p), [0, 0, 0] as [number, number, number]),
			1 / 8,
		);

		for (const face of faces) {
			const fCenter = vScale(
				face.pts.reduce((acc, p) => vAdd(acc, p), [0, 0, 0] as [number, number, number]),
				0.25,
			);
			const n = vNorm(vCross(vSub(face.pts[1], face.pts[0]), vSub(face.pts[2], face.pts[0])));
			const outDir = vSub(fCenter, center);
			expect(vDot(n, outDir)).toBeGreaterThan(0);
		}
	});

	it('carves a lower ceremonial corridor in front of the monolith than the flanking dunes', () => {
		const anchorX = 1.85;
		const corridorY = duneHeight(anchorX, 1.2, anchorX, 0);
		const flankingY = duneHeight(anchorX + 2.4, 1.2, anchorX, 0);
		// Remember +Y is down in screen/world coordinates, so a larger Y means lower ground elevation
		expect(corridorY).toBeGreaterThan(flankingY);
	});
});

describe('duneScene interaction and telemetry state', () => {
	it('toggles sanctuary via toggleSanctuary without drag state', () => {
		const state = createDuneState();
		expect(getTelemetryLabel(state)).toBe('RUIDO AFUERA · EN PIE');

		toggleSanctuary(state);
		expect(state.shieldLocked).toBe(true);
		expect(state.pulse).toBe(1);
		expect(getTelemetryLabel(state)).toBe('SILENCIO ADENTRO · ENTRANDO');

		toggleSanctuary(state);
		expect(state.shieldLocked).toBe(false);
	});

	it('continues autonomous camera yaw oscillation while keeping pitch fixed', () => {
		const state = createDuneState();
		const initialPitch = state.rotX;
		const initialYaw = state.rotY;

		state.time = 2;
		advanceCameraMotion(state);

		expect(state.rotX).toBe(initialPitch);
		expect(state.rotY).not.toBe(initialYaw);
	});
});
