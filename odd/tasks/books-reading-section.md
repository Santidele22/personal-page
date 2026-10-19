# books-reading-section

Books feature end to end: admin can upload PDF books; the landing renders a
"what I'm reading" section with downloads (rate-limited) and reviews.
Branch: `dev` (work-unit commits, PR to `main` at the end). Test runner:
backend `pnpm test` (vitest), frontend `astro check` + `astro build`.

## Specs

- S1: "seccion tanto en la landing como en el admin." — a books/reading
  section exists in both the landing and the admin panel.
- S2: "poder subir libros en formatos pdf, si son libros grandes usar tecnicas
  de chucking para subirlos por partes o buscar formas de optimizarlos." — the
  admin uploads PDFs; large books upload efficiently (streaming-to-disk is the
  chosen optimization; chunked upload only if streaming cannot absorb the cap).
- S3: "Seccion aparte para poder mostra, contar sobre que estoy leyendo, que
  se puedan descargar los pdf (con un rate-limiting) y si hay una reseña o
  comentario sobre ese libro tambien agregarlo." — dedicated landing section
  shows what the owner is reading, each PDF is downloadable with rate
  limiting, and an optional review/comment renders with the book.

Assumptions (marked, not user-verbatim):
- Rate limit default: 10 downloads per IP per rolling 24 h, configurable via
  `BOOKS_DAILY_DOWNLOAD_LIMIT`; exceeded answers `429` with a Spanish message.
- PDFs live on disk under `BOOKS_UPLOAD_DIR` (default `backend/uploads/books/`,
  gitignored); only metadata goes in the database.
- Reading status enum: `reading` | `finished` | `queued` (Spanish labels in UI).

## Tasks

- T1 [S2] Backend books module: entity, DTOs, CRUD following the projects
  pattern (owner from session, public GET). Route: inline. Commit:
  feat(books) — e2e 7/7 (`test/books.e2e-spec.ts`), unit 138/138, build OK.
- T2 [S2] PDF upload: `POST /books/:id/file` multipart, streaming to disk
  (multer disk storage), PDF-only filter, size cap. Route: inline.
  Issue: Santidele22/personal-page#15. Commit: 311b4ab (backend dev). e2e 13/13.
- T3 [S2/S3] Download endpoint `GET /books/:id/download` with per-IP daily
  rate limiting (`download_events` table). Route: inline.
  Issue: Santidele22/personal-page#17. Commit: aaf6357 (backend dev). e2e 16/16.
- T4 [S3] Landing widget `widgets/reading/` + section on the landing. Route:
  delegated. Issue: Santidele22/personal-page#18. Commit: (outer repo, uncommitted) —
  astro check 0/0/0 (119 files), tsc clean, build complete.
- T5 [S1] Admin page `/admin/libros` + `BooksEditorPanel` island + sidebar
  entry. Route: delegated. Issue: Santidele22/personal-page#19. Commit: (outer repo, uncommitted) —
  astro check 0/0/0 (122 files), tsc clean.
- T6 [S2] Chunked upload endpoints, only if T2 evidence shows the streaming
  path cannot absorb large books. Route: inline.
  Issue: Santidele22/personal-page#20 (conditional; closes `wontfix` with
  evidence if T2 holds). Commit: —

## Log

- L1 (2026-10-19): "Vamos a crear esta features: - seccion tanto en la landing
  como en el admin. ADMIN: - poder subir libros en formatos pdf, si son libros
  grandes usar tecnicas de chucking para subirlos por partes o buscar formas de
  optimizarlos. LANDING: - Seccion aparte para poder mostra, contar sobre que
  estoy leyendo, que se puedan descargar los pdf (con un rate-limiting) y si
  hay una reseña o comentario sobre ese libro tambien agregarlo."
- L2 (2026-10-19): Pending blog feature committed (3 commits), pushed, PR 14
  created and merged into `main`; dev fast-forwarded to the merge.
- L3 (2026-10-19): User asked to create GitHub issues for every pending task.
  Created #15 (T2), #17 (T3), #18 (T4), #19 (T5), #20 (T6, conditional). #16
  was a shell mishap duplicate of #17 and got closed. Not dumped into the
  issues: T-internal acceptance details stay in this doc; issues quote the
  verbatim S-strings and link back here.
