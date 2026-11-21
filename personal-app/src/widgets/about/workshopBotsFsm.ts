import { triggerEventDialogue } from './workshopDialogue';
import {
	BENCH_DROP,
	getSeamPoint,
	PARTS_PICK,
	PC_DROP,
	spawnSmokePuff,
	spawnWeldSpark,
} from './workshopEvents';
import {
	findFloorPath,
	resolveDroneAirspace,
	resolveFloorCollisions,
	segmentClearsObstacles,
} from './workshopPhysics';
import type { Point2D, WorkshopWorld } from './workshopTypes';

export const DRONE_GREET = { x: 5.6, y: 8.2, z: 4.5 };

export function followFloorPath(
	actor: {
		x: number;
		y: number;
		targetX: number;
		targetY: number;
		facing: number;
		radius: number;
		path: Point2D[];
	},
	speed: number,
	dt: number,
): boolean {
	if (actor.path.length === 0) return true;
	const next = actor.path[0];
	actor.targetX = next.x;
	actor.targetY = next.y;
	const dx = next.x - actor.x;
	const dy = next.y - actor.y;
	const dist = Math.hypot(dx, dy);
	if (dist <= 0.08) {
		actor.x = next.x;
		actor.y = next.y;
		resolveFloorCollisions(actor, actor.radius);
		actor.path.shift();
		if (actor.path.length > 0) {
			actor.targetX = actor.path[0].x;
			actor.targetY = actor.path[0].y;
		}
		return actor.path.length === 0;
	}
	const step = Math.min(dist, speed * dt);
	actor.x += (dx / dist) * step;
	actor.y += (dy / dist) * step;
	if (dist > 0.04) actor.facing = Math.atan2(dy, dx);
	resolveFloorCollisions(actor, actor.radius);
	if (step >= dist - 0.001) {
		actor.path.shift();
		if (actor.path.length > 0) {
			actor.targetX = actor.path[0].x;
			actor.targetY = actor.path[0].y;
		}
	}
	return actor.path.length === 0;
}

function moveAirborne(
	actor: { x: number; y: number; z: number; facing: number },
	tx: number,
	ty: number,
	tz: number,
	speed: number,
	dt: number,
): boolean {
	const dx = tx - actor.x;
	const dy = ty - actor.y;
	const dz = tz - actor.z;
	const dist = Math.hypot(dx, dy, dz);
	if (dist <= 0.08) {
		actor.x = tx;
		actor.y = ty;
		actor.z = tz;
		return true;
	}
	const step = Math.min(dist, speed * dt);
	actor.x += (dx / dist) * step;
	actor.y += (dy / dist) * step;
	actor.z += (dz / dist) * step;
	if (Math.hypot(dx, dy) > 0.04) actor.facing = Math.atan2(dy, dx);
	return step >= dist - 0.001;
}

