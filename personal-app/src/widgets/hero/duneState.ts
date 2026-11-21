import { transitionDune } from './duneFsm';
import { triggerStateWhisper } from './duneNarrative';
import type { DuneState, Vec3 } from './duneTypes';
import { vNorm } from './duneVectors';

export function createDuneState(): DuneState {
	return {
		rotX: -0.02,
		rotY: 0,
		shieldLocked: false,
		shieldStrength: 0,
		pulse: 0,
		time: 0,
		thresholdState: 'RUIDO',
		thresholdTime: 0,
		scribeState: 'QUIETO',
		scribeTime: 0,
		stairProgress: 0,
		insideDepth: 0,
		gustStrength: 0,
		kintsugiWave: 0,
		codexGlow: 0,
		cycleCount: 0,
		whisper: null,
		whisperIndex: 0,
		staffPlanted: false,
		breathPulse: 0,
		openTremor: 0,
		dustBurst: 0,
		cameraZoom: 1,
		dayPhase: 0,
	};
}

export function getSunDir(dayPhase: number): Vec3 {
	const a = dayPhase * Math.PI * 2;
	return vNorm([-0.74 + Math.sin(a) * 0.28, -0.52 + (1 - Math.cos(a)) * 0.16, 0.42]);
}

export function isSanctuaryActive(
	state: Pick<DuneState, 'shieldLocked' | 'pulse'> &
		Partial<Pick<DuneState, 'thresholdState' | 'stairProgress' | 'insideDepth'>>,
): boolean {
	if (state.shieldLocked || state.pulse > 0.15) return true;
	if (state.thresholdState === 'ABRIENDO' || state.thresholdState === 'EN_SILENCIO') return true;
	if ((state.insideDepth ?? 0) > 0) return true;
	return state.thresholdState === 'CERRANDO' && (state.stairProgress ?? 0) > 0.25;
}

export function getTelemetryLabel(
	state: Pick<DuneState, 'shieldLocked' | 'pulse'> &
		Partial<Pick<DuneState, 'thresholdState' | 'scribeState' | 'insideDepth'>>,
): string {
	if (state.shieldLocked) {
		if (state.scribeState === 'ADENTRO' && (state.insideDepth ?? 0) >= 0.99) {
			return 'EN SILENCIO · ADENTRO (FIJO)';
		}
		return 'SILENCIO ADENTRO · ENTRANDO';
	}
	if (state.scribeState === 'ADENTRO') return 'EN SILENCIO · ADENTRO';
	if (state.scribeState === 'ENTRANDO') return 'REFUGIO ABIERTO · ENTRANDO';
	if (state.scribeState === 'SALIENDO' || state.thresholdState === 'CERRANDO') {
		return 'VOLVIENDO AL RUIDO · SALIENDO';
	}
	if (state.scribeState === 'PENSANDO') return 'PAUSA · PENSANDO EN VOZ BAJA';
	if (state.scribeState === 'AGUANTANDO' || state.thresholdState === 'RAFAGA') {
		return 'RAFAGA DE RUIDO · AGUANTANDO';
	}
	return 'RUIDO AFUERA · EN PIE';
}

export function toggleSanctuary(state: DuneState): void {
	state.shieldLocked = !state.shieldLocked;
	if (state.shieldLocked) {
		state.pulse = 1;
		if (state.insideDepth >= 0.99 && state.stairProgress >= 0.99) {
			transitionDune(state, 'EN_SILENCIO', 'ADENTRO', 8.0);
		} else {
			const nextThreshold = state.stairProgress > 0.35 ? 'EN_SILENCIO' : 'ABRIENDO';
			transitionDune(state, nextThreshold, 'ENTRANDO', 7.4);
		}
		return;
	}
	if (state.insideDepth > 0.02 || state.stairProgress > 0.02) {
		transitionDune(state, 'CERRANDO', 'SALIENDO', 7.2);
	} else {
		transitionDune(state, 'RUIDO', 'QUIETO');
		triggerStateWhisper(state, 'QUIETO', 7.2);
	}
}

export function advanceCameraMotion(state: Pick<DuneState, 'time' | 'rotX' | 'rotY'>): void {
	state.rotY = Math.sin(state.time * 0.22) * 0.085;
	state.rotX = -0.02;
}
