import {
	buildActorDrawables,
	drawActorEmotes,
	drawDroneShadow,
	drawFsmDebugOverlay,
	drawParticles,
} from './workshopActors';
import { SPEAKER_LABELS } from './workshopDialogue';
import {
	commandArtisanTo,
	createWorkshopWorld,
	getWorkshopCaption,
	pokeActor,
	stepWorkshop,
	triggerNextFailure,
	triggerVisitorGreeting,
} from './workshopFsm';
import {
	clientToLogical,
	getStageTransform,
	hitTestActor,
	hitTestStation,
	projectIso,
	readWorkshopPalette,
} from './workshopIso';
import { sortIsoDrawables } from './workshopPhysics';
import { buildStationDrawables, drawRoomShell } from './workshopRoom';
import type { SpeakerId, WorkshopPalette, WorkshopWorld } from './workshopTypes';

function getSpeakerAnchor(world: WorkshopWorld, speaker: SpeakerId): { x: number; y: number; z: number } {
	if (speaker === 'artisan') return { x: world.artisan.x, y: world.artisan.y, z: 3.95 + world.artisan.jumpZ };
	if (speaker === 'drone') return { x: world.drone.x, y: world.drone.y, z: world.drone.z + 0.75 };
	return { x: world.carrier.x, y: world.carrier.y, z: 1.35 + world.carrier.jumpZ };
}

