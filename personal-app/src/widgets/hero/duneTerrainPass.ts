import type { DuneFrame } from './duneFrame';
import { duneHeight } from './duneGeometry';
import { mixRgb, rgba } from './dunePalette';
import type { Vec3 } from './duneTypes';
import { rotateXYZ, vCross, vDot, vNorm, vScale, vSub } from './duneVectors';

export function drawTerrainPass(frame: DuneFrame): void {
	const { palette, state, project, anchorX, effRx, effRy, sunDir, drawList } = frame;

	// 2. 3D Sculpted Shaded Desert Dunes
	const cols = 34;
	const rows = 12;
	const xMin = -6.8;
	const xMax = 6.8;
	const zMin = -2.2;
	const zMax = 2.0;
	const duneVerts: Vec3[][] = [];
	for (let r = 0; r <= rows; r++) {
		const wz = zMin + (r / rows) * (zMax - zMin);
		const rowArr: Vec3[] = [];
		for (let c = 0; c <= cols; c++) {
			const wx = xMin + (c / cols) * (xMax - xMin);
			const wy = duneHeight(wx, wz, anchorX, state.time * (1 - state.shieldStrength * 0.7));
			const gp = rotateXYZ([wx - anchorX, wy - 0.15, wz], effRx * 0.45, effRy * 0.22, 0);
			rowArr.push([gp[0] + anchorX, gp[1], gp[2]]);
		}
		duneVerts.push(rowArr);
	}

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const p00 = duneVerts[r][c];
			const p10 = duneVerts[r][c + 1];
			const p11 = duneVerts[r + 1][c + 1];
			const p01 = duneVerts[r + 1][c];

			const tris: [Vec3, Vec3, Vec3][] = [
				[p00, p10, p11],
				[p00, p11, p01],
			];

			for (const tri of tris) {
				let n = vCross(vSub(tri[1], tri[0]), vSub(tri[2], tri[0]));
				if (n[1] > 0) n = vScale(n, -1);
				const unitN = vNorm(n);
				const lit = Math.max(0, Math.min(1, (vDot(unitN, sunDir) + 0.35) / 1.25));
				const avgZ = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;

				const duneColor = palette.isDark
					? mixRgb(palette.bg, mixRgb(palette.secondary, palette.fg, 0.22), lit)
					: mixRgb(mixRgb(palette.fg, palette.muted, 0.56), palette.card, Math.pow(lit, 0.85));

				const sp = tri.map(project);
				drawList.push({
					z: -3.2 + avgZ * 0.22,
					draw: (ctx2) => {
						ctx2.fillStyle = rgba(duneColor, 0.96);
						ctx2.strokeStyle = rgba(duneColor, 0.62);
						ctx2.lineWidth = 0.65;
						ctx2.beginPath();
						ctx2.moveTo(sp[0][0], sp[0][1]);
						ctx2.lineTo(sp[1][0], sp[1][1]);
						ctx2.lineTo(sp[2][0], sp[2][1]);
						ctx2.closePath();
						ctx2.fill();
						ctx2.stroke();
					},
				});
			}

			const cellWx = xMin + (c / cols) * (xMax - xMin);
			if ((r === 5 || r === 8) && Math.abs(cellWx - anchorX) > 1.05) {
				const sA = project(p00);
				const sB = project(p10);
				const avgZ = (p00[2] + p10[2]) * 0.5;
				drawList.push({
					z: -3.15 + avgZ * 0.22,
					draw: (ctx2) => {
						ctx2.strokeStyle = rgba(r === 5 ? palette.aka : palette.fg, r === 5 ? 0.35 : 0.18);
						ctx2.lineWidth = r === 5 ? 1.15 : 0.75;
						ctx2.beginPath();
						ctx2.moveTo(sA[0], sA[1]);
						ctx2.lineTo(sB[0], sB[1]);
						ctx2.stroke();
					},
				});
			}
		}
	}
}