export function stepCarrier(world: WorkshopWorld, dt: number, rand: () => number): void {
	const c = world.carrier;
	c.stateTime += dt;
	if (c.state === 'PANICKING') {
		c.walkPhase += dt * 26;
		c.wobble = Math.sin(c.stateTime * 28) * 0.42;
		c.x += Math.cos(c.stateTime * 6.5) * 1.6 * dt;
		c.y += Math.sin(c.stateTime * 6.5) * 1.6 * dt;
		resolveFloorCollisions(c, c.radius);
		if (c.stateTime >= c.duration) {
			c.wobble = 0;
			c.emote = 'none';
			c.state = 'IDLE';
			c.stateTime = 0;
			c.duration = 1.0;
		}
		return;
	}
	if (c.state === 'CELEBRATING') {
		c.jumpZ = Math.abs(Math.sin(c.stateTime * 11)) * 0.16;
		if (c.stateTime >= c.duration) {
			c.jumpZ = 0;
			c.emote = 'none';
			c.state = 'IDLE';
			c.stateTime = 0;
			c.duration = 1.4;
		}
		return;
	}
	if (c.state === 'STUMBLE') {
		c.wobble = Math.sin(c.stateTime * 22) * 0.35;
		if (c.stateTime >= c.duration) {
			c.wobble = 0;
			c.emote = 'none';
			c.state = c.carrying === 'none' ? 'RETURNING' : c.carrying === 'coffee' ? 'CARRYING_TO_PC' : 'CARRYING_TO_BENCH';
			if (c.path.length > 0 && !segmentClearsObstacles(c.x, c.y, c.path[0].x, c.path[0].y, c.radius, 0.01)) {
				const dest = c.state === 'RETURNING' ? PARTS_PICK : c.carrying === 'coffee' ? PC_DROP : BENCH_DROP;
				c.path = findFloorPath(c.x, c.y, dest.x, dest.y, c.radius);
			}
			c.stateTime = 0;
		}
		return;
	}
	if (c.state === 'IDLE' && c.stateTime >= c.duration) {
		c.state = 'FETCHING';
		c.stateTime = 0;
		c.duration = 1.1;
	} else if (c.state === 'FETCHING' && c.stateTime >= c.duration) {
		const toBench = c.nextDestination === 'bench';
		c.nextDestination = toBench ? 'pc' : 'bench';
		c.carrying = toBench ? (rand() < 0.5 ? 'capacitor' : 'pcb') : 'coffee';
		c.state = toBench ? 'CARRYING_TO_BENCH' : 'CARRYING_TO_PC';
		const drop = toBench ? BENCH_DROP : PC_DROP;
		c.path = findFloorPath(c.x, c.y, drop.x, drop.y, c.radius);
		c.targetX = c.path[0]?.x ?? drop.x;
		c.targetY = c.path[0]?.y ?? drop.y;
		c.stateTime = 0;
	} else if (c.state === 'CARRYING_TO_BENCH' || c.state === 'CARRYING_TO_PC') {
		c.walkPhase += dt * 11;
		if (c.stateTime > 1.2 && c.path.length > 0 && world.event.kind === 'none' && rand() < dt * 0.09) {
			c.state = 'STUMBLE';
			c.stateTime = 0;
			c.duration = 1.1;
			triggerEventDialogue(world, 'stumble', rand);
			return;
		}
		if (followFloorPath(c, world.event.phase === 'fixing' ? 2.45 : 1.9, dt)) {
			c.state = 'DELIVERING';
			c.stateTime = 0;
			c.duration = 0.85;
		}
	} else if (c.state === 'DELIVERING' && c.stateTime >= c.duration) {
		if (c.carrying === 'coffee') {
			world.blackboard.coffeeTimer = 14;
		} else if (c.carrying === 'capacitor' || c.carrying === 'pcb') {
			world.blackboard.partDeliveredAtBench = true;
			world.blackboard.benchNeedsWeld = true;
		}
		c.carrying = 'none';
		c.emote = 'none';
		c.state = 'RETURNING';
		c.path = findFloorPath(c.x, c.y, PARTS_PICK.x, PARTS_PICK.y, c.radius);
		c.targetX = c.path[0]?.x ?? PARTS_PICK.x;
		c.targetY = c.path[0]?.y ?? PARTS_PICK.y;
		c.stateTime = 0;
	} else if (c.state === 'RETURNING') {
		c.walkPhase += dt * 10;
		if (followFloorPath(c, 2.0, dt)) {
			c.state = 'IDLE';
			c.stateTime = 0;
			c.duration = 1.5 + rand() * 1.4;
			c.walkPhase = 0;
		}
	}
}

