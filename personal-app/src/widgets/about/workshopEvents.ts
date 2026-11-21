import { triggerEventDialogue } from './workshopDialogue';
import { findFloorPath, ROOM_BOUNDS, WORKSHOP_OBSTACLES } from './workshopPhysics';
import type { ParticleColor, Vec3, WorkshopParticle, WorkshopStation, WorkshopWorld } from './workshopTypes';

export const PARTS_PICK = { x: 2.0, y: 7.45 };
export const BENCH_DROP = { x: 5.38, y: 5.55 };
export const PC_DROP = { x: 5.85, y: 3.45 };
export const BENCH_SEAM = { x: 3.42, y: 5.45, z: 2.31 };
export const PC_SCREEN = { x: 7.1, y: 2.2, z: 3.2 };
const PC_TOWER = { x: 7.9, y: 2.2, z: 1.8 };
const MAX_PARTICLES = 90;
const FAILURE_CYCLE = ['short_circuit', 'build_fail', 'drone_glitch'] as const;

export const SEAM_PATH: readonly Vec3[] = [
	{ x: 2.92, y: 5.2, z: 2.31 },
	{ x: 3.25, y: 5.2, z: 2.31 },
	{ x: 3.45, y: 5.55, z: 2.31 },
	{ x: 3.88, y: 5.55, z: 2.31 },
];

export function getSeamPoint(progress: number): Vec3 {
	const clamped = Math.max(0, Math.min(1, progress));
	const scaled = clamped * (SEAM_PATH.length - 1);
	const idx = Math.min(SEAM_PATH.length - 2, Math.floor(scaled));
	const frac = scaled - idx;
	const a = SEAM_PATH[idx];
	const b = SEAM_PATH[idx + 1];
	return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac, z: a.z + (b.z - a.z) * frac };
}

export function getSurfaceHeightAt(x: number, y: number): number {
	for (const obs of WORKSHOP_OBSTACLES) {
		if (x >= obs.minX && x <= obs.maxX && y >= obs.minY && y <= obs.maxY) return obs.surfaceZ;
	}
	return 0;
}

export function stepParticlesPhysics(particles: WorkshopParticle[], dt: number): WorkshopParticle[] {
	const kept: WorkshopParticle[] = [];
	for (const p of particles) {
		p.life += dt;
		if (p.life >= p.maxLife) continue;

		if (p.kind === 'smoke') {
			p.vz = Math.min(1.35, p.vz + 0.85 * dt);
			p.vx *= 0.94;
			p.vy *= 0.94;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;
		} else if (p.kind === 'confetti') {
			p.vz = Math.max(-1.45, p.vz - 3.4 * dt);
			p.vx *= 0.93;
			p.vy *= 0.93;
			p.x += (p.vx + Math.sin(p.life * 8 + p.x) * 0.25) * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;
			const floorZ = getSurfaceHeightAt(p.x, p.y);
			if (p.z <= floorZ) {
				p.z = floorZ;
				p.vx = 0;
				p.vy = 0;
				p.vz = 0;
			}
		} else {
			p.vz -= 14 * dt;
			const nextX = p.x + p.vx * dt;
			const nextY = p.y + p.vy * dt;
			p.z += p.vz * dt;
			if (nextX <= ROOM_BOUNDS.minX || nextX >= ROOM_BOUNDS.maxX) p.vx *= -0.5;
			else p.x = nextX;
			if (nextY <= ROOM_BOUNDS.minY || nextY >= ROOM_BOUNDS.maxY) p.vy *= -0.5;
			else p.y = nextY;
			const floorZ = getSurfaceHeightAt(p.x, p.y);
			if (p.z <= floorZ && p.vz < 0) {
				p.z = floorZ;
				p.vz *= -0.35;
				p.vx *= 0.65;
				p.vy *= 0.65;
			}
		}
		kept.push(p);
	}
	return kept;
}

function pushParticle(world: WorkshopWorld, p: WorkshopParticle): void {
	if (world.sparks.length >= MAX_PARTICLES) world.sparks.shift();
	world.sparks.push(p);
}

export function spawnWeldSpark(
	world: WorkshopWorld,
	x: number,
	y: number,
	z: number,
	nextRand: () => number,
	burstScale = 1,
	color: ParticleColor = 'aka',
): void {
	const angle = nextRand() * Math.PI * 2;
	const speed = (1.3 + nextRand() * 2.3) * burstScale;
	pushParticle(world, {
		x: x + (nextRand() - 0.5) * 0.22,
		y: y + (nextRand() - 0.5) * 0.22,
		z: z + 0.08,
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		vz: (2.0 + nextRand() * 2.8) * burstScale,
		life: 0,
		maxLife: 0.45 + nextRand() * 0.35,
		kind: 'spark',
		color,
	});
}

export function spawnSmokePuff(world: WorkshopWorld, x: number, y: number, z: number, nextRand: () => number): void {
	pushParticle(world, {
		x: x + (nextRand() - 0.5) * 0.25,
		y: y + (nextRand() - 0.5) * 0.25,
		z,
		vx: (nextRand() - 0.5) * 0.35,
		vy: (nextRand() - 0.5) * 0.35,
		vz: 0.65 + nextRand() * 0.45,
		life: 0,
		maxLife: 1.1 + nextRand() * 0.6,
		kind: 'smoke',
		color: 'smoke',
		size: 3.2 + nextRand() * 2.5,
	});
}

