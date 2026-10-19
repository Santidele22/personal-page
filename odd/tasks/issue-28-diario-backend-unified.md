# issue-28-diario-backend-unified

Objective: unify the diario (entry archive) under a single source of truth: the backend `/blogs`. Admin, landing, `/blog/` archive, article pages, and RSS consume the unified source; the markdown collection is no longer a supported source (the files stay as the migration source/evidence).

Branch: `dev` · Delivery strategy: `ask-on-risk` · Runners: backend `pnpm test` (vitest) + `pnpm astro check`/`pnpm exec tsc --noEmit`/`pnpm build` in `personal-app`.

## Specs

S1 — Verbatim from the ticket (`gh issue view 28`):

> En `/admin/diario/` el panel dice «Todavía no hay entradas» (SIN DATOS), mientras la landing muestra perfectamente las entradas del diario (destacada + cards de entradas recientes).

S2 — Verbatim decision point:

> 2. Decidir el store único de la verdad: la landing lee el markdown local pero el admin lee del backend. Si el diario se va a administrar desde el panel (ver issue del modal de escritura), el correcto es backend.

S3 — User decision (2026-10-19, this session): **«Backend unificado ya»** — everything in this issue: migrate the existing content, slug, landing+archive+articles read from the backend (runtime markdown rendering, no prerender for the diario routes).

S4 — Acceptance criteria (verbatim from the ticket):

> - `/admin/diario/` lista las mismas entradas que la landing muestra (o documenta por qué difieren y quedan alineadas por decisión tomada).
> - El resumen (`/admin/resumen/`) no queda con KPIs inconsistentes al mismo tiempo.
> - No quedó un source borrado: si se unifica a backend, la landing consume del source unificado.
> - `pnpm astro check` + `pnpm build` en verde (y `pnpm test` backend si lo toca).

S5 — Design adopted (assumptions marked as assumptions):

- Backend `Blog` entity adds `slug` (unique, ≤120 chars), `pubDate` (datetime, nullable), `updatedDate` (datetime, nullable). Dev `synchronize` creates the columns; the table is empty today so there is no data migration risk.
- DTOs (create/update) accept the optional `slug`; the service derives it from the title when missing and throws `ConflictException` on an already-taken slug. `pubDate`/`updatedDate` optional ISO.
- New public read: `GET /blogs/slug/:slug` (`@AllowAnonymous`). The existing `GET /blogs`, CRUD, and portada fields remain unchanged.
- One-time seed (`pnpm seed:blogs` in `backend`): imports the 5 files of `personal-app/src/content/blog/*.md` (slug=filename to keep the public URLs `/blog/<id>/` identical), idempotent (it does not duplicate existing slugs), author = first admin user of better-auth. Assumption: it runs manually in the dev environment; it is not a boot hook.
- Frontend: new `features/blog/api/blogs.ts` maps the API to `Post` (cards) and provides the per-slug lookup for the article. No markdown fallback: if the backend does not respond, the public diario shows empty state (single source of truth; documented tradeoff).
- `widgets/blog/Blog.astro`, `pages/blog/index.astro`, `pages/blog/[...slug].astro`, `pages/rss.xml.js` stop consuming `getCollection('blog')`. The archive and article routes lose `prerender` (new entries from the panel appear without rebuilding). The article renders `content` (markdown DB) with `marked` (new dependency in `personal-app/package.json`).
- `BlogPostLayout` accepts plain data (`pubDate` as ISO or Date) instead of `CollectionEntry<'blog'>`; `astro:assets Image` → `<img>`; the hero-conditional property is kept (although today no entry has a hero).
- Admin adapter: `toDiarioPosts`/dates prefer `pubDate ?? createdAt`.
- Out of scope (from the ticket): reste del contenido editorial; the modal editor (issue 29) builds later on this contract. Known tradeoff: `/blog/*` and `rss.xml` drop out of the static sitemap (`@astrojs/sitemap` only takes pre-rendered pages); documented, a dynamic sitemap can come later.
- XSS tradeoff: `marked` does not sanitize; the content is written by an authenticated `admin` author (later the issue-29 panel). Assumption: the trusted author.

