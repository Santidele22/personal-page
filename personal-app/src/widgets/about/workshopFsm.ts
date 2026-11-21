import { DRONE_GREET, followFloorPath, stepCarrier, stepDrone } from './workshopBotsFsm';
import {
	createEmptyDialogue,
	getGreetingDialogue,
	JOKE_EXCHANGES,
	pickExchange,
	startDialogue,
	stepDialogue,
} from './workshopDialogue';
import {
	applyWorkshopEvent,
	BENCH_DROP,
	cycleNextFailure,
	getSeamPoint,
	PARTS_PICK,
	PC_DROP,
	SEAM_PATH,
	spawnSmokePuff,
	spawnWeldSpark,
	stepParticlesPhysics,
	stepWorkshopEvent,
} from './workshopEvents';
import {
	ARTISAN_RADIUS,
	CARRIER_RADIUS,
	DRONE_RADIUS,
	findFloorPath,
	resolveActorSeparation,
	resolveFloorCollisions,
} from './workshopPhysics';
import type {
	ArtisanActor,
	BaseActor,
	CarrierActor,
	DroneActor,
	VisitorRole,
	WorkshopStation,
	WorkshopWorld,
} from './workshopTypes';

export const STAND_PC = { x: 7.05, y: 3.35 };
export const STAND_BENCH = { x: 3.45, y: 6.80 };
export { BENCH_DROP, getSeamPoint, PARTS_PICK, PC_DROP, SEAM_PATH };

export function nextRand(world: WorkshopWorld): number {
	world.seed = (Math.imul(1664525, world.seed) + 1013904223) >>> 0;
	return world.seed / 4294967296;
}

function makeBase<S extends string>(
	state: S,
	duration: number,
	x: number,
	y: number,
	z: number,
	facing: number,
	radius: number,
): BaseActor<S> {
	return {
		state,
		stateTime: 0,
		duration,
		x,
		y,
		z,
		targetX: x,
		targetY: y,
		targetZ: z,
		facing,
		walkPhase: 0,
		radius,
		jumpZ: 0,
		emote: 'none',
	};
}

export function createWorkshopWorld(options: { visitorRole?: VisitorRole; seed?: number } = {}): WorkshopWorld {
	const visitorRole = options.visitorRole ?? 'guest';
	const seed = options.seed ?? 1337;
	const artisan: ArtisanActor = {
		...makeBase('CODING', 7.5, STAND_PC.x, STAND_PC.y, 0, -1.5, ARTISAN_RADIUS),
		activeStation: 'pc',
		path: [],
		carrying: 'none',
		maskProgress: 0,
		solderProgress: 0.15,
		arcActive: false,
		solderSparkAccum: 0,
	};
	const drone: DroneActor = {
		...makeBase('PATROL', 4.5, 4.6, 4.2, 5.2, 0.6, DRONE_RADIUS),
		carrying: 'none',
		orbitAngle: 0.4,
		hoverPhase: 0,
		weldProgress: 0.25,
		weldHeat: 0,
		sparkAccum: 0,
		weldingActive: false,
	};
	const carrier: CarrierActor = {
		...makeBase('IDLE', 1.4, PARTS_PICK.x, PARTS_PICK.y, 0, 0.4, CARRIER_RADIUS),
		carrying: 'none',
		nextDestination: 'bench',
		path: [],
		wobble: 0,
	};

	return {
		time: 0,
		seed,
		artisan,
		drone,
		carrier,
		sparks: [],
		dialogue: createEmptyDialogue(),
		dialogueCooldown: 1.8,
		lastDialogueKey: '',
		debugFsm: false,
		event: { kind: 'none', phase: 'none', elapsed: 0, duration: 0, cooldown: 12.5, source: 'room' },
		blackboard: {
			greeted: false,
			visitorRole,
			partDeliveredAtBench: false,
			benchNeedsWeld: false,
			kintsugiSeam: 0.25,
			codeLinesCompiled: 0,
			coffeeTimer: 0,
			nextFailureIndex: 0,
		},
	};
}

export function triggerVisitorGreeting(world: WorkshopWorld): void {
	if (world.blackboard.greeted) return;
	world.blackboard.greeted = true;
	Object.assign(world.drone, {
		state: 'GREET_VISITOR',
		stateTime: 0,
		duration: 4.4,
		targetX: DRONE_GREET.x,
		targetY: DRONE_GREET.y,
		targetZ: DRONE_GREET.z,
	});
	if (world.artisan.state !== 'WALKING_TO_BENCH' && world.artisan.state !== 'WALKING_TO_PC') {
		Object.assign(world.artisan, { state: 'GREETING', stateTime: 0, duration: 3.6, facing: 0.8 });
	}
	startDialogue(world, getGreetingDialogue(world.blackboard.visitorRole));
}

