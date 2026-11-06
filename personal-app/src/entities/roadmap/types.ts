/**
 * The /roadmap entities as the anonymous `GET /roadmap` aggregate serves them
 * (`{ stages, milestones }`, both ordered `position ASC, id ASC`, stamps
 * stripped): the editable columns only, with `techs` already an array — the
 * feature adapter parses the stored JSON string when the row still carries it.
 */
export type RoadmapStageState = 'done' | 'now' | 'next';

export type RoadmapStage = {
	id: number;
	title: string;
	summary: string;
	/** Stack chips of the node sublabel, rendered joined with `·`. */
	techs: string[];
	state: RoadmapStageState;
	/** 0–100; the ring of a `now` node and the hero bar read it. */
	progress: number;
};

export type RoadmapMilestoneStatus = 'now' | 'planned';

export type RoadmapMilestone = {
	id: number;
	/** Quarter label as stored, e.g. «Q3 · 2026». */
	quarter: string;
	title: string;
	summary: string;
	status: RoadmapMilestoneStatus;
};

/** The aggregate the public page renders. */
export type Roadmap = {
	stages: RoadmapStage[];
	milestones: RoadmapMilestone[];
};