## Tasks

- T1 · S5 (backend) · schema + contract: columns, DTOs, `findBySlug`, `GET /blogs/slug/:slug`, unit specs (RED before the `slug` derive + `findBySlug` code). Route: inline. Commit: pending. **DONE 2026-10-19 — RED 4 failed → GREEN 14/14; suite 130/131 (1 preexisting dev-auth failure); commit backend repo `17e17f4` (backend es repo propio personal-page-backend, /backend/ ignorado por el repo raíz).**
- T2 · S5 (backend) · seed `pnpm seed:blogs` idempotent with import from the 5 md files; observed verification: 5 rows with correct slugs and dates. Route: inline. Commit: pending.
- T3 · S5 (frontend) · `features/blog/api/blogs.ts`, Blog.astro, `/blog/`, `[...slug]` with `marked`, `rss.xml.js`, `BlogPostLayout`; add `marked`. Route: inline. Commit: pending. **DONE 2026-10-19 — astro check 0 errors, tsc 0, build green; observed in dev: landing links 5 slugs, article renders the markdown from the DB, 404 unknown slug, RSS 5 items. `marked@18.1.1` added. Commit pending.**
- T4 · S4+S5 (frontend) · adapter `pubDate ?? createdAt` + differential verification (existing endpoints with the new input) and e2e observed: admin diario, landing, archive, article, RSS. Route: inline. Commit: pending. **DONE 2026-10-19 — commit pending: astro check/tsc 0; dev observed: /admin/diario lists the 5 rows with the stored dates (2026.10.15, 2026.09.14), resumen (admin index) coherent KPI "Entradas: 5", landing/archive/article/RSS 200, unknown article 404.**
- T5 (verification fallout) · entity post-diff dialect fix (the postgres e2e rejects constant 'datetime'): the date type follows the DATABASE_URL split. Observed: unit 130/131 and e2e 91/93 (the 2 dev-auth failures already exist in the base `c31fab8`). Commits backend `93b816b`.

Changelog estimate: ~500 lines authored (backend ~270, frontend ~240 + markdown removed from routes). **Strategy cached 2026-10-19: `stacked-to-main/stacked-dev` — all of the issue's commits to `dev`, one PR dev->main at closing (ask-on-risk answered once).**

## Log

L1 — 2026-10-19 — Original request verbatim: "Sigamos con la issue 28".
L2 — 2026-10-19 — Cause confirmed with code: `dashboards.ts loadDiario` → `fetchBlogs(/blogs)` (empty table) vs `Blog.astro`/`blog/{index,[...slug]}`/`rss.xml.js` → `getCollection('blog')`. The backend already has portada fields but without `slug`; the `/blogs` table has zero rows. Chosen option (question to the user): "Backend unificado ya".
L3 — 2026-10-19 — Relevant incident from the task: the entity's explicit `type: 'datetime'` boots SQLite but the e2e suite (postgres) fails with DataTypeNotSupportedError; the reflection does not infer a `Date | null` union either. Resolved with a dialect-aware column type (T5) confirming that the backend is a separate git repo (`personal-page-backend`, /backend/ is ignored by the root) and the delivery routes: commits on `dev`, one PR at closing.
L4 — 2026-10-19 — Known environmental failures (not part of this feature's green): dev-auth `signs a seven-day admin session…` (unit, 1) and dev-auth e2e (2) assert the hardcoded id from `10b2a1f5`/the c31fab8 prebase; absent and untouched by this change.
L5 — 2026-10-19 — Closing verification observed: `pnpm astro check` + `tsc --noEmit` + `pnpm build` in green; /admin/diario with the same 5 entries as the landing, resumen KPI 5 entradas, unknown article 404, RSS with 5 items on the live dev. Next step: closing PR `Closes #28` when the user approves the push.
