import { describe, expect, it } from 'vitest';
import { layoutRoadmapGraph, milestoneStatusLabel, overallProgress, stateLabel } from './format';
import type { RoadmapStageState } from './types';

/**
 * Pure helpers of the /roadmap page (issue 48, specs S2/S6/S8): the overall
 * percentage is the rounded mean of the stage progresses (the artboard's "54%"
 * was illustrative), the state labels are the Spanish copy the legend and the
 * chips render, and the graph layout places any N stages on the trunk/branch
 * grid without breaking when the count differs from the designed seven.
 */

const stage = (state: RoadmapStageState, progress: number) => ({ state, progress });

/* The shipped fallback (S8): Fundamentos y Backend I hechas, Backend II al
   60% y Web3 I al 45%, el resto pendiente. */
const SEED_STAGES = [
	stage('done', 100),
	stage('done', 100),
	stage('now', 60),
	stage('now', 45),
	stage('next', 0),
	stage('next', 0),
	stage('next', 0),
];

describe('overallProgress', () => {
	it('is the rounded mean of the stage progresses', () => {
		expect(overallProgress(SEED_STAGES)).toBe(44); // 305 / 7 ≈ 43.57
	});

	it('rounds halves up and truncates below them', () => {
		expect(overallProgress([stage('now', 50), stage('next', 0)])).toBe(25);
		expect(overallProgress([stage('now', 33), stage('now', 33), stage('next', 0)])).toBe(22);
	});

	it('is 0 for an empty roadmap instead of NaN', () => {
		expect(overallProgress([])).toBe(0);
	});
});

describe('stateLabel', () => {
	it('names every stage state in Spanish', () => {
		expect(stateLabel('done')).toBe('Completada');
		expect(stateLabel('now')).toBe('En progreso');
		expect(stateLabel('next')).toBe('Próxima');
	});
});

describe('milestoneStatusLabel', () => {
	it('names every milestone status in Spanish', () => {
		expect(milestoneStatusLabel('now')).toBe('En curso');
		expect(milestoneStatusLabel('planned')).toBe('Planificado');
	});
});

describe('layoutRoadmapGraph', () => {
	it('reproduces the artboard trunk/branch shape for the seven seed stages', () => {
		const graph = layoutRoadmapGraph(SEED_STAGES);

		expect(graph.columns).toBe(6);
		expect(graph.nodes.map((node) => [node.index, node.column, node.lane])).toEqual([
			[0, 0, 'trunk'], // Fundamentos
			[1, 1, 'trunk'], // Backend I
			[2, 2, 'trunk'], // Backend II (frontera)
			[3, 3, 'bottom'], // Web3 I
			[4, 3, 'top'], // Cloud & DevOps
			[5, 4, 'bottom'], // Web3 II
			[6, 5, 'trunk'], // Especialización (convergencia)
		]);
	});

	it('marks edges done/live/future from the states of the stages they join', () => {
		const graph = layoutRoadmapGraph(SEED_STAGES);
		const edges = graph.edges.map((edge) => [edge.from, edge.to, edge.state]);

		expect(edges).toEqual([
			[0, 1, 'done'], // Fundamentos → Backend I
			[1, 2, 'done'], // Backend I → Backend II
			[2, 3, 'live'], // Backend II → Web3 I
			[2, 4, 'live'], // Backend II → Cloud & DevOps
			[3, 5, 'future'], // Web3 I → Web3 II
			[4, 6, 'future'], // Cloud & DevOps → Especialización
			[5, 6, 'future'], // Web3 II → Especialización
		]);
	});

	it('lays a fully done roadmap out as a plain chain', () => {
		const graph = layoutRoadmapGraph([stage('done', 100), stage('done', 100), stage('done', 100)]);

		expect(graph.columns).toBe(3);
		expect(graph.nodes.every((node) => node.lane === 'trunk')).toBe(true);
		expect(graph.edges).toEqual([
			{ from: 0, to: 1, state: 'done' },
			{ from: 1, to: 2, state: 'done' },
		]);
	});

	it('continues the trunk in line when a single stage remains after the frontier', () => {
		const graph = layoutRoadmapGraph([stage('done', 100), stage('next', 0)]);

		expect(graph.columns).toBe(2);
		expect(graph.nodes.map((node) => node.lane)).toEqual(['trunk', 'trunk']);
		expect(graph.edges).toEqual([{ from: 0, to: 1, state: 'done' }]);
	});

	it('handles a single stage and an empty roadmap without edges', () => {
		const single = layoutRoadmapGraph([stage('now', 10)]);
		expect(single.columns).toBe(1);
		expect(single.nodes).toEqual([{ index: 0, column: 0, lane: 'trunk' }]);
		expect(single.edges).toEqual([]);

		expect(layoutRoadmapGraph([])).toEqual({ nodes: [], edges: [], columns: 0 });
	});

	it('branches from the first stage when nothing is done yet', () => {
		const graph = layoutRoadmapGraph([stage('now', 20), stage('next', 0), stage('next', 0)]);

		// Trunk = solo la frontera; los dos siguientes abren rama y convergencia.
		expect(graph.nodes.map((node) => node.lane)).toEqual(['trunk', 'bottom', 'trunk']);
		expect(graph.edges).toEqual([
			{ from: 0, to: 1, state: 'live' },
			{ from: 1, to: 2, state: 'future' },
		]);
	});
});
