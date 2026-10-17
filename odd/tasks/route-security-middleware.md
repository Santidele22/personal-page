# Route security middleware (issue #6)

Objective: centralize route security for the backend NestJS API in one global
composition (APP_GUARD): a session guard (401) + a roles guard (403), resolving
the session through the auth abstraction (`AUTH_MODE=dev` signed cookie or
Better Auth), instead of relying on per-route decoration for mutation
protection.

- Branch: backend `dev` (nested repo) + root `dev` for this doc.
- Delivery: work-unit commits on backend `dev`; close with issue #6 comment.
- Test runner: `pnpm test` (unit) and `pnpm test:e2e` (vitest, backend/).
- Related docs: odd/tasks/dev-auth-env-credentials.md (closed), issue #7.

## Specs

Quoted verbatim from issue #6 (Santidele22/personal-page) and its scope note.

- S1: "AuthGuard reutilizable que resuelva la sesión de Better Auth y rechace
  peticiones anónimas con 401." Scope note: "El middleware de seguridad debe
  resolver sesión vía esa abstracción (cookie firmada en dev; Better Auth en
  modo better), NO asumir solo Better Auth."
- S2: "RolesGuard reutilizable (metadato `@Roles`) que rechace sin 403 (admin)"
- S3: "Deduplicar la protección de mutaciones (users, blogs, projects,
  services, brands, advertising-plans) con una composición global coherente
  (APP_GUARD), en vez de decorar a mano cada controller nuevo."
- S4: "Mantener lecturas públicas sin cambiar el contrato actual (ver
  odd/tasks/auth-postgres-better-auth.md, S5)."
- S5 acceptance: "Anónimo → 401 en mutaciones; sin rol admin → 403; admin → OK
  (e2e confirmado también vía proxy dev)."
- S6 acceptance: "Vía de composición (APP_GUARD) sin decoración por-ruta en
  controllers nuevos."
- S7 acceptance: "Cobertura e2e del guard + sección de README actualizada."

Assumption (allowed by the current code): the unified policy follows the
Better Auth guard semantics — everything requires a session unless the route
is `@AllowAnonymous()`; every public read in the domain controllers is already
decorated, so no contract changes. This closes today's dev-mode gap where
admin-only GETs (e.g. `GET /newsletter/subscribers`, `@Roles`) were open to
anonymous callers because the interim guard only checked mutations. Anonymous
callers hitting an admin-only route get 401 (no session); a session without
the role gets 403, matching the existing Better Auth e2e suite.

Limitation (documented, no current usage): the library-only decorators
`@OptionalAuth()`, `@OrgRoles()`, `@RequireActiveOrg()`, `@UserHasPermission()`
and `@MemberHasPermission()` are NOT part of the unified policy; none is used
in this app. If one is used someday it must be added to the guards first.

## Tasks

- T1 [S1] Unified `RouteAuthGuard` + session readers (dev cookie / Better
  Auth), attaching `request.session`/`request.user` like the library guard did.
  Route: inline. Commit: backend dev 5210f08.
- T2 [S2] `RouteRolesGuard` reading the `ROLES` metadata (same key the
  library's `@Roles` writes). Route: inline. Commit: backend dev 5210f08.
- T3 [S3, S6] Composition in `auth.module.ts`: `APP_GUARD` pair for both
  stacks, `disableGlobalAuthGuard: true` on Better Auth, no guard when no auth
  stack is mounted (SQLite fallback stays open). `DevAuthGuard` replaced.
  Route: inline. Commit: backend dev 5210f08.
- T4 [S5, S7] Tests: unit specs for both guards; dev e2e additions (401 on
  admin GET / 200 with session, public reads open, mutations 401); better-mode
  parity stays covered by the Postgres-gated `auth.e2e-spec.ts`. Route: inline.
  Commit: backend dev 5210f08 (tests with the change).
- T5 [S7] README route-security section + close issue with evidence.
  Route: inline. Commit: backend dev 06d8400.

## Log

- L1 (2026-10-17): "Sigamos por la issue #6 (middleware)" — user's request.
  Prior order agreement (issue scope note): interim dev auth → middleware →
  manual UAT by owner ("vía proxy dev" evidence belongs to the UAT issue #8).
- L1 evidence (2026-10-17): explored `auth.module.ts`, `auth-mode.ts`,
  `DevAuthGuard`, all 7 domain controllers (reads already `@AllowAnonymous` or
  `@Roles`), the library guard source (`_reaction` semantics: everything needs
  a session unless public, `ROLES` metadata → 403, supports
  `disableGlobalAuthGuard`) and both e2e suites. Baseline from last session:
  101 unit + 20 e2e green.
- L2 (2026-10-17): T1-T3 done. Baseline observed on this machine before any
  edit: 101 unit green. RED first: new guard unit specs + dev e2e cases
  (admin GET 401 anonymous today) observed failing; then GREEN.
  `RouteAuthGuard` always resolves the session (library parity so `@Session()`
  works), rejects anonymous with 401 except `@AllowAnonymous()`;
  `RouteRolesGuard` reads the library's `ROLES` metadata → 403; both stacks
  share the pair via `APP_GUARD` with `disableGlobalAuthGuard: true`; no
  stack mounted (SQLite fallback) keeps the API open. `DevAuthGuard` deleted.
  Commit: backend dev `5210f08`, then README `06d8400`.
- L3 (2026-10-17): Verification observed: 112 unit + 21 e2e green locally
  (Postgres `personal-page-db` container running; Better Auth sweep passed,
  including 401 anonymous/403 non-admin/admin-OK in `better` mode); build +
  oxlint clean. The new dev e2e pins the changed contract:
  `GET /newsletter/subscribers` without a session is now 401 in every mode.
- L4 (2026-10-17): Native review (RDD, `review_due: high_risk`): lenses
  risk+readability granted by the owner. Verdict `approved`, no correction
  required, acknowledged and authority burned (lineage
  `review-8fc773890c7f4ee4`). 9 findings, all informational/non-blocking,
  recorded as follow-ups:
  - complementary `WARNING`: `RouteRolesGuard` matches the whole role string
    but never splits the comma-separated multi-role form the
    `session-reader.ts` doc mentions; for this app (single `'admin'`) it is
    unreachable; fix in a later candidate if multi-role users appear.
  - `WARNING` (R1): the `@OptionalAuth()`, `@OrgRoles()`,
    `@RequireActiveOrg()`, `@UserHasPermission()`, `@MemberHasPermission()`
    library decorators become no-ops under the composition (documented in
    README); verify no controller uses them before relying on those.
    Verified at close: no controller uses them.
  - readability: leftover `method` fields/unused `metadata` param and a
    misnamed test in the new specs; harmless, batchable into the next
    backend commit.
- L5 (2026-10-17): Feature closed. Follow-up: owner runs the UAT checklist
  (issue #8) including the dev-proxy verification of 401/403.
