import { describe, expect, it } from 'vitest';
import { getScribeVisibility, getScribeWorldPos, stepDuneFsm } from './duneFsm';
import { getWhisperOpacity } from './duneNarrative';
import { createDuneState, getSunDir, getTelemetryLabel, toggleSanctuary } from './duneState';
import type { ScribeState, ThresholdState } from './duneTypes';

const FORBIDDEN_JARGON = /c[oó]digo|rust|umbral|c[oó]dice|hechizo|portal|tormenta/i;

describe('duneFsm autonomous life-reflection cycle', () => {
	it('starts in RUIDO and QUIETO outside the refuge with full visibility', () => {
		const state = createDuneState();
		expect(state.thresholdState).toBe('RUIDO');
		expect(state.scribeState).toBe('QUIETO');
		expect(state.stairProgress).toBe(0);
		expect(state.insideDepth).toBe(0);
		expect(state.staffPlanted).toBe(false);
		expect(state.breathPulse).toBe(0);
		expect(state.openTremor).toBe(0);
		expect(state.dustBurst).toBe(0);
		expect(state.cameraZoom).toBe(1);
		expect(state.dayPhase).toBe(0);
		expect(getScribeVisibility(state)).toBe(1);
		expect(getTelemetryLabel(state)).toBe('RUIDO AFUERA · EN PIE');

		expect(getWhisperOpacity({ text: 'test', elapsed: 0.35, duration: 7.6 })).toBeLessThan(1);
		expect(getWhisperOpacity({ text: 'test', elapsed: 1.0, duration: 7.6 })).toBe(1);
		expect(getWhisperOpacity({ text: 'test', elapsed: 6.0, duration: 7.6 })).toBe(1);
		expect(getWhisperOpacity({ text: 'test', elapsed: 7.3, duration: 7.6 })).toBeLessThan(1);
	});

	it('completes an autonomous cycle walking all the way inside and returning outside', () => {
		const state = createDuneState();
		const visitedScribe = new Set<ScribeState>([state.scribeState]);
		const visitedThreshold = new Set<ThresholdState>([state.thresholdState]);
		const whispers = new Set<string>();
		let maxStairProgress = 0;
		let maxInsideDepth = 0;
		let minVisibility = 1;
		let insideWorldZ: number | null = null;
		let maxOpenTremor = 0;
		let maxDustBurst = 0;
		let maxBreathPulse = 0;
		let maxCameraZoom = 0;
		let minZoomAfterCycle = Number.POSITIVE_INFINITY;
		let plantedAfterCycle: boolean | null = null;
		let sawPlantedWhileHiddenInside = false;
		let tremorInAdentro = 1;
		let dustInAdentro = 1;
		let minWhisperDuration = Number.POSITIVE_INFINITY;

		for (let i = 0; i < 1200; i += 1) {
			stepDuneFsm(state, 0.1);
			visitedScribe.add(state.scribeState);
			visitedThreshold.add(state.thresholdState);
			if (state.whisper) {
				whispers.add(state.whisper.text);
				minWhisperDuration = Math.min(minWhisperDuration, state.whisper.duration);
			}
			if (state.stairProgress > maxStairProgress) maxStairProgress = state.stairProgress;
			if (state.insideDepth > maxInsideDepth) maxInsideDepth = state.insideDepth;
			if (state.openTremor > maxOpenTremor) maxOpenTremor = state.openTremor;
			if (state.dustBurst > maxDustBurst) maxDustBurst = state.dustBurst;
			if (state.cameraZoom > maxCameraZoom) maxCameraZoom = state.cameraZoom;

			const vis = getScribeVisibility(state);
			if (vis < minVisibility) minVisibility = vis;
			if (state.insideDepth >= 0.999) {
				insideWorldZ = getScribeWorldPos(state)[2];
			}
			if (state.scribeState === 'ADENTRO') {
				if (state.breathPulse > maxBreathPulse) maxBreathPulse = state.breathPulse;
				if (state.staffPlanted && vis === 0) sawPlantedWhileHiddenInside = true;
				tremorInAdentro = Math.min(tremorInAdentro, state.openTremor);
				dustInAdentro = Math.min(dustInAdentro, state.dustBurst);
			}
			if (state.cycleCount >= 1 && state.scribeState === 'QUIETO') {
				minZoomAfterCycle = Math.min(minZoomAfterCycle, state.cameraZoom);
				plantedAfterCycle = state.staffPlanted;
			}
		}

		expect([...visitedScribe]).toEqual(
			expect.arrayContaining<ScribeState>([
				'QUIETO',
				'AGUANTANDO',
				'PENSANDO',
				'ENTRANDO',
				'ADENTRO',
				'SALIENDO',
			]),
		);
		expect([...visitedThreshold]).toEqual(
			expect.arrayContaining<ThresholdState>([
				'RUIDO',
				'RAFAGA',
				'ABRIENDO',
				'EN_SILENCIO',
				'CERRANDO',
			]),
		);
		expect(maxStairProgress).toBeCloseTo(1, 3);
		expect(maxInsideDepth).toBeCloseTo(1, 3);
		expect(minVisibility).toBe(0);
		expect(insideWorldZ).not.toBeNull();
		expect(insideWorldZ!).toBeLessThan(0);
		expect(state.cycleCount).toBeGreaterThanOrEqual(1);
		expect(sawPlantedWhileHiddenInside).toBe(true);
		expect(plantedAfterCycle).toBe(false);
		expect(maxOpenTremor).toBeGreaterThan(0.5);
		expect(maxDustBurst).toBeGreaterThan(0.5);
		expect(tremorInAdentro).toBeLessThan(0.05);
		expect(dustInAdentro).toBeLessThan(0.05);
		expect(maxBreathPulse).toBeGreaterThan(0.5);
		expect(maxCameraZoom).toBeGreaterThan(1.07);
		expect(minZoomAfterCycle).toBeLessThan(1.03);
		expect(state.dayPhase).toBeGreaterThan(0.1);
		expect(getSunDir(state.dayPhase)).not.toEqual(getSunDir(0));
		expect(minWhisperDuration).toBeGreaterThanOrEqual(7);
		expect(whispers.size).toBeGreaterThanOrEqual(4);
		for (const line of whispers) {
			expect(line).not.toMatch(FORBIDDEN_JARGON);
		}
	});

	it('toggleSanctuary walks completely inside while locked and exits smoothly on unlock', () => {
		const state = createDuneState();
		toggleSanctuary(state);
		expect(state.shieldLocked).toBe(true);
		expect(state.openTremor).toBe(1);
		expect(state.dustBurst).toBe(1);
		expect(getTelemetryLabel(state)).toBe('SILENCIO ADENTRO · ENTRANDO');

		for (let i = 0; i < 200; i += 1) {
			stepDuneFsm(state, 0.1);
		}
		expect(state.thresholdState).toBe('EN_SILENCIO');
		expect(state.scribeState).toBe('ADENTRO');
		expect(state.stairProgress).toBe(1);
		expect(state.insideDepth).toBe(1);
		expect(state.staffPlanted).toBe(true);
		expect(state.cameraZoom).toBeGreaterThan(1.07);
		expect(getScribeVisibility(state)).toBe(0);

		for (let i = 0; i < 120; i += 1) {
			stepDuneFsm(state, 0.1);
		}
		expect(state.scribeState).toBe('ADENTRO');
		expect(state.insideDepth).toBe(1);
		expect(state.staffPlanted).toBe(true);

		toggleSanctuary(state);
		expect(state.shieldLocked).toBe(false);
		stepDuneFsm(state, 0.1);
		expect(state.scribeState).toBe('SALIENDO');
		expect(state.thresholdState).toBe('CERRANDO');

		for (let i = 0; i < 200; i += 1) {
			stepDuneFsm(state, 0.1);
		}
		expect(state.scribeState).toBe('QUIETO');
		expect(state.thresholdState).toBe('RUIDO');
		expect(state.stairProgress).toBe(0);
		expect(state.insideDepth).toBe(0);
		expect(state.staffPlanted).toBe(false);
		expect(getScribeVisibility(state)).toBe(1);
	});
});
