# Feature: Issue #10 — landing consume el backend para todo el contenido

Objective: every landing widget reads its content from the backend API in SSR (issue #9 pattern: loader in `features/`, prop-driven, fallback to current hardcoded constants), admin gets panels for the missing entities, and prod materialization is decided and implemented (adapter SSR).
Branch: root repo `dev` (Santidele22/personal-page) and backend repo `dev` (Santidele22/…, nested checkout `backend/`).
Delivery: work-unit commits per repo (~400 authored lines, conventional commits); frontend runner: pnpm + astro check/build (personal-app); backend: pnpm (lint/build/test/test:e2e). Products decisions fixed 2026-10-18 (see L2).

## Specs

- S1 (from issue #10 AC, verbatim): "Ningún widget de la landing importa datos de `src/entities/*/data.ts` (salvo como fallback offline declarado)."
- S2 (issue #10 AC, verbatim): "Cambiar contenido desde `/admin` se refleja en la landing sin tocar código."
- S3 (issue #10 AC, verbatim): "Sin backend disponible la landing renderiza con los valores actuales (sin 500)."
- S4 (issue #10 AC, verbatim): "Contenido nuevo y público: `401` mutaciones sin sesión / `403` no admin; lecturas públicas."
- S5 (issue #10 AC, verbatim): "Pantalla admin para cada entidad nueva editable."
- S6 (issue #10 AC, verbatim): "Tests del backend (unit + e2e CRUD y lectura pública) y documentación en `backend/README.md`."
- S7 (issue #10 alcance, verbatim): "el o los endpoints que falten (nuevo dominio `tools` como mínimo), CRUD con los guards vigentes: lectura pública `@AllowAnonymous`, mutaciones solo admin. README actualizado."
- S8 (user decision 2026-10-18): "Adapter SSR" — prod runs the Astro server (`@astrojs/node` or equivalent); pages that fetch content render on demand, the rest stays prerendered where possible; fallback constants still guard an API outage.
- S9 (user decision 2026-10-18): "Consumir /blogs (Recommended)" — portada post cards consume `/blogs`; the diario (`src/content`) stays as-is; no unification this issue.
- S10 (user decision 2026-10-18): "Entidad menu-items (Recommended)" — NAV_LINKS become a new `menu-items` domain (label, href, order), admin-editable; `SiteHeader`/mobile nav consume it with fallback to current constants.
- S11 (user decision 2026-10-18): "Extender advertising-plans (Recommended)" — public ad-slot fields live as columns on `advertising-plans` (name, visibility, moment, format, cadence, note); public read endpoint serves the landing; existing plan admin contracts kept working.
- S12 (blogs portada mapping; architecture): the API `Blog` (title, description, content, level) does not carry the portada card fields. Backend `blogs` gains nullable display columns (category, icon, readMin, featured); landing maps `/blogs` rows → Post cards, `date` derived from `createdAt`, no slug requirement (cards are not links today).
- S13 (continúa patrón issue #9, verbatim from issue: "Continúa el patrón y las convenciones de la issue #9 (loader, fallback, `putJson`, `AdminSection`.") — loaders under `src/features/<domain>/api/`, `getJson` with `serverOrigin`; widgets prop-driven with declared fallback; admin sections reuse `AdminSection` pattern.
- S14 (prod wiring, architecture): with SSR, server-side fetch needs a resolvable `/api` path: dev keeps the vite proxy; prod needs the Astro origin + backend reachable behind the same origin (reverse proxy `/api` → Nest) or `PUBLIC_API_BASE_URL` absolute → document in `backend/README.md` and frontend docs; `http.ts` `serverOrigin` resolution must work in prod SSR (not only `import.meta.env.DEV`).

## Tasks

- T1 (S7, S6) — backend dominio `tools` (entity `tools`: name, what; CRUD guards; unit + e2e; README). Route: inline. — DONE (2026-10-18), commit backend `b91ce86`.
- T2 (S7→S10 mux, S6) — backend dominio `menu-items` (label, href, order; CRUD guards; unit + e2e; README). Route: inline. — DONE (2026-10-18), commit backend `200817d` + lint fix `4fbec27`.
- T3 (S11, S6) — backend: `advertising-plans` columnas públicas + endpoint lectura pública; unit + e2e + README. Route: inline. — DONE (2026-10-18), commit backend `820781d`.
- T4 (S12, S6) — backend: `blogs` columnas de portada (category, icon, readMin, featured); unit + e2e + README. Route: inline. — DONE (2026-10-18), commit backend `1cc8b30`. Learned: POST /blogs exige `authorId` (FK a `user`); en SQLite de test el autor inserta directo por repository (Better Auth desmontado).
- T5 (S5, S6, S13) — frontend loaders/features API para posts→/blogs, services, projects, tools, ad-slots, menu-items. Route: inline.
- T6 (S1, S2, S3, S13) — landing widgets: Blog.astro/PostCard/ToolsBlock, Services.astro, Projects.astro, Brands.astro, SiteHeader, SiteFooter consumen loaders con fallback; ningún import de `data.ts` salvo fallback declarado. Route: inline.
- T7 (S5, S13) — panel admin: pantallas servicios y proyectos; tools y menu-items nuevos; columns públicas en publicidad. Route: inline.
- T8 (S8, S14) — adapter SSR en personal-app (per-page prerender fallback), script/proxy prod, documentación cross-repo. Route: inline.
- T9 (S6, S14) — verificación: suite backend completa, astro check/build, chequeo diferencial de comandos existentes; closes AC checklist. Route: inline + verifier si Risk lo nombra.

## Log

- L1 (2026-10-18): "Sigamos con la issue 10" — user asked to start Santidele22/personal-page#10. Explored: backend already has blogs/brands/advertising-plans/services/projects/newsletter/profile with `@AllowAnonymous` reads + `@Roles(['admin'])` mutations; missing: tools, menu-items, ad-slot public fields, blogs portada columns, admin panels, landing consumption, prod materialization.
- L2 (2026-10-18): user decisions on the 4 product forks: prod = **Adapter SSR**; posts = **Consumir /blogs** (diario untouched); NAV_LINKS = **entidad menu-items**; ad-slots = **extender advertising-plans**. Recorded as S8–S11.
- L3 (2026-10-18): exploration notes — `PostCard.astro` cards are NOT anchors (no slug usage today, S12); `BlogLevel` enum (basico/intermedio/avanzado) ≠ portada categories, hence separate nullable columns; `adSlots` entries carry price → they are the public face of plans (S11); `http.ts` resolves `serverOrigin` only because callers currently gate on `import.meta.env.DEV` (S14); admin pages today: diario, perfil, publicidad, suscriptores.
- L4 (2026-10-18): backend tasks T1–T4 closed. Commits: b91ce86 (tools), 200817d + 4fbec27 (menu-items + lint fix), 820781d (advertising-plans public columns), 1cc8b30 (blogs portada columns). Full backend suite green: unit 138/138, e2e 59/59, build + lint (2 pre-existing warnings on profile.service.ts remain).
