# Issue 23 — libros: sección lectura dividida por técnicos y no técnicos

Objetivo: dividir la sección "lectura" de la landing por tipo de libro (técnicos / no técnicos), administrado como campo `kind` del libro en backend + admin + landing. Branch: `dev` (trabajo solo local/dev, sin prod). Test runner: `pnpm test` / `pnpm test:e2e` (Vitest, backend); `pnpm astro check` / `pnpm build` / `pnpm exec tsc --noEmit` (frontend).

## Specs

- S1: «`GET /books` (público, published) devuelve `kind` (`"tecnico" | "no_tecnico"`) en cada libro.»
- S2: «Las filas existentes de `books` obtienen el default del enum sin migración destructiva.»
- S3: «`/admin/libros/` permite asignar/cambiar la categoría de cada libro y persiste el cambio al recargar.»
- S4: «La landing muestra los dos apartados con la separación correcta, y el conteo de cada apartado coincide con la API real.» El apartado queda definido en la issue: «la sección "lectura" renderiza dos apartados — "Técnicos" y "No técnicos" — manteniendo el `status` (reading/finished/queued) dentro de cada uno; los libros sin `kind` explícito se muestran en "No técnicos" (default).»
- S5: «Cuando el backend no responde, el fallback offline sigue funcionando con el split aplicado.» Alcance: «Fallback offline (`entities/book/data.ts`): clasificar los libros hardcodeados actuales y declarar el campo en `types.ts`.»
- S6: «`pnpm test` / `pnpm test:e2e` (backend) y `pnpm build` + `pnpm astro check` + `pnpm exec tsc --noEmit` (frontend) en verde.»
- S7 contrato DTO (alcance backend): «con create/update aceptándolo» y «el endpoint existente no rompe el consumo actual: solo añade el campo».
- Fuera de alcance: «Sub-categorías más finas (género literario, lenguaje de programación)», «Cambiar la lógica del PDF de descarga (queda igual)», «Tocar la colección del diario (`content/blogs`), que es otra cosa».
- Decisión de diseño de la issue: campo `kind` con enum `'tecnico' | 'no_tecnico'`, «default `'no_tecnico'` como opción menos asumida».

## Tasks

- T1 [S1,S2,S6,S7] Backend: enum `BookKind` (`tecnico|no_tecnico`, default `no_tecnico`), columna en `Book`, DTO opcional con `@IsEnum`; e2e RED→GREEN en `test/books.e2e-spec.ts`. Route: inline. Commit: backend `40497e9`.
- T2 [S3,S6] Frontend admin: selector de categoría en `BooksEditorPanel` + tipos (`entities/book/types.ts`, `features/book/api/books-admin.ts`, `features/book/api/books.ts`). Route: inline. Commit: root `04816ae`.
- T3 [S4,S5,S6] Frontend landing: split en `widgets/reading/Reading.astro` en "Técnicos" / "No técnicos" conservando `statusLabel` por libro; fallback offline cubierto (lista vacía por diseño, el único libro hardcodeado posible no existe). Route: inline. Commit: root.
- T4 [⇒ cierre] Documento de feature + espejo Engram. Route: inline. Commit: root.

## Log

- L1 (2026-10-19): «Sigamos con la issue 23» — implementar https://github.com/Santidele22/personal-page/issues/23 completa (backend + admin + landing), criterios de aceptación arriba (S1-S7).
- L2 (2026-10-19): verificación T1 — RED observado (2 tests nuevos de `kind` fallan), luego GREEN `books.e2e-spec.ts` 18/18. `pnpm test` unidades 125/126 y `pnpm test:e2e` 87/89 con los 3 fallos PREEXISTENTES de dev-auth documentados en la issue 22 (L3), ajenos a la 23. S2: sonda throwaway sobre esquema viejo (fila con ownerId y timestamps reales) — synchronize rellena `kind='no_tecnico'` sin tocar los datos; sonda eliminada antes del commit, no commiteada.
- L3 (2026-10-19): verificación T2 — `pnpm exec tsc --noEmit` OK, `astro check` 0 errores (112 archivos). Selector CATEGORÍA con hint visible; badge de fila muestra la categoría de cada libro. Credenciales dev del backend vivo: están en `backend/.env` del usuario, no en las inline de sesiones anteriores.
- L4 (2026-10-19): verificación T3 — `astro check` 0 errores, `astro build` OK. Sonda funcional S4 en vivo (backend :3000 + landing :4321): «Iván Ilich» (`no_tecnico`) bajo «No técnicos» y libro temporal «Clean Code» (`tecnico`, creado y publicado con sesión dev) bajo «Técnicos»; ambos apartados renderizan con `statusLabel` dentro de cada apartado. Libro temporal eliminado (DELETE 200), estado dev restaurado (solo book 3). El watch del backend ya sirvió el backfill: book 3 mostró `no_tecnico` sin paso extra.
- L5 (2026-10-19): sorpresa capturada al armar el commit de T2 — un archivo basura `—` preexistente (untracked) entró al commit; sacado del commit con amend y borrado del árbol. Commit final T2: `04816ae` (solo archivos del feature).
- L6 (2026-10-19): RDD assessment backend `40497e9` (base `41b122b`, committed-only): risk `medium`, `review_due=false (under_budget)` (executable_change en el DTO; 156 líneas). Slice abierto hasta un commit posterior; candidato natural del próximo review: `41b122b..HEAD` backend. Root: assessment del cierre del feature.
- L7 (2026-10-19): cierre del feature — T1-T3 hechos, S1-S7 cubiertos (S6 con salidas verdes propias; los 3 fallos dev-auth preexistentes, documentados y ajenos a la 23). Commits: backend `40497e9`; root `04816ae`, `1f0595b` + doc. Assessment root `04816ae..1f0595b` (base `47c5d01`, committed-only): risk `medium`, `review_due=false (under_budget)` (159 líneas). Ambos slices quedan `under_budget`; al igual que en la 22, la decisión de push/merge y con qué commit cerrar el budget es del usuario.
- L8 (2026-10-19): sonda backend del scratch purgada (`rm -rf /tmp/opencode/probe23`), workspace sin archivos residuales.
