# issue-25-tool-links

Objective: add a managed `url` to each tool so the landing links to its page (admin input + backend field + ToolsBlock anchors). Branch: `dev` (local work, no push). Delivery strategy: `exception-ok` (single issue, user works local/dev). Test runner: backend `pnpm -C backend test:e2e` (vitest); frontend `pnpm -C personal-app astro check`, `pnpm -C personal-app build`, `pnpm -C personal-app exec tsc --noEmit`.

## Specs

S1 (backend field, verbatim: "agregar a `Tool` un campo de URL (por ejemplo `url`, opcional), aceptado en create/update"): the `Tool` entity grows an optional `url` column; `POST /tools` and `PATCH /tools/:id` accept it; `GET /tools` returns it. An empty string clears the link; a non-empty value must be an http(s) URL, otherwise `400` and the collection stays untouched. Criterion (verbatim): "`POST /tools` y `PATCH /tools/:id` aceptan `url` y `GET /tools` la devuelve en cada fila."

S2 (admin input, verbatim: "input \"LINK\" en el form de nueva herramienta y en la edición de cada registro; validar formato de URL (permitir vacío si la herramienta todavía no tiene página)"): the ToolsEditorPanel shows a LINK field in the create form and in every row editor; the admin can load, edit and clear the link; the stored value persists after reload. Light client-side validation only (same soft policy as the rest of the panel); the backend keeps the authoritative check.

S3 (landing links, verbatim: "si la herramienta tiene `url`, el click abre su página (`target=\"_blank\"`); si no la tiene, mantener el ancla actual (`#marcas`) hasta que exista el dato"): ToolsBlock anchors use the stored url with `target="_blank"` + `rel="noopener noreferrer"` when present, and keep `#marcas` otherwise. Fallback rows (offline data with no url) keep the current ancla behavior.

S4 (criteria, verbatim): "`pnpm test` / `pnpm test:e2e` (backend) y `pnpm build` + `pnpm astro check` + `pnpm exec tsc --noEmit` (frontend) en verde."

## Tasks

- T1 — S1: RED first in `backend/test/tools.e2e-spec.ts` (create accepts url, GET returns it, PATCH updates it, PATCH with empty string clears it, invalid url → 400 and collection untouched), then entity + dto. Route: inline.
- T2 — S2 + S3: frontend types (`entities/tool/types.ts`, `api/tools-admin.ts`, `api/tools.ts`), ToolsEditorPanel LINK field, ToolsBlock anchors. Route: inline.
- T3 — S4: full backend `pnpm test` + `test:e2e`, frontend build + astro check + tsc. Route: inline.

## Log

- L1: user request (verbatim): "Arranquemos la issue 25" — GitHub issue #25 "admin herramientas: input de link para que cada herramienta redirija a su página", whose body provides the objetivos/estado/alcance/criterios quoted in S1–S4.
- L2: Assumptions (from prior session conventions, issue 22): work stays local/dev, no push, no merge; conventional commits, no Co-Authored-By. `url` stored as given (no normalization); empty string means "sin link".
- L3: Route declaration: all tasks inline; no Writer trigger fired (single sequential flow, units ≤100 changed lines each, disjoint areas edited one after another by the same actor).
