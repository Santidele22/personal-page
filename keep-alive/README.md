# Keep-alive worker

Cloudflare cron worker that keeps the Render free-tier backend awake during
the day and lets it sleep overnight.

## Why

Render sleeps a free web service after ~15 minutes without inbound traffic
(cold start ~50 s on the next request) and Neon Free suspends compute after
~5 minutes of inactivity. Pings target `/health-db`, which runs a real
`SELECT 1`: running every 4 minutes keeps both Render and Neon awake across
a 12h waking window (10:00–22:00 ART) while staying under Neon's 100
CU-hours/month free limit (~93 CU-hours/month at 0.25 CU). Stopping pings
overnight (22:00–10:00 ART) lets both sleep; public SSR reads during those
hours are served from `personal-app`'s Cloudflare KV Edge Cache.

## Schedule (America/Argentina/Buenos_Aires = UTC-3)

| Cron (UTC)       | Local time     | Effect                                  |
| ---------------- | -------------- | --------------------------------------- |
| `*/4 13-23 * * *` | 10:00–20:56 ART | Ping every 4 min (Render + Neon awake) |
| `*/4 0 * * *`     | 21:00–21:56 ART | Ping every 4 min (Render + Neon awake) |
| — (no pings)      | 22:00–10:00 ART | Service sleeps (~93 CU-h/month budget) |

The first backend/admin request after 10:00 ART pays one ~50 s cold start if
the cron hasn't fired yet; public pages are served from Edge Cache.

## Deploy

```sh
pnpm install
pnpm deploy          # wrangler deploy (first time creates the worker)
```

The backend URL lives in `wrangler.jsonc` under `vars.BACKEND_URL`; change it
there if the Render domain ever moves. No secrets needed: the endpoint is
public and side-effect free.

## Verify

```sh
pnpm test                            # unit tests (schedule window, ping behavior)
wrangler triggers deploy --dry-run   # inspect the cron schedule
# Tail live cron executions:
wrangler tail personal-page-keep-alive
```
