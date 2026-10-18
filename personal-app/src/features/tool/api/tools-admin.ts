import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/http';

/**
 * Admin CRUD for the `tools` domain (`/admin/herramientas/`), separate from the
 * landing loader (`./tools.ts`) because the two have opposite error policies:
 * the landing softens a failure into its fallback, while the panel must show the
 * real answer the backend gave (`400 { message }` on validation, `401`/`403` on
 * the guards). These calls run in the browser island, so they keep the relative
 * `/api` base and need no `serverOrigin`.
 */

/** A row as `GET /tools` serves it; the landing only reads `name` and `what`. */
export type ToolRow = {
	id: number;
	name: string;
	what: string;
};

/** Body of `POST /tools`; `PATCH /tools/:id` accepts any subset of it. */
export type ToolInput = {
	name: string;
	what: string;
};

export function fetchToolRows(): Promise<ToolRow[]> {
	return getJson<ToolRow[]>('/tools');
}

export function createTool(body: ToolInput): Promise<void> {
	return postJson('/tools', body);
}

export function updateTool(id: number, body: Partial<ToolInput>): Promise<void> {
	return patchJson(`/tools/${id}`, body);
}

export function deleteTool(id: number): Promise<void> {
	return deleteJson(`/tools/${id}`);
}
