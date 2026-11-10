import { getJson, putJson } from '../../shared/api/authorizedHttp';
import type { ApiBlog } from '../../entities/admin/types';

export {
	MANIFIESTO_CONTENT,
	MANIFIESTO_DESCRIPTION,
	MANIFIESTO_TITLE,
} from './default';

/**
 * The `/manifiesto` singleton article (codex-copy S6): one reserved blog row
 * the panel edits with the same full-page diario editor.
 *
 * `fetchManifesto` is the public read: only a published article serves, so a
 * draft (or an outage) renders the source-controlled default. The editor
 * reads through `fetchManifestoForEditor` (admin session) instead, because a
 * draft must never leak through the public API.
 */
export async function fetchManifesto(serverOrigin?: string): Promise<ApiBlog | null> {
	try {
		return await getJson<ApiBlog | null>('/blogs/manifiesto', { serverOrigin });
	} catch {
		// Backend outage: the page still renders the default copy.
		return null;
	}
}

/** The panel editor's read: the row whatever its publication state. */
export async function fetchManifestoForEditor(): Promise<ApiBlog | null> {
	try {
		return await getJson<ApiBlog | null>('/blogs/manifiesto/editor');
	} catch {
		// No row yet (first visit) or a failed read: the editor opens with the
		// source-controlled default either way.
		return null;
	}
}

export type ManifiestoBody = {
	title: string;
	description: string;
	content: string;
	/** `false` saves as a draft (invisible publicly); `true` publishes. */
	publish: boolean;
};

/** Saves the article: upsert on the reserved slug, admin session required. */
export function saveManifesto(body: ManifiestoBody): Promise<void> {
	return putJson('/blogs/manifiesto', body);
}
