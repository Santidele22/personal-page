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
- **Supuesto** (a confirmar al usuario): cómo se suben las imágenes — endpoint nuevo en backend vs data-URL vs solo por URL. → Decisión en `## Log` L2.
- **Supuesto**: chips de categorías → el backend tiene un solo campo `category` (texto); los chips se almacenan como texto separado por comas en ese campo. Notado en el doc; la portada lo muestra como una línea.

## Tasks

- **T1** (S5,S6,S7,S8-parcial,S10) Núcleo del editor: helpers puros (`countWords`, `readMin`, `slashes`...) + `markdown.ts` cambia payload `<span>` y `markdown.test.ts`. Route: inline. Verificado con vitest.
- **T2** (S2,S3,S4,S5,S6,S7) Isla `DiarioEditorPage` markup completo (chrome, meta bar, split, toolbar, slash, statusbar, estilos). Route: inline.
- **T3** (S8,L2) Subida de imágenes (toast + drag&drop + pegar). Route: inline. Complejidad según decisión del usuario (backend o data-URL).
- **T4** (S9,S12) Drawer de metadatos + save/publish contra API (diario.ts, incluir slug auto + featured/level/category/readMin). Route: inline.
- **T5** (S1) Páginas Astro `/admin/diario/nueva` + `/admin/diario/[id]` + links del panel (T-spec S11). Route: inline.
- **T6** Verificación final: `pnpm build`, `astro check`, `tsc --noEmit`, `vitest run`, comparación as problemas.

## Log

- **L1** (2026-11-07) Solicitud del usuario, verbatim: «Implementa esta_issue en una rama nueva. actualiza el repo local antes: El diseño final es el artboard 02 — Markdown split, con los tres extras que elegiste incorporados. Las direcciones 01 y 03 quedan como alternativas descartadas en el canvas. […] Notas técnicas registradas: isla Solid.js, preview con renderMarkdown existente, color como <span class> (requiere extender el allowlist de sanitize-html), sin dependencias nuevas.»
- **L2** (2026-11-07) Mapeo: el modal actual (`DiarioEditorPanel.tsx`) guarda drafts/published con evento bridge; el middleware protege `/admin/*`; el backend ya acepta level/category/featured/readMin/slug (CreateBlogDto). Certificates controller tiene el patrón completo de subida de imágenes (FileInterceptor + diskStorage + magic bytes + GET de imagen). Books usa almacenamiento S3 (Neon Object Storage) con presigned URLs. Pendiente: decisión del usuario sobre la subida de imágenes.
- **L3** (2026-11-07) Decisión de las chips de categorías: campo único `category` en el backend; los chips se guardan como cadena separada por comas en ese campo.
- **L4** (2026-11-07) Decisión del usuario (selección única): subida de imágenes con **endpoint en el backend** reutilizando el patrón de certificados (multipart + verificación de bytes). Scope de backend separado: rama nueva en el repo `backend`, sin push.
- **L5** (2026-11-07) El backend está en `main` limpio (7395f92); ramifica `feature/diario-md-editor` ahí también. Test de backend: `pnpm test` (vitest).
