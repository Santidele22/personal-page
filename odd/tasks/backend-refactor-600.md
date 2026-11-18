# Backend refactor: max 600 code lines per file

Stage 2 of the refactor plan (`docs/refactorizacion.md`, section 2). Stage 1 (`personal-app/src/`,
max 400) is closed and deployed: `odd/tasks/front-refactor-400.md`. Here: the `backend/` NestJS API.

## Specs

S1. "el front no puede superar las 400 lineas de codigo y el backend max 600." — every file under
`backend/` must stay at or below **600 code lines** (`scc --by-file`, `Code` column), with a
comfortable margin (target ≤ 400 when the split allows it).

S2. "2- backend." — the scope is exactly `backend/`. Nothing outside it is refactored by this
feature, and the already-closed `personal-app/src/` stage is not revisited.

S3. "ejecuta este comando scc --by-file y armes un archivo .md que se llame refactorizacion." +
"nombre del archivo, lineas de codigo, complejidad y un boolean de (se refactoriza?)" — the inventory
lives at `docs/refactorizacion.md`; it is regenerated (never hand-edited) when the code moves.

S4. "segunda sesion. vamos con el backend." — authorization to execute stage 2 now, on a feature
branch, with work-unit commits.

S5. Behavior is preserved exactly: same exported API surface (modules keep importing from their
current paths), same SQL, same JSON shapes on disk, same HTTP contracts (routes, status codes,
validation messages, auth decorators, Swagger metadata), same logs. Refactor only.

## Contract

- **Hard ceiling**: 600 code lines per file; target 400. A file over 600 is a defect of this feature.
- **Public surface stays**: `book-reading.extractor.ts`, `books.service.ts`, etc. keep being importable
  from their current path; a split module re-exports from the original when consumers import it.
- **NestJS wiring untouched**: `@Module` declarations, providers, guards, interceptors, DTOs and
  `app.module.ts` registrations keep their current identity and order unless a move is unavoidable.
- **Tests travel with the code**: existing `*.spec.ts` and `test/*.e2e-spec.ts` must stay green and
  their assertions must not change. A spec that only needs its imports updated is updated; no test is
  renamed, removed, loosened or added for bulk.
- Verification per task, from `backend/`: `pnpm test` (vitest, 34 files / 334 tests at start),
  `pnpm run build` (nest build), and `scc --by-file backend` proving every touched file ≤ 600. When a
  task touches HTTP wiring, `pnpm run test:e2e` for the affected suite.
- Commits: Conventional Commits, one work unit per task, branch `refactor/backend-600`.

## Result

Stage 2 closed: no file under `backend/` exceeds 600 code lines (253 files; largest is
`src/books/reading/reading.xml-blocks.ts` at 576, which keeps the extraction algorithm intact).
`pnpm test` stays at **34 files / 334 tests**, `pnpm run build` clean and `pnpm run lint` at the same
17 pre-existing warnings, task by task.

| Task | File | Before (code / cx) | After (code / cx) | Commit |
| --- | --- | --- | --- | --- |
| T1 | `books/reading/book-reading.extractor.ts` | 2247 / 431 | 28 barrel + 11 modules, max 576 / 131 | `refactor(reading): split the PDF reading extractor into cohesive modules` |
| T2 | `books/books.service.ts` | 293 / 56 | 117 / 2 + 8 helpers | `refactor(books): split the books service into focused helpers` |
| T3 | `database/migrate-local-content.ts` | 165 / 34 | 32 / 6 + 7 modules | `refactor(database): split the local content migration into focused modules` |
| T4 | `books/books.controller.ts` | 308 / 29 | 234 / 7 + 5 modules | `refactor(books): extract the controller helpers` |
| T5 | `auth/dev/dev-session.ts` | 120 / 28 | 12 barrel + 4 modules | `refactor(auth): split the dev session helpers` |
| T6 | `certificates/certificates.controller.ts` | 339 / 26 | 179 / 1 + 4 modules | `refactor(certificates): extract the controller helpers` |
| T7 | `auth/auth-mode.ts` | 74 / 26 | 19 / 8 + 5 modules | `refactor(auth): split the auth mode resolution` |

All commits live in the nested `backend/` repository on branch `refactor/backend-600`; T8 regenerated
`docs/refactorizacion.md` from `scripts/refactor-inventory.mjs` (the inventory is now generated, not
hand-written) in the root repository.

## Tasks

