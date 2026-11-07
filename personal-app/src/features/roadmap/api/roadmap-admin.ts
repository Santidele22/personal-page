import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin CRUD for the `roadmap` domain (`/admin/roadmap/`) — the backend→web3
 * stages and milestones the public `/roadmap` page renders as a node-edge
 * graph. The admin reads through the same aggregate the public page uses
 * (`GET /roadmap`), and mutates through the per-entity admin routes. Bodies
 * travel as JSON (no uploads here); the shared helpers already normalise the
 * API error shape into a Spanish message.
 */

export type RoadmapStageState = 'done' | 'now' | 'next';

export type RoadmapMilestoneStatus = 'now' | 'planned';

/**
 * A `roadmap_stages` row. The column stores `techs` as a JSON string array
 * while the DTO accepts a real `string[]`, so the read may arrive in either
 * shape depending on whether the backend parses it on the way out; the panel
 * normalises through `parseTechs` before editing.
 */
export type AdminRoadmapStageRow = {
	id: number;
	title: string;
	summary: string;
	/** Parsed array, or the raw JSON column (e.g. `'["Solidity","EVM"]'`). */
	techs: string[] | string;
	state: RoadmapStageState;
	/** Integer 0–100; the public page shows it as the node ring fill. */
	progress: number;
	position: number;
	createdAt?: string;
	updatedAt?: string;
};

/** A `roadmap_milestones` row (a "Próximos hitos" entry). */
export type AdminRoadmapMilestoneRow = {
	id: number;
	/** Short label, e.g. "Q3 · 2026". */
	quarter: string;
	title: string;
	summary: string;
	status: RoadmapMilestoneStatus;
	position: number;
	createdAt?: string;
	updatedAt?: string;
};

/** The `GET /roadmap` aggregate; both lists arrive ordered `position ASC, id ASC`. */
export type AdminRoadmapResponse = {
	stages: AdminRoadmapStageRow[];
	milestones: AdminRoadmapMilestoneRow[];
};

/** Body of `POST /roadmap/stages`; `PATCH` accepts any subset. */
export type RoadmapStageWriteBody = {
	title: string;
	summary: string;
	/** The DTO takes the real array and serialises it into the JSON column. */
	techs: string[];
	state: RoadmapStageState;
	progress: number;
	position?: number;
};

/** Body of `POST /roadmap/milestones`; `PATCH` accepts any subset. */
export type RoadmapMilestoneWriteBody = {
	quarter: string;
	title: string;
	summary: string;
	status: RoadmapMilestoneStatus;
	position?: number;
};

/**
 * Normalises `techs` for the editor: a stored array passes through, a raw
 * JSON column is parsed, and anything unexpected degrades to no chips instead
 * of breaking the panel.
 */
export function parseTechs(techs: string[] | string | null | undefined): string[] {
	if (Array.isArray(techs)) return techs;
	if (typeof techs !== 'string' || !techs.trim()) return [];

	try {
		const parsed: unknown = JSON.parse(techs);

		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

/** The stored aggregate in the API order; throws so the panel can offer a retry. */
export function fetchAdminRoadmap(): Promise<AdminRoadmapResponse> {
	return getJson<AdminRoadmapResponse>('/roadmap');
}

export function createRoadmapStage(body: RoadmapStageWriteBody): Promise<void> {
	return postJson('/roadmap/stages', body);
}

export function updateRoadmapStage(id: number, body: Partial<RoadmapStageWriteBody>): Promise<void> {
	return patchJson(`/roadmap/stages/${id}`, body);
}

export function deleteRoadmapStage(id: number): Promise<void> {
	return deleteJson(`/roadmap/stages/${id}`);
}

export function createRoadmapMilestone(body: RoadmapMilestoneWriteBody): Promise<void> {
	return postJson('/roadmap/milestones', body);
}

export function updateRoadmapMilestone(id: number, body: Partial<RoadmapMilestoneWriteBody>): Promise<void> {
	return patchJson(`/roadmap/milestones/${id}`, body);
}

export function deleteRoadmapMilestone(id: number): Promise<void> {
	return deleteJson(`/roadmap/milestones/${id}`);
}
