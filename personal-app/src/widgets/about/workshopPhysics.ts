import type { DrawItem, ObstacleBox, Point2D } from './workshopTypes';
export { getSurfaceHeightAt, stepParticlesPhysics } from './workshopEvents';

export const ROOM_BOUNDS = {
	minX: 0.45,
	maxX: 9.45,
	minY: 0.45,
	maxY: 9.45,
	maxZ: 6.75,
} as const;

export const ARTISAN_RADIUS = 0.40;
export const CARRIER_RADIUS = 0.34;
export const DRONE_RADIUS = 0.45;

export const WORKSHOP_OBSTACLES: readonly ObstacleBox[] = [
	{ id: 'rack', minX: 0.25, maxX: 1.40, minY: 6.10, maxY: 8.55, maxZ: 3.65, surfaceZ: 3.56 },
	{ id: 'bench', minX: 1.50, maxX: 4.90, minY: 4.25, maxY: 6.30, maxZ: 3.20, surfaceZ: 2.21 },
	{ id: 'pcDesk', minX: 5.50, maxX: 8.85, minY: 1.00, maxY: 2.85, maxZ: 4.25, surfaceZ: 2.49 },
];

export function circleOverlapsBox(
	x: number,
	y: number,
	radius: number,
	box: Pick<ObstacleBox, 'minX' | 'maxX' | 'minY' | 'maxY'>,
	pad = 0,
): boolean {
	const r = radius + pad;
	const cx = Math.max(box.minX, Math.min(box.maxX, x));
	const cy = Math.max(box.minY, Math.min(box.maxY, y));
	const dx = x - cx;
	const dy = y - cy;
	return dx * dx + dy * dy < r * r;
}

export function isFloorPositionClear(x: number, y: number, radius: number, pad = 0): boolean {
	const margin = radius + pad;
	if (
		x < ROOM_BOUNDS.minX + margin ||
		x > ROOM_BOUNDS.maxX - margin ||
		y < ROOM_BOUNDS.minY + margin ||
		y > ROOM_BOUNDS.maxY - margin
	) {
		return false;
	}
	for (const obs of WORKSHOP_OBSTACLES) {
		if (circleOverlapsBox(x, y, radius, obs, pad)) return false;
	}
	return true;
}

export function segmentClearsObstacles(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	radius: number,
	pad = 0.04,
): boolean {
	const dist = Math.hypot(x2 - x1, y2 - y1);
	const steps = Math.max(2, Math.ceil(dist / 0.12));
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		if (!isFloorPositionClear(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, pad)) {
			return false;
		}
	}
	return true;
}

export function resolveFloorCollisions(pos: { x: number; y: number }, radius: number): boolean {
	let collided = false;
	for (let pass = 0; pass < 2; pass++) {
		const cx0 = Math.max(ROOM_BOUNDS.minX + radius, Math.min(ROOM_BOUNDS.maxX - radius, pos.x));
		const cy0 = Math.max(ROOM_BOUNDS.minY + radius, Math.min(ROOM_BOUNDS.maxY - radius, pos.y));
		if (cx0 !== pos.x || cy0 !== pos.y) collided = true;
		pos.x = cx0;
		pos.y = cy0;

		for (const obs of WORKSHOP_OBSTACLES) {
			const nearX = Math.max(obs.minX, Math.min(obs.maxX, pos.x));
			const nearY = Math.max(obs.minY, Math.min(obs.maxY, pos.y));
			const dx = pos.x - nearX;
			const dy = pos.y - nearY;
			const dist = Math.hypot(dx, dy);

			if (dist >= radius) continue;
			collided = true;

			if (dist < 1e-6) {
				const dLeft = pos.x - obs.minX;
				const dRight = obs.maxX - pos.x;
				const dTop = pos.y - obs.minY;
				const dBot = obs.maxY - pos.y;
				const minPen = Math.min(dLeft, dRight, dTop, dBot);
				if (minPen === dLeft) pos.x = obs.minX - radius - 0.002;
				else if (minPen === dRight) pos.x = obs.maxX + radius + 0.002;
				else if (minPen === dTop) pos.y = obs.minY - radius - 0.002;
				else pos.y = obs.maxY + radius + 0.002;
			} else {
				const push = radius - dist + 0.002;
				pos.x += (dx / dist) * push;
				pos.y += (dy / dist) * push;
			}
		}

		pos.x = Math.max(ROOM_BOUNDS.minX + radius, Math.min(ROOM_BOUNDS.maxX - radius, pos.x));
		pos.y = Math.max(ROOM_BOUNDS.minY + radius, Math.min(ROOM_BOUNDS.maxY - radius, pos.y));
	}
	return collided;
}

