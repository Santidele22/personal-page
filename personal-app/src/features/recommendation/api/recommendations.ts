import { recommendations } from '../../../entities/recommendation/data';
import type { Recommendation } from '../../../entities/recommendation/types';
import { getJson } from '../../../shared/api/http';
import { safeHref } from '../../../shared/api/url';

/**
 * A recommendation row as the public `GET /recommendations` serves it: the
 * editable columns, with `createdAt`/`updatedAt` stripped and the LinkedIn
 * link nullable (`null` or `''` when the admin left it empty).
 */
type ApiRecommendation = {
	id: number;
	quote: string;
	authorName: string;
	authorRole: string;
	relationship?: string | null;
	linkedinUrl?: string | null;
};

function mapRecommendation(row: ApiRecommendation): Recommendation {
	return {
		id: row.id,
		quote: row.quote,
		authorName: row.authorName,
		authorRole: row.authorRole,
		relationship: row.relationship ?? '',
		// http/https/mailto only (shared/api/url.ts), so a stored `javascript:`
		// value can never reach an `href`; `''` means "sin link" and the card
		// renders no «in ↗».
		linkedinUrl: safeHref(row.linkedinUrl) ?? '',
	};
}

/**
 * The home bento read (`widgets/recommendations/Recommendations.astro`).
 * `null` only means the request itself failed (API down, proxy misconfigured,
 * server without the backend): the widget then renders the recommendations it
 * shipped with. An empty stored collection answers `[]` and the widget shows
 * its empty state instead of pinning the old copy. Rows keep the API order
 * (`position ASC, id ASC`). The widget asks for the plain collection, without
 * `offset`/`limit`, so the backend answers the bare array of the contract.
 */
export async function fetchRecommendations(serverOrigin?: string): Promise<Recommendation[] | null> {
	try {
		const rows = await getJson<ApiRecommendation[]>('/recommendations', { serverOrigin });

		return rows.map(mapRecommendation);
	} catch {
		return null;
	}
}

export { recommendations as recommendationsFallback };
