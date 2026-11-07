# Infra: deploy free tier (Render + Neon + Cloudflare Pages)

Objective: infraestructura de producción 100% free tier para ejecutar cuando la app esté completa. Backend NestJS en Render Free Web Service, base de datos + auth en Neon free plan, frontend Astro en Cloudflare Pages.
Branch: a definir al retomar. Tracking issue: Santidele22/personal-page#42.
Delivery: manual (consola Render/Neon/Cloudflare) + commits de config si hacen falta (adapter, env docs).

## Specs

- S1 (backend → Render Free Web Service): build `pnpm build`, start `node dist/main`. Env vars: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (sync TypeORM + migraciones Better Auth), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUST_PROXY_HOPS` (verificar hops según proxy final). Free tier duerme tras ~15 min sin tráfico (cold start ~30-60s) — aceptado para página personal.
- S2 (Neon → DB + Auth): free plan. Decidir proyecto (`plain-bird-10024768` vs `sparkling-smoke-80537831`, ambos aws-us-east-2). Decidir Neon Auth managed vs Better Auth self-hosted contra Neon (placeholders `NEON_AUTH_BASE_URL`/`NEON_AUTH_JWKS_URL` ya en `backend/.env.example`). Apagar modo interino: `AUTH_MODE=better`.
- S3 (frontend → Cloudflare Pages): verificar si el admin SSR necesita el adapter de Cloudflare Pages o alcanza static + backend de Render (el proxy de dev es `vite.server.proxy`, no aplica a producción).

## Tasks

- T1 (S1) — PENDING: alta del servicio en Render + env vars + smoke del backend desplegado.
- T2 (S2) — PENDING: elegir proyecto Neon, provisionar DB/Auth, migraciones, switch `AUTH_MODE=better`.
- T3 (S3) — PENDING: deploy de personal-app en Cloudflare Pages + verificación E2E del flujo completo (login admin incluido).

## Risk line

`Risk: none` — issue de infra diferida, sin código tocado todavía. Riesgos conocidos a evaluar al ejecutar: cold starts del free tier de Render; decisión de auth (managed vs self-hosted) puede exigir cambios en `src/auth`; SSR del admin en Cloudflare puede requerir adapter.

## Log

- L1: "Armemos una issue para cuando este todo listo: render free web service, neon para bases de datos + auth, frontend en cloudflare pages" (2026-10-21). Constraint registrada: stack 100% free, deploy diferido hasta tener todo listo.
- L2: issue #42 creada en GitHub con el detalle completo de las tres tareas y las opciones descartadas (Mau/AWS, Railway, Fly.io — no 100% free).
- L3 (2026-10-21): decisiones anotadas en #42 — sin infra de idempotencia (UNIQUE + upsert donde aplique); routing del API con CORS (sin proxy same-origin). Confirmado dominios distintos (cross-site): cookies Better Auth con `SameSite=None; Secure` + `trustedOrigins` + CORS credentials; riesgo de bloqueo third-party cookies (Safari ITP) con plan B bearer plugin / Pages Function proxy / admin solo Chrome.
- L4 (2026-10-21): decisión — sesión del admin por header Bearer (plugin `bearer` de Better Auth) como esquema principal, no plan B. Motivo: compatibilidad con dominios distintos, no seguridad. CORS se simplifica (sin credentials ni SameSite=None). Criterios de seguridad del token (storage en cliente, TTL/rotación, revocación, rate limiting) quedan pendientes para la implementación. Anotado en #42.
