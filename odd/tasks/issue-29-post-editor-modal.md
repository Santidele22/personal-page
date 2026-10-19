# issue-29-blog-editor-modal

Objective: the "+ New entry" button of `/admin/diario/` opens a modal of writing with **save as draft** and **explicit "Publish"**, persisting through the backend `/blogs` API (source resolved in issue 28: backend is the only truth).

Branch: `dev` (both repos) · Delivery strategy: `ask-on-risk` · Runners: backend `pnpm test` (+ `pnpm test:e2e`) and frontend `pnpm astro check`/`pnpm exec tsc --noEmit`/`pnpm build`.

## Specs

S1 — Verbatim from the ticket (`gh issue view 29`):

> Poder escribir una entrada del diario directamente desde el panel: modal/ventana de edición con **guardado** (borrador) y un botón explícito de **"Publicar"**. Hoy el botón "+ Nueva entrada" de `/admin/diario/` no abre nada.

S2 — Verbatim scope:

> 2. **Guardado**: persistir la entrada como borrador (no visible en la landing hasta publicar).
> 3. **Botón "Publicar"**: cambia el estado de la entrada a publicada y la hace visible en la landing al recargar.

S3 — Verbatim field scope:

> 1. Modal de edición con campos mínimos de la entrada (título, fecha, contenido — el contenido del diario hoy es markdown en `content/blogs`, ver dependencia).

S4 — Verbatim acceptance criteria:

> - "+ Nueva entrada" abre el modal con los campos y permite guardar borrador.
> - Borrador guardado NO aparece en la landing; aparece en el admin con su estado.
> - "Publicar" deja la entrada visible en la landing al recargar y la admin lista ya la ve publicada.
> - El botón refleja el estado real (deshabilitado con cambios sin guardar, por ejemplo).
> - `pnpm astro check` + `pnpm build` + `pnpm exec tsc --noEmit` y backend en verde (según lo que toque el modal).

S5 — Verbatim out of scope:

> - Editor WYSIWYG o formatos ricos (el contenido sigue siendo markdown).
> - Imágenes adjuntas, comentarios o analytics de lectura.

S6 — Adopted design (bookkeeper assumptions, by decision of the parent):

- **Draft = `pubDate: null`** (consistent with the issue-28 entity comment: an editor may save without a date). NO new columns: the state does not require a migration.
- `GET /blogs` (anonymous) now returns only** published entries** (`pubDate IS NOT NULL`): the landing data and the public API should not leak draft content. `GET /blogs/drafts` (`@Roles(['admin'])`) lists the drafts for the panel.
  - Consequence observed: the e2e `test/blogs-portada.e2e-spec.ts` fixtures must carry `pubDate` and the expectations will be updated with the observed diff.
- `POST /blogs` derives `authorId` from the session (the books pattern: `@Session() session`; `BadRequestException` if there is no session and no DTO authorId). `level` is optional with the default `BASICO` (the modal does not manage levels).
- The modal sends: `title`, `description` (= the first paragraph or an empty value with a validated default), `content` (markdown), optional `pubDate` (yyyy-mm-dd input).
- Save draft = `POST /blogs` without `pubDate`. Publish = `POST /blogs` with `pubDate` (or a `PATCH :id` { pubDate } for an existing draft). Error = honest HTTP message surfaced in the modal.
- The panel diario lists both: the published ones (date source) and the drafts with `status: 'borrador'` (the `AdminPostStatus` union already exists); the KPI "borradores abiertos" stops being hardcoded `0` and counts the real feature.

## Tasks

- T1 · S1-S5+S6 contract (backend repo): the specs first (RED the published-only filter + drafts + session author) → GREEN, the e2e fixtures with `pubDate`. Route: delegated (explicit user instruction "delega a un subagente"). Commit: pending. **DONE 2026-10-19 — commits backend repo `9b9ca50` (contract) + `2486a1d` (fix sharp leak: the drafts answered by slug/id anonymity, review flag that the parent closed inline). RED observed 5 failed → GREEN (unit 133/134, only pre-existing dev-auth); focused e2e 9/9; e2e suite 93/95 (2 pre-existing dev-auth). Skill `work-unit-commits` loaded by the worker.**
- T2 · S1-S4+S6 modal (root repo): the modal with the fields, the two buttons with a real state, loadDiario with drafts, the adapter status `borrador`, honest errors. Verification: astro check + tsc + build + live dev against the dynamic backend of T1 (+ every route of the S4 observed in a real HTTP request). Route: delegated (same explicit instruction). Commit: pending.

Changelog estimate: ~400 lines (backend ~120, frontend ~280).

## Log

L1 — 2026-10-19 — User request verbatim: "Perfecto mergea los datos y delega a un subagente la implementacion de la issue 28" → after the merge of issue 28, in a question the user chose "Delegar la issue 29" (not dupplicate the already-closed #28).
L2 — 2026-10-19 — The issue itself declares the dependency it has on #28 (store de verdade) already resolved: backend. The contract of S6 is documented BEFORE the first write.
L3 — 2026-10-19 — Backend precedent found: `src/books/books.controller.ts` derives the owner from `@Session() session: UserSession | null` and answers `400` without one; the blogs controller gets the same treatment (`@thallesp/nestjs-better-auth`).
L4 — 2026-10-19 — S6 amendment for the review flag of T1: the anonymous draft-offer filter covers ALL the public reads (`GET /blogs`, `GET /blogs/slug/:slug` service-filtered, `GET :id` 404 at the controller); the mutations reuse the lookup under `@Roles(['admin'])` (commits `9b9ca50` + `2486a1d`). Frontend precedent: the editor panels are Solid tsx islands (`widgets/admin/ToolsEditorPanel`, `BooksEditorPanel`, `client:load`) and there is a dev-auth curl tool (`POST /api/auth/dev-login` mints the session cookie).
L5 — 2026-10-19 — Known constraint: the server-side render does not carry the browser's cookie, so reading the drafts (admin route) goes through the browser island, not through the page frontmatter.
L6 — 2026-10-19 — T2 DONE: delegated worker commit root repo `c193b6a` (DiarioEditorPanel.tsx island client:load, features/admin/api/diario.ts with drafts/create/publish, dashboards.loadDiarioPanel, adapter status borrador + KPI real, diario.astro wired). Evidence observed by the worker: dev-login 200; draft POST 201 id 6; anonymous GET /blogs 5 rows (draft absent); drafts route authenticated YES / anonymous 401; PATCH publish → 6 published; /admin/diario/ 200 with the modal markup; cleanup to 5/0. RED/GREEN exception: personal-app has no test runner (structural + real HTTP instead).
L7 — 2026-10-19 — T3 (closure of the T2 flag) DONE inline: `NotFoundException` was missing from the backend import (commit `73ebf29`; tsc green for src, only the pre-existing test/auth.e2e-spec.ts broken). In live dev observed: draft id 6 anonymous GET :id → 404, slug → 404, DELETE cleanup → back to 5 published. The `await` hint in [...slug].astro dropped (commit pending in the root). Pending: visual interactions in the browser (modal open/close, disabled states, dark mode 390px), push/PR of both repos.
