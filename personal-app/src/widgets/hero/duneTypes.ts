export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
export type Quad3 = [Vec3, Vec3, Vec3, Vec3];

export type ThresholdState = 'RUIDO' | 'RAFAGA' | 'ABRIENDO' | 'EN_SILENCIO' | 'CERRANDO';
export type ScribeState =
	| 'QUIETO'
	| 'AGUANTANDO'
	| 'PENSANDO'
	| 'ENTRANDO'
	| 'ADENTRO'
	| 'SALIENDO';

export interface ScribeWhisper {
	text: string;
	elapsed: number;
	duration: number;
}

export interface SlabFace {
	pts: Vec3[];
	kind: 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';
}

export interface DunePalette {
	isDark: boolean;
	bg: RGB;
	card: RGB;
	secondary: RGB;
	muted: RGB;
	border: RGB;
	fg: RGB;
	mutedFg: RGB;
	aka: RGB;
	akaDeep: RGB;
}

export interface DuneState {
	rotX: number;
	rotY: number;
	shieldLocked: boolean;
	shieldStrength: number;
	pulse: number;
	time: number;
	thresholdState: ThresholdState;
	thresholdTime: number;
	scribeState: ScribeState;
	scribeTime: number;
	stairProgress: number;
	insideDepth: number;
	gustStrength: number;
	kintsugiWave: number;
	codexGlow: number;
	cycleCount: number;
	whisper: ScribeWhisper | null;
	whisperIndex: number;
	staffPlanted: boolean;
	breathPulse: number;
	openTremor: number;
	dustBurst: number;
	cameraZoom: number;
	dayPhase: number;
}
