import type { DuneFrame } from './duneFrame';
import { rgba } from './dunePalette';
import type { Vec3 } from './duneTypes';
import { rotateXYZ } from './duneVectors';

const STARS: readonly [number, number][] = [
	[0.14, 0.16],
	[0.31, 0.11],
	[0.48, 0.22],
	[0.64, 0.12],
	[0.77, 0.19],
	[0.86, 0.09],
	[0.92, 0.26],
];

export function drawSkyPass(frame: DuneFrame): void {
	const { ctx, w, h, isDesktop, palette, project, effRx, anchorX, state } = frame;
	const angle = state.dayPhase * Math.PI * 2;

	if (palette.isDark) {
		const twilight = 0.08 + Math.max(state.insideDepth * 0.14, (1 - Math.cos(angle)) * 0.1);
		for (let i = 0; i < STARS.length; i++) {
			const [nx, ny] = STARS[i];
			const twinkle = 0.72 + Math.sin(state.time * 1.4 + i * 2.1) * 0.28;
			ctx.fillStyle = rgba(palette.fg, Math.min(0.28, twilight * twinkle));
			ctx.beginPath();
			ctx.arc(w * nx, h * ny, i % 2 === 0 ? 1.15 : 0.85, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// Low Red Sun behind the Split Monolith Gate, slowly shifting across cycles
	const sunCenterWorld: Vec3 = [
		anchorX + 0.15 + Math.sin(angle) * 0.42,
		-0.35 + (1 - Math.cos(angle)) * 0.22,
		-2.6,
	];
	const sunScreen = project(rotateXYZ(sunCenterWorld, effRx * 0.15, 0, 0));
	const sunR = Math.min(w, h) * (isDesktop ? 0.19 : 0.145);
	const breathBoost = state.breathPulse * 0.08;

	const sunHalo = ctx.createRadialGradient(
		sunScreen[0],
		sunScreen[1],
		sunR * 0.15,
		sunScreen[0],
		sunScreen[1],
		sunR * 2.2,
	);
	sunHalo.addColorStop(0, rgba(palette.aka, (palette.isDark ? 0.3 : 0.21) + breathBoost));
	sunHalo.addColorStop(0.5, rgba(palette.aka, (palette.isDark ? 0.1 : 0.07) + breathBoost * 0.4));
	sunHalo.addColorStop(1, rgba(palette.aka, 0));
	ctx.fillStyle = sunHalo;
	ctx.beginPath();
	ctx.arc(sunScreen[0], sunScreen[1], sunR * 2.2, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = rgba(palette.aka, (palette.isDark ? 0.25 : 0.16) + breathBoost * 0.6);
	ctx.beginPath();
	ctx.arc(sunScreen[0], sunScreen[1], sunR * 0.8, 0, Math.PI * 2);
	ctx.fill();

	// Eclipse arc shifting slowly with dayPhase
	ctx.strokeStyle = rgba(palette.aka, 0.38);
	ctx.lineWidth = 1.1;
	ctx.beginPath();
	ctx.arc(
		sunScreen[0] - sunR * 0.12,
		sunScreen[1] + sunR * 0.08,
		sunR * 0.98,
		-0.5 + angle * 0.35,
		Math.PI * 1.25 + angle * 0.35,
	);
	ctx.stroke();
}
