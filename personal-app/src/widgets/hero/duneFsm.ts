import { stepWhisper, triggerStateWhisper } from './duneNarrative';
import type { DuneState, ScribeState, ThresholdState, Vec3 } from './duneTypes';

function easeToward(current: number, target: number, rate: number, dt: number): number {
	return current + (target - current) * Math.min(1, dt * rate);
}

export function transitionDune(
	state: DuneState,
	threshold: ThresholdState,
	scribe: ScribeState,
	whisperDuration?: number,
): void {
	const thresholdChanged = state.thresholdState !== threshold;
	const scribeChanged = state.scribeState !== scribe;
	state.thresholdState = threshold;
	if (thresholdChanged) state.thresholdTime = 0;
	if (thresholdChanged && threshold === 'ABRIENDO') {
		state.openTremor = 1;
		state.dustBurst = 1;
	}
	state.scribeState = scribe;
	if (scribeChanged) state.scribeTime = 0;
	if (whisperDuration && scribeChanged) {
		triggerStateWhisper(state, scribe, whisperDuration);
	}
}

export function getScribeVisibility(state: Pick<DuneState, 'insideDepth'>): number {
	const depth = Math.max(0, Math.min(1, state.insideDepth));
	return Math.max(0, 1 - depth);
}

export function getScribeWorldPos(
	state: Pick<DuneState, 'stairProgress' | 'insideDepth' | 'scribeState' | 'scribeTime'>,
): Vec3 {
	const sp = Math.max(0, Math.min(1, state.stairProgress));
	const id = Math.max(0, Math.min(1, state.insideDepth));
	const smoothStair = sp * sp * (3 - 2 * sp);
	const smoothInside = id * id * (3 - 2 * id);
	const moving = state.scribeState === 'ENTRANDO' || state.scribeState === 'SALIENDO';
	const stepBob = moving
		? Math.abs(Math.sin(state.scribeTime * 6.5)) * 0.008 * (1 - smoothInside * 0.4)
		: 0;

	if (smoothInside > 0) {
		return [0, 0.94 - stepBob, 0.37 - smoothInside * 0.68];
	}

	const walkX = -0.58 * (1 - Math.min(1, smoothStair * 1.45));
	const walkY = 1.24 - smoothStair * 0.3 - stepBob;
	const walkZ = 1.44 - smoothStair * 1.07;
	return [walkX, walkY, walkZ];
}

function getShieldTarget(state: DuneState): number {
	if (state.shieldLocked || state.thresholdState === 'ABRIENDO' || state.thresholdState === 'EN_SILENCIO') {
		return 1;
	}
	return state.thresholdState === 'CERRANDO' ? 0.45 : 0;
}

