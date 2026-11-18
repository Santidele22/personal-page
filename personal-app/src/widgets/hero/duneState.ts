import type { DuneState } from './duneTypes';

const DEFAULT_ROT_X = 0.14;
const DEFAULT_ROT_Y = -0.32;

export function createDuneState(): DuneState {
	return {
		rotX: DEFAULT_ROT_X,
		rotY: DEFAULT_ROT_Y,
		shieldLocked: false,
		shieldStrength: 0,
		pulse: 0,
		time: 0,
	};
}

export function isSanctuaryActive(state: Pick<DuneState, 'shieldLocked' | 'pulse'>): boolean {
	return state.shieldLocked || state.pulse > 0.15;
}

export function getTelemetryLabel(state: Pick<DuneState, 'shieldLocked' | 'pulse'>): string {
	return isSanctuaryActive(state)
		? 'UMBRAL ABIERTO · ARENA EN CALMA'
		: 'TORMENTA EN LA ARENA · UMBRAL EN PIE';
}

export function toggleSanctuary(state: DuneState): void {
	state.shieldLocked = !state.shieldLocked;
	if (state.shieldLocked) {
		state.pulse = 1;
	}
}

export function advanceCameraMotion(state: Pick<DuneState, 'rotX' | 'rotY' | 'time'>): void {
	const targetYaw = DEFAULT_ROT_Y + Math.sin(state.time * 0.28) * 0.16;
	state.rotY += (targetYaw - state.rotY) * 0.015;
	state.rotX += (DEFAULT_ROT_X - state.rotX) * 0.02;
}
