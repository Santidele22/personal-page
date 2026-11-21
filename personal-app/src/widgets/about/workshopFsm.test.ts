import { describe, expect, it } from 'vitest';

import { JOKE_EXCHANGES, stepDialogue } from './workshopDialogue';
import {
	commandArtisanTo,
	createWorkshopWorld,
	getWorkshopCaption,
	pokeActor,
	stepWorkshop,
	triggerNextFailure,
	triggerVisitorGreeting,
	triggerWorkshopEvent,
} from './workshopFsm';

function advanceSeconds(world: ReturnType<typeof createWorkshopWorld>, seconds: number, dt = 0.04): void {
	const steps = Math.ceil(seconds / dt);
	for (let i = 0; i < steps; i++) {
		stepWorkshop(world, dt);
	}
}

describe('workshop FSM & dialogue engine', () => {
	it('greets unknown visitors with "¡Bienvenido, desconocido!" and admins differently', () => {
		const guestWorld = createWorkshopWorld({ visitorRole: 'guest', seed: 42 });
		expect(guestWorld.blackboard.greeted).toBe(false);

		triggerVisitorGreeting(guestWorld);
		expect(guestWorld.blackboard.greeted).toBe(true);
		expect(guestWorld.drone.state).toBe('GREET_VISITOR');
		expect(guestWorld.artisan.state).toBe('GREETING');
		expect(guestWorld.dialogue.active?.speaker).toBe('drone');
		expect(guestWorld.dialogue.active?.text).toContain('Bienvenido, desconocido');

		// Re-triggering once greeted must not restart the greeting.
		guestWorld.drone.state = 'PATROL';
		triggerVisitorGreeting(guestWorld);
		expect(guestWorld.drone.state).toBe('PATROL');

		// Admin gets a personal greeting distinct from guest greeting.
		const adminWorld = createWorkshopWorld({ visitorRole: 'admin', seed: 42 });
		triggerVisitorGreeting(adminWorld);
		expect(adminWorld.blackboard.greeted).toBe(true);
		expect(adminWorld.drone.state).toBe('GREET_VISITOR');
		expect(adminWorld.dialogue.active?.speaker).toBe('drone');
		expect(adminWorld.dialogue.active?.text).toContain('Santi');
		expect(adminWorld.dialogue.active?.text).not.toContain('desconocido');
	});

	it('walks artisan smoothly between Standing PC and Electronics Bench on command', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 11 });
		expect(world.artisan.state).toBe('CODING');
		expect(world.artisan.activeStation).toBe('pc');

		commandArtisanTo(world, 'bench');
		expect(world.artisan.state).toBe('WALKING_TO_BENCH');
		expect(world.artisan.activeStation).toBe('bench');

		// Step enough time for the artisan to walk around the center waypoint to the bench.
		advanceSeconds(world, 5);
		expect(['SOLDERING', 'ELECTRONICS_TEST']).toContain(world.artisan.state);
		expect(world.artisan.x).toBeLessThan(4.5);
		expect(world.artisan.y).toBeGreaterThan(6.5);

		commandArtisanTo(world, 'pc');
		expect(world.artisan.state).toBe('WALKING_TO_PC');
		expect(world.artisan.activeStation).toBe('pc');

		advanceSeconds(world, 5);
		expect(world.artisan.state).toBe('CODING');
		expect(world.artisan.x).toBeGreaterThan(6.0);
		expect(world.artisan.y).toBeLessThan(4.5);
	});

	it('runs autonomous multi-actor cycles, delivers parts, welds with physics sparks, and keeps drone airborne', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 7 });
		const seenArtisanStates = new Set<string>([world.artisan.state]);
		const seenDroneStates = new Set<string>([world.drone.state]);
		const seenCarrierStates = new Set<string>([world.carrier.state]);
		let sawSparks = false;
		let minDroneZ = world.drone.z;

		for (let i = 0; i < 900; i++) {
			stepWorkshop(world, 0.04); // 36 seconds simulated
			seenArtisanStates.add(world.artisan.state);
			seenDroneStates.add(world.drone.state);
			seenCarrierStates.add(world.carrier.state);
			minDroneZ = Math.min(minDroneZ, world.drone.z);
			if (world.sparks.length > 0) sawSparks = true;
		}

		expect(seenArtisanStates.size).toBeGreaterThanOrEqual(3);
		expect(seenCarrierStates.has('FETCHING')).toBe(true);
		expect(seenCarrierStates.has('CARRYING_TO_BENCH') || seenCarrierStates.has('CARRYING_TO_PC')).toBe(true);
		expect(seenDroneStates.has('WELDING_BENCH')).toBe(true);
		expect(sawSparks).toBe(true);
		expect(minDroneZ).toBeGreaterThan(2);
		expect(world.blackboard.kintsugiSeam).toBeGreaterThan(0.25);
		expect(world.blackboard.codeLinesCompiled).toBeGreaterThan(0);
	});

	it('advances multi-turn dialogue sequentially with a clean gap and updates caption state', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 99 });
		triggerVisitorGreeting(world);
		expect(getWorkshopCaption(world)).toContain('SALUDO');

		expect(world.dialogue.active?.speaker).toBe('drone');
		const firstDuration = world.dialogue.active?.duration ?? 2.4;

		// Step past turn 1 duration into inter-line gap.
		stepDialogue(world, firstDuration + 0.05, () => 0.5);
		expect(world.dialogue.active).toBeNull();

		// Step past gap into turn 2 (artisan reply).
		stepDialogue(world, 0.4, () => 0.5);
		expect(world.dialogue.active?.speaker).toBe('artisan');

		const secondDuration = world.dialogue.active?.duration ?? 2.6;
		stepDialogue(world, secondDuration + 0.1, () => 0.5);
		expect(world.dialogue.active).toBeNull();
	});

	it('triggers short_circuit and build_fail problems through panic, fixing, and celebration phases', () => {
		const circuitWorld = createWorkshopWorld({ visitorRole: 'guest', seed: 19 });
		commandArtisanTo(circuitWorld, 'bench');
		advanceSeconds(circuitWorld, 5);

		triggerWorkshopEvent(circuitWorld, 'short_circuit');
		expect(circuitWorld.event.kind).toBe('short_circuit');
		expect(circuitWorld.event.phase).toBe('panic');
		expect(circuitWorld.artisan.state).toBe('PANICKING');
		expect(circuitWorld.carrier.state).toBe('PANICKING');
		expect(circuitWorld.drone.state).toBe('PANICKING');
		expect(circuitWorld.sparks.some((p) => p.kind === 'smoke')).toBe(true);
		expect(circuitWorld.dialogue.active?.mood).toBe('alert');
		expect(getWorkshopCaption(circuitWorld)).toContain('PÁNICO');

		// Panic phase resolves into active troubleshooting & alert drone response.
		advanceSeconds(circuitWorld, 2.3);
		expect(circuitWorld.event.phase).toBe('fixing');
		expect(circuitWorld.artisan.state).toBe('TROUBLESHOOTING');
		expect(circuitWorld.drone.state).toBe('ALERT');
		expect(getWorkshopCaption(circuitWorld)).toContain('CORTOCIRCUITO');

		// Fixing completes and transitions into workshop celebration with confetti.
		advanceSeconds(circuitWorld, 3.4);
		expect(circuitWorld.event.kind).toBe('celebration');
		expect(circuitWorld.artisan.state).toBe('CELEBRATING');
		expect(circuitWorld.drone.state).toBe('CELEBRATING');
		expect(circuitWorld.sparks.some((p) => p.kind === 'confetti')).toBe(true);
		expect(getWorkshopCaption(circuitWorld)).toContain('FESTEJO');

		const buildWorld = createWorkshopWorld({ visitorRole: 'admin', seed: 23 });
		triggerWorkshopEvent(buildWorld, 'build_fail');
		expect(buildWorld.event.kind).toBe('build_fail');
		expect(buildWorld.event.phase).toBe('panic');
		expect(buildWorld.artisan.state).toBe('PANICKING');
		advanceSeconds(buildWorld, 2.3);
		expect(buildWorld.event.phase).toBe('fixing');
		expect(buildWorld.artisan.state).toBe('TROUBLESHOOTING');
		expect(getWorkshopCaption(buildWorld)).toContain('KERNEL PANIC');
		advanceSeconds(buildWorld, 3.4);
		expect(buildWorld.event.kind).toBe('celebration');
	});

	it('supports drone_glitch malfunction, triggerNextFailure cycling, and carrier coffee delivery to PC', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 55 });

		triggerNextFailure(world);
		expect(world.event.kind).toBe('short_circuit');

		triggerNextFailure(world);
		expect(world.event.kind).toBe('build_fail');

		triggerNextFailure(world);
		expect(world.event.kind).toBe('drone_glitch');
		expect(world.event.phase).toBe('panic');
		expect(world.drone.state).toBe('MALFUNCTION');
		expect(world.artisan.state).toBe('PANICKING');
		expect(world.carrier.state).toBe('PANICKING');
		expect(world.sparks.length).toBeGreaterThan(0);

		advanceSeconds(world, 2.3);
		expect(world.event.phase).toBe('fixing');
		advanceSeconds(world, 3.4);
		expect(world.event.kind).toBe('celebration');

		// Coffee delivery from spider-bot refreshes workstation coffeeTimer on standing desk.
		const coffeeWorld = createWorkshopWorld({ visitorRole: 'guest', seed: 61 });
		Object.assign(coffeeWorld.carrier, { state: 'DELIVERING', stateTime: 0.84, duration: 0.85, carrying: 'coffee' });
		stepWorkshop(coffeeWorld, 0.04);
		expect(coffeeWorld.carrier.state).toBe('RETURNING');
		expect(coffeeWorld.blackboard.coffeeTimer).toBeGreaterThan(0);
	});

	it('delivers NPC jokes without consecutive repeats and lets poked actors react', () => {
		expect(JOKE_EXCHANGES.length).toBeGreaterThanOrEqual(8);

		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 77 });
		const seenJokes = new Set<string>();
		let sawEvent = false;

		for (let i = 0; i < 1800; i++) {
			stepWorkshop(world, 0.04); // 72s autonomous run
			if (world.dialogue.active?.mood === 'joke') {
				seenJokes.add(world.dialogue.active.text);
			}
			if (world.event.kind !== 'none') sawEvent = true;
		}

		expect(seenJokes.size).toBeGreaterThanOrEqual(2);
		expect(sawEvent).toBe(true);

		pokeActor(world, 'carrier');
		expect(world.dialogue.active?.speaker).toBe('carrier');
	});

	it('puts on welding mask before striking manual soldering arc and stows it when leaving bench', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 31 });
		commandArtisanTo(world, 'bench');
		advanceSeconds(world, 4.5);

		world.artisan.state = 'SOLDERING';
		world.artisan.stateTime = 0;
		world.artisan.duration = 6.0;
		world.artisan.maskProgress = 0;
		world.artisan.arcActive = false;
		world.drone.state = 'PATROL';
		world.drone.stateTime = 0;
		world.blackboard.benchNeedsWeld = false;
		world.blackboard.partDeliveredAtBench = false;
		world.sparks = [];

		// One tick while lowering mask: safety interlock keeps arc off.
		stepWorkshop(world, 0.04);
		expect(world.artisan.maskProgress).toBeGreaterThan(0);
		expect(world.artisan.maskProgress).toBeLessThan(0.85);
		expect(world.artisan.arcActive).toBe(false);

		// Once mask finishes lowering, electric arc strikes and emits manual welding sparks.
		advanceSeconds(world, 0.7);
		expect(world.artisan.maskProgress).toBe(1);
		expect(world.artisan.arcActive).toBe(true);
		expect(world.artisan.solderProgress).toBeGreaterThan(0);
		expect(world.sparks.some((p) => p.kind === 'spark')).toBe(true);

		// Walking back to the PC turns off the arc immediately and stows the welding mask.
		commandArtisanTo(world, 'pc');
		advanceSeconds(world, 1.0);
		expect(world.artisan.arcActive).toBe(false);
		expect(world.artisan.maskProgress).toBe(0);
	});

	it('lets the flying drone weld the bench with sparks while keeping safe altitude and triggering Santi mask', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 41 });
		commandArtisanTo(world, 'bench');
		advanceSeconds(world, 4.5);

		Object.assign(world.artisan, { state: 'ELECTRONICS_TEST', stateTime: 0, duration: 6.0, maskProgress: 0 });
		Object.assign(world.drone, { state: 'PATROL', stateTime: 0 });
		world.blackboard.benchNeedsWeld = true;
		world.sparks = [];

		let sawWelding = false;
		let sawArcSparks = false;
		let minWeldingZ = Infinity;

		for (let i = 0; i < 90; i++) {
			stepWorkshop(world, 0.04); // 3.6 seconds
			if (world.drone.state === 'WELDING_BENCH' && world.drone.weldingActive) {
				sawWelding = true;
				minWeldingZ = Math.min(minWeldingZ, world.drone.z);
			}
			if (world.sparks.some((p) => p.kind === 'spark' && p.color === 'arc')) {
				sawArcSparks = true;
			}
		}

		expect(sawWelding).toBe(true);
		expect(sawArcSparks).toBe(true);
		expect(minWeldingZ).toBeGreaterThanOrEqual(3.6);
		expect(world.artisan.maskProgress).toBe(1);
	});

	it('tells a coherent Linux console build story with Simpsons references in dialogues', () => {
		const guestWorld = createWorkshopWorld({ visitorRole: 'guest', seed: 91 });
		triggerVisitorGreeting(guestWorld);
		const firstDuration = guestWorld.dialogue.active?.duration ?? 2.6;
		advanceSeconds(guestWorld, firstDuration + 0.05);
		advanceSeconds(guestWorld, 0.35);
		expect(guestWorld.dialogue.active?.speaker).toBe('artisan');
		expect(guestWorld.dialogue.active?.text.toLowerCase()).toContain('consola');

		const jokeCorpus = JOKE_EXCHANGES.flat()
			.map((l) => l.text.toLowerCase())
			.join(' ');
		expect(jokeCorpus).toContain('termodinámica');
		expect(jokeCorpus).toContain('atómico');
		expect(jokeCorpus).toContain('cuca');
		expect(jokeCorpus).toContain('milhouse');

		for (const speaker of ['artisan', 'drone', 'carrier'] as const) {
			const count = JOKE_EXCHANGES.filter((lines) => lines[0]?.speaker === speaker).length;
			expect(count).toBeGreaterThanOrEqual(2);
		}
	});
});
