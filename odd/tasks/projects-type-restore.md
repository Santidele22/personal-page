# Projects: `type` column, card chip and portfolio restore

Two-or-three-line header: restore the four portfolio projects (deleted from
Neon during the demo-seed cleanup) with data verified against GitHub, add the
new `cyfrin-course-researcher-security-audit` project, and add a `type` column
to `projects` (full-stack / backend / frontend / auditoria / web3) rendered as
a chip on the portada cards.

## Specs

S1: "Aprovechemos esto para volver a subirlo" — reinsert the four real
portfolio projects (Orvel, Whiskito, nft-marketplace, ts-sender-clon) into the
Neon `projects` table. Descriptions/technologies follow the shipped portada
copy for Orvel and the current GitHub repo descriptions for the rest.

S2: "subi tambien los proyectos de auditorias nuevos" — add the audit project
taken from GitHub (`Santidele22/cyfrin-course-researcher-security-audit`,
"Security audit resolutions for the Cyfrin security researcher course"; today
it holds one audit: `3-passwordstore-audit`).

S3: "crea una nueva columna en proyects para que sea 'type' y alla
full-stack, backend, front, auditorias, web3, etc." — `projects` gains a
nullable text `type` column; accepted keys: `full-stack`, `backend`,
`frontend`, `auditoria`, `web3` (free text stored; backend validates only
non-empty string).

S4: chip on the card ("Mostrar chip en tarjeta") — the portada project cards
render the project type as a visible chip/label; unknown stored keys fall back
to the capitalized raw value.

## Tasks

T1 (S3, backend): entity + DTOs accept `type`; unit tests. Route: inline.
T2 (S3, backend): one-off idempotent DDL script `add-project-type.ts`
(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS type text`), run against
`DATABASE_URL_UNPOOLED`. Route: inline (user runs, .env blocked for agent).
T3 (S1+S2+S3, backend): seed-projects restores the 4 projects + audit project
with `type`, idempotent by name; run after T2. Route: inline (user runs).
T4 (S3+S4, frontend): `ProjectType` in types, API mapping with label map,
chip in `Projects.astro`, admin API passthrough; tests. Route: inline.
T5 (all): verification — backend vitest suite, frontend vitest suite, user
runs DDL + seed, portada shows 5 cards with chips.

## Log

L1: "La pagina personal quedo con informacion falsa que no tenia en mi base de
datos de neon. yo no tengo esa info. contame despues que lo resuelvas. porque
se agrego?" — root cause: `pnpm seed:projects` (commit 4005d7c) imported the
four demo projects into Neon.

L2: cleanup deleted the four rows; user confirmed they were real data and
asked to re-upload them plus the audit projects and to add the `type` column
(verbatim request in S1-S3).
