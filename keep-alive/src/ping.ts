/**
 * Keep-alive ping logic for the Render free-tier backend + Neon Postgres.
 *
 * Render sleeps a free web service after ~15 minutes without inbound traffic,
 * and Neon Free suspends compute after ~5 minutes of inactivity. This worker
 * pings `/health-db` (which runs `SELECT 1`) every 4 minutes during the 12h
 * waking window (10:00–22:00 America/Argentina/Buenos_Aires, i.e. 13:00–00:59
 * UTC) so both Render and Neon stay warm within Neon's 100 CU-hours/month
 * free quota (~93 CU-hours/month at 0.25 CU).
 */

export interface Env {
  /** Public base URL of the backend, e.g. https://personal-page-backend-ahbb.onrender.com */
  BACKEND_URL: string;
}

/**
 * One keep-alive ping against the backend health endpoint.
 *
 * Kept in its own module (not the worker entry): the Workers runtime only
 * allows handler exports in the entry module, so helpers must live here.
 */
export const HEALTH_PATH = '/health-db';

/** Cron minutes/hours must mirror the `triggers.crons` entries in wrangler.jsonc. */
export const KEEP_ALIVE_CRONS = ['*/4 13-23 * * *', '*/4 0 * * *'] as const;

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const ATTEMPT_TIMEOUT_MS = 60_000;

export interface PingOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}

export interface PingResult {
  status: number;
  ok: boolean;
  attempts: number;
}

export function healthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${HEALTH_PATH}`;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 0 || status >= 500;
}

/**
 * Keep-alive ping with bounded retries on transient failures (network error
 * or 5xx while Render/Neon wakes up). Never throws: if all attempts fail,
 * returns the last status so the scheduled invocation logs and waits for the
 * next 4-minute tick.
 */
export async function ping(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  options: PingOptions = {},
): Promise<PingResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? ATTEMPT_TIMEOUT_MS;
  const sleepImpl = options.sleepImpl ?? defaultSleep;

  const target = healthUrl(baseUrl);
  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await fetchImpl(target, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) {
        return { status: response.status, ok: true, attempts: attempt };
      }
      lastStatus = response.status;
    } catch {
      lastStatus = 0;
    }

    if (!isRetryable(lastStatus) || attempt > maxRetries) {
      return { status: lastStatus, ok: false, attempts: attempt };
    }

    if (retryDelayMs > 0) {
      await sleepImpl(retryDelayMs * attempt);
    }
  }

  return { status: lastStatus, ok: false, attempts: maxRetries + 1 };
}
