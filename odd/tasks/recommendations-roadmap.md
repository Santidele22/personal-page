# Recommendations (LinkedIn) + Roadmap backend→web3

Two new managed entities (backend + admin + public) for the personal site: LinkedIn recommendations shown as a bento section on the home, and a backend→web3 roadmap as its own `/roadmap` page with a node-edge graph. Template: Certificates end-to-end (`odd/tasks/issue-45-certificates.md`). Design: `design/recommendations-roadmap/` (artboards 02 bento = home section, 03 network graph = /roadmap page) + `design/system.md` tokens.

## Specs

S1. "1- espacio para recomendaciones que vamos a sacar de linkedin como [Image#1]" — the image is a real LinkedIn recommendation: author Carlos Fabian Lencina, "CTO | Blockchain & AI Engineer | AI Agents | Solidity & Rust | Full Stack Web & Mobile | iOS & Android |Python · Node · Java · Go · C# · React js React Native · AWS · Azure · Google Cloud | Pix & DREX | OTC Desk", "27 de febrero de 2026, Carlos Fabian supervisaba directamente a Santiago", quote: "Tengo la oportunidad de trabajar con Santiago como Full Stack Developer Jr. dentro del área de tokenizaciones, en un entorno fintech/crypto de alta exigencia, y su evolución fue realmente destacable. Participó activamente en el desarrollo de soluciones vinculadas a emisión y gestión de activos tokenizados, integrando componentes frontend y backend con gran responsabilidad. Siempre recibí muy buenos reportes de los Tech Leads sobre su desempeño, su capacidad de aprendizaje y su compromiso con la calidad, especialmente en flujos sensibles relacionados con blockchain y transacciones. Se caracteriza por su actitud proactiva, su interés por comprender el impacto de lo que construye y su disposición constante a mejorar. Es un profesional en crecimiento, con bases sólidas y gran proyección dentro del ecosistema digital. Sin duda, un talento con mucho futuro en el mundo de la tokenización y el desarrollo full stack."

S2. "2- Vamos a agregar un espacio para mi para poder ver mi progreso como backend - web3 develoment. que sea como mi hoja de ruta. donde haya aristas y demas."

S3. Design comment on artboard 03 (applied): "Me gusta mas este diseño, pero me gustaria que la hoja de ruta este en una pagina aparte. que no este dentro de la page principal."

S4. Design comment on artboard 02 (applied): "Quedemosno con este bento"

S5. User answers (2026-06): data management = "Entidad administrable (backend + admin)" for BOTH recommendations and roadmap; home placement = "Después de Quién soy (About)".

