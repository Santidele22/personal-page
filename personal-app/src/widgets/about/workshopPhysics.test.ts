import { describe, expect, it } from 'vitest';

import {
	BENCH_DROP,
	PARTS_PICK,
	PC_DROP,
	STAND_BENCH,
	STAND_PC,
	commandArtisanTo,
	createWorkshopWorld,
	stepWorkshop,
	triggerWorkshopEvent,
} from './workshopFsm';
import {
	ARTISAN_RADIUS,
	CARRIER_RADIUS,
	DRONE_RADIUS,
	ROOM_BOUNDS,
	WORKSHOP_OBSTACLES,
	circleOverlapsBox,
	findFloorPath,
	isFloorPositionClear,
	resolveFloorCollisions,
	segmentClearsObstacles,
	sortIsoDrawables,
	stepParticlesPhysics,
} from './workshopPhysics';
import type { DrawItem, WorkshopParticle } from './workshopTypes';

function assertActorClearOfObstacles(x: number, y: number, radius: number): void {
	expect(x).toBeGreaterThanOrEqual(ROOM_BOUNDS.minX + radius - 0.01);
	expect(x).toBeLessThanOrEqual(ROOM_BOUNDS.maxX - radius + 0.01);
	expect(y).toBeGreaterThanOrEqual(ROOM_BOUNDS.minY + radius - 0.01);
	expect(y).toBeLessThanOrEqual(ROOM_BOUNDS.maxY - radius + 0.01);
	for (const obs of WORKSHOP_OBSTACLES) {
		expect(circleOverlapsBox(x, y, radius - 0.01, obs)).toBe(false);
	}
}

