/**
 * Short-lived cache for public SSR reads (issue 44).
 *
 * Every public page render re-reads immutable-within-a-render data from the
 * Render backend (the profile alone is read by five widgets on the home), and
 * the free-tier backend pays for every one of those trips. This module keeps
 * a tiny in-memory map updated at most once per: fresh window (TTL), with a
 * stale-while-revalidate serve for anything beyond it and a plain passthrough
 * (fetcher errors propagate) when nothing was cached yet — current fallbacks
 * for an unavailable Render stay untouched.
 *
 * Scope guards live in `cacheablePath` (what may be cached) and in the caller:
 * sessions, JWT probes, admin/draft reads, authorisation-carrying requests and
 * mutating methods never reach this module.
 */

/** How long a cached entry is served without consulting the backend again. */
export const FRESH_TTL_MS = 60_000;

type CacheOptions = {
	/** Injection point so the unit tests drive the clock deterministically. */
	now?: () => number;
};

/** A cached read: raw response body and when it was fetched (the injected clock). */
type Entry = {
	data: string;
	fetchedAt: number;
};

/** Exact paths (public entity collections the landing uses). */
const CACHEABLE_PATHS = new Set([
	'/profile',
	'/blogs',
	'/tools',
	'/menu-items',
	'/books',
	'/services',
	'/advertising-plans',
	'/brands',
	'/projects',
]);

/** Sub-paths that stay cacheable (the item lookups the public site uses). */
const CACHEABLE_PREFIXES = ['blogs/slug/', 'books/', 'brands/'];

/** Admin-only reads that must never share the public cache. */
const NEVER_CACHED = new Set(['/blogs/drafts']);

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<string>>();
const revalidating = new Set<string>();

/** Where background revalidations are handed to (Cloudflare `waitUntil`). */
let scheduleBackground: ((promise: Promise<unknown>) => void) | undefined;

/** Registers the destination for background revalidation promises. The site
 * middleware passes the Worker's `waitUntil` for the current request; when no
 * sink was set, revalidation still runs fire-and-forget. */
export function setWaitUntil(schedule?: (promise: Promise<unknown>) => void): void {
	scheduleBackground = schedule;
}

/** Drops every entry — the proxy calls this after a successful admin mutation
 * so panel edits surface immediately on the same isolate (spec S6). */
export function invalidateContentCache(): void {
	entries.clear();
	inFlight.clear();
	revalidating.clear();
}

/** Number of cached entries (diagnostics/tests). */
export function cachedEntryCount(): number {
	return entries.size;
}

/**
 * Whether a backend `path` is a public read the cache may serve (spec S7).
 * Only the whitelist entries above: anything else (sessions, drafts, admin,
 * unknown endpoints) is always fetched live.
 */
export function cacheablePath(path: string): boolean {
	const clean = path.replace(/\/+$/, '');
	if (NEVER_CACHED.has(clean)) return false;
	if (CACHEABLE_PATHS.has(clean)) return true;

	return CACHEABLE_PREFIXES.some((prefix) => clean.startsWith(`/${prefix}`));
}

/**
 * Serves `path` through the cache. `fetcher` performs the raw read and returns
 * the serialised response body; it only runs when the cache has no usable
 * copy (mint entry or in-flight read). Errors from it propagate when the cache
 * is cold and are swallowed by background revalidations.
 */
export async function cachedRead(path: string, fetcher: () => Promise<string>, options: CacheOptions = {}): Promise<string> {
	const now = options.now ?? (() => Date.now());
	const timestamp = now();

	const entry = entries.get(path);
	if (entry && timestamp - entry.fetchedAt < FRESH_TTL_MS) {
		return entry.data;
	}

	if (entry) {
		scheduleStaleRevalidation(path, fetcher, now);
		return entry.data;
	}

	// Cold read: collapse every concurrent visitor into one backend call.
	let pending = inFlight.get(path);
	if (!pending) {
		pending = fetcher()
			.then((data) => {
				entries.set(path, { data, fetchedAt: now() });
				return data;
			})
			.finally(() => {
				inFlight.delete(path);
			});
		inFlight.set(path, pending);
	}

	return pending;
}

/**
 * Refreshes a stale entry in the background without blocking the reader.
 * Structured as exactly one revalidation per path: if one is already running,
 * the fresh value it produces will serve the next visitor. A failed
 * revalidation leaves the stale copy authoritative.
 */
function scheduleStaleRevalidation(path: string, fetcher: () => Promise<string>, now: () => number): void {
	if (revalidating.has(path)) return;

	revalidating.add(path);
	const job = fetcher()
		.then((data) => {
			entries.set(path, { data, fetchedAt: now() });
		})
		.catch(() => {
			// Render unreachable or a bad response: the stale entry stays.
		})
		.finally(() => {
			revalidating.delete(path);
		});

	if (scheduleBackground) {
		scheduleBackground(job);
	} else {
		void job;
	}
}
