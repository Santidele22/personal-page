/**
 * Keep-alive cron worker for the Render free-tier backend and Neon Postgres.
 *
 * Render sleeps after ~15 minutes without inbound traffic and Neon Free
 * suspends compute after ~5 minutes of inactivity. This worker pings
 * `/health-db` every 4 minutes during the 12h waking window (10:00–22:00 ART,
 * i.e. 13:00–00:59 UTC) and stays silent overnight so consumption fits within
 * Neon's 100 CU-hours/month free tier.
 */

import { ping, type Env } from './ping.js';

export type { Env };

export default {
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const result = await ping(env.BACKEND_URL);
        if (result.ok) {
          console.log(
            `keep-alive: pinged ${env.BACKEND_URL} -> ${result.status} (attempts=${result.attempts})`,
          );
        } else {
          console.warn(
            `keep-alive: ping to ${env.BACKEND_URL} failed (status=${result.status}, attempts=${result.attempts}); will retry next tick`,
          );
        }
      })(),
    );
  },
};