S6. Visual spec = the artboards (not verbatim HTML): `design/recommendations-roadmap/02-bento-stepper.html` (home section: featured card 3fr + two side cards 2fr, hanko initials, mincho quotes, aka quote glyph, "Ver perfil en LinkedIn ↗" link) and `design/recommendations-roadmap/03-network-graph.html` (/roadmap page: hero with overall progress bar, SVG graph with 7 nodes and edges — trunk Fundamentos→Backend I→Backend II bifurcating to Cloud & DevOps and Web3 I, converging into Especialización; live edges animated with dash flow; node rings show % for in-progress; legend; two "Ahora" cards; "Próximos hitos" milestone list). Tokens from `design/system.md` only (aka #c73e3a sole accent, square cards, hairline borders, mincho headings, no dark: utilities — dark via CSS vars).

S7. Content is editable from /admin like Certificates; public widgets render backend data with shipped fallback constants when the API is unreachable (site convention).

S8. Seed/local content (placeholder until real LinkedIn pulls): recommendations = the real Carlos Fabian Lencina quote (S1) + 2 clearly-replaceable stand-ins (Mariana Duarte "Tech Lead · Fintech", Diego Fernández "Senior Backend Engineer") exactly as in artboard 02. Roadmap stages = Fundamentos (done), Backend I (done), Backend II (now, 60%), Web3 I (now, 45%), Cloud & DevOps (next), Web3 II (next), Especialización (next) with the chip labels from artboard 03; milestones = Q3·2026 / Q4·2026 / Q1·2027 entries from artboard 03. The artboard's "54%" overall is illustrative: overall progress = round(mean(stage.progress)).

## Contract

Backend (NestJS, follows `backend/src/certificates/` shape; no file uploads):

- Module `recommendations` — entity `recommendations`: `id`, `quote` text, `authorName` text, `authorRole` text, `relationship` text (e.g. "Me supervisó directamente"), `linkedinUrl` text nullable/'' allowed with `^$|^https?://\S+$` validation, `position` int, `createdAt`/`updatedAt`.
  - `GET /recommendations` @AllowAnonymous → array, or `{items,total,offset,limit}` when offset/limit present; order `position ASC, id ASC`.
  - `GET /recommendations/:id` anonymous; `POST /recommendations` admin (JSON body, class-validator DTO); `PATCH/DELETE /recommendations/:id` admin. `present()` strips stamps for non-admins.
- Module `roadmap` — two entities:
  - `roadmap_stages`: `id`, `title` text, `summary` text, `techs` text (JSON string array, e.g. '["Solidity","EVM"]'; DTO accepts string[] and serializes), `state` text in ('done','now','next'), `progress` int 0–100, `position` int, stamps.
  - `roadmap_milestones`: `id`, `quarter` text (e.g. "Q3 · 2026"), `title` text, `summary` text, `status` text in ('now','planned'), `position` int, stamps.
  - `GET /roadmap` @AllowAnonymous → `{ stages: [...], milestones: [...] }` both ordered `position ASC, id ASC`, stamps stripped. (Deviation from issue-47 envelope: aggregate endpoint, lists are ≤ dozens; no offset/limit on the aggregate. Admin uses the same aggregate for its lists.)
  - Admin CRUD: `POST /roadmap/stages`, `PATCH/DELETE /roadmap/stages/:id`, `POST /roadmap/milestones`, `PATCH/DELETE /roadmap/milestones/:id` (all admin, DTOs with enum + `@Min(0) @Max(100)` on progress).
- Register both modules in `backend/src/app.module.ts`. Seed scripts `pnpm seed:recommendations` / `pnpm seed:roadmap` (pattern `seed:projects`) inserting the S8 content idempotently.

Frontend (personal-app):

- Public: `entities/recommendation/{types.ts,data.ts}` + `features/recommendation/api/recommendations.ts` (fetch + fallback), `widgets/recommendations/Recommendations.astro` rendered in `src/pages/index.astro` immediately AFTER `<About/>`; `entities/roadmap/{types.ts,data.ts}` + `features/roadmap/api/roadmap.ts`, `src/pages/roadmap.astro` (hero + graph + now-cards + milestones, all from fetched data with fallback). Add both paths to `CACHEABLE_PATHS` in `shared/api/contentCache.ts`. Add `/roadmap` to `NAV_LINKS` fallback in `app/config/site.ts`. `Icon.astro` icon union: reuse existing names only.
- Admin: `features/recommendation/{RecommendationsEditorPanel.tsx,api/recommendations-admin.ts}`, `features/roadmap/{RoadmapEditorPanel.tsx,api/roadmap-admin.ts}`, `pages/admin/recomendaciones.astro`, `pages/admin/roadmap.astro`; register both in `entities/admin/types.ts` (AdminSection union) and `widgets/admin/AdminSidebar.astro` (navItems + icon union — reuse existing icon names).
- Nav in production: the `/roadmap` menu row is created via the admin menu panel (`POST /menu-items`); code only ships the `NAV_LINKS` fallback (documented for the user at close).

Tests (project convention): backend co-located vitest specs per module (service behavior + auth decorator metadata contract, like `certificates.service.spec.ts`); frontend tests only for pure helpers (e.g. `entities/roadmap/format.ts` initials/overall-progress helpers) — no .astro rendering tests.

## Tasks

- T1 (S1,S7,S8) Backend recommendations module + spec + seed — route: W-backend — commit: pending
- T2 (S2,S7,S8) Backend roadmap module (stages+milestones) + spec + seed — route: W-backend — commit: pending
- T3 (S4,S6,S7) Public recommendations bento section after About + fallback data + cache — route: W-public — commit: pending
- T4 (S2,S3,S6,S7) Public /roadmap page with SVG graph + now-cards + milestones + NAV_LINKS fallback — route: W-public — commit: pending
- T5 (S1,S7) Admin recommendations panel + page + sidebar registration — route: W-admin — commit: pending
- T6 (S2,S7) Admin roadmap panel + page + sidebar registration — route: W-admin — commit: pending
- T7 Integration: backend specs GREEN, `astro check`, dev smoke (home section after About, /roadmap renders from API and from fallback), report — route: parent — commit: pending

## Log

L1. Original request (verbatim): "Vamos a agregar lo siguiente a mi pagina web. 1- espacio para recomendaciones que vamos a sacar de linkedin como [Image#1] 2- Vamos a agregar un espacio para mi para poder ver mi progreso como backend - web3 develoment. que sea como mi hoja de ruta. donde haya aristas y demas. antes de pasar a codigo pasemos a gentle-desing" (+ LinkedIn recommendation image transcribed in S1).

L2. Design phase: synced `design/system.md` (washi/sumi-e tokens); wrote 3 directions under `design/recommendations-roadmap/`. Canvas comment on 03 (xv60vxub, resolved): roadmap moves to its own page. Canvas comment on 02 (op4zwwra, resolved): "Quedemosno con este bento" — final pair = 02 bento (home) + 03 graph page (/roadmap). Artboard 03's own recommendation variant removed as obsolete.

L3. "Esta todo cerrado, sigamos" — design approved; handoff recorded for both artboards. Answers: managed entities (backend+admin) for both; recommendations after About.

L4. Engram unavailable this session (binary predates v2.0.0-rc.11) — no memory mirror; this file is the tracking of record.