export function resolveActorSeparation(
	a: { x: number; y: number },
	ra: number,
	weightA: number,
	b: { x: number; y: number },
	rb: number,
	weightB: number,
): boolean {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const dist = Math.hypot(dx, dy);
	const minDist = ra + rb;
	if (dist >= minDist) return false;

	const totalW = Math.max(0.001, weightA + weightB);
	const shareA = weightA / totalW;
	const shareB = weightB / totalW;
	const nx = dist > 1e-5 ? dx / dist : 1;
	const ny = dist > 1e-5 ? dy / dist : 0;
	const overlap = minDist - dist + 0.004;

	a.x -= nx * overlap * shareA;
	a.y -= ny * overlap * shareA;
	b.x += nx * overlap * shareB;
	b.y += ny * overlap * shareB;

	resolveFloorCollisions(a, ra);
	resolveFloorCollisions(b, rb);

	// If b got pinched against furniture/wall while a held position, step b tangentially around a.
	if (Math.hypot(b.x - a.x, b.y - a.y) < minDist - 0.005) {
		const stepOut = minDist + 0.06;
		const b1 = { x: a.x - ny * stepOut, y: a.y + nx * stepOut };
		const b2 = { x: a.x + ny * stepOut, y: a.y - nx * stepOut };
		resolveFloorCollisions(b1, rb);
		resolveFloorCollisions(b2, rb);
		const best = Math.hypot(b1.x - a.x, b1.y - a.y) >= Math.hypot(b2.x - a.x, b2.y - a.y) ? b1 : b2;
		b.x = best.x;
		b.y = best.y;
		const dFinal = Math.hypot(b.x - a.x, b.y - a.y);
		if (dFinal < minDist - 0.005 && dFinal > 1e-5) {
			const rest = (minDist - dFinal) * 0.5 + 0.004;
			a.x -= ((b.x - a.x) / dFinal) * rest;
			a.y -= ((b.y - a.y) / dFinal) * rest;
			b.x += ((b.x - a.x) / dFinal) * rest;
			b.y += ((b.y - a.y) / dFinal) * rest;
			resolveFloorCollisions(a, ra);
			resolveFloorCollisions(b, rb);
		}
	}
	return true;
}

export function resolveDroneAirspace(pos: { x: number; y: number; z: number }, radius = DRONE_RADIUS): void {
	pos.x = Math.max(ROOM_BOUNDS.minX + radius, Math.min(ROOM_BOUNDS.maxX - radius, pos.x));
	pos.y = Math.max(ROOM_BOUNDS.minY + radius, Math.min(ROOM_BOUNDS.maxY - radius, pos.y));
	pos.z = Math.max(1.6, Math.min(ROOM_BOUNDS.maxZ, pos.z));

	for (const obs of WORKSHOP_OBSTACLES) {
		if (!circleOverlapsBox(pos.x, pos.y, radius, obs)) continue;
		const minClearZ = obs.maxZ + 0.45;
		if (pos.z < minClearZ) {
			pos.z = Math.min(ROOM_BOUNDS.maxZ, minClearZ);
		}
	}
}

const GRID_N = 25;
const GRID_STEP = 0.4;
const gridCenter = (ix: number): number => (ix + 0.5) * GRID_STEP;

function nearestWalkableCell(x: number, y: number, walkable: boolean[]): number {
	const bx = Math.max(0, Math.min(GRID_N - 1, Math.floor(x / GRID_STEP)));
	const by = Math.max(0, Math.min(GRID_N - 1, Math.floor(y / GRID_STEP)));
	let best = -1;
	let bestD = Infinity;
	for (let r = 0; r <= 4 && best === -1; r++) {
		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				const cx = bx + dx;
				const cy = by + dy;
				if (cx < 0 || cx >= GRID_N || cy < 0 || cy >= GRID_N) continue;
				const idx = cy * GRID_N + cx;
				if (!walkable[idx]) continue;
				const d = Math.hypot(gridCenter(cx) - x, gridCenter(cy) - y);
				if (d < bestD) {
					bestD = d;
					best = idx;
				}
			}
		}
	}
	return best;
}

