import {
	deleteJson as sharedDeleteJson,
	getJson as sharedGetJson,
	patchJson as sharedPatchJson,
	postJson as sharedPostJson,
	putJson as sharedPutJson,
} from './http';
import type { RequestOptions } from './http';
import { getManagedAuthToken } from './managedAuthClient';
import { getAuthMode } from './sessionMode';

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

export async function putJson(path: string, body: unknown): Promise<void> {
	return sharedPutJson(path, body, await authorizedOptions({}));
}

export async function patchJson(path: string, body: unknown): Promise<void> {
	return sharedPatchJson(path, body, await authorizedOptions({}));
}

export async function deleteJson(path: string): Promise<void> {
	return sharedDeleteJson(path, await authorizedOptions({}));
}