export function spawnConfettiBurst(
	world: WorkshopWorld,
	x: number,
	y: number,
	z: number,
	count: number,
	nextRand: () => number,
): void {
	const colors: ParticleColor[] = ['gold', 'ok', 'aka'];
	for (let i = 0; i < count; i++) {
		const angle = nextRand() * Math.PI * 2;
		const speed = 1.2 + nextRand() * 2.2;
		pushParticle(world, {
			x,
			y,
			z,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			vz: 2.2 + nextRand() * 2.1,
			life: 0,
			maxLife: 1.4 + nextRand() * 0.9,
			kind: 'confetti',
			color: colors[i % colors.length],
			size: 2.4 + nextRand() * 1.4,
		});
	}
}

export function applyWorkshopEvent(
	world: WorkshopWorld,
	kind: 'short_circuit' | 'build_fail' | 'drone_glitch' | 'celebration',
	nextRand: () => number,
	navigateArtisan: (station: WorkshopStation) => void,
): void {
	if (kind === 'celebration') {
		world.event = { kind: 'celebration', phase: 'celebrating', elapsed: 0, duration: 3.2, cooldown: 11 + nextRand() * 6, source: 'room' };
		spawnConfettiBurst(world, world.artisan.x, world.artisan.y, 3.6, 22, nextRand);
		if (world.artisan.state !== 'WALKING_TO_BENCH' && world.artisan.state !== 'WALKING_TO_PC') {
			Object.assign(world.artisan, { state: 'CELEBRATING', stateTime: 0, duration: 3.2, emote: 'ok' });
		} else {
			world.artisan.emote = 'ok';
		}
		Object.assign(world.drone, { state: 'CELEBRATING', stateTime: 0, duration: 3.2, emote: 'ok', weldingActive: false });
		if (world.carrier.state === 'IDLE' || world.carrier.state === 'DELIVERING' || world.carrier.state === 'PANICKING') {
			Object.assign(world.carrier, { state: 'CELEBRATING', stateTime: 0, duration: 3.0, emote: 'ok', wobble: 0 });
		}
		triggerEventDialogue(world, 'celebration', nextRand);
		return;
	}

	const source = kind === 'short_circuit' ? 'bench' : kind === 'build_fail' ? 'pc' : 'room';
	world.event = { kind, phase: 'panic', elapsed: 0, duration: 2.0, cooldown: 12 + nextRand() * 6, source };
	Object.assign(world.artisan, { state: 'PANICKING', stateTime: 0, duration: 2.0, emote: 'panic', arcActive: false, jumpZ: 0 });
	Object.assign(world.carrier, { state: 'PANICKING', stateTime: 0, duration: 2.0, emote: 'panic', wobble: 0 });

	if (kind === 'short_circuit') {
		for (let i = 0; i < 10; i++) spawnWeldSpark(world, BENCH_SEAM.x, BENCH_SEAM.y, BENCH_SEAM.z, nextRand, 1.3);
		for (let i = 0; i < 5; i++) spawnSmokePuff(world, BENCH_SEAM.x, BENCH_SEAM.y, BENCH_SEAM.z + 0.15, nextRand);
		Object.assign(world.drone, { state: 'PANICKING', stateTime: 0, duration: 2.0, emote: 'panic', weldingActive: false });
		triggerEventDialogue(world, 'short_circuit', nextRand);
	} else if (kind === 'build_fail') {
		for (let i = 0; i < 6; i++) spawnWeldSpark(world, PC_TOWER.x, PC_TOWER.y, PC_TOWER.z, nextRand, 1.0);
		for (let i = 0; i < 4; i++) spawnSmokePuff(world, PC_TOWER.x, PC_TOWER.y, PC_TOWER.z, nextRand);
		Object.assign(world.drone, { state: 'PANICKING', stateTime: 0, duration: 2.0, emote: 'panic', weldingActive: false });
		triggerEventDialogue(world, 'build_fail', nextRand);
	} else {
		const d = world.drone;
		for (let i = 0; i < 10; i++) spawnWeldSpark(world, d.x, d.y, d.z, nextRand, 1.1, 'arc');
		for (let i = 0; i < 5; i++) spawnSmokePuff(world, d.x, d.y, d.z, nextRand);
		Object.assign(d, { state: 'MALFUNCTION', stateTime: 0, duration: 2.0, emote: 'panic', weldingActive: false });
		triggerEventDialogue(world, 'drone_glitch', nextRand);
	}
	void navigateArtisan;
}

export function cycleNextFailure(
	world: WorkshopWorld,
	nextRand: () => number,
	navigateArtisan: (station: WorkshopStation) => void,
): void {
	const kind = FAILURE_CYCLE[world.blackboard.nextFailureIndex % FAILURE_CYCLE.length];
	world.blackboard.nextFailureIndex = (world.blackboard.nextFailureIndex + 1) % FAILURE_CYCLE.length;
	applyWorkshopEvent(world, kind, nextRand, navigateArtisan);
}