export function commandArtisanTo(world: WorkshopWorld, station: WorkshopStation): void {
	const a = world.artisan;
	const dest = station === 'bench' ? STAND_BENCH : STAND_PC;
	a.activeStation = station;
	a.stateTime = 0;
	a.jumpZ = 0;
	a.path = findFloorPath(a.x, a.y, dest.x, dest.y, a.radius);
	a.targetX = a.path[0]?.x ?? dest.x;
	a.targetY = a.path[0]?.y ?? dest.y;
	a.state = station === 'bench' ? 'WALKING_TO_BENCH' : 'WALKING_TO_PC';
}

export function triggerWorkshopEvent(
	world: WorkshopWorld,
	kind: 'short_circuit' | 'build_fail' | 'drone_glitch' | 'celebration',
): void {
	applyWorkshopEvent(world, kind, () => nextRand(world), (station) => commandArtisanTo(world, station));
}

export function triggerNextFailure(world: WorkshopWorld): void {
	cycleNextFailure(world, () => nextRand(world), (station) => commandArtisanTo(world, station));
}

export function pokeActor(world: WorkshopWorld, actor: 'artisan' | 'drone' | 'carrier'): void {
	if (world.artisan.state === 'GREETING' || world.drone.state === 'GREET_VISITOR') return;
	const matches = JOKE_EXCHANGES.filter((lines) => lines[0]?.speaker === actor);
	const pool = matches.length > 0 ? matches : JOKE_EXCHANGES;
	const picked = pickExchange(pool, `poke-${actor}`, () => nextRand(world), world.lastDialogueKey);
	world.lastDialogueKey = picked.key;
	startDialogue(world, picked.lines);
	if (actor === 'artisan') world.artisan.emote = 'laugh';
	else if (actor === 'drone') world.drone.emote = 'laugh';
	else world.carrier.emote = 'laugh';
}

function stepArtisan(world: WorkshopWorld, dt: number): void {
	const a = world.artisan;
	a.stateTime += dt;
	a.arcActive = false;

	const atBench = a.activeStation === 'bench' && a.state !== 'WALKING_TO_BENCH' && a.state !== 'WALKING_TO_PC';
	const fixingShort = world.event.kind === 'short_circuit' && world.event.phase === 'fixing';
	const needsMask = a.state === 'SOLDERING' || (atBench && (world.drone.state === 'WELDING_BENCH' || fixingShort));
	a.maskProgress = needsMask ? Math.min(1, a.maskProgress + dt * 2.6) : Math.max(0, a.maskProgress - dt * 2.8);

	if (a.state === 'PANICKING') {
		a.jumpZ = Math.abs(Math.sin(a.stateTime * 16)) * 0.14;
		a.facing = Math.sin(a.stateTime * 10) * 0.8;
		resolveFloorCollisions(a, a.radius);
		if (a.stateTime >= a.duration) {
			a.jumpZ = 0;
			a.emote = 'none';
			a.state = a.activeStation === 'pc' ? 'CODING' : 'ELECTRONICS_TEST';
			a.stateTime = 0;
			a.duration = 6.5;
		}
		return;
	}
	if (a.state === 'GREETING') {
		if (a.stateTime >= a.duration) {
			a.state = a.activeStation === 'pc' ? 'CODING' : 'ELECTRONICS_TEST';
			a.stateTime = 0;
			a.duration = 6.5 + nextRand(world) * 3.0;
		}
		return;
	}
	if (a.state === 'CELEBRATING') {
		a.jumpZ = Math.abs(Math.sin(a.stateTime * 9)) * 0.24;
		if (a.stateTime >= a.duration) {
			a.jumpZ = 0;
			a.emote = 'none';
			a.state = a.activeStation === 'pc' ? 'CODING' : 'ELECTRONICS_TEST';
			a.stateTime = 0;
			a.duration = 6.5 + nextRand(world) * 3.0;
		}
		return;
	}
	if (a.state === 'TROUBLESHOOTING') {
		a.facing = a.activeStation === 'pc' ? -1.4 : -0.95;
		if (a.stateTime >= a.duration) {
			a.emote = 'none';
			a.state = a.activeStation === 'pc' ? 'CODING' : 'ELECTRONICS_TEST';
			a.stateTime = 0;
			a.duration = 6.5 + nextRand(world) * 3.0;
		}
		return;
	}
	if (a.state === 'CODING') {
		a.facing = -1.4;
		if (Math.floor((a.stateTime - dt) * 2) < Math.floor(a.stateTime * 2)) world.blackboard.codeLinesCompiled += 1;
		if (a.stateTime >= a.duration) commandArtisanTo(world, 'bench');
		return;
	}
	if (a.state === 'WALKING_TO_BENCH' || a.state === 'WALKING_TO_PC') {
		a.walkPhase += dt * (world.event.phase === 'fixing' ? 12 : 9.5);
		if (!followFloorPath(a, world.event.phase === 'fixing' ? 2.9 : 2.4, dt)) return;
		a.stateTime = 0;
		a.walkPhase = 0;
		const arrivedBench = a.state === 'WALKING_TO_BENCH';
		a.activeStation = arrivedBench ? 'bench' : 'pc';
		if (
			(world.event.kind === 'short_circuit' && arrivedBench) ||
			((world.event.kind === 'build_fail' || world.event.kind === 'drone_glitch') && !arrivedBench)
		) {
			a.state = 'TROUBLESHOOTING';
			a.emote = 'alert';
			a.duration = Math.max(1.2, world.event.duration - world.event.elapsed);
			return;
		}
		if (arrivedBench) {
			a.state = nextRand(world) < 0.55 ? 'SOLDERING' : 'ELECTRONICS_TEST';
			a.duration = 6.5 + nextRand(world) * 2.5;
			world.blackboard.benchNeedsWeld = true;
		} else {
			a.state = 'CODING';
			a.duration = 7.0 + nextRand(world) * 3.0;
		}
		return;
	}
	if (a.state === 'SOLDERING' || a.state === 'ELECTRONICS_TEST') {
		a.facing = -0.95;
		if (a.state === 'SOLDERING' && a.maskProgress >= 0.85) {
			a.arcActive = true;
			a.solderProgress = (a.solderProgress + dt * 0.2) % 1;
			world.blackboard.kintsugiSeam = Math.min(1, world.blackboard.kintsugiSeam + dt * 0.08);
			const pt = getSeamPoint(a.solderProgress);
			a.solderSparkAccum += dt * 22;
			while (a.solderSparkAccum >= 1) {
				a.solderSparkAccum -= 1;
				spawnWeldSpark(world, pt.x, pt.y, pt.z, () => nextRand(world), 1.05, 'arc');
			}
			if (nextRand(world) < dt * 2.6) {
				spawnSmokePuff(world, pt.x, pt.y, pt.z + 0.08, () => nextRand(world));
			}
		}
		if (a.stateTime >= a.duration) {
			a.arcActive = false;
			a.state = 'INSPECTING';
			a.stateTime = 0;
			a.duration = 2.0;
		}
		return;
	}
	if (a.state === 'INSPECTING' && a.stateTime >= a.duration) commandArtisanTo(world, 'pc');
}

