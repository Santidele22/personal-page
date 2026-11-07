# Auth: reconectar Better Auth con sesión Bearer + criterios de seguridad

Objective: al reconectar Better Auth, la sesión del admin viaja por `Authorization: Bearer <token>` (plugin `bearer`) como esquema principal — no cookie. Motivo: compatibilidad con dominios distintos en producción (issue #42), no seguridad. Apagar el modo interino `AUTH_MODE=dev` al final.
Branch: a definir al retomar. Tracking issue: Santidele22/personal-page#43. Relacionada: #42 (deploy free tier).
Delivery: work-unit commits; runners pnpm (vitest backend / build+check frontend).

## Specs

- S1 (bearer plugin): `bearer()` en `backend/src/auth/auth.ts`; el cliente del admin (`personal-app/src/features/auth`) guarda el token y lo adjunta por header.
- S2 (storage del token, decisión clave): memoria vs `localStorage` — este último exige higiene XSS estricta + CSP (ya hay CSP por middleware, issue #41).
- S3 (TTL + rotación): `session.expiresIn` / `updateAge` cortos.
- S4 (revocación): logout revoca server-side; el guard consulta la sesión en DB, no confía solo en firma.
- S5 (rate limiting) en endpoints de login.
- S6 (CORS simplificado): allowlist del origen del frontend, sin `credentials: true` ni cookies cross-site.
- S7 (switch final): `AUTH_MODE=better`; el guard de Better Auth vuelve a ser el único; el modo dev queda como fallback documentado.
- S8 (pendientes): qué proyecto Neon (`plain-bird-10024768` vs `sparkling-smoke-80537831`). ~~Neon Auth managed vs self-hosted~~ → resuelto: híbrido (L2).
- S9 (híbrido, L2): guard JWT para prod — verificación JWKS contra `NEON_AUTH_JWKS_URL` + mapeo de claims → rol admin, reusando la metadata `PUBLIC`/`ROLES` existente (SetMetadata leíble con Reflector, sin tocar controllers). Selección de guard por `DB_MODE`, análoga a la selección de store.

## Tasks

- T1 (S1–S7) — PENDING: implementación bearer + criterios de seguridad + switch de modo, con suite de tests del modo better actualizada (hoy el e2e corre en los 3 modos).
- T2 (S8) — PENDING: elegir proyecto Neon (`plain-bird-10024768` vs `sparkling-smoke-80537831`) antes de T1 o como parte del deploy (#42).
- T3 (S9) — PENDING: guard JWT de prod (JWKS + claims → rol, metadata PUBLIC/ROLES) + selección de guard por DB_MODE.

## Risk line

`Risk: none` — planificación solamente, sin código tocado. Riesgos conocidos: token en `localStorage` exfiltrable vía XSS (mitigar con CSP + sanitización); revocación depende de que el guard consulte DB.

## Log

- L1 (2026-10-21): "Bueno vamos por header y despues tomamos los criterios de seguridad necesarias" → "Crea la issue con estos pasos". Issue #43 creada con los 7 pasos acordados en la discusión de #42 (Bearer como esquema principal, motivo compatibilidad no seguridad).
- L2 (2026-10-21): "Self_hosted para dev y managed para prod" — esquema híbrido: dev/dev-neon con el stack Better Auth actual (plugin bearer propio), prod con Neon Auth managed (frontend directo al servicio; la API verifica JWT contra JWKS). Implicancia nueva: guard JWT para prod reusando metadata PUBLIC/ROLES (S9/T3). `neon.ts` ya declara `auth: true`. Queda pendiente solo el proyecto Neon. Anotado en #43 y #42.
