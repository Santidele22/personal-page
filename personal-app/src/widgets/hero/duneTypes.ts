export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
export type Quad3 = [Vec3, Vec3, Vec3, Vec3];

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
}
