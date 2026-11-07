import type { RoadmapMilestoneStatus, RoadmapStage, RoadmapStageState } from './types';

/**
 * The hero percentage of /roadmap: the rounded mean of the stage progresses
 * (S8 — the artboard's «54%» was illustrative, not a stored value). An empty
 * roadmap is 0, never NaN.
 */
export function overallProgress(stages: Pick<RoadmapStage, 'progress'>[]): number {
	if (stages.length === 0) return 0;

	const total = stages.reduce((sum, stage) => sum + stage.progress, 0);

	return Math.round(total / stages.length);
}

/** The Spanish label of a stage state (legend, node chips). */
export function stateLabel(state: RoadmapStageState): string {
	switch (state) {
		case 'done':
			return 'Completada';
		case 'now':
			return 'En progreso';
		case 'next':
			return 'Próxima';
	}
}

/** The Spanish chip of a milestone status («Próximos hitos» list). */
export function milestoneStatusLabel(status: RoadmapMilestoneStatus): string {
	return status === 'now' ? 'En curso' : 'Planificado';
}

/** A lane of the graph: the middle trunk or one of the two branch lanes. */
export type GraphLane = 'trunk' | 'top' | 'bottom';

/** Where one stage sits on the viewBox grid (`index` is its data order). */
export type GraphNode = {
	index: number;
	column: number;
	lane: GraphLane;
};

/**
 * How an edge reads: `done` = already traversed (solid aka), `live` = the
 * frontier the visitor is crossing now (animated dash flow), `future` =
 * still out of reach (dashed hairline).
 */
export type GraphEdgeState = 'done' | 'live' | 'future';

export type GraphEdge = {
	from: number;
	to: number;
	state: GraphEdgeState;
};

export type RoadmapGraphLayout = {
	nodes: GraphNode[];
	edges: GraphEdge[];
	/** Column count of the grid; the page derives the x coordinates from it. */
	columns: number;
};

/**
 * The trunk/branch layout of the /roadmap graph (S6, artboard 03), computed
 * from the stages alone so any N lays out simply and correctly:
 *
 * - The leading `done` run plus the first stage after it (the frontier) form
 *   the trunk on the middle row.
 * - Of the remaining stages the last one becomes the convergence node back on
 *   the trunk; the ones in between fill the bottom/top lanes in pairs, one
 *   column at a time. A single remaining stage just continues the trunk in
 *   line.
 * - Edges chain the trunk, fork from the frontier into each lane head, follow
 *   each lane, and close into the convergence node. An edge is `done` when it
 *   leaves a completed stage, `live` when it leaves an in-progress stage that
 *   is the frontier or reaches another in-progress stage, and `future`
 *   otherwise.
 */
export function layoutRoadmapGraph(stages: Pick<RoadmapStage, 'state'>[]): RoadmapGraphLayout {
	const count = stages.length;
	if (count === 0) return { nodes: [], edges: [], columns: 0 };

	let trunkCount = 0;
	while (trunkCount < count && stages[trunkCount].state === 'done') trunkCount++;
	if (trunkCount < count) trunkCount++; // la frontera también es tronco

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const frontier = trunkCount - 1;

	const edgeState = (from: number, to: number): GraphEdgeState => {
		if (stages[from].state === 'done') return 'done';
		if (stages[from].state === 'now' && (from === frontier || stages[to].state === 'now')) return 'live';
		return 'future';
	};

	for (let index = 0; index < trunkCount; index++) {
		nodes.push({ index, column: index, lane: 'trunk' });
		if (index > 0) edges.push({ from: index - 1, to: index, state: edgeState(index - 1, index) });
	}

	const remaining = count - trunkCount;

	if (remaining === 0) {
		return { nodes, edges, columns: trunkCount };
	}

	if (remaining === 1) {
		nodes.push({ index: frontier + 1, column: trunkCount, lane: 'trunk' });
		edges.push({ from: frontier, to: frontier + 1, state: edgeState(frontier, frontier + 1) });
		return { nodes, edges, columns: trunkCount + 1 };
	}

	// Dos o más etapas después del tronco: ramas en pares y convergencia final.
	const middleCount = remaining - 1;
	const convergence = count - 1;
	const laneEnd: Partial<Record<'top' | 'bottom', number>> = {};

	for (let i = 0; i < middleCount; i++) {
		const index = trunkCount + i;
		const lane: 'top' | 'bottom' = i % 2 === 0 ? 'bottom' : 'top';
		nodes.push({ index, column: trunkCount + Math.floor(i / 2), lane });

		const previous = laneEnd[lane];
		const from = previous ?? frontier;
		edges.push({ from, to: index, state: edgeState(from, index) });
		laneEnd[lane] = index;
	}

	const convergenceColumn = trunkCount + Math.ceil(middleCount / 2);
	nodes.push({ index: convergence, column: convergenceColumn, lane: 'trunk' });
	for (const lane of ['top', 'bottom'] as const) {
		const end = laneEnd[lane];
		if (end !== undefined) edges.push({ from: end, to: convergence, state: edgeState(end, convergence) });
	}

	return { nodes, edges, columns: convergenceColumn + 1 };
}
