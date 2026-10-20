import { getJson, putJson } from '../../../shared/api/http';
import { safeHref } from '../../../shared/api/url';
import type { Profile, UpdateProfile } from '../types';

/**
 * Public read of the singleton profile. The backend always answers `200` with
 * the stored row or its built-in copy, so `null` only means the request itself
 * failed (API down, proxy misconfigured, static build with a relative base):
 * widgets then render their existing hardcoded fallback instead of breaking.
 * `serverOrigin` resolves the relative `/api` base during a server-side render,
 * the same way the admin loaders do.
 *
 * The social URLs the profile stores go through `safeHref` (issue 38): any
 * scheme other than http/https/mailto comes back empty and the widgets fall
 * back to the `app/config/site` constants.
 */
export async function fetchProfile(serverOrigin?: string): Promise<Profile | null> {
	try {
		const profile = await getJson<Profile>('/profile', { serverOrigin });

		return {
			...profile,
			githubUrl: safeHref(profile.githubUrl) ?? '',
			linkedinUrl: safeHref(profile.linkedinUrl) ?? '',
		};
	} catch {
		return null;
	}
}

/**
 * Admin-only upsert for the profile editor. The body may be partial: the
 * backend merges it over the stored row (or the built-in defaults). Errors
 * surface through the shared helper's message mapping so the island can show
 * the real failure.
 */
export function updateProfile(body: UpdateProfile): Promise<void> {
	return putJson('/profile', body);
}
