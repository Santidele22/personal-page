import { getJson, putJson } from '../../shared/api/authorizedHttp';
import type { ApiBlog } from '../../entities/admin/types';

export {
	MANIFIESTO_CONTENT,
	MANIFIESTO_DESCRIPTION,
	MANIFIESTO_TITLE,
} from './default';

/**
 * The `/manifiesto` singleton article (codex-copy S6): one reserved blog row
 * the panel edits with the same full-page diario editor. Unlike the public
 * slug lookup this answers the saved row whatever its publication state, or
 * `null` when nobody saved it yet — the web falls back to the
 * source-controlled default and the editor opens with it.
 */
export async function fetchManifesto(serverOrigin?: string): Promise<ApiBlog | null> {
	try {
		return await getJson<ApiBlog | null>('/blogs/manifiesto', { serverOrigin });
	} catch {
		// Backend outage: the page still renders the default copy.
		return null;
	}
}

export type ManifiestoBody = {
	title: string;
	description: string;
	content: string;
};

/** Saves the article: upsert on the reserved slug, admin session required. */
export function saveManifesto(body: ManifiestoBody): Promise<void> {
	return putJson('/blogs/manifiesto', body);
}
