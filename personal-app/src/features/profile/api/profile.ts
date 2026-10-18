import { getJson, putJson } from '../../../shared/api/http';
import type { Profile, UpdateProfile } from '../types';

/**
 * Public read of the singleton profile. The backend always answers `200` with
 * the stored row or its built-in copy, so `null` only means the request itself
 * failed (API down, proxy misconfigured, static build with a relative base):
 * widgets then render their existing hardcoded fallback instead of breaking.
 * `serverOrigin` resolves the relative `/api` base during a server-side render,
 * the same way the admin loaders do.
 */
export async function fetchProfile(serverOrigin?: string): Promise<Profile | null> {
	try {
		return await getJson<Profile>('/profile', { serverOrigin });
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
