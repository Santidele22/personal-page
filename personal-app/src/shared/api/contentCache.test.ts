import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedRead, cacheablePath, invalidateContentCache, setWaitUntil, cachedEntryCount } from './contentCache';

/**
 * Shared cache for every public SSR read (issue 44, specs S3/S4/S7). The
 * unit tests pin the cache semantics; the integration with `getJson` is
 * pinned in http.test.ts.
 */

let now: number;

/** Fake clock: `now` is handed to the cache as its time source. */
const nowSource = () => now;

beforeEach(() => {
  now = 1_000_000;
  invalidateContentCache();
});

const jsonBody = (value: unknown) => () => Promise.resolve(JSON.stringify(value));

describe('cachedRead — cold reads', () => {
  it('stores the first read and keeps serving it inside the fresh window', async () => {
    const fetcher = vi.fn(jsonBody({ name: 'Santi' }));

    const first = await cachedRead('/profile', fetcher, { now: nowSource });
    const second = await cachedRead('/profile', fetcher, { now: nowSource });

    expect(await parse(first)).toEqual({ name: 'Santi' });
    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent cold reads of the same path into one fetcher call', async () => {
    let resolve!: (value: string) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolve = res;
        }),
    );

    const a = cachedRead('/blogs', fetcher, { now: nowSource });
    const b = cachedRead('/blogs', fetcher, { now: nowSource });
    resolve(JSON.stringify([{ id: 1 }]));

    expect(await a).toBe(await b);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('cachedRead — stale window and revalidation', () => {
  it('serves stale data instantly after the fresh window and revalidates in the background', async () => {
    const fetcher = vi.fn(jsonBody({ v: 1 }));
    await cachedRead('/profile', fetcher, { now: nowSource });

    const backgrounds: Promise<unknown>[] = [];
    setWaitUntil((p) => backgrounds.push(p));

    now += 61_000;
    const ready = jsonBody({ v: 2 });

    // After TTL the immediate answer is the stale copy; the revalidation is
    // scheduled, not awaited.
    const stale = await cachedRead('/profile', ready, { now: nowSource });
    expect(stale).toContain('"v":1');
    expect(backgrounds).toHaveLength(1);

    await backgrounds[0];
    expect(cachedEntryCount()).toBe(1);

    now += 1; // revalidation completed: the next read inside its fresh window must not refetch
    await cachedRead('/profile', ready, { now: nowSource });
    expect(fetcher).toHaveBeenCalledTimes(1); // the cold fetch only
  });

  it('serves stale data without throwing when the background revalidation fails', async () => {
    const fetcher = vi.fn(jsonBody({ v: 1 }));
    await cachedRead('/profile', fetcher, { now: nowSource });

    const backgrounds: Promise<unknown>[] = [];
    setWaitUntil((p) => backgrounds.push(p));

    now += 61_000;
    // The revalidation fetcher rejects: the visitor must still get the stale copy.
    await cachedRead('/profile', () => Promise.reject(new Error('Render down')), { now: nowSource });

    await expect(backgrounds[0]).resolves.toBeUndefined();
    expect(cachedEntryCount()).toBe(1); // stale copy still in place
  });

  it('rethrows on a cold read that fails and does not cache the error', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('Render down')));

    await expect(cachedRead('/profile', fetcher, { now: nowSource })).rejects.toThrow('Render down');
    expect(cachedEntryCount()).toBe(0);

    const recovered = jsonBody({ ok: true });
    expect(await cachedRead('/profile', recovered, { now: nowSource })).toContain('"ok":true');
  });
});

describe('cachedRead — invalidation (admin mutations)', () => {
  it('drops every entry so the next read refetches', async () => {
    const fetcher = vi.fn(jsonBody({ v: 1 }));
    await cachedRead('/blogs', fetcher, { now: nowSource });
    expect(cachedEntryCount()).toBe(1);

    invalidateContentCache();
    expect(cachedEntryCount()).toBe(0);

    await cachedRead('/blogs', async () => JSON.stringify({ v: 2 }), { now: nowSource });
    expect(cachedEntryCount()).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('cacheablePath — public read whitelist (spec S7)', () => {
  it.each([
    ['/profile', true],
    ['/blogs', true],
    ['/blogs/slug/mi-entrada', true],
    ['/tools', true],
    ['/menu-items', true],
    ['/books', true],
    ['/books/3', true],
    ['/services', true],
    ['/advertising-plans', true],
    ['/brands', true],
    ['/brands/7', true],
    ['/projects', true],
    ['/blogs/drafts', false],
    ['/session-mode', false],
    ['/auth/get-session', false],
    ['/admin/resumen', false],
    ['/unlikely-endpoint', false],
  ])('%s → cacheable=%j', (path, expected) => {
    expect(cacheablePath(path)).toBe(expected);
  });
});

function parse(raw: string): Promise<unknown> {
  return Promise.resolve(JSON.parse(raw));
}