export function stepDuneFsm(state: DuneState, dt: number): void {
	const safeDt = Math.min(dt, 0.05);
	state.time += safeDt;
	const prevScribeTime = state.scribeTime;
	state.thresholdTime += safeDt;
	state.scribeTime += safeDt;
	state.pulse = Math.max(0, state.pulse - safeDt * 0.9);
	state.openTremor = Math.max(0, state.openTremor - safeDt * 1.55);
	state.dustBurst = Math.max(0, state.dustBurst - safeDt * 0.55);
	stepWhisper(state, safeDt);

	state.shieldStrength = easeToward(state.shieldStrength, getShieldTarget(state), 3.2, safeDt);
	state.gustStrength = easeToward(state.gustStrength, state.thresholdState === 'RAFAGA' ? 1 : 0, 3.6, safeDt);

	const breathTarget =
		state.scribeState === 'ADENTRO' ? 0.5 - 0.5 * Math.cos(state.scribeTime * (Math.PI / 4)) : 0;
	state.breathPulse = easeToward(state.breathPulse, breathTarget, 3.0, safeDt);

	const zoomTarget =
		state.scribeState === 'ADENTRO'
			? 1.11
			: state.scribeState === 'ENTRANDO'
				? 1.05 + state.stairProgress * 0.03 + state.insideDepth * 0.03
				: state.scribeState === 'SALIENDO'
					? 1.0 + state.stairProgress * 0.05 + state.insideDepth * 0.06
					: state.scribeState === 'PENSANDO'
						? 1.035
						: 1.0;
	state.cameraZoom = easeToward(state.cameraZoom, zoomTarget, 2.2, safeDt);

	const glowTarget =
		state.scribeState === 'ADENTRO'
			? 1
			: state.scribeState === 'ENTRANDO'
				? 0.8
				: state.scribeState === 'PENSANDO'
					? 0.48
					: 0.12;
	state.codexGlow = easeToward(state.codexGlow, glowTarget, 2.8, safeDt);

	const waveSpeed =
		state.thresholdState === 'ABRIENDO' || state.scribeState === 'ENTRANDO'
			? 0.55
			: state.thresholdState === 'EN_SILENCIO'
				? 0.36
				: state.scribeState === 'PENSANDO'
					? 0.25
					: 0.16;
	state.kintsugiWave = (state.kintsugiWave + safeDt * waveSpeed) % 1;

	if (state.scribeState === 'QUIETO') {
		state.staffPlanted = false;
		if (prevScribeTime < 1.4 && state.scribeTime >= 1.4 && !state.whisper) {
			triggerStateWhisper(state, 'QUIETO', 7.2);
		}
		if (state.scribeTime >= 9.5) {
			transitionDune(state, 'RAFAGA', 'AGUANTANDO', 7.4);
		}
		return;
	}

	if (state.scribeState === 'AGUANTANDO') {
		state.staffPlanted = false;
		if (state.scribeTime >= 8.5) {
			transitionDune(state, 'RUIDO', 'PENSANDO', 7.6);
		}
		return;
	}

	if (state.scribeState === 'PENSANDO') {
		state.staffPlanted = false;
		if (state.scribeTime >= 9.0) {
			state.pulse = Math.max(state.pulse, 0.75);
			transitionDune(state, 'ABRIENDO', 'ENTRANDO', 7.4);
		}
		return;
	}

	if (state.scribeState === 'ENTRANDO') {
		if (state.stairProgress < 1) {
			state.stairProgress = Math.min(1, state.stairProgress + safeDt * 0.21);
			if (state.stairProgress > 0.35 && state.thresholdState !== 'EN_SILENCIO') {
				state.thresholdState = 'EN_SILENCIO';
				state.thresholdTime = 0;
			}
		} else {
			if (state.thresholdState !== 'EN_SILENCIO') {
				state.thresholdState = 'EN_SILENCIO';
				state.thresholdTime = 0;
			}
			state.insideDepth = Math.min(1, state.insideDepth + safeDt * 0.26);
			if (state.insideDepth > 0.08) state.staffPlanted = true;
			if (state.insideDepth >= 1) {
				transitionDune(state, 'EN_SILENCIO', 'ADENTRO', 8.2);
			}
		}
		return;
	}

	if (state.scribeState === 'ADENTRO') {
		state.stairProgress = 1;
		state.insideDepth = 1;
		state.staffPlanted = true;
		state.dayPhase = (state.dayPhase + safeDt * 0.026) % 1;
		if (state.shieldLocked) {
			if (
				!state.whisper &&
				state.scribeTime >= 10.0 &&
				Math.floor(prevScribeTime / 13.5) < Math.floor(state.scribeTime / 13.5)
			) {
				triggerStateWhisper(state, 'ADENTRO', 8.2);
			}
			return;
		}
		if (state.scribeTime >= 9.5) {
			transitionDune(state, 'CERRANDO', 'SALIENDO', 7.2);
		}
		return;
	}

	if (state.scribeState === 'SALIENDO') {
		if (state.insideDepth > 0) {
			state.insideDepth = Math.max(0, state.insideDepth - safeDt * 0.28);
			if (state.insideDepth <= 0.08) state.staffPlanted = false;
		} else {
			state.staffPlanted = false;
			state.stairProgress = Math.max(0, state.stairProgress - safeDt * 0.22);
			if (state.stairProgress <= 0) {
				state.cycleCount += 1;
				transitionDune(state, 'RUIDO', 'QUIETO');
			}
		}
	}
}
