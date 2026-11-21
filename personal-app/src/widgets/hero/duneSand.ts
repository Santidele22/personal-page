import type { DuneFrame } from './duneFrame';
import { duneHeight } from './duneGeometry';
import { isSanctuaryActive } from './duneState';
import type { DuneState } from './duneTypes';
import { rgba } from './dunePalette';
import { rotateXYZ } from './duneVectors';

export interface SandParticle {
	x: number;
	z: number;
	yOffset: number;
	speed: number;
	len: number;
	orbitA: number;
	isEmber: boolean;
	isForeground: boolean;
}

const SAND_COUNT = 150;
const FOREGROUND_START = SAND_COUNT - 10;

export function createSand(): SandParticle[] {
	return Array.from({ length: SAND_COUNT }, (_, i) => {
		const s1 = Math.sin(i * 17.13) * 43758.5453;
		const f1 = s1 - Math.floor(s1);
		const s2 = Math.sin(i * 63.71) * 19341.123;
		const f2 = s2 - Math.floor(s2);
		const isForeground = i >= FOREGROUND_START;
		if (isForeground) {
			return {
				x: (f1 - 0.5) * 13.0,
				z: 2.15 + f2 * 0.7,
				yOffset: -0.65 + (i % 5) * 0.35,
				speed: 3.4 + (i % 4) * 0.38,
				len: 0.65 + (i % 5) * 0.12,
				orbitA: (i / SAND_COUNT) * Math.PI * 2,
				isEmber: false,
				isForeground: true,
			};
		}
		return {
			x: (f1 - 0.5) * 13.0,
			z: -1.8 + f2 * 3.4,
			yOffset: 0.04 + (i % 6) * 0.06,
			speed: 1.4 + (i % 5) * 0.34,
			len: 0.18 + (i % 4) * 0.11,
			orbitA: (i / SAND_COUNT) * Math.PI * 2,
			isEmber: i % 8 === 0,
			isForeground: false,
		};
	});
}

export function updateSand(
	sand: SandParticle[],
	state: DuneState,
	dt: number,
	onPulseEnd: () => void,
): void {
	const target = isSanctuaryActive(state) ? 1 : 0;
	state.shieldStrength += (target - state.shieldStrength) * Math.min(1, dt * 3.6);
	if (state.pulse > 0) {
		state.pulse = Math.max(0, state.pulse - dt * 0.75);
		if (state.pulse === 0) onPulseEnd();
	}

	for (const p of sand) {
		if (p.isForeground) {
			if (state.gustStrength > 0.05) {
				p.x -= p.speed * (0.55 + state.gustStrength * 0.9) * dt;
				if (p.x < -6.8) p.x = 6.8;
			}
			continue;
		}
		if (state.shieldStrength > 0.45 && p.isEmber) {
			p.orbitA += dt * 0.7;
			p.yOffset += dt * 0.65;
			if (p.yOffset > 2.4) p.yOffset = 0.05;
		} else {
			const speedScale = Math.max(0.18, (1 - state.shieldStrength * 0.78) * (1 + state.gustStrength * 0.85));
			p.x -= p.speed * speedScale * dt;
			if (p.x < -6.8) {
				p.x = 6.8;
				p.yOffset = 0.04 + Math.abs(Math.sin(p.orbitA * 9 + state.time)) * 0.36;
			}
		}
	}
}

export function drawSandPass(frame: DuneFrame, sand: SandParticle[]): void {
	const { state, palette, project, anchorX, effRx, effRy, drawList } = frame;

	// 5. Windblown Sand off Dune Crests, Spice Embers & Foreground Gust Parallax
	for (const p of sand) {
		if (p.isForeground) {
			if (state.gustStrength <= 0.06) continue;
			const wy = p.yOffset;
			const stretch = p.len * (0.85 + state.gustStrength * 0.65);
			const gp1 = rotateXYZ([p.x - anchorX, wy, p.z], effRx * 0.45, effRy * 0.22, 0);
			const gp2 = rotateXYZ([p.x - anchorX + stretch, wy + 0.045, p.z], effRx * 0.45, effRy * 0.22, 0);
			const s1 = project([gp1[0] + anchorX, gp1[1], gp1[2]]);
			const s2 = project([gp2[0] + anchorX, gp2[1], gp2[2]]);
			const lineW = 1.9 + (p.z - 2.15) * 0.85;
			drawList.push({
				z: 2.35 + (p.z - 2.0) * 0.2,
				draw: (c) => {
					c.strokeStyle = rgba(palette.fg, state.gustStrength * (palette.isDark ? 0.34 : 0.26));
					c.lineWidth = lineW;
					c.lineCap = 'round';
					c.beginPath();
					c.moveTo(s1[0], s1[1]);
					c.lineTo(s2[0], s2[1]);
					c.stroke();
				},
			});
			continue;
		}
		if (state.shieldStrength > 0.45 && p.isEmber) {
			const ex = anchorX + Math.sin(p.orbitA) * 0.22;
			const ey = 0.9 - p.yOffset;
			const ez = Math.cos(p.orbitA) * 0.22;
			const sp = project([ex, ey, ez]);
			drawList.push({
				z: ez + 0.25,
				draw: (c) => {
					c.fillStyle = rgba(palette.aka, 0.78);
					c.beginPath();
					c.arc(sp[0], sp[1], 2.1 * sp[3], 0, Math.PI * 2);
					c.fill();
				},
			});
		} else {
			const baseH = duneHeight(p.x, p.z, anchorX, state.time * (1 - state.shieldStrength * 0.7));
			const wy = baseH - p.yOffset - 0.15;
			const stretch = p.len * (1 + state.gustStrength * 0.55);
			const gp1 = rotateXYZ([p.x - anchorX, wy, p.z], effRx * 0.45, effRy * 0.22, 0);
			const gp2 = rotateXYZ([p.x - anchorX + stretch, wy + 0.03, p.z], effRx * 0.45, effRy * 0.22, 0);
			const s1 = project([gp1[0] + anchorX, gp1[1], gp1[2]]);
			const s2 = project([gp2[0] + anchorX, gp2[1], gp2[2]]);
			const depth = Math.max(0.12, Math.min(1, (gp1[2] + 2.2) / 3.8));

			drawList.push({
				z: gp1[2] - 0.3,
				draw: (c) => {
					c.strokeStyle = rgba(
						p.isEmber ? palette.aka : palette.fg,
						(p.isEmber ? 0.55 : 0.22) * depth,
					);
					c.lineWidth = p.isEmber ? 1.3 : 0.9;
					c.lineCap = 'round';
					c.beginPath();
					c.moveTo(s1[0], s1[1]);
					c.lineTo(s2[0], s2[1]);
					c.stroke();
				},
			});
		}
	}
}
