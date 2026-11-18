# Front refactor: max 400 code lines per file

Split every `personal-app/src/` file that exceeds 400 code lines into cohesive modules, and finish the
container/presentational migration of the admin editor panels that the books/certificates/recommendations
work started. Stage 2 (`backend/`, max 600) is tracked separately and stays out of this feature.

Inventory: `docs/refactorizacion.md` (generated with `scc --by-file`).

## Specs

S1. "lo unico es que lineas de codigo de front maximo 400." — every file that results from this
refactor under `personal-app/src/` must stay at or below **400 code lines** (`scc --by-file`, `Code`
column), with a comfortable margin (target ≤ 250 when the split allows it).

S2. "1- personal-app/ todo lo que este dentro de src/" — the scope is exactly `personal-app/src/`
(250 files, 25 913 code lines); nothing outside it is refactored by this feature. Backend is stage 2
("2- backend.", max 600) and is not touched here.

S3. "ejecuta este comando scc --by-file y armes un archivo .md que se llame refactorizacion." +
"nombre del archivo, lineas de codigo, complejidad y un boolean de (se refactoriza?)" — the inventory
already exists at `docs/refactorizacion.md`; it is regenerated (not hand-edited) whenever the code
changes enough to move a file across the 400 threshold.

S4. "mandale" — authorization to execute stage 1 of the plan order, i.e. the 11 front files over 400
code lines:
`pages/lecturas/[id].astro` (3388), `features/book/lib/reader.ts` (1748), `widgets/hero/duneScene.ts`
(1100), `features/book/lib/reader.test.ts` (1019), `features/roadmap/RoadmapEditorPanel.tsx` (755),
`features/project/ProjectsEditorPanel.tsx` (700), `features/profile/ProfileEditorPanel.tsx` (659),
`features/service/ServicesEditorPanel.tsx` (536), `features/ad-slot/BrandsEditorPanel.tsx` (510),
`features/ad-slot/AdvertisingPlansEditorPanel.tsx` (503), `features/tool/ToolsEditorPanel.tsx` (410).

S5. Behavior is preserved exactly: no copy, layout, markup, style-token, validation-message, API call,
URL, or localStorage/sessionStorage key changes. Refactor only. Public behavior of every page stays
byte-compatible where it is already rendered (same DOM structure, same class names).

## Contract

Conventions every task follows:

- **Admin panels** (T1-T7): container/presentational split already established by
  `features/book/BooksEditorPanel.tsx` + `features/book/components/` and
  `features/certificate/CertificadosEditorPanel.tsx` + `features/certificate/components/`:
  - `<Feature>EditorPanel.tsx` stays a container: `createAdminCrudState` from
    `shared/ui/admin/createAdminCrudState`, local signals (`editingId`, `confirmingDeleteId`,
    `newForm`, `draftForm`, plus per-domain extras), `onMount(() => { void crud.load(); })`,
    `updateNew`/`updateDraft`, `submitValidated`, and handlers only.
  - `components/<Feature>EditorView.tsx` is purely presentational: props in, markup out, built on
    `AdminStatusGate`, `AdminFeedbackBanner`, `AdminCreateSection`, `AdminListSection`.
  - `components/<Entity>RowCard.tsx` on top of `shared/ui/admin/AdminEditableRowCard.tsx`;
    `components/<Entity>Fields.tsx` on top of `AdminField` / `AdminSelectField` /
    `shared/ui/admin/styles.ts`.
  - `<entity>Form.ts` holds the form state type, empty defaults, option constants, row→form and
    form→body mappers, label helpers and the Spanish client-side validation; `<entity>Form.test.ts`
    covers only those pure helpers (project convention: no component rendering tests).
  - Do not modify shared `shared/ui/admin/*` or `shared/lib/adminPanel.ts` unless a task explicitly
    says so; add new shared controls alongside instead.
  - Shared shells (`AdminStatusGate`, `AdminFeedbackBanner`, `AdminCreateSection`, `AdminListSection`,
    `AdminEditableRowCard`) are adopted when the panel's current UX already matches them, accepting the
    small class/layout normalization that books, certificates and recommendations already shipped.
    When a panel has a distinct interaction the shells cannot express (collapsible create form,
    disclosure block, extra per-form error routing, extra copy), keep its exact markup inside the new
    presentational components and adopt only `createAdminCrudState`; S5 wins over cosmetic uniformity.
    Every panel must end with the container/presentational split either way.
- **Non-panel modules** (T8-T11): split by responsibility into sibling modules inside the same
  feature folder, re-exporting from the original path only when a public import must be preserved.
  Pure logic moves to testable modules; DOM/SVG glue stays in the component.
- Every task ends with, from `personal-app/`: `npx vitest run` green and `npx astro check` with
  0 errors and 0 warnings, plus `scc --by-file` proof that each touched file is ≤ 400 code lines.
- Commits: Conventional Commits, one work unit per task, feature branch `refactor/front-400-lines`.

