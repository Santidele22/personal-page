import type { DuneFrame } from './duneFrame';
import { rgba } from './dunePalette';
import type { Vec3 } from './duneTypes';
import { rotateXYZ } from './duneVectors';

export function drawSkyPass(frame: DuneFrame): void {
	const { ctx, w, h, isDesktop, palette, project, effRx, anchorX } = frame;

	// 1. Arrakis Low Red Sun behind the Split Monolith Gate
	const sunCenterWorld: Vec3 = [anchorX + 0.15, -0.35, -2.6];
	const sunScreen = project(rotateXYZ(sunCenterWorld, effRx * 0.15, 0, 0));
	const sunR = Math.min(w, h) * (isDesktop ? 0.19 : 0.145);

	const sunHalo = ctx.createRadialGradient(
		sunScreen[0],
		sunScreen[1],
		sunR * 0.15,
		sunScreen[0],
		sunScreen[1],
		sunR * 2.2,
	);
	sunHalo.addColorStop(0, rgba(palette.aka, palette.isDark ? 0.3 : 0.21));
	sunHalo.addColorStop(0.5, rgba(palette.aka, palette.isDark ? 0.1 : 0.07));
	sunHalo.addColorStop(1, rgba(palette.aka, 0));
	ctx.fillStyle = sunHalo;
	ctx.beginPath();
	ctx.arc(sunScreen[0], sunScreen[1], sunR * 2.2, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = rgba(palette.aka, palette.isDark ? 0.25 : 0.16);
	ctx.beginPath();
	ctx.arc(sunScreen[0], sunScreen[1], sunR * 0.8, 0, Math.PI * 2);
	ctx.fill();

	// Eclipse arc (Arrakis second moon motif)
	ctx.strokeStyle = rgba(palette.aka, 0.38);
	ctx.lineWidth = 1.1;
	ctx.beginPath();
	ctx.arc(sunScreen[0] - sunR * 0.12, sunScreen[1] + sunR * 0.08, sunR * 0.98, -0.5, Math.PI * 1.25);
	ctx.stroke();
}