describe('workshop collision physics, pathfinding & isometric sorting', () => {
	it('keeps all static station anchors clear of obstacles and routes cleanly around furniture', () => {
		for (const pt of [STAND_PC, STAND_BENCH]) {
			expect(isFloorPositionClear(pt.x, pt.y, ARTISAN_RADIUS)).toBe(true);
		}
		for (const pt of [PARTS_PICK, BENCH_DROP, PC_DROP]) {
			expect(isFloorPositionClear(pt.x, pt.y, CARRIER_RADIUS)).toBe(true);
		}

		// Direct segment from PARTS_PICK to PC_DROP passes through the bench, so A* must bend around it.
		expect(segmentClearsObstacles(PARTS_PICK.x, PARTS_PICK.y, PC_DROP.x, PC_DROP.y, CARRIER_RADIUS)).toBe(false);
		const path = findFloorPath(PARTS_PICK.x, PARTS_PICK.y, PC_DROP.x, PC_DROP.y, CARRIER_RADIUS);
		expect(path.length).toBeGreaterThan(1);

		let prev = PARTS_PICK;
		for (const wp of path) {
			expect(segmentClearsObstacles(prev.x, prev.y, wp.x, wp.y, CARRIER_RADIUS, 0.01)).toBe(true);
			prev = wp;
		}
		expect(prev.x).toBeCloseTo(PC_DROP.x, 2);
		expect(prev.y).toBeCloseTo(PC_DROP.y, 2);
	});

	it('pushes actors placed inside furniture or outside walls cleanly back to valid floor positions', () => {
		const insideBench = { x: 3.1, y: 5.2 };
		expect(resolveFloorCollisions(insideBench, ARTISAN_RADIUS)).toBe(true);
		assertActorClearOfObstacles(insideBench.x, insideBench.y, ARTISAN_RADIUS);

		const insidePc = { x: 7.2, y: 2.0 };
		expect(resolveFloorCollisions(insidePc, ARTISAN_RADIUS)).toBe(true);
		assertActorClearOfObstacles(insidePc.x, insidePc.y, ARTISAN_RADIUS);

		const outsideWall = { x: -1.5, y: 12.0 };
		expect(resolveFloorCollisions(outsideWall, CARRIER_RADIUS)).toBe(true);
		assertActorClearOfObstacles(outsideWall.x, outsideWall.y, CARRIER_RADIUS);
	});

	it('never penetrates obstacles, walls, sibling actors, or furniture airspace over 60s + manual commands', () => {
		const world = createWorkshopWorld({ visitorRole: 'guest', seed: 2026 });

		for (let i = 0; i < 1500; i++) {
			if (i === 120) commandArtisanTo(world, 'bench');
			if (i === 260) triggerWorkshopEvent(world, 'short_circuit');
			if (i === 410) commandArtisanTo(world, 'pc');
			if (i === 750) commandArtisanTo(world, 'bench');
			if (i === 920) triggerWorkshopEvent(world, 'drone_glitch');
			if (i === 1100) commandArtisanTo(world, 'pc');

			stepWorkshop(world, 0.04);

			assertActorClearOfObstacles(world.artisan.x, world.artisan.y, ARTISAN_RADIUS);
			assertActorClearOfObstacles(world.carrier.x, world.carrier.y, CARRIER_RADIUS);

			const pairDist = Math.hypot(world.artisan.x - world.carrier.x, world.artisan.y - world.carrier.y);
			expect(pairDist).toBeGreaterThanOrEqual(ARTISAN_RADIUS + CARRIER_RADIUS - 0.02);

			// Drone must stay inside airspace and above any furniture volume it overlaps.
			expect(world.drone.x).toBeGreaterThanOrEqual(ROOM_BOUNDS.minX + DRONE_RADIUS - 0.01);
			expect(world.drone.x).toBeLessThanOrEqual(ROOM_BOUNDS.maxX - DRONE_RADIUS + 0.01);
			expect(world.drone.y).toBeGreaterThanOrEqual(ROOM_BOUNDS.minY + DRONE_RADIUS - 0.01);
			expect(world.drone.y).toBeLessThanOrEqual(ROOM_BOUNDS.maxY - DRONE_RADIUS + 0.01);
			for (const obs of WORKSHOP_OBSTACLES) {
				if (circleOverlapsBox(world.drone.x, world.drone.y, DRONE_RADIUS - 0.02, obs)) {
					expect(world.drone.z).toBeGreaterThanOrEqual(obs.maxZ + 0.35);
				}
			}
		}
	});

	it('bounces sparks onto furniture tops vs floor accurately and topologically sorts isometric depth', () => {
		const particles: WorkshopParticle[] = [
			{ x: 3.2, y: 5.2, z: 2.3, vx: 0, vy: 0, vz: -2.0, life: 0, maxLife: 1.0, kind: 'spark' },
			{ x: 6.5, y: 7.5, z: 0.2, vx: 0, vy: 0, vz: -2.0, life: 0, maxLife: 1.0, kind: 'spark' },
		];
		const after = stepParticlesPhysics(particles, 0.2);
		expect(after[0].z).toBeGreaterThanOrEqual(2.2);
		expect(after[1].z).toBeLessThan(0.5);

		const noop = () => {};
		const bench: DrawItem = {
			depth: 8.5,
			box: { minX: 1.5, maxX: 4.9, minY: 4.25, maxY: 6.3, minZ: 0, maxZ: 3.2 },
			draw: noop,
		};
		const behindActor: DrawItem = {
			depth: 8.5,
			box: { minX: 4.3, maxX: 5.1, minY: 3.4, maxY: 4.2, minZ: 0, maxZ: 3.4 },
			draw: noop,
		};
		const frontActor: DrawItem = {
			depth: 10.9,
			box: { minX: 5.05, maxX: 5.7, minY: 5.2, maxY: 5.9, minZ: 0, maxZ: 0.9 },
			draw: noop,
		};

		const sorted = sortIsoDrawables([frontActor, bench, behindActor]);
		expect(sorted.indexOf(behindActor)).toBeLessThan(sorted.indexOf(bench));
		expect(sorted.indexOf(bench)).toBeLessThan(sorted.indexOf(frontActor));
	});
});
