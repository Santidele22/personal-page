# Issue 44: reducir peticiones SSR a Render y cachear contenido público

Objective: reducir consumo del backend gratuito y tiempos de navegación; deduplicar lecturas por render y cachear contenido público con TTL corto + revalidación en background, invalidando tras mutations del admin.
Branch: feat/issue-44 (a crear desde main; hoy estamos en main con `odd/tasks/issue-42…md` y `issue-43…md` untracked). Tracking issue: Santidele22/personal-page#44.
Delivery: work-unit commits en feature branch; push/PR/merge es decisión del usuario (patrón de issues previas). Runner: vitest (nuevo, frontend) + `pnpm build` + `pnpm astro check`.

## Specs

- S1 (verbatim): "Reducir el consumo del backend gratuito y mejorar los tiempos de navegación. Actualmente cada navegación SSR dispara múltiples peticiones a Render y varias repiten la misma información (por ejemplo, el perfil en distintos widgets del layout)."
- S2 (verbatim): "Medir y documentar las peticiones actuales por ruta, separando duplicadas de imprescindibles."
- S3 (verbatim): "Deduplicar lecturas dentro de un mismo render/request, empezando por  y datos compartidos por layout/widgets." — el issue perdió un fragmento inline (probablemente `fetchProfile`); supuesto: el objetivo son los datos compartidos por layout/widgets (profile, plans, brands, blogs).
- S4 (verbatim): "Incorporar una estrategia de caché de corta duración para contenido público y estable (TTL + revalidación en segundo plano cuando corresponda)." — decisión: TTL fresh 60s, stale-while-revalidate indefinido con `waitUntil` (mono `locals` de middleware), cold+failure re-throw.
- S5 (verbatim): "Revisar agregación de endpoints si la deduplicación no elimina suficientes viajes a Render." — condicional: aceptable si quedan ~≤5 lecturas distintas por render T (1 ventana TTL).
- S6 (verbatim): "Invalidar o actualizar la caché tras mutations del admin para que los cambios no tarden innecesariamente en aparecer." — invalidación total (best-effort isolate-local) cuando el proxy `/api` reenvía POST/PUT/PATCH/DELETE exitoso.
- S7 (verbatim): "No cachear sesiones, JWT, respuestas admin, mutations ni datos privados." — gate: GET && SSR && sin `bearerToken` && whitelist (profile, blogs, blogs/slug/:s, tools, menu-items, books, services, advertising-plans, brands, projects); excluye `/blogs/drafts` y auth.
- S8 (verbatim): "Mantener los fallbacks actuales cuando Render no responda y no reintroducir llamadas SSR al proxy público del Worker."
- S9 (aceptación): "Una misma lectura se resuelve como máximo una vez por render, aunque la usen varios widgets."
- S10 (aceptación): "Las navegaciones frecuentes reducen mediblemente las peticiones salientes a Render respecto del estado actual."
- S11 (aceptación): "La home y las rutas públicas responden correctamente con caché fría y caliente."
- S12 (aceptación): "Los cambios del admin se reflejan dentro del TTL definido o invalidan la caché inmediatamente."
- S13 (aceptación): "Login, recuperación y panel admin mantienen su comportamiento actual."
- S14 (aceptación): "Builds/checks y pruebas de las rutas afectadas pasan."

## Tasks

- T1 (S2) — inline — DONE: personal-app/docs/ssr-requests.md (baseline commit 6fd4c9f; home 14 fetches, profile×5/plans×3/brands×2) — commit 1686ebb.
- T2 (S3, S4, S7, S9) — inline — DONE: src/shared/api/contentCache.ts (TTL 60s + SWR + in-flight dedup) + gate en getJson (http.ts) + sink waitUntil en middleware (cfContext Astro 7); tests 32/32 con vitest (nuevo dep) — commit be442d6. Smoke real (dev 4321 ↔ Render): home 200 (2.2s frío → 20ms con caché), /blog, /about, /marcas, /rss.xml 200, /blog/:slug inexistente 404 (contrato), /admin 302, /admin/login 200.
- T3 (S6, S12) — inline — DONE: invalidateContentCache() en src/pages/api/[...path].ts tras mutation no-auth exitosa; test de proxy cubre drop/keep/auth-exempt — commit be442d6.
- T4 (S8, S13) — inline — DONE: differential check admin gate (302/200 sin cambios), 404 de slug preservado, cold-failure re-throw en test; build + astor check 0 errores + tsc --noEmit ok — be442d6.

## Pending real-environment notes

- Backend local no arrancó: Neon rechaza la contraseña guardada de `neondb_owner` en backend/.env (credencial rotada) — verificación end-to-end de invalidación (S12 con admin real) quedó contraproducente contra Render TTLeada; el test de proxy la cubre unitariamente. Pendiente para el owner: actualizar .env o correr `neon auth` again.


## Risk line

T1 `Risk: none`. T2/T3/T4 tocan la capa `request()` compartida por TODO el tráfico del frontend (auth, admin, proxy) — `Risk: item 3` (contrato consumido por toda la app) e implementa una caché (consumo de datos) → gate exhaustivo por tests + assessment nativo.

## Log

- L1 (2026-10-28): petición "Sigamos con la issue 44" (contexto: sesión previa 2026-10-27/28 cerró Neon admin + bearer, issue 43 planeada con tasks 42/43). Issue #44 leída verbatim de GitHub. Exploración delegada (gentle-ai-explore, ses_e7cbdbdd): home ≈14 fetches SSR (profile×5, plans×3, brands×2), sin caché actual, proxy `/api` para browser y lectura directa BACKEND_URL en SSR; `fetchBlogRows` sin catch (preexistente, se mantiene).
- L2 (2026-10-28): decisiones de diseño registradas: TTL 60s fresh + SWR; único chokepoint de caché = `request()`; invalidación total en mutation proxied; vitest como runner nuevo del frontend (no existía; S14 exige pruebas). Reagregación S5 condicional a resultado.
- L3 (2026-10-28): implementación completa T1–T4 (commits be442d6, 1686ebb en feat/issue-44). Hallazgo del smoke: `Astro.locals.runtime.ctx` removido en Astro 6+ → usamos `locals.cfContext` (con fallback antiguo); sin ese check funcional el build/check/tsc no lo detectaban. Hallazgo de entorno: `backend/.env` con contraseña de Neon rechazada (auth failed de `neondb_owner`) → backend local no arrancable; smoke contra Render (solo lecturas). Dev `/api` 502 causa `proxy` de Vite a :3000 sin backend — preexistente, no cubierto por el Worker route en dev. S12 end-to-end (admin real) pendiente de credencial; cubierto por unit. SResultsController declarado sin necesidad (no-aggregation, S5 no aplica: dedup + TTL deja home en ≈5 lecturas/minuto salvo caché caliente).

