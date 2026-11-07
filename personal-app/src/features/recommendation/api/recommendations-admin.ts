import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin CRUD for the `recommendations` domain (`/admin/recomendaciones/`) —
 * the LinkedIn recommendations the home renders in its bento section. It is
 * separate from the public loader: the loader softens a failure into the
 * shipped fallback, while the panel must show the real answer the backend
 * gave (`400 { message }` on validation, `401`/`403` on the guards). Bodies
 * travel as JSON (no uploads here); the shared helpers already normalise the
 * API error shape into a Spanish message.
 */

/**
 * A `recommendations` row as `GET /recommendations` serves it. The list
 * already arrives ordered by `position` (ties by id), so the panel renders
 * the stored order as-is.
 */
export type AdminRecommendationRow = {
	id: number;
	quote: string;
	authorName: string;
	authorRole: string;
	/** How the author relates to Santiago, e.g. "Me supervisó directamente". */
	relationship: string;
	/** LinkedIn profile/post link; `''` when the card shows no link. */
	linkedinUrl: string;
	position: number;
	createdAt?: string;
	updatedAt?: string;
};

/**
 * Body of `POST /recommendations`; `PATCH /recommendations/:id` accepts any
 * subset. An omitted `position` leaves ordering to the backend (append on
 * create, keep on update).
 */
export type RecommendationWriteBody = {
	quote: string;
	authorName: string;
	authorRole: string;
	relationship: string;
	/** `''` or a full http(s) URL (`^$|^https?://\S+$` on the DTO). */
	linkedinUrl: string;
	position?: number;
};

/** Stored recommendations in the API order; throws so the panel can offer a retry. */
export function fetchAdminRecommendations(): Promise<AdminRecommendationRow[]> {
	return getJson<AdminRecommendationRow[]>('/recommendations');
}

export function createRecommendation(body: RecommendationWriteBody): Promise<void> {
	return postJson('/recommendations', body);
}

export function updateRecommendation(id: number, body: Partial<RecommendationWriteBody>): Promise<void> {
	return patchJson(`/recommendations/${id}`, body);
}

export function deleteRecommendation(id: number): Promise<void> {
	return deleteJson(`/recommendations/${id}`);
}
