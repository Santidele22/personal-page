# Feature: diario-md-editor — Editor markdown full-page del diario

Objetivo: implementar el artboard 02 (Markdown split) del editor de blogs: ruta dedicada full-page con split 50/50 (editor md + preview vivo), toolbar, slash command, imágenes con subida, drawer de metadatos y guardado/admin API extendidos.
Branch: `feature/diario-md-editor` (base: main @ f492c25). Delivery: `ask-on-risk` en `personal-app` (push/PR/merge = decisión del usuario). Test runner: `vitest run`, `pnpm build`, `pnpm astro check`, `pnpm exec tsc --noEmit` (desde `personal-app`).

## Specs

Fuente de diseño: `design/blog-editor/02-markdown-split.html` (dirección final; 01 y 03 descartadas).

- **S1** Rutas dedicadas full-page `/admin/diario/nueva` (crear) y `/admin/diario/[id]` (editar), fuera del modal y del `max-w-6xl` de AdminLayout — 100% del viewport. Protegidas por el middleware `/admin/*` existente.
- **S2** Chrome superior: volver a Diario, estado del borrador, botón «⚙ Metadatos», «Guardar borrador» y «Publicar».
- **S3** Barra de metadatos básicos: título (mincho), descripción, fecha (`input date`; vacía = borrador).
- **S4** Split 50/50: izquierda editor markdown, derecha preview vivo renderizado con los estilos reales del artículo (mincho para títulos, blockquote con borde aka, mono para código).
- **S5** Toolbar que envuelve la selección: H2 (`## `), H3 (`### `), cita (`> `), lista (`- `), B (`**`), I (`_`), S (`~~`), código (`` ` ``), link (`[texto](url)`), color aka/muted vía `<span class="c-aka|c-muted">`.
- **S6** Statusbar: palabras, líneas, readMin (~200 wpm).
- **S7** Slash command: `/` en línea vacía → menú de bloques (H2, H3, cita, lista, código, imagen, divisor `---`); reemplaza el `/` por el bloque.
- **S8** Imágenes por drag & drop o pegar en el editor, con toast de subida (porcentaje) e inserción automática `![nombre](url)`.
- **S9** Drawer de metadatos: nivel segmentado (básico/intermedio/avanzado), categorías (chips) con quitar/agregar, toggle «Destacado en home», readMin auto (~200 wpm) y slug auto-derivado del título.
- **S10** Preview con `renderMarkdown` existente (`shared/lib/markdown.ts`); el span de color requiere extender el allowlist de sanitize-html (`span` con clase `c-aka`/`c-muted` únicamente) y los estilos correspondientes en `BlogPostLayout` para el artículo publicado.
- **S11** El modal del panel queda sustituido por las rutas dedicadas: «+ Nueva entrada» y «Editar» (borradores y tabla publicada) navegan a las rutas nuevas. El borrado/confirmar del panel se conserva.
- **S12** Guardado admin API: cuerpo con `level`, `category`, `featured`, `readMin` además de título/descripción/contenido/fecha. El backend ya acepta todos esos campos (CreateBlogDto/UpdateBlogDto); cambios solo en frontend/adaptador.
- **S13** Sin dependencias nuevas.
- **Resuelto** (L4): la subida de imágenes va con endpoint nuevo en el backend (multipart + verificación de bytes), elegido por el usuario.
- **Supuesto**: chips de categorías → el backend tiene un solo campo `category` (texto); los chips se almacenan como texto separado por comas en ese campo. Notado en el doc; la portada lo muestra como una línea.

## Tasks

- **T1** (S5,S6,S7,S8-parcial,S10) Núcleo del editor: helpers puros + allowlist `<span>` y `markdown.test.ts`. **DONE** (commit 4093a48; 21 tests). Route: inline.
- **T2** (S2,S3,S4,S5,S6,S7) Isla `DiarioEditorPage` completa (chrome, meta bar, split, toolbar, slash, statusbar, drawer) + CRUD del editor (`features/diario-editor/api/post.ts`, `postJsonReturning`, `resolveApiUrl` en shared) + `ApiBlog` con category/featured/readMin. **DONE** (commit 4cced9e). T4 se implementó dentro de este commit (drawer + cuerpo de guardado con level/category/featured/readMin). Route: inline.
- **T3** (S8,L2) Subida de imágenes: `POST /blogs/images` + `GET /blogs/images/:name` en repo `backend` (rama `feature/diario-md-editor`, commit b70485f; helpers en `image-files.ts` con 12 tests; 296 unit + 110 e2e verdes) y cliente XHR con progreso en la isla. **DONE**. Route: inline (backend = repo separado, misma rama nominal).
- **T5** (S1,S11) Páginas `/admin/diario/nueva` + `/admin/diario/[id]` + `EditorLayout.astro` + links del panel (`diario.astro`, `DiarioEditorPanel` sin modal, `AdminPostTable` con link) + estilos `.c-aka/.c-muted` en `BlogPostLayout`. **DONE** (commit e4c5784). Route: inline.
- **T6** Verificación final. **DONE**: ver `## Log` L7.

## Risk line

`Risk: item 3` — el allowlist compartido de sanitize-html quedó extendido (`span` con clase restringida) y `BlogPostLayout` estilos el span publicado: tanto los tests nuevos (`markdown.test.ts`) como la petición real al artículo publicado (`/blog/editor-smoke/`) lo pinnean; el resto del contrato de render queda cubierto por la suite previa.

## Log

- **L6** (2026-11-07) Implementación completa en 3 commits de frontend (4093a48 helpers/tests, 4cced9e isla + PRUEBA, e4c5784 rutas/panel) y 1 commit de backend (b70485f, endpoint de imágenes). Branch `feature/diario-md-editor` en ambos repos — creada en backend desde el `main` limpio (7395f92).
- **L7** (2026-11-07) Verificación observada:
  - Frontend (`personal-app`): `pnpm test` 132/132, `pnpm build` ok, `pnpm astro check` 0 errores (3 hints), `tsc --noEmit` 0, bundle `DiarioEditorPage` 224 KB (marked + sanitize-html lives en la isla, carga solo en las 2 rutas del admin).
  - Backend: `pnpm test` 296/296, `pnpm test:e2e` 110/110, `pnpm lint` 0 errores, `pnpm build` ok.
  - Peticiones reales (backend SQLite en :3000, astro dev :4321, AUTH_MODE=dev): gate anónimo `302 → /admin/login?redirect=/admin/diario/nueva` ✓; subida con sesión por vite proxy `201 {"url":"/api/blogs/images/<name>"}` ✓; imagen falsa (text bytes) `400 "The uploaded image is not valid"` y archivo descartado ✓; entrega de la imagen `200 image/png` ✓; traversal `..%2F..%2F.env` → `404` ✓; nombre desconocido `404` ✓; `POST /api/blogs` con metadatos `201 {id,slug}` ✓; PATCH de publicación `200` ✓; `/blog/<slug>/` renderiza `class="c-aka"` y `class="c-muted"` ✓; `DELETE` por limpieza `200` ✓; `/admin/diario/abc` → `302 /admin/diario` ✓; `/admin/diario/nueva` con sesión `200` con el chrome del editor.
- **L8** (2026-11-07) Hallazgo del entorno dev: `astro dev` resuelve `BACKEND_URL` desde wrangler.jsonc (top-level = prod Render), así que el gate SSR del middleware sondeaba prod con una cookie dev local → redirect permanente sin sesión en dev. No es ablación del cambio (middleware intocado). Se creó `personal-app/.dev.vars` (gitignored, local) con `BACKEND_URL=http://localhost:3000` para que las verificaciones dev funcionen contra el backend local; **decisión del usuario conservar o borrar este archivo**.
- **L9** (2026-11-07) Supuesto de chips validado en runtime: los chips del drawer se envían como `category: "smoke, web3"` y el artículo publicado lo muestra tal cual (una línea). El icono `icon` queda fuera del scope del diseño elegido (no estaba en el artboard).

- **L1** (2026-11-07) Solicitud del usuario, verbatim: «Implementa esta_issue en una rama nueva. actualiza el repo local antes: El diseño final es el artboard 02 — Markdown split, con los tres extras que elegiste incorporados. Las direcciones 01 y 03 quedan como alternativas descartadas en el canvas. […] Notas técnicas registradas: isla Solid.js, preview con renderMarkdown existente, color como <span class> (requiere extender el allowlist de sanitize-html), sin dependencias nuevas.»
- **L2** (2026-11-07) Mapeo: el modal actual (`DiarioEditorPanel.tsx`) guarda drafts/published con evento bridge; el middleware protege `/admin/*`; el backend ya acepta level/category/featured/readMin/slug (CreateBlogDto). Certificates controller tiene el patrón completo de subida de imágenes (FileInterceptor + diskStorage + magic bytes + GET de imagen). Books usa almacenamiento S3 (Neon Object Storage) con presigned URLs. Pendiente: decisión del usuario sobre la subida de imágenes.
- **L3** (2026-11-07) Decisión de las chips de categorías: campo único `category` en el backend; los chips se guardan como cadena separada por comas en ese campo.
- **L4** (2026-11-07) Decisión del usuario (selección única): subida de imágenes con **endpoint en el backend** reutilizando el patrón de certificados (multipart + verificación de bytes). Scope de backend separado: rama nueva en el repo `backend`, sin push.
- **L5** (2026-11-07) El backend está en `main` limpio (7395f92); ramifica `feature/diario-md-editor` ahí también. Test de backend: `pnpm test` (vitest).