export function stepDrone(world: WorkshopWorld, dt: number, rand: () => number): void {
	const d = world.drone;
	d.stateTime += dt;
	d.hoverPhase += dt * (d.state === 'PANICKING' || d.state === 'MALFUNCTION' ? 9.5 : 3.8);
	d.orbitAngle += dt * (d.state === 'CELEBRATING' ? 2.4 : d.state === 'PANICKING' ? 4.2 : 0.65);
	d.weldingActive = false;

	if (d.state !== 'WELDING_BENCH') d.weldHeat = Math.max(0, d.weldHeat - dt * 0.8);

	if (d.state === 'PANICKING') {
		const tx = 4.8 + Math.sin(d.stateTime * 7) * 1.3;
		const ty = 4.8 + Math.cos(d.stateTime * 6) * 1.2;
		moveAirborne(d, tx, ty, 5.1 + Math.sin(d.stateTime * 11) * 0.35, 4.4, dt);
		if (d.stateTime >= d.duration) {
			d.emote = 'none';
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.2;
		}
	} else if (d.state === 'MALFUNCTION') {
		const tx = 4.8 + Math.sin(d.stateTime * 5.2) * 1.8;
		const ty = 4.8 + Math.sin(d.stateTime * 10.4) * 1.1;
		moveAirborne(d, tx, ty, 4.6 + Math.cos(d.stateTime * 8) * 0.55, 4.8, dt);
		if (d.stateTime >= d.duration) {
			d.emote = 'none';
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.2;
		}
	} else if (d.state === 'GREET_VISITOR' || d.state === 'SCAN_PC' || d.state === 'ALERT') {
		const tx = d.state === 'GREET_VISITOR' ? DRONE_GREET.x : d.state === 'SCAN_PC' ? 7.6 : d.targetX;
		const ty = d.state === 'GREET_VISITOR' ? DRONE_GREET.y : d.state === 'SCAN_PC' ? 3.2 : d.targetY;
		const tz = d.state === 'GREET_VISITOR' ? DRONE_GREET.z : d.state === 'SCAN_PC' ? 5.0 : d.targetZ;
		moveAirborne(d, tx, ty, tz, d.state === 'ALERT' ? 3.9 : 3.2, dt);
		if (d.stateTime >= d.duration) {
			d.emote = 'none';
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.2 + rand() * 2.0;
		}
	} else if (d.state === 'CELEBRATING') {
		const tx = Math.max(1.2, Math.min(8.6, world.artisan.x + Math.cos(d.orbitAngle) * 1.4));
		const ty = Math.max(1.2, Math.min(8.6, world.artisan.y + Math.sin(d.orbitAngle) * 1.4));
		moveAirborne(d, tx, ty, 4.9 + Math.sin(d.hoverPhase * 1.6) * 0.45, 4.0, dt);
		if (d.stateTime >= d.duration) {
			d.emote = 'none';
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.2;
		}
	} else if (d.state === 'WELDING_BENCH') {
		const pt = getSeamPoint(d.weldProgress);
		d.targetX = pt.x;
		d.targetY = pt.y;
		d.targetZ = 3.78;
		moveAirborne(d, pt.x, pt.y, 3.78, 3.2, dt);
		if (Math.hypot(d.x - pt.x, d.y - pt.y) <= 0.35 && world.event.kind !== 'short_circuit') {
			d.weldingActive = true;
			d.weldHeat = Math.min(1, d.weldHeat + dt * 2.5);
			d.weldProgress = (d.weldProgress + dt * 0.24) % 1;
			world.blackboard.kintsugiSeam = Math.min(1, world.blackboard.kintsugiSeam + dt * 0.14);
			d.sparkAccum += dt * 18;
			while (d.sparkAccum >= 1) {
				d.sparkAccum -= 1;
				spawnWeldSpark(world, pt.x, pt.y, pt.z, rand, 1.0, 'arc');
			}
			if (rand() < dt * 2.2) spawnSmokePuff(world, pt.x, pt.y, pt.z + 0.08, rand);
		}
		if (d.stateTime >= d.duration || world.event.kind === 'short_circuit') {
			world.blackboard.partDeliveredAtBench = false;
			world.blackboard.benchNeedsWeld = false;
			d.weldingActive = false;
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.0 + rand() * 1.8;
		}
	} else if (d.state === 'DELIVER_AERIAL') {
		const mid = d.stateTime >= d.duration * 0.45;
		d.carrying = mid && d.stateTime < d.duration * 0.88 ? 'pcb' : 'none';
		moveAirborne(d, mid ? 4.6 : 2.1, mid ? 5.8 : 7.0, 4.4, 3.2, dt);
		if (d.stateTime >= d.duration) {
			d.carrying = 'none';
			d.state = 'PATROL';
			d.stateTime = 0;
			d.duration = 3.4;
		}
	} else {
		d.targetX = 4.9 + Math.cos(d.orbitAngle) * 2.1;
		d.targetY = 4.8 + Math.sin(d.orbitAngle) * 1.9;
		d.targetZ = 4.8 + Math.sin(d.hoverPhase * 0.7) * 0.45;
		moveAirborne(d, d.targetX, d.targetY, d.targetZ, 2.8, dt);

		const weldRequested = world.blackboard.partDeliveredAtBench || world.blackboard.benchNeedsWeld;
		if (weldRequested && world.event.kind !== 'short_circuit') {
			d.state = 'WELDING_BENCH';
			d.stateTime = 0;
			d.duration = 3.8;
			if (world.artisan.arcActive) d.weldProgress = (world.artisan.solderProgress + 0.5) % 1;
		} else if (d.stateTime >= d.duration) {
			const r = rand();
			if (world.event.kind !== 'short_circuit' && r < 0.45) {
				d.state = 'WELDING_BENCH';
				d.duration = 3.8;
				if (world.artisan.arcActive) d.weldProgress = (world.artisan.solderProgress + 0.5) % 1;
			} else if (world.artisan.state === 'CODING' && r < 0.78) {
				d.state = 'SCAN_PC';
				d.duration = 3.2;
			} else {
				d.state = 'DELIVER_AERIAL';
				d.duration = 4.0;
			}
			d.stateTime = 0;
		}
	}

	resolveDroneAirspace(d, d.radius);
}
