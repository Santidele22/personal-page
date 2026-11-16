import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error Vitest raw asset import; keep-alive tsconfig only declares workers-types.
import wranglerRaw from '../wrangler.jsonc?raw';
import worker from './index.js';
import { HEALTH_PATH, KEEP_ALIVE_CRONS, healthUrl, ping } from './ping.js';

describe('healthUrl', () => {
  it('appends the health path to the base URL', () => {
    expect(healthUrl('https://api.example.com')).toBe(
      `https://api.example.com${HEALTH_PATH}`,
    );
  });

  it('trims trailing slashes from the base URL', () => {
    expect(healthUrl('https://api.example.com/')).toBe(
      `https://api.example.com${HEALTH_PATH}`,
    );
  });
});

describe('ping', () => {
  it('returns ok true with the HTTP status on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('up', { status: 200 }));
    const result = await ping('https://api.example.com', fetchImpl);
    expect(result).toEqual({ status: 200, ok: true, attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.example.com${HEALTH_PATH}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('retries transient 5xx/network failures and succeeds if a retry recovers', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('reset'))
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const result = await ping('https://api.example.com', fetchImpl, {
      sleepImpl,
      retryDelayMs: 10,
    });
    expect(result).toEqual({ status: 200, ok: true, attempts: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const result = await ping('https://api.example.com', fetchImpl, {
      sleepImpl,
    });
    expect(result).toEqual({ status: 404, ok: false, attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleepImpl).not.toHaveBeenCalled();
  });

  it('reports a server error as not ok after exhausting retries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 502 }));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const result = await ping('https://api.example.com', fetchImpl, { sleepImpl });
    expect(result).toEqual({ status: 502, ok: false, attempts: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('survives a network failure without throwing after exhausting retries', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('dns failure'));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const result = await ping('https://api.example.com', fetchImpl, { sleepImpl });
    expect(result).toEqual({ status: 0, ok: false, attempts: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('KEEP_ALIVE_CRONS', () => {
  function expandCronHours(cron: string): number[] {
    const hourPart = cron.split(' ')[1]!;
    const hours: number[] = [];
    for (const piece of hourPart.split(',')) {
      if (piece.includes('-')) {
        const [start, end] = piece.split('-').map(Number) as [number, number];
        for (let h = start; h <= end; h++) hours.push(h);
      } else {
        hours.push(Number(piece));
      }
    }
    return hours;
  }

  it('runs every 4 minutes (< 5 min Neon autosuspend)', () => {
    for (const cron of KEEP_ALIVE_CRONS) {
      expect(cron.split(' ')[0]).toBe('*/4');
    }
  });

  it('covers exactly the 12h waking window 13:00-00:59 UTC (10:00-21:59 ART)', () => {
    const covered = new Set(KEEP_ALIVE_CRONS.flatMap(expandCronHours));
    const expectedAwake = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0]);
    expect(covered).toEqual(expectedAwake);
  });

  it('matches triggers.crons in wrangler.jsonc', () => {
    const cleaned = (wranglerRaw as string).replace(/^\s*\/\/.*$/gm, '');
    const parsed = JSON.parse(cleaned) as { triggers: { crons: string[] } };
    expect(parsed.triggers.crons).toEqual([...KEEP_ALIVE_CRONS]);
  });
});

describe('scheduled worker entry', () => {
  it('registers the ping promise with ctx.waitUntil', async () => {
    const waitUntil = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await worker.scheduled(
        {} as ScheduledController,
        { BACKEND_URL: 'https://api.example.com' },
        { waitUntil } as unknown as ExecutionContext,
      );
      expect(waitUntil).toHaveBeenCalledTimes(1);
      await (waitUntil.mock.calls[0]![0] as Promise<void>);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.example.com${HEALTH_PATH}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
