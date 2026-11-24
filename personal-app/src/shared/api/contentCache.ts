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

/** Seven-day retention in Cloudflare KV so overnight/idle cold starts still
 * serve the last verified public snapshot while revalidating in background. */
const EDGE_TTL_SECONDS = 604_800;
const EDGE_VERSION_KEY = 'content:version';

export interface EdgeCacheStore {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

type CacheOptions = {
	/** Injection point so the unit tests drive the clock deterministically. */
	now?: () => number;
	/** Optional explicit KV store override (tests); defaults to `edgeStore`. */
	kv?: EdgeCacheStore;
};

/** A cached read: raw response body, timestamp, and edge version. */
type Entry = {
	data: string;
	fetchedAt: number;
	version?: string;
};

type EdgeRecord = {
	v: string;
	data: string;
	fetchedAt: number;
};

/** Exact paths (public entity collections the landing uses). */
const CACHEABLE_PATHS = new Set([
	'/profile',
	'/blogs',
	'/tools',
	'/menu-items',
	'/services',
	'/advertising-plans',
	'/brands',
	'/projects',
	'/certificates',
	'/recommendations',
	'/roadmap',
]);

/**
 * Fixed landing reads with pagination params (issue 47 S12): the same public
 * collections as above, capped to the first page server-side. Only the exact
 * queries the landing issues are listed; dedicated-page reads with a dynamic
 * `?offset=N` stay uncached, the same as any other unknown path.
 */
const CACHEABLE_QUERIED_PATHS = new Set([
	'/certificates?limit=4',
	'/projects?limit=4',
	'/services?limit=4',
]);

/** Sub-paths that stay cacheable (the item lookups the public site uses). */
const CACHEABLE_PREFIXES = ['blogs/slug/', 'brands/'];

/** Admin-only reads that must never share the public cache. */
const NEVER_CACHED = new Set(['/blogs/drafts']);

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<string>>();
const revalidating = new Set<string>();

/** Where background revalidations are handed to (Cloudflare `waitUntil`). */
let scheduleBackground: ((promise: Promise<unknown>) => void) | undefined;
/** Optional Cloudflare KV namespace backing L2 persistence across isolate cold starts. */
let edgeStore: EdgeCacheStore | undefined;

/** Registers the destination for background revalidation promises. The site
 * middleware passes the Worker's `waitUntil` for the current request; when no
 * sink was set, revalidation still runs fire-and-forget. */
export function setWaitUntil(schedule?: (promise: Promise<unknown>) => void): void {
	scheduleBackground = schedule;
}

/** Registers the Cloudflare KV store for L2 edge persistence. */
export function setEdgeCacheStore(store?: EdgeCacheStore): void {
	edgeStore = store;
}

function edgeKey(path: string): string {
	return `content:entry:${path}`;
}

function runBackground(job: Promise<unknown>): void {
	if (scheduleBackground) {
		scheduleBackground(job);
	} else {
		void job;
	}
}

async function readEdgeVersion(kv: EdgeCacheStore): Promise<string> {
	try {
		return (await kv.get(EDGE_VERSION_KEY)) ?? '0';
	} catch {
		return '0';
	}
}

async function readEdgeEntry(
	kv: EdgeCacheStore,
	path: string,
): Promise<{ version: string; record: EdgeRecord | null }> {
	try {
		const [rawVersion, rawRecord] = await Promise.all([kv.get(EDGE_VERSION_KEY), kv.get(edgeKey(path))]);
		const version = rawVersion ?? '0';
		if (!rawRecord) return { version, record: null };

		const parsed = JSON.parse(rawRecord) as Partial<EdgeRecord> | null;
		if (
			parsed &&
			typeof parsed.v === 'string' &&
			typeof parsed.data === 'string' &&
			typeof parsed.fetchedAt === 'number'
		) {
			return { version, record: parsed as EdgeRecord };
		}
		return { version, record: null };
	} catch {
		return { version: '0', record: null };
	}
}

async function putEdgeRecord(
	kv: EdgeCacheStore,
	path: string,
	version: string,
	data: string,
	fetchedAt: number,
): Promise<void> {
	try {
		const payload: EdgeRecord = { v: version, data, fetchedAt };
		await kv.put(edgeKey(path), JSON.stringify(payload), { expirationTtl: EDGE_TTL_SECONDS });
	} catch {
		// KV write errors must never fail SSR or background revalidation.
	}
}

/** Drops every L1 entry synchronously and bumps the edge KV version so other
 * isolates stop serving pre-mutation snapshots after an admin edit. */
export function invalidateContentCache(options?: { kv?: EdgeCacheStore }): Promise<void> {
	entries.clear();
	inFlight.clear();
	revalidating.clear();

	const kv = options?.kv ?? edgeStore;
	if (!kv) {
		return Promise.resolve();
	}

	const nextVersion = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return kv.put(EDGE_VERSION_KEY, nextVersion).catch(() => {
		// Best-effort KV version bump; L1 on this isolate is already cleared.
	});
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
	if (NEVER_CACHED.has(clean)) {
		return false;
	}
	if (CACHEABLE_PATHS.has(clean) || CACHEABLE_QUERIED_PATHS.has(clean)) return true;

	return CACHEABLE_PREFIXES.some((prefix) => clean.startsWith(`/${prefix}`));
}

/**
 * Serves `path` through L1 memory + optional L2 Cloudflare KV cache.
 * - L1 fresh hit: returns immediately.
 * - L1 stale hit: returns stale immediately and revalidates in background.
 * - L1 miss with valid L2 KV hit (same `content:version`): returns KV snapshot
 *   immediately (preventing cold-start 503s) and revalidates in background if stale.
 * - Cold miss: fetches live, caches in L1 and schedules L2 KV put.
 */
export async function cachedRead(path: string, fetcher: () => Promise<string>, options: CacheOptions = {}): Promise<string> {
	const now = options.now ?? (() => Date.now());
	const kv = options.kv ?? edgeStore;
	const timestamp = now();

	const entry = entries.get(path);
	if (entry && timestamp - entry.fetchedAt < FRESH_TTL_MS) {
		return entry.data;
	}

	if (entry) {
		scheduleStaleRevalidation(path, fetcher, now, kv, entry.version, entry.data);
		return entry.data;
	}

	// Cold read: collapse every concurrent visitor into one KV + backend check.
	let pending = inFlight.get(path);
	if (!pending) {
		pending = (async () => {
			let currentVersion = '0';
			if (kv) {
				const edge = await readEdgeEntry(kv, path);
				currentVersion = edge.version;
				if (edge.record && edge.record.v === currentVersion) {
					entries.set(path, {
						data: edge.record.data,
						fetchedAt: edge.record.fetchedAt,
						version: edge.record.v,
					});
					if (now() - edge.record.fetchedAt >= FRESH_TTL_MS) {
						scheduleStaleRevalidation(path, fetcher, now, kv, edge.record.v, edge.record.data);
					}
					return edge.record.data;
				}
			}

			const data = await fetcher();
			const fetchedAt = now();
			entries.set(path, { data, fetchedAt, version: currentVersion });
			if (kv) {
				runBackground(putEdgeRecord(kv, path, currentVersion, data, fetchedAt));
			}
			return data;
		})().finally(() => {
			inFlight.delete(path);
		});
		inFlight.set(path, pending);
	}

	return pending;
}

/**
 * Refreshes a stale entry in the background without blocking the reader.
 * Structured as exactly one revalidation per path: if one is already running,
 * the fresh value it produces will serve the next visitor. Skips KV writes when
 * both payload and version match to stay well below KV's daily write cap.
 */
function scheduleStaleRevalidation(
	path: string,
	fetcher: () => Promise<string>,
	now: () => number,
	kv: EdgeCacheStore | undefined,
	previousVersion: string | undefined,
	previousData: string | undefined,
): void {
	if (revalidating.has(path)) return;

	revalidating.add(path);
	const job = fetcher()
		.then(async (data) => {
			const fetchedAt = now();
			const latestVersion = kv ? await readEdgeVersion(kv) : '0';
			entries.set(path, { data, fetchedAt, version: latestVersion });
			if (kv && (data !== previousData || previousVersion !== latestVersion)) {
				await putEdgeRecord(kv, path, latestVersion, data, fetchedAt);
			}
		})
		.catch(() => {
			// Render unreachable or a bad response: the stale entry stays.
		})
		.finally(() => {
			revalidating.delete(path);
		});

	runBackground(job);
}
