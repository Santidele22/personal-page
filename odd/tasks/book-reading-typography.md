# book-reading-typography

Improve PDF-to-HTML structural parsing, semantic chunk classification, and
editorial UI/UX typography in the immersive reader (`/lecturas/[id]`) while
preserving the nocturnal/paper/aka/bronce palette and backwards compatibility
with existing cached `reading.json` documents.
Branches: `feat/book-reading-typography` (root & `backend`).
Test runners: backend `pnpm test` + `pnpm lint` (vitest + oxlint), frontend
`pnpm test` + `pnpm astro check` + `pnpm build`.

## Specs

- S1: "la forma en que podamos estilar los titulos, sub-titulos, parafos, frases etc. para que tenga una ui/ux bonita y se parseen correctamente." — Backend PDF extraction (`book-reading.extractor.ts`) extracts layout and typography signals via `pdftohtml -xml` (with `pdftotext` and raw PDF buffer fallbacks) to classify hierarchical headings (`level: 1 | 2 | 3`), leaderless and dotted TOCs, quotes/epigraphs, lists, dedications, frontmatter/edition metadata, figure captions, code blocks, inline emphasis runs (`b`, `i`, `code`), de-hyphenated lines, cross-page paragraph continuations, and running header/footer removal.
- S2: "por ejemplo esto es lo que veo como 'feo' [Image#3: portada/edición/traducción todo como h2; Image#4: 09 10 11 12, Para Suzanne..., CONTENIDO, PREFACIO, 1.1 + ¿QUÉ ES...? 3 1.1.1 ... pegados]" — Reader normalization (`personal-app/src/features/book/lib/reader.ts` and `entities/book/types.ts`) supports the extended additive `ReadingChunk` contract and also rescues legacy cached chunks (reconstructing leaderless numbered TOCs like `1.1` + `¿QUÉ ES...? 3 1.1.1 ... 4`, demoting/grouping frontmatter/credits/edition/numeric noise, detecting dedications and quotes/epigraphs, and assigning heading levels).
- S3: "2- Sigamos con la misma estetica y paleta de colores." — Reader UI (`personal-app/src/pages/lecturas/[id].astro`) renders 3-level headings (`h2`, `h3`, `h4`) with numeric mono badges, hierarchical indented TOC entries, styled blockquotes/epigraphs, ordered/unordered lists, dedications, subtle frontmatter/edition metadata, figure captions, inline `strong`/`em`/`code` runs (via safe DOM nodes, never `innerHTML`), and crisp resting paragraph contrast in the existing night/paper/aka/bronce palette.

## Tasks

- T1 [S1] Backend typographic PDF extractor (`pdftohtml -xml` parser, font-size/bold/italic/x-indent analysis, de-hyphenation, running header/footer stripping, semantic chunk classification, inline runs, cross-page paragraph merge, and comprehensive unit tests). Route: inline. Status: `done`. Commit: `backend@626faea`
- T2 [S2] Frontend `ReadingChunk` types + `reader.ts` normalization & legacy-cache rescue (leaderless numbered TOC reconstruction, heading levels `1|2|3`, dedication/quote/list/meta/caption/code support, and unit tests). Route: delegated (`gentle-ai-worker`). Status: `done`. Commit: `caeef65`
- T3 [S3] Reader UI/UX & editorial CSS (`personal-app/src/pages/lecturas/[id].astro`) implementing hierarchy, indented TOC, quotes, lists, dedications, metadata/credits, captions, safe inline runs + cross-run annotation highlighting, and resting contrast in the existing palette. Route: delegated (`gentle-ai-worker`). Status: `done`. Commit: `1dc713f`
- T4 [S1/S2/S3] End-to-end verification across backend (`pnpm test`, `pnpm lint`, `pnpm build`) and frontend (`pnpm test`, `pnpm astro check`, `pnpm build`), plus live sample-PDF extraction check on Tanenbaum & Sabato, and ODD/Engram closure. Route: inline. Status: `done`. Commit: current

## Log

- L1 (2026-11-17): "Quiero que veamos esto ahora: la forma en que podamos estilar los titulos, sub-titulos, parafos, frases etc. para que tenga una ui/ux bonita y se parseen correctamente. por ejemplo esto es lo que veo como 'feo' [Image#3] [Image#4]"
- L2 (2026-11-17): User approved full solution ("1- Dale, avanza nomas rey de reyes. 2- Sigamos con la misma estetica y paleta de colores."). Created `feat/book-reading-typography` in root and `backend`.
- L3 (2026-11-17): Verified all 3 layers end-to-end: backend `nest build`, 34/34 unit files (327 tests), `test/books.e2e-spec.ts` (26/26), `oxlint src/books/` clean on extractor; frontend 22/22 unit files (199 tests), `astro check` (211 files, 0 errors/0 warnings), `astro build` complete; live PDF->`BookDisplayItem` check passed on Sabato (318 items) & Tanenbaum (7897 items, 534 TOC entries).
