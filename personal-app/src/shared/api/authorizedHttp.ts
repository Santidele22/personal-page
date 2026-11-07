import {
	deleteJson as sharedDeleteJson,
	getJson as sharedGetJson,
	patchJson as sharedPatchJson,
	postJson as sharedPostJson,
	postJsonReturning as sharedPostJsonReturning,
	putJson as sharedPutJson,
} from './http';
import type { RequestOptions } from './http';
import { getManagedAuthToken } from './managedAuthClient';
import { getAuthMode } from './sessionMode';

/** Bearer token when Managed Neon Auth is active; the XHR image upload needs
 * the raw header because multipart progress cannot reuse the fetch helpers. */
export async function getBearerToken(): Promise<string | undefined> {
	if (typeof window === 'undefined' || (await getAuthMode()) !== 'neon') {
		return undefined;
	}

	return getManagedAuthToken();
}

async function authorizedOptions(options: RequestOptions): Promise<RequestOptions> {
	return { ...options, bearerToken: await getBearerToken() };
}

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
	return sharedGetJson<T>(path, await authorizedOptions(options));
}

export async function postJson(path: string, body: unknown): Promise<void> {
	return sharedPostJson(path, body, await authorizedOptions({}));
}

/** POST whose 201 body is read back (the created entry `id`, for example). */
export async function postJsonReturning<T>(path: string, body: unknown): Promise<T> {
	return sharedPostJsonReturning<T>(path, body, await authorizedOptions({}));
}

export async function putJson(path: string, body: unknown): Promise<void> {
	return sharedPutJson(path, body, await authorizedOptions({}));
}

export async function patchJson(path: string, body: unknown): Promise<void> {
	return sharedPatchJson(path, body, await authorizedOptions({}));
}

export async function deleteJson(path: string): Promise<void> {
	return sharedDeleteJson(path, await authorizedOptions({}));
}
