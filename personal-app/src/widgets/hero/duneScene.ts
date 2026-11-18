import type { DuneFrame } from './duneFrame';
import { createProjector } from './duneFrame';
import { drawGatePass } from './duneGatePass';
import { createDunePylons, createKintsugiSeams, createStoneInscriptions } from './duneGeometry';
import { drawMonolithPass } from './duneMonolithPass';
import { readPalette } from './dunePalette';
import { createSand, drawSandPass, updateSand } from './duneSand';
import { drawScribePass } from './duneScribePass';
import { drawSkyPass } from './duneSkyPass';
import { drawStairsPass } from './duneStairsPass';
import {
	advanceCameraMotion,
	createDuneState,
	getTelemetryLabel,
	toggleSanctuary,
} from './duneState';
import { drawTerrainPass } from './duneTerrainPass';
import { vNorm } from './duneVectors';

export type { DunePalette, DuneState, Quad3, RGB, SlabFace, Vec3 } from './duneTypes';
export { hexToRgb, mixRgb, rgba } from './dunePalette';
export { duneHeight } from './duneGeometry';
export { vAdd, vCross, vDot, makeSlab, vNorm, vScale, vSub } from './duneVectors';
export {
	advanceCameraMotion,
	createDuneState,
	getTelemetryLabel,
	isSanctuaryActive,
	toggleSanctuary,
} from './duneState';

export function initDuneHero(): () => void {
	const stageNode = document.getElementById('duneStage');
	const canvasNode = document.getElementById('duneCanvas');
	const telemetryState = document.getElementById('telemetryState');
	const holdHelmBtn = document.getElementById('holdHelmBtn');

	if (!(stageNode instanceof HTMLElement) || !(canvasNode instanceof HTMLCanvasElement)) {
		return () => {};
	}
	const stage: HTMLElement = stageNode;
	const canvas: HTMLCanvasElement = canvasNode;

	const pylons = createDunePylons();
	const kintsugiSeams = createKintsugiSeams(pylons);
	const stoneInscriptions = createStoneInscriptions(pylons);
	const sand = createSand();

	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	let reducedMotion = motionQuery.matches;
	let palette = readPalette();
	const state = createDuneState();
	let lastTs = performance.now();
	let rafId = 0;
	let isVisible = true;

	function syncTelemetry(): void {
		if (telemetryState) {
			telemetryState.textContent = getTelemetryLabel(state);
		}
		if (holdHelmBtn) {
			holdHelmBtn.setAttribute('aria-pressed', state.shieldLocked ? 'true' : 'false');
			holdHelmBtn.textContent = state.shieldLocked ? 'Soltar la calma' : 'Calmar la tormenta';
		}
	}

	function renderFrame(): void {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = stage.clientWidth;
		const h = stage.clientHeight;
		if (w === 0 || h === 0) return;

		const targetW = Math.round(w * dpr);
		const targetH = Math.round(h * dpr);
		if (canvas.width !== targetW || canvas.height !== targetH) {
			canvas.width = targetW;
			canvas.height = targetH;
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		const isDesktop = w >= 1024;
		const cx = w * 0.5;
		const cy = isDesktop ? h * 0.5 : h * 0.73;
		const scale = isDesktop ? Math.min(w, h) * 0.215 : Math.min(w, h) * 0.155;
		const camDist = 7.6;
		const anchorX = isDesktop ? 1.85 : 0.0;
		const anchorY = 0.0;

		const frame: DuneFrame = {
			ctx,
			w,
			h,
			isDesktop,
			cx,
			cy,
			scale,
			anchorX,
			anchorY,
			effRx: state.rotX,
			effRy: state.rotY,
			splitGap: 0.04 + state.shieldStrength * 0.09,
			state,
			palette,
			drawList: [],
			sunDir: vNorm([-0.74, -0.52, 0.42]),
			project: createProjector(cx, cy, scale, camDist),
		};

		drawSkyPass(frame);
		drawTerrainPass(frame);
		drawGatePass(frame);
		drawMonolithPass(frame, pylons.pylonFaces, kintsugiSeams, stoneInscriptions);
		drawStairsPass(frame);
		drawScribePass(frame);
		drawSandPass(frame, sand);

		frame.drawList.sort((a, b) => a.z - b.z);
		for (const item of frame.drawList) {
			item.draw(ctx);
		}
	}

	function scheduleNextFrame(): void {
		if (rafId) return;
		if (!isVisible) return;
		if (!reducedMotion || state.pulse > 0 || state.shieldStrength > 0.01) {
			rafId = requestAnimationFrame(tick);
		}
	}

	function tick(ts: number): void {
		rafId = 0;
		const dt = Math.min(0.05, (ts - lastTs) / 1000);
		lastTs = ts;

		if (!reducedMotion) {
			state.time += dt;
			updateSand(sand, state, dt, syncTelemetry);
			advanceCameraMotion(state);
		} else if (state.pulse > 0 || state.shieldStrength > 0.01) {
			updateSand(sand, state, dt, syncTelemetry);
		}

		renderFrame();
		scheduleNextFrame();
	}

	const triggerSanctuaryToggle = () => {
		toggleSanctuary(state);
		syncTelemetry();
		if (reducedMotion) {
			state.shieldStrength = state.shieldLocked ? 1 : 0;
			state.pulse = 0;
			renderFrame();
		} else {
			scheduleNextFrame();
		}
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			triggerSanctuaryToggle();
		}
	};

	const onResize = () => {
		renderFrame();
	};

	const onMotionChange = (e: MediaQueryListEvent) => {
		reducedMotion = e.matches;
		if (reducedMotion && rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
		renderFrame();
		scheduleNextFrame();
	};

	const themeObserver = new MutationObserver(() => {
		palette = readPalette();
		renderFrame();
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class'],
	});

	let intersectionObserver: IntersectionObserver | null = null;
	if ('IntersectionObserver' in window) {
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				isVisible = entries.some((entry) => entry.isIntersecting);
				if (isVisible) {
					lastTs = performance.now();
					scheduleNextFrame();
				} else if (rafId) {
					cancelAnimationFrame(rafId);
					rafId = 0;
				}
			},
			{ threshold: 0.01 },
		);
		intersectionObserver.observe(stage);
	}

	holdHelmBtn?.addEventListener('click', triggerSanctuaryToggle);
	stage.addEventListener('click', triggerSanctuaryToggle);
	stage.addEventListener('keydown', onKeyDown);
	window.addEventListener('resize', onResize);
	motionQuery.addEventListener('change', onMotionChange);

	syncTelemetry();
	renderFrame();
	if (!reducedMotion) {
		lastTs = performance.now();
		scheduleNextFrame();
	}

	return () => {
		if (rafId) cancelAnimationFrame(rafId);
		themeObserver.disconnect();
		intersectionObserver?.disconnect();
		holdHelmBtn?.removeEventListener('click', triggerSanctuaryToggle);
		stage.removeEventListener('click', triggerSanctuaryToggle);
		stage.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('resize', onResize);
		motionQuery.removeEventListener('change', onMotionChange);
	};
}