function transitionPanicToFixing(
	world: WorkshopWorld,
	nextRand: () => number,
	navigateArtisan: (station: WorkshopStation) => void,
): void {
	const ev = world.event;
	ev.phase = 'fixing';
	ev.elapsed = 0;
	ev.duration = 2.8;

	const targetStation: WorkshopStation = ev.kind === 'short_circuit' ? 'bench' : 'pc';
	if (world.artisan.activeStation === targetStation) {
		Object.assign(world.artisan, { state: 'TROUBLESHOOTING', stateTime: 0, duration: 2.8, emote: 'alert', jumpZ: 0 });
	} else {
		navigateArtisan(targetStation);
		world.artisan.emote = 'alert';
	}

	const [dx, dy, dz] =
		ev.kind === 'short_circuit'
			? [3.7, 5.1, 4.45]
			: ev.kind === 'build_fail'
				? [7.3, 3.1, 4.85]
				: [5.4, 4.6, 4.6];
	Object.assign(world.drone, {
		state: 'ALERT',
		stateTime: 0,
		duration: 2.8,
		emote: 'alert',
		targetX: dx,
		targetY: dy,
		targetZ: dz,
	});

	// Dispatch spider-bot on an emergency supply run while Santi troubleshoots.
	const c = world.carrier;
	const drop = ev.kind === 'short_circuit' ? BENCH_DROP : PC_DROP;
	Object.assign(c, {
		wobble: 0,
		carrying: ev.kind === 'short_circuit' ? 'extinguisher' : 'coffee',
		state: ev.kind === 'short_circuit' ? 'CARRYING_TO_BENCH' : 'CARRYING_TO_PC',
		path: findFloorPath(c.x, c.y, drop.x, drop.y, c.radius),
		stateTime: 0,
		emote: 'alert',
	});
	c.targetX = c.path[0]?.x ?? drop.x;
	c.targetY = c.path[0]?.y ?? drop.y;
	triggerEventDialogue(world, 'emergency_delivery', nextRand);
}

export function stepWorkshopEvent(
	world: WorkshopWorld,
	dt: number,
	nextRand: () => number,
	navigateArtisan: (station: WorkshopStation) => void,
): void {
	const ev = world.event;
	if (ev.kind === 'none') {
		ev.cooldown -= dt;
		if (ev.cooldown <= 0 && world.artisan.state !== 'GREETING') {
			const r = nextRand();
			if (r < 0.25) applyWorkshopEvent(world, 'celebration', nextRand, navigateArtisan);
			else if (world.artisan.state === 'CODING') {
				applyWorkshopEvent(world, r < 0.65 ? 'build_fail' : 'drone_glitch', nextRand, navigateArtisan);
			} else if (world.artisan.state === 'SOLDERING' || world.artisan.state === 'ELECTRONICS_TEST') {
				applyWorkshopEvent(world, r < 0.65 ? 'short_circuit' : 'drone_glitch', nextRand, navigateArtisan);
			} else {
				ev.cooldown = 3.0;
			}
		}
		return;
	}

	ev.elapsed += dt;
	const rate = ev.phase === 'panic' ? 9 : 4;
	if (ev.kind === 'short_circuit' && nextRand() < dt * rate) {
		spawnSmokePuff(world, BENCH_SEAM.x, BENCH_SEAM.y, BENCH_SEAM.z + 0.15, nextRand);
		if (nextRand() < 0.5) spawnWeldSpark(world, BENCH_SEAM.x, BENCH_SEAM.y, BENCH_SEAM.z, nextRand, 0.9);
	} else if (ev.kind === 'drone_glitch' && nextRand() < dt * rate) {
		spawnSmokePuff(world, world.drone.x, world.drone.y, world.drone.z, nextRand);
		if (nextRand() < 0.55) spawnWeldSpark(world, world.drone.x, world.drone.y, world.drone.z, nextRand, 0.9, 'arc');
	} else if (ev.kind === 'build_fail' && nextRand() < dt * (rate * 0.7)) {
		spawnSmokePuff(world, PC_TOWER.x, PC_TOWER.y, PC_TOWER.z, nextRand);
	} else if (ev.kind === 'celebration' && nextRand() < dt * 6) {
		spawnConfettiBurst(world, world.artisan.x, world.artisan.y, 3.6, 2, nextRand);
	}

	if (ev.elapsed >= ev.duration) {
		if (ev.phase === 'panic') {
			transitionPanicToFixing(world, nextRand, navigateArtisan);
			return;
		}
		if (ev.phase === 'fixing') {
			applyWorkshopEvent(world, 'celebration', nextRand, navigateArtisan);
			return;
		}
		world.event = { kind: 'none', phase: 'none', elapsed: 0, duration: 0, cooldown: 11 + nextRand() * 6, source: 'room' };
		world.artisan.emote = 'none';
		world.artisan.jumpZ = 0;
		world.drone.emote = 'none';
		world.carrier.emote = 'none';
		world.carrier.jumpZ = 0;
	}
}