export function initWorkshopScene(root: ParentNode = document): () => void {
	const stageNode = root.querySelector<HTMLElement>('#workshopStage');
	const canvasNode = root.querySelector<HTMLCanvasElement>('#workshopCanvas');
	if (!stageNode || !canvasNode || stageNode.dataset.workshopBound === 'true') {
		return () => {};
	}
	const stageEl: HTMLElement = stageNode;
	const canvasEl: HTMLCanvasElement = canvasNode;
	stageEl.dataset.workshopBound = 'true';

	const bubbleEl = root.querySelector<HTMLElement>('#workshopDialogue');
	const speakerEl = root.querySelector<HTMLElement>('#workshopSpeaker');
	const lineEl = root.querySelector<HTMLElement>('#workshopLine');
	const stationBtn = root.querySelector<HTMLButtonElement>('#workshopStationBtn');
	const failBtn = root.querySelector<HTMLButtonElement>('#workshopFailBtn');
	const fsmBtn = root.querySelector<HTMLButtonElement>('#workshopFsmBtn');
	const captionEl = root.querySelector<HTMLElement>('#workshopCaptionState');

	const isAdmin = stageEl.dataset.visitor === 'admin';
	const world = createWorkshopWorld({ visitorRole: isAdmin ? 'admin' : 'guest', seed: 1337 });

	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	let reducedMotion = motionQuery.matches;
	let palette: WorkshopPalette = readWorkshopPalette();
	let rafId = 0;
	let isVisible = false;
	let lastTs = performance.now();
	let lastBubbleKey = '';
	let lastCaption = '';
	let lastStation: 'pc' | 'bench' | null = null;

	function syncHud(): void {
		const caption = getWorkshopCaption(world);
		if (captionEl && caption !== lastCaption) {
			lastCaption = caption;
			captionEl.textContent = caption;
		}
		if (stationBtn && lastStation !== world.artisan.activeStation) {
			lastStation = world.artisan.activeStation;
			const atBench = lastStation === 'bench';
			stationBtn.textContent = atBench ? 'Ir a la PC' : 'Ir al banco';
			stationBtn.setAttribute('aria-pressed', String(atBench));
		}
		if (failBtn) {
			const failing = world.event.kind !== 'none' && world.event.kind !== 'celebration';
			failBtn.setAttribute('aria-pressed', String(failing));
		}
		if (bubbleEl && speakerEl && lineEl) {
			const active = world.dialogue.active;
			if (!active) {
				if (lastBubbleKey !== '') {
					lastBubbleKey = '';
					bubbleEl.hidden = true;
				}
			} else {
				const mood = active.mood ?? 'normal';
				const key = `${active.speaker}:${active.text}:${mood}`;
				if (key !== lastBubbleKey) {
					lastBubbleKey = key;
					bubbleEl.dataset.mood = mood;
					speakerEl.textContent = SPEAKER_LABELS[active.speaker];
					lineEl.textContent = active.text;
					bubbleEl.hidden = false;
				}
				const w = stageEl.clientWidth || 400;
				const h = stageEl.clientHeight || 500;
				const { scale, offsetX, offsetY } = getStageTransform(w, h);
				const anchor = getSpeakerAnchor(world, active.speaker);
				const projected = projectIso(anchor.x, anchor.y, anchor.z);
				const leftPct = Math.max(18, Math.min(82, ((offsetX + projected.x * scale) / w) * 100));
				const topPct = Math.max(12, Math.min(76, ((offsetY + projected.y * scale) / h) * 100));
				bubbleEl.style.left = `${leftPct.toFixed(1)}%`;
				bubbleEl.style.top = `${topPct.toFixed(1)}%`;
			}
		}
	}

	function renderFrame(): void {
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = stageEl.clientWidth;
		const h = stageEl.clientHeight;
		if (w === 0 || h === 0) return;

		const targetW = Math.round(w * dpr);
		const targetH = Math.round(h * dpr);
		if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
			canvasEl.width = targetW;
			canvasEl.height = targetH;
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		const { scale, offsetX, offsetY } = getStageTransform(w, h);
		ctx.save();
		ctx.translate(offsetX, offsetY);
		ctx.scale(scale, scale);

		drawRoomShell(ctx, world, palette);
		drawDroneShadow(ctx, world);
		const sorted = sortIsoDrawables([...buildStationDrawables(world, palette), ...buildActorDrawables(world, palette)]);
		for (const item of sorted) item.draw(ctx);
		drawParticles(ctx, world, palette);
		drawActorEmotes(ctx, world, palette);
		drawFsmDebugOverlay(ctx, world, palette);

		ctx.restore();
		syncHud();
	}

	function scheduleFrame(): void {
		if (rafId || !isVisible || reducedMotion) return;
		rafId = requestAnimationFrame(tick);
	}

	function tick(ts: number): void {
		rafId = 0;
		const dt = Math.min(0.05, (ts - lastTs) / 1000);
		lastTs = ts;
		stepWorkshop(world, dt);
		renderFrame();
		scheduleFrame();
	}

	const onStationToggle = () => {
		const next = world.artisan.activeStation === 'pc' ? 'bench' : 'pc';
		commandArtisanTo(world, next);
		if (reducedMotion) {
			for (let i = 0; i < 120; i++) stepWorkshop(world, 0.04);
		}
		renderFrame();
	};

	const onFailTrigger = () => {
		triggerNextFailure(world);
		renderFrame();
	};

	const onFsmToggle = () => {
		world.debugFsm = !world.debugFsm;
		if (fsmBtn) {
			fsmBtn.setAttribute('aria-pressed', String(world.debugFsm));
			fsmBtn.textContent = world.debugFsm ? 'FSM · ON' : 'FSM';
		}
		renderFrame();
	};

	const onStageClick = (e: MouseEvent) => {
		if ((e.target as Element | null)?.closest('button')) return;
		const pt = clientToLogical(e.clientX, e.clientY, stageEl.getBoundingClientRect());
		const poked = hitTestActor(world, pt.x, pt.y);
		if (poked) {
			pokeActor(world, poked);
			renderFrame();
			return;
		}
		const hit = hitTestStation(pt.x, pt.y);
		if (!hit) return;
		commandArtisanTo(world, hit);
		if (reducedMotion) {
			for (let i = 0; i < 120; i++) stepWorkshop(world, 0.04);
		}
		renderFrame();
	};

	const onPointerMove = (e: PointerEvent) => {
		if (e.pointerType === 'touch') return;
		const pt = clientToLogical(e.clientX, e.clientY, stageEl.getBoundingClientRect());
		const hit = hitTestActor(world, pt.x, pt.y) || hitTestStation(pt.x, pt.y);
		stageEl.style.cursor = hit ? 'pointer' : 'default';
	};

	const onResize = () => renderFrame();
	const onMotionChange = (e: MediaQueryListEvent) => {
		reducedMotion = e.matches;
		if (reducedMotion && rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
		renderFrame();
		scheduleFrame();
	};

	const themeObserver = new MutationObserver(() => {
		palette = readWorkshopPalette();
		renderFrame();
	});
	themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

	let observer: IntersectionObserver | null = null;
	if ('IntersectionObserver' in window) {
		observer = new IntersectionObserver(
			(entries) => {
				isVisible = entries.some((entry) => entry.isIntersecting);
				if (isVisible) {
					if (!world.blackboard.greeted) triggerVisitorGreeting(world);
					lastTs = performance.now();
					renderFrame();
					scheduleFrame();
				} else if (rafId) {
					cancelAnimationFrame(rafId);
					rafId = 0;
				}
			},
			{ threshold: 0.2 },
		);
		observer.observe(stageEl);
	} else {
		isVisible = true;
		triggerVisitorGreeting(world);
		renderFrame();
		scheduleFrame();
	}

	stationBtn?.addEventListener('click', onStationToggle);
	failBtn?.addEventListener('click', onFailTrigger);
	fsmBtn?.addEventListener('click', onFsmToggle);
	stageEl.addEventListener('click', onStageClick);
	stageEl.addEventListener('pointermove', onPointerMove);
	window.addEventListener('resize', onResize);
	motionQuery.addEventListener('change', onMotionChange);

	renderFrame();

	return () => {
		if (rafId) cancelAnimationFrame(rafId);
		themeObserver.disconnect();
		observer?.disconnect();
		stationBtn?.removeEventListener('click', onStationToggle);
		failBtn?.removeEventListener('click', onFailTrigger);
		fsmBtn?.removeEventListener('click', onFsmToggle);
		stageEl.removeEventListener('click', onStageClick);
		stageEl.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('resize', onResize);
		motionQuery.removeEventListener('change', onMotionChange);
	};
}
