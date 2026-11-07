import { roadmap } from '../../../entities/roadmap/data';
import type { Roadmap, RoadmapMilestone, RoadmapMilestoneStatus, RoadmapStage, RoadmapStageState } from '../../../entities/roadmap/types';
import { getJson } from '../../../shared/api/http';

/**
 * A stage row as the public `GET /roadmap` aggregate serves it. `techs` is
 * stored as a JSON string array; the public read may hand it over parsed or
 * still serialised, so the adapter accepts both.
 */
type ApiRoadmapStage = {
	id: number;
	title: string;
	summary: string;
	techs?: string[] | string | null;
	state: string;
	progress: number;
};

type ApiRoadmapMilestone = {
	id: number;
	quarter: string;
	title: string;
	summary: string;
	status: string;
};

type ApiRoadmap = {
	stages: ApiRoadmapStage[];
	milestones: ApiRoadmapMilestone[];
};

const STAGE_STATES: RoadmapStageState[] = ['done', 'now', 'next'];
const MILESTONE_STATUSES: RoadmapMilestoneStatus[] = ['now', 'planned'];

/** The stored JSON string array (or an already-parsed array) as string[]. */
function parseTechs(value: ApiRoadmapStage['techs']): string[] {
	if (Array.isArray(value)) return value.filter((tech): tech is string => typeof tech === 'string');

	if (typeof value === 'string' && value.trim()) {
		try {
			const parsed: unknown = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed.filter((tech): tech is string => typeof tech === 'string');
		} catch {
			// Un valor corrupto no rompe la página: el nodo queda sin chips.
		}
	}

	return [];
}

function mapStage(row: ApiRoadmapStage): RoadmapStage {
	const state = STAGE_STATES.find((candidate) => candidate === row.state) ?? 'next';
	const progress = Number.isFinite(row.progress) ? Math.round(row.progress) : 0;

	return {
		id: row.id,
		title: row.title,
		summary: row.summary,
		techs: parseTechs(row.techs),
		state,
		progress: Math.min(100, Math.max(0, progress)),
	};
}

function mapMilestone(row: ApiRoadmapMilestone): RoadmapMilestone {
	return {
		id: row.id,
		quarter: row.quarter,
		title: row.title,
		summary: row.summary,
		status: MILESTONE_STATUSES.find((candidate) => candidate === row.status) ?? 'planned',
	};
}

/**
 * The /roadmap page read: the `{ stages, milestones }` aggregate, already
 * ordered by the backend (`position ASC, id ASC`). `null` only means the
 * request itself failed (API down, proxy misconfigured): the page then
 * renders the roadmap it shipped with. A reachable but empty aggregate
 * answers `{ stages: [], milestones: [] }` and the page shows its empty
 * state — the backend is then the only source of truth.
 */
export async function fetchRoadmap(serverOrigin?: string): Promise<Roadmap | null> {
	try {
		const aggregate = await getJson<ApiRoadmap>('/roadmap', { serverOrigin });

		return {
			stages: (aggregate.stages ?? []).map(mapStage),
			milestones: (aggregate.milestones ?? []).map(mapMilestone),
		};
	} catch {
		return null;
	}
}

export { roadmap as roadmapFallback };