| ID | Scope | Specs | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | `books/reading/book-reading.extractor.ts` (2247, cx 431) → reading modules + barrel | S1 S2 S4 S5 | writer | `refactor(reading): split the PDF reading extractor` |
| T2 | `books/books.service.ts` (293, cx 56) → service helpers by responsibility | S1 S2 S4 S5 | writer | `refactor(books): split the books service` |
| T3 | `database/migrate-local-content.ts` (165, cx 34) → table specs + copy runner | S1 S2 S4 S5 | writer | `refactor(database): split the local content migration` |
| T4 | `books/books.controller.ts` (308, cx 29) → upload/response helpers | S1 S2 S4 S5 | writer | `refactor(books): extract controller helpers` |
| T5 | `auth/dev/dev-session.ts` (120, cx 28) → token helpers | S1 S2 S4 S5 | writer | `refactor(auth): split the dev session helpers` |
| T6 | `certificates/certificates.controller.ts` (339, cx 26) → upload/image helpers | S1 S2 S4 S5 | writer | `refactor(certificates): extract controller helpers` |
| T7 | `auth/auth-mode.ts` (74, cx 26) → env validation helpers | S1 S2 S4 S5 | writer | `refactor(auth): split the auth mode resolution` |
| T8 | Regenerate `docs/refactorizacion.md` and close the stage | S1 S3 | parent | `docs(odd): close the backend refactor` |

T2 (`book-reading.extractor.spec.ts`, 361 code, complexity 0) is dropped: with the extractor split it
still imports the barrel, stays far below the ceiling and has no complexity to reduce, so splitting it
would add churn without a defect to fix.

## Log

L1. "The conversation history before this point was compacted ..." (stage-1 context, see
`odd/tasks/front-refactor-400.md`).

L2. "el front no puede superar las 400 lineas de codigo y el backend max 600." (original request,
carried over from stage 1).

L3. "segunda sesion. vamos con el backend." — stage 2 starts. Facts measured before writing code:
`backend/` has 209 files; exactly **one** file exceeds 600 code lines —
`src/books/reading/book-reading.extractor.ts` (2247 code, complexity 431). The other nine entries
flagged `true` in `docs/refactorizacion.md` are the inventory heuristic (≥ 250 code lines or
complexity ≥ 25): `certificates.controller.ts` 339, `books.controller.ts` 308, `books.service.ts` 293,
`blogs.controller.ts` 263, `migrate-local-content.ts` 165, `seed-blogs.ts` 126, `dev-session.ts` 120,
`auth-mode.ts` 74, plus `book-reading.extractor.spec.ts` 361. They do not violate the 600 ceiling, so
their inclusion is a scope decision asked to the human (L4 records the answer).

L4. Scope answer (2026-11-18): **"Extractor mas los de complejidad alta"** — the extractor (done as T1)
plus every production file with complexity >= 25: `books.service.ts` (cx 56),
`migrate-local-content.ts` (cx 34), `books.controller.ts` (cx 29), `dev-session.ts` (cx 28),
`certificates.controller.ts` (cx 26), `auth-mode.ts` (cx 26). The spec, `blogs.controller.ts`,
`seed-blogs.ts` and the plain list endpoints stay untouched.

L5. Repo layout fact: `backend/` is a **nested independent git repository** (its own `.git`, ignored by
the root repo). Stage-2 code commits therefore live in
`/home/aegir/personal-page/backend` on branch `refactor/backend-600`, while this feature document and
`docs/refactorizacion.md` stay in the root repo. T1's commit: `refactor(reading): split the PDF
reading extractor into cohesive modules`, T2's: `refactor(books): split the books service into focused
helpers`.

L6. Baseline fact for stage 2: `pnpm run test:e2e` is **not** fully green before any stage-2 change.
`test/profile.e2e-spec.ts` fails 2 assertions (`bioParagraphs` length 2 vs 3 and its sibling) while the
other 14 e2e files pass (116/118 tests). No stage-2 task touches `src/profile/**`, so this is a
pre-existing failure kept out of scope: every task is judged against the affected suites, and the unit
suite (`pnpm test`, 34 files / 334 tests) stays the gate.

L7. Verification per task: `pnpm test` green, `pnpm run build` clean and `pnpm run lint` at the same 17
pre-existing warnings after every unit; the HTTP-facing units (T4, T6, T7) also ran their e2e suites
(`books`, `books-s3`, `swagger`, `bootstrap-body-parser`) green. Security-sensitive T5 shipped a
token-compatibility proof (39 signed tokens, 450 verify outcomes, cookie strings and TTL readings
byte-identical before/after) and T7 a warn-literal diff. Independent verifier unavailable (no provider
key for `gentle-ai-verify`), so the evidence is the writer's plus the parent's own runs of `pnpm test`,
`pnpm run build` and the scoped e2e suites.

L8. Residual complexity is reported, not chased: `reading.xml-blocks.ts` keeps cx 33 (target 400
unreachable without rewriting the extraction algorithm), `reading.pdf-layout.ts` 29 and the
pre-existing `profile.service.ts` 34. They are listed in `docs/refactorizacion.md` under "Seguimiento
de complejidad" as future candidates; none violates the 600 ceiling, so none blocks this stage.
