# Feature: Server Liveness, Cron */4, Pool Resilience & Edge Cache

Goal: Eliminate manual server wake-ups and cold-start 503 errors on Free Tier (\$0) across `keep-alive`, `backend`, and `personal-app`.

## Specs

- **S1** (User request): `"Tratemos de solucionar la muerte del servidor. el cron ya no esta solucionando nada. es como que hay que levantarlo manualmente y no es lo mejor"`
- **S2** (Strategy choice): `"Cron */4 + Caché Edge + resiliencia (Recomendado)"` — Cron every 4 min (`*/4`) with retries, resilient Postgres pool in backend, and persistent Edge Cache (`CONTENT_CACHE` KV) in Cloudflare Workers so public SSR pages return 200 without 503 even when Neon/Render are asleep.
- **S3** (Active window choice): `"12h/día (ej. 10:00–22:00 ART) — seguro en Free Tier"` — `13:00–00:59 UTC` (`*/4 13-23 * * *` and `*/4 0 * * *`, i.e., `10:00–21:59 ART`), staying safely under Neon Free's 100 CU-hours/month limit (`~93 CU-h/month` at 0.25 CU).
- **S4** (Backend pool & health resilience): Configure Postgres `extra` pool options (`idleTimeoutMillis`, `connectionTimeoutMillis`, `keepAlive`, `keepAliveInitialDelayMillis`, `max`) in `backend/src/config/database.config.ts` so Neon autosuspend does not leave stale sockets, and retry transient DB connection errors once in `GET /health-db` (`backend/src/health/health.controller.ts`).
- **S5** (Frontend Edge Cache & SSR timeout): Extend `personal-app/src/shared/api/contentCache.ts` with a Cloudflare KV L2 cache (`CONTENT_CACHE` binding) keyed by final backend URL with global `cache:version` invalidation on successful non-auth proxy mutations (`personal-app/src/pages/api/[...path].ts`), serving valid stale KV copies (`200`) while revalidating in `waitUntil`, writing KV only on payload or version change (well under 1,000 KV writes/day), preserving L1-only behavior when KV is absent (dev/tests) and never caching sessions/drafts/admin/bearer reads; raise `SSR_READ_TIMEOUT_MS` in `personal-app/src/shared/api/http.ts` from `8_000` to `20_000`.

## Tasks

- [x] **T1** (`S1-S3`, route: inline, commit: `38970b6`) — Update `keep-alive` cron to `*/4` on `13:00–00:59 UTC` (`10:00–21:59 ART`), add bounded retries in `keep-alive/src/ping.ts`, remove duplicate default export, update `keep-alive/README.md`, and run tests.
- [x] **T2** (`S1, S4`, route: inline, commit: `backend:1db31c8`) — Add Postgres `extra` pool resilience in `backend/src/config/database.config.ts` and transient retry in `backend/src/health/health.controller.ts`, with unit tests.
- [x] **T3** (`S1, S2, S5`, route: inline + `gentle-ai-verify`, commit: `f089fe8`) — Add Cloudflare KV L2 layer in `personal-app/src/shared/api/contentCache.ts`, wire `CONTENT_CACHE` binding and `SSR_READ_TIMEOUT_MS = 20_000`, wire async version invalidation in proxy/middleware, and add unit tests.
- [x] **T4** (`S1-S5`, route: inline + `gentle-ai-verify`, commit: closing) — Provision `CONTENT_CACHE` KV namespace, deploy `keep-alive` and `personal-app` Workers, run final verification and smoke checks.

## Log

- **L1** (`2026-11-16T17:39:20-03:00`): `"Tratemos de solucionar la muerte del servidor. el cron ya no esta solucionando nada. es como que hay que levantarlo manualmente y no es lo mejor"`
- **L2** (`2026-11-16T17:46:19-03:00`): User selected via `ask_user_question`: Strategy = `"Cron */4 + Caché Edge + resiliencia (Recomendado)"`, Schedule = `"12h/día (ej. 10:00–22:00 ART) — seguro en Free Tier"`.
- **L3** (`2026-11-16T17:55:23-03:00`): Provisioned Cloudflare KV `CONTENT_CACHE` (`d31caa39dcc145d5adef48498fc9842b`), deployed `personal-page-keep-alive` (version `e7bc0b22-856c-4410-a127-38652a9bc1c2`, crons `*/4 13-23 * * *` and `*/4 0 * * *`) and `personal-page` (version `429c3302-6e3d-436a-8c56-cd076d275382`). Smoke tests passed (`/`, `/blog`, `/lecturas`, `/certificados`, `/servicios`, `/proyectos`, `/api/projects` 200; `/admin` 302; remote KV entries populated). `gentle-ai-verify` unavailable (`No API key found for google`). Backend commit `1db31c8` ready on `feat/server-liveness-db-resilience` (pending push/merge to trigger Render deploy).