export function findFloorPath(
	startX: number,
	startY: number,
	goalX: number,
	goalY: number,
	radius: number,
): Point2D[] {
	const goal = { x: goalX, y: goalY };
	resolveFloorCollisions(goal, radius);
	if (segmentClearsObstacles(startX, startY, goal.x, goal.y, radius, 0.04)) {
		return [goal];
	}

	const total = GRID_N * GRID_N;
	const walkable = new Array<boolean>(total);
	for (let iy = 0; iy < GRID_N; iy++) {
		for (let ix = 0; ix < GRID_N; ix++) {
			walkable[iy * GRID_N + ix] = isFloorPositionClear(gridCenter(ix), gridCenter(iy), radius, 0.04);
		}
	}

	const startIdx = nearestWalkableCell(startX, startY, walkable);
	const goalIdx = nearestWalkableCell(goal.x, goal.y, walkable);
	if (startIdx === -1 || goalIdx === -1) return [goal];

	const gScore = new Float64Array(total).fill(Infinity);
	const fScore = new Float64Array(total).fill(Infinity);
	const cameFrom = new Int32Array(total).fill(-1);
	const closed = new Uint8Array(total);
	const open: number[] = [startIdx];
	const gx0 = goalIdx % GRID_N;
	const gy0 = Math.floor(goalIdx / GRID_N);
	gScore[startIdx] = 0;
	fScore[startIdx] = Math.hypot((startIdx % GRID_N) - gx0, Math.floor(startIdx / GRID_N) - gy0);

	while (open.length > 0) {
		let bestPos = 0;
		for (let i = 1; i < open.length; i++) {
			if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
		}
		const cur = open.splice(bestPos, 1)[0];
		if (cur === goalIdx) break;
		closed[cur] = 1;

		const cx = cur % GRID_N;
		const cy = Math.floor(cur / GRID_N);
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx < 0 || nx >= GRID_N || ny < 0 || ny >= GRID_N) continue;
				const nIdx = ny * GRID_N + nx;
				if (closed[nIdx] || !walkable[nIdx]) continue;
				if (dx !== 0 && dy !== 0 && (!walkable[cy * GRID_N + nx] || !walkable[ny * GRID_N + cx])) {
					continue;
				}
				const nextG = gScore[cur] + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
				if (nextG >= gScore[nIdx]) continue;
				cameFrom[nIdx] = cur;
				gScore[nIdx] = nextG;
				fScore[nIdx] = nextG + Math.hypot(nx - gx0, ny - gy0);
				if (!open.includes(nIdx)) open.push(nIdx);
			}
		}
	}

	const cells: Point2D[] = [];
	let trace = goalIdx;
	while (trace !== -1) {
		cells.push({ x: gridCenter(trace % GRID_N), y: gridCenter(Math.floor(trace / GRID_N)) });
		trace = trace === startIdx ? -1 : cameFrom[trace];
	}
	cells.reverse();
	if (cells.length === 0) return [goal];
	cells.push(goal);

	// Greedy line-of-sight smoothing while respecting clearance constraints.
	const smoothed: Point2D[] = [];
	let anchor: Point2D = { x: startX, y: startY };
	let idx = 0;
	while (idx < cells.length) {
		let farthest = idx;
		for (let j = cells.length - 1; j > idx; j--) {
			if (segmentClearsObstacles(anchor.x, anchor.y, cells[j].x, cells[j].y, radius, 0.03)) {
				farthest = j;
				break;
			}
		}
		smoothed.push(cells[farthest]);
		anchor = cells[farthest];
		idx = farthest + 1;
	}
	return smoothed.length > 0 ? smoothed : [goal];
}

export function sortIsoDrawables(items: DrawItem[]): DrawItem[] {
	const n = items.length;
	if (n <= 1) return [...items];

	const adj: number[][] = Array.from({ length: n }, () => []);
	const inDeg = new Int32Array(n);
	const eps = 0.01;

	for (let i = 0; i < n; i++) {
		const bi = items[i].box;
		if (!bi) continue;
		for (let j = i + 1; j < n; j++) {
			const bj = items[j].box;
			if (!bj) continue;
			const iBehind = bi.maxX <= bj.minX + eps || bi.maxY <= bj.minY + eps || bi.maxZ <= bj.minZ + eps;
			const jBehind = bj.maxX <= bi.minX + eps || bj.maxY <= bi.minY + eps || bj.maxZ <= bi.minZ + eps;
			if (iBehind && !jBehind) {
				adj[i].push(j);
				inDeg[j]++;
			} else if (jBehind && !iBehind) {
				adj[j].push(i);
				inDeg[i]++;
			}
		}
	}

	const available: number[] = [];
	for (let i = 0; i < n; i++) {
		if (inDeg[i] === 0) available.push(i);
	}

	const ordered: DrawItem[] = [];
	const used = new Uint8Array(n);
	while (available.length > 0) {
		available.sort((a, b) => items[a].depth - items[b].depth);
		const cur = available.shift()!;
		used[cur] = 1;
		ordered.push(items[cur]);
		for (const next of adj[cur]) {
			inDeg[next]--;
			if (inDeg[next] === 0) available.push(next);
		}
	}

	if (ordered.length < n) {
		const rest: number[] = [];
		for (let i = 0; i < n; i++) if (!used[i]) rest.push(i);
		rest.sort((a, b) => items[a].depth - items[b].depth);
		for (const i of rest) ordered.push(items[i]);
	}
	return ordered;
}
