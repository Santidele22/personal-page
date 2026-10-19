# Issue 22 — herramientas: patrocinadas vs. amor al arte

Objetivo: separar las herramientas recomendadas genuinamente de las patrocinadas, en backend, admin y landing. Branch: `dev` (trabajo solo local/dev, sin prod). Test runner: `pnpm test` / `pnpm test:e2e` (Vitest, backend); `pnpm astro check` / `pnpm build` / `pnpm exec tsc --noEmit` (frontend).

## Specs

- S1: «`GET /tools` devuelve `sponsorship` (`"genuina" | "patrocinada"`) en cada ítem, con valor por defecto `'genuina'` en las filas existentes.»
- S2: «Las herramientas existentes quedan clasificadas como "genuina" solo por el default, sin migración destructiva.»
- S3: «La landing muestra los dos apartados separados, y las patrocinadas se indican explícitamente como tal (sin dark patterns).» Orden acordado en la issue: «primero las genuinas».
- S4: «Cuando el backend no responde, el fallback offline de `data.ts` sigue mostrando el bloque con el copy de siempre (sin la nueva clasificación si no aplica).»
- S5: «`pnpm test` / `pnpm test:e2e` (backend) y `pnpm build` + `pnpm astro check` + `pnpm exec tsc --noEmit` (frontend) en verde.»
- S6 (alcance admin): «poder editar el campo desde el panel cuando exista el CRUD de tools (o al menos asemejarse a otros CRUD de la sección de admin)». Ya existe el CRUD (`/admin/herramientas/`), el campo entra ahí.
- S7 contrato DTO (alcance backend): que `GET /tools` (y el create/update «acepten y devuelvan el nuevo campo sin romper el contrato actual (los campos existentes quedan igual)».
- Fuera de alcance: métricas de clics, afiliados, analytics, y la sección de publicidad (`advertising-plans`/`brands`).

## Tasks

- T1 [S1,S2,S5,S7] Backend: enum `ToolSponsorship` (`genuina|patrocinada`, default `genuina`), columna en `Tool`, DTO opcional con `@IsEnum`; e2e RED→GREEN (4 tests nuevos, 12/12). Route: inline. Commit: backend `27012e7`.
- T2 [S6] Frontend admin: selector de patrocinio en `ToolsEditorPanel` + tipos en `api/tools-admin.ts` + `ToolSponsorship` en `entities/tool/types.ts`. Route: inline. Commit: root `55c1a06`.
- T3 [S3,S4,S5] Frontend landing: split en `ToolsBlock.astro` (genuinas primero, etiqueta patrocinadas explícita con tag por fila), fallback sin clasificación. Route: inline. Commit: root `b74f3f8`.

## Log

- L1 (2026-10-19): «Sigamos con la issue 22» — implementar https://github.com/Santidele22/personal-page/issues/22 completa (backend + admin + landing), criterios de aceptación arriba (S1-S7).
- L2 (2026-10-19): pedido del usuario que motivó la issue: «Si quiero que revisemos la parte de "Herramientas" porque quiero promocionar herramientas que uso pero sin buscar nada a cambio. como que haya apartados herramientas que me pagan y las que promociono...»
- L3 (2026-10-19): verificación T1: RED observado (4 tests nuevos de sponsorship fallan), luego GREEN `tools.e2e-spec.ts` 12/12. `pnpm test` unidades: 125/126, con 1 fallo PREEXISTENTE en `dev-auth.service.spec.ts` (sesión ahora devuelve `user.id: 'dev-admin'`, el spec espera `{email,name,role}` exacto; reprodujo sobre la base vía stash). `pnpm test:e2e` completo: 85/87, 2 fallos PREEXISTENTES en `dev-auth.e2e-spec.ts` (repro con worktree en la base 41b122b). Ambos fuera del alcance de la 22 (gestión de sesión dev, no tools).
- L4 (2026-10-19): verificación T2/T3 frontend: `astro check` 0 errores (112 archivos), `tsc --noEmit` OK, `astro build` OK. Sin e2e frontend propio (el proyecto no tiene runner de test; `astro check` es la verificación estructural acordada en features previas).
- L5 (2026-10-19): copy decidido inline — genuinas: «Uso estas herramientas de verdad: nadie me paga para recomendarlas.»; patrocinadas: «Cartel visible: con estas me pagan por incluirlas acá.» + tag "Pago" por fila. Fallback offline conserva el copy de S4 (aviso de afiliados anterior) porque no lleva clasificación.
- L6 (2026-10-19): RDD assessments post-commit — backend 27012e7 (base 41b122b): risk `medium`, `review_due=false (under_budget)`; root 55c1a06+b74f3f8 (base 3ca9c83): risk `medium`, `review_due=false (under_budget)`. Sin revisión nativa pendiente; el presupuesto de slice queda abierto hasta un commit posterior.
- L7 (2026-10-19): cierre — T1-T3 hechos, S1-S5 y S7 cubiertos (S5 con las salidas verdes propias y los 3 fallos preexistentes de auth dev documentados en L3, ajenos a la 22). S6: selector admin entregado (el CRUD ya existía en `/admin/herramientas/`). Pendiente del usuario: revisar la landing en dev (`pnpm dev` + backend :3000 con `AUTH_MODE=dev`) y decidir push/merge con un commit más para cerrar el slice `under_budget`.
