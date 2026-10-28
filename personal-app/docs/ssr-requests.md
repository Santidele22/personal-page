# SSR requests to Render — per-route measurement (issue 44)

Baseline measured on `main` (6fd4c9f) by code inspection of the SSR fetch
modules. Every SSR read goes through `request()` in `src/shared/api/http.ts`
(directly to `BACKEND_URL`, never re-entering the public Worker proxy). The
browser keeps using the same-origin `/api` proxy — unaffected here.

## Baseline: requests fired on a full SSR render (cold, no cache)

| Route | Reads | Duplicated reads |
|---|---|---|
| `/` (home) | profile ×5 (BaseLayout, SiteFooter, Hero, About, Contact), plans ×3 (hero band, footer, Blog slot), brands ×2, blogs, projects, books, services, menu-items | profile ×4, plans ×2, brands ×1 — **14 total** |
| `/about` | profile ×2 (BaseLayout, About + footer read) — 5 (profile+menu+plans+brands+tools) | profile ×1 — **5–6 total** |
| `/blog`, `/blog/:slug` | profile ×2, menu, plans, brands, blogs (+article on slug) | profile ×1 — **5–6 total** |
| `/marcas` | profile ×2, menu, plans, brands ×1–2 | — |
| `/admin/*` (sessioned) | 5-parallel `loadResumen` (plans, brands, blogs, projects, services) per dashboard page + session probes | SSR loaders are bearer/session-gated and admin-owned; **not cached** |
| `/rss.xml` | blogs ×1 (shares `/blogs` with home/blog routes through cache) | — |

Imprescindibles (one read each, must keep flowing): blogs, profile, menu-items,
projects, books, services, advertising-plans, brands (`src/features/*/api/*`,
all `GET`), plus the admin session probes (`GET /session-mode`,
`get-session` — `no-store`).

Duplicadas (dedupe first): profile, advertising-plans, brands — every one
re-fetched per widget though the value can not change within a render.

## Strategy

1. **Per-render dedup + short TTL** (60s fresh, stale-while-revalidate in the
   background): module-level cache in a single choke point,
   `contentCache.ts` used by `request()` for `GET` + SSR-direct + no bearer.
2. **Never cached**: sessions/JWT probes, `/blogs/drafts`, `/api/auth/*`,
   mutating methods, anything sent with a bearer token, admin dashboards.
3. **Invalidate all** cached entries when the `/api` proxy successfully
   forwards a mutating admin request (`src/pages/api/[...path].ts`).
4. **Fallbacks preserved**: a cold read that fails re-throws (widgets keep
   their hardcoded fallbacks); with a warm cache the stale value is served
   while Render is down (currently `fetchBlogRows` takes home down instead).
