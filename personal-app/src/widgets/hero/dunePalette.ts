import type { DunePalette, RGB } from './duneTypes';

export function hexToRgb(hex: string): RGB {
	const clean = hex.trim().replace('#', '');
	if (clean.length === 3 && /^[0-9a-fA-F]{3}$/.test(clean)) {
		return [
			parseInt(clean[0] + clean[0], 16),
			parseInt(clean[1] + clean[1], 16),
			parseInt(clean[2] + clean[2], 16),
		];
	}
	if (clean.length === 6 && /^[0-9a-fA-F]{6}$/.test(clean)) {
		return [
			parseInt(clean.slice(0, 2), 16),
			parseInt(clean.slice(2, 4), 16),
			parseInt(clean.slice(4, 6), 16),
		];
	}
	return [35, 32, 26];
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
	const k = Math.max(0, Math.min(1, t));
	return [
		Math.round(a[0] + (b[0] - a[0]) * k),
		Math.round(a[1] + (b[1] - a[1]) * k),
		Math.round(a[2] + (b[2] - a[2]) * k),
	];
}

export function rgba(rgb: RGB, alpha: number): string {
	return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function readPalette(): DunePalette {
	const styles = getComputedStyle(document.documentElement);
	const isDark = document.documentElement.classList.contains('dark');
	return {
		isDark,
		bg: hexToRgb(styles.getPropertyValue('--background') || (isDark ? '#14110d' : '#f4efe4')),
		card: hexToRgb(styles.getPropertyValue('--card') || (isDark ? '#1c1812' : '#fbf8f0')),
		secondary: hexToRgb(styles.getPropertyValue('--secondary') || (isDark ? '#241f17' : '#ece5d4')),
		muted: hexToRgb(styles.getPropertyValue('--muted') || (isDark ? '#231e16' : '#ebe4d2')),
		border: hexToRgb(styles.getPropertyValue('--border') || (isDark ? '#322b20' : '#ddd2bc')),
		fg: hexToRgb(styles.getPropertyValue('--foreground') || (isDark ? '#eae3d3' : '#23201a')),
		mutedFg: hexToRgb(styles.getPropertyValue('--muted-foreground') || (isDark ? '#a29681' : '#6f6657')),
		aka: hexToRgb(styles.getPropertyValue('--aka') || (isDark ? '#d95448' : '#c73e3a')),
		akaDeep: hexToRgb(styles.getPropertyValue('--aka-deep') || (isDark ? '#c73e3a' : '#a02f2b')),
	};
}