## Tasks

| ID | Scope | Specs | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | `features/tool/ToolsEditorPanel.tsx` → container/presentational | S1 S4 S5 | writer | `refactor(admin): split tools panel` |
| T2 | `features/ad-slot/AdvertisingPlansEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split advertising plans panel` |
| T3 | `features/ad-slot/BrandsEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split brands panel` |
| T4 | `features/service/ServicesEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split services panel` |
| T5 | `features/profile/ProfileEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split profile panel` |
| T6 | `features/project/ProjectsEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split projects panel` |
| T7 | `features/roadmap/RoadmapEditorPanel.tsx` | S1 S4 S5 | writer | `refactor(admin): split roadmap panel` |
| T8 | `features/book/lib/reader.ts` → reading modules | S1 S4 S5 | inline | `refactor(reader): split reading engine` |
| T9 | `features/book/lib/reader.test.ts` → per-module specs | S1 S4 S5 | inline | `test(reader): split reader specs` |
| T10 | `widgets/hero/duneScene.ts` → scene modules | S1 S4 S5 | inline | `refactor(hero): split dune scene` |
| T11 | `pages/lecturas/[id].astro` → page + widgets | S1 S4 S5 | inline | `refactor(lecturas): split reader page` |

## Result

Stage 1 closed: no file under `personal-app/src/` exceeds 400 code lines (355 files, largest
`features/menu/MenuItemsEditorPanel.tsx` at 369). Verified with `npx vitest run` (46 files, 417
tests), `npx astro check` (0 errors, 0 warnings) and `npx astro build` (complete). Inventory
regenerated in `docs/refactorizacion.md`.

| Task | File | Before | After (max) | Commit |
| --- | --- | ---: | ---: | --- |
| T1 | `features/tool/ToolsEditorPanel.tsx` | 410 | 115 | `99ffcfd` |
| T2 | `features/ad-slot/AdvertisingPlansEditorPanel.tsx` | 503 | 200 | `38b318f` |
| T3 | `features/ad-slot/BrandsEditorPanel.tsx` | 510 | 198 | `6e92558` |
| T4 | `features/service/ServicesEditorPanel.tsx` | 536 | 185 | `ea5f2fb` |
| T5 | `features/profile/ProfileEditorPanel.tsx` | 659 | 198 | `4603253` |
| T6 | `features/project/ProjectsEditorPanel.tsx` | 700 | 304 | `2323085` |
| T7 | `features/roadmap/RoadmapEditorPanel.tsx` | 755 | 273 | `b9ccd7f` |
| T8 | `features/book/lib/reader.ts` | 1748 | 252 | `c295a91` |
| T9 | `features/book/lib/reader.test.ts` | 1019 | 223 | `045914f` |
| T10 | `widgets/hero/duneScene.ts` | 1100 | 209 | `0c85309` |
| T11 | `pages/lecturas/[id].astro` | 3388 | 365 | `ce15a2d` |

The pre-existing books and certificates splits from the previous session were committed as their
own units first (`44fe274`, `d0a1296`) so the branch history matches the work units.

## Log

L1. "The conversation history before this point was compacted ... The user asked in Spanish to continue with `personal-app/src/features/certificate/CertificadosEditorPanel.tsx`" (context; already done).

L2. "quiero que hagas lo siguiente:
ejecuta este comando scc --by-file
y armes un archivo .md que se llame refactorizacion.
el front no puede superar las 400 lineas de codigo y el backend max 600."

L3. "borremos el google-cloud-sdk no lo necesitamos.
y la refactorizacion va a ser asi:
1- personal-app/ todo lo que este dentro de src/
2- backend."

L4. "1- refactorizacion en donde lo veas mejor
2- nombre del archivo, lineas de codigo, complejidad y un boolean de (se refactoriza?)
3- no"

L5. "lo unico es que lineas de codigo de front maximo 400."

L6. "mandale" — start stage 1.

L7. Decision (parent, after T1/T2): markup normalization and S5 collided. Resolution recorded in
`## Contract`: shared shells when the panel already matches them (books/certificates/recommendations
precedent), exact markup preserved when the panel has a distinct interaction. T1 normalized onto the
shells; T2 kept its own markup (collapsible create card, public-slot disclosure, per-form error
routing) and adopted only `createAdminCrudState`.

L8. Evidence per task (widget): every task ended with `npx vitest run` green, `npx astro check` at 0
errors / 0 warnings, and `scc --by-file` proving each touched file <= 400 code lines. T11 also ran
`npx astro build` successfully. No test case was added, removed or loosened except the new unit
specs for the extracted pure helpers; `reader.test.ts` was split with its 40 tests preserved and
verified by block-keyed diff.

L9. Slice note: the branch exceeds the ~400 authored-line guidance per commit because one unit here
is one whole panel (container + form module + components + spec). The boundary is the commit: each
commit is one reviewable panel/module and one task in `## Tasks`.
