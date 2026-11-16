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
- S4 (Issue #50): "entrar a la web y apretar Leer para leer el PDF dentro de un
  mundo inmersivo, con progreso guardado en backend" — "El elegido fue el 10
  «Espera sonora» (el visor nocturno full-bleed de tu captura), junto con
  07-del-horno-al-visor (el pipeline PDF→HTML)."
- S5 (Issue #50 pipeline `07-del-horno-al-visor`): "PDF entra, HTML se lee
  siempre, reading.json con chunks" — uploaded PDF stays intact as canon;
  extraction generates `reading.json` (`{ bookId, pdfPages, ocrPending, chunks:
  [{ id, type, page, offset, text, mood, cues }] }`), served via
  `GET /books/:id/reading`, with `ocr_pending` fallback for scanned PDFs without
  text, and reading state (`progress`, `marks`, `words`) persisted via
  `GET /books/:id/reading-state` and `PUT /books/:id/reading-state`.
- S6 (Issue #50 feedback lessons on `10-espera-sonora`): "todas las lecciones de
  feedback del diseño elegido (colores legibles, opacidad del progreso, nowrap
  en píldoras, padding del top bar)" — minimum `--w-faint` (`#8a7d66`) for
  ambient/hint text (never `#3a3126` on night bg); full opacity + glow on
  progress bar fill over `#3f3628` track; `white-space: nowrap` on session
  pills ("Guardar progreso", "Volver al inicio"); `.stage` top padding `168px`
  + dense topbar gradient so `h2` never collides with topbar; turntable
  (`.station` + `.deck`) with vinyl/arm, volume, power, auto/manual mood tuning
  with hysteresis, and 3-ink underline + keyword rail.

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
  Issue: Santidele22/personal-page#20 (closed wontfix: T2 streaming holds). Commit: —
- T7 [S4/S5] Backend reading pipeline & state (`07-del-horno-al-visor`):
  extract PDF text per page into `reading.json` chunks (`{ id, type, page,
  offset, text, mood, cues }`) on upload and on-demand for existing local PDFs,
  expose `GET /books/:id/reading` and `GET`/`PUT /books/:id/reading-state`
  (`progress`, `marks`, `words`), e2e RED→GREEN in `test/books.e2e-spec.ts`.
  Route: inline. Status: `done`. Commit: `2fd7350` (backend) — RED 3 failed /
  GREEN 26/26 e2e + 2/2 unit.
- T8 [S4/S6] Frontend book API & "Leer" CTA: add reading/state client helpers
  in `personal-app/src/features/book/api/books.ts` and "Leer" link to
  `/lecturas/[id]` in `BookCard.astro`. Route: inline. Status: `done`. Commit:
  `3ffe439` (root) — vitest 19/19 (137 tests), tsc clean.
- T9 [S4/S5/S6] Immersive reader page `/lecturas/[id].astro` («Espera sonora»,
  `10-espera-sonora.html`): full-bleed nocturnal reader, topbar + `topthread`
  progress, central-band `IntersectionObserver` mood engine with hysteresis,
  turntable deck (vinyl SVG, tonearm, Web Audio ambient synth, volume, power,
  auto/manual), selection pill (3 inks + keyword) + right-margin keyword rail,
  session pills (`Guardar progreso` + `Volver al inicio`), and `ocr_pending`
  fallback. Route: inline. Status: `done`. Commit: `569aade` (root) — astro
  build OK, tsc clean.
- T10 [S4/S5/S6] End-to-end verification (`pnpm test`, `pnpm test:e2e`,
  `astro check`, `tsc --noEmit`, `astro build`) and Engram mirror sync.
  Route: inline. Status: `done`. Commit: `feat/issue-50-lecturas-inmersivo` —
  independent verifier (`gentle-ai-verify`) confirmed S4, S5, S6 and CSP met
  with 0 blockers.

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
- L4 (2026-11-14): Feature request #50 (lectura inmersiva) designed in
  `design/lecturas-inmersivo/` — 7 artboards: vigilia (texto sin bordes),
  claro de sombra, tablero del taller, clausura/timer, foco fovial (ventana
  de 3 párrafos + modo papel/noche), tinta y lupa (subrayado en 3 tintas,
  diccionario/traducción, cuaderno de márgenes exportable) y del horno al
  visor (pipeline). Decisión de arquitectura (artboard 07): el PDF subido
  queda como canon y la página de lectura SIEMPRE renderiza HTML derivado
  (`reading.json`: chunks {id, type, page, offset, text} generados por un
  worker de extracción al subir el libro). El visor no renderiza el PDF
  (solo fallback PDF.js clásico para escaneados sin OCR). Requiere un
  conversor/worker nuevo, fuera del alcance T1–T5: issue dedicado).
- L5 (2026-11-16): "Empecemos con la feature la pagina de lectura: aca tenems
  todo: Diseños — design/lecturas-inmersivo/ - 10 artboards HTML
  (01-fortaleza-taller hasta 10-espera-sonora). El elegido fue el 10 «Espera
  sonora» (el visor nocturno full-bleed de tu captura), junto con
  07-del-horno-al-visor (el pipeline PDF→HTML). [...] Issue / feature doc —
  odd/tasks/books-reading-section.md [...] Memoria — en Engram quedó guardada
  la decisión de arquitectura (PDF entra, HTML se lee siempre, reading.json con
  chunks) y todas las lecciones de feedback del diseño elegido (colores
  legibles, opacidad del progreso, nowrap en píldoras, padding del top bar
  crea una nueva rama y dale para adelante". Created branch
  `feat/issue-50-lecturas-inmersivo` in root and `backend`. Added S4–S6 and
  T7–T10. Starting T7 (backend extraction + reading endpoints).
- L6 (2026-11-16): Completed T7 (`2fd7350` in `backend`: `book-reading.extractor.ts`,
  `update-reading-state.dto.ts`, `GET /books/:id/reading`, `GET`/`PUT /books/:id/reading-state`,
  RED 3 failed → GREEN 26/26 e2e + 314/314 unit), T8 (`3ffe439` in root:
  `fetchBookById`, `fetchBookReading`, `fetchBookReadingState`, `saveBookReadingState`,
  `BookCard.astro` "Leer" CTA, vitest 137/137), and T9 (`569aade` in root:
  `/lecturas/[id].astro` implementing `10-espera-sonora.html` + `07-del-horno-al-visor.html`
  `ocr_pending` fallback, `tsc --noEmit` 0 errors, `astro build` complete).
- L7 (2026-11-16): Completed T10 — independent verifier confirmed S4, S5, S6,
  and CSP compliance all `met` with 0 blockers. Backend unit 314/314, books e2e
  26/26, frontend unit 137/137, `tsc --noEmit` 0 errors, `astro build` OK.