export function stepWorkshop(world: WorkshopWorld, dt: number): void {
	const safeDt = Math.max(0, Math.min(0.05, dt));
	const rand = () => nextRand(world);
	world.time += safeDt;
	world.blackboard.coffeeTimer = Math.max(0, world.blackboard.coffeeTimer - safeDt);

	stepArtisan(world, safeDt);
	stepCarrier(world, safeDt, rand);

	const artisanMoving = world.artisan.state === 'WALKING_TO_BENCH' || world.artisan.state === 'WALKING_TO_PC';
	const artisanWeight = artisanMoving ? 0.45 : world.artisan.state === 'PANICKING' ? 0.35 : 0.0;
	resolveActorSeparation(world.artisan, world.artisan.radius, artisanWeight, world.carrier, world.carrier.radius, 1.0);

	stepDrone(world, safeDt, rand);
	stepWorkshopEvent(world, safeDt, rand, (station) => commandArtisanTo(world, station));
	world.sparks = stepParticlesPhysics(world.sparks, safeDt);
	stepDialogue(world, safeDt, rand);
}

export function getWorkshopCaption(world: WorkshopWorld): string {
	if (world.event.phase === 'panic') return '¡PÁNICO EN EL TALLER!';
	if (world.event.kind === 'short_circuit') return 'ALERTA · CORTOCIRCUITO EN BANCO';
	if (world.event.kind === 'build_fail') return 'ALERTA · KERNEL PANIC EN PC';
	if (world.event.kind === 'drone_glitch') return 'ALERTA · FALLO DEL DRON';
	if (world.event.kind === 'celebration' || world.artisan.state === 'CELEBRATING') return 'TALLER · ¡FESTEJO!';
	if (world.artisan.state === 'GREETING' || world.drone.state === 'GREET_VISITOR') return 'TALLER · SALUDO EN VIVO';
	if (world.artisan.arcActive) return 'SANTI · SOLDANDO KINTSUGI';
	if (world.drone.state === 'WELDING_BENCH') return 'DRON · SOLDANDO KINTSUGI';
	if (world.artisan.state === 'CODING') return 'SANTI · MOTOR EN RUST';
	if (world.artisan.state === 'WALKING_TO_BENCH' || world.artisan.state === 'WALKING_TO_PC') {
		return 'SANTI · CAMBIO DE ESTACIÓN';
	}
	return 'SANTI · PLACA CONSOLA';
}
