# ads-carousel — bandas de publicidad tipo carrusel (hero + footer)

Objetivo: bandas de publicidad en la landing, de tipo carrusel, en el hero y en el footer, con
composición «mixto»: sponsors reales (marcas con plan tomado) primero y espacios disponibles como
oferta para completar.
Branch: `feat/carousel-ads` desde `dev`. Delivery: `ask-on-risk` (commits por unidad de trabajo;
push/PR/merge es decisión del usuario). Test runners: backend `pnpm test` y `pnpm test:e2e`
(vitest) en `backend/`; frontend sin runner de tests: `pnpm astro check`, `pnpm exec tsc --noEmit`,
`pnpm build` en `personal-app/`.

## Specs

- S1: "Vamos a empezar a construir las publicidades: ahora determinamos que van a ser de tipo
  carrusel ... tanto en el hero como en el footer." Dos bandas de publicidad con carrusel: una en
  el hero y otra en el footer de la landing.
- S2: Elección de usuario (esta sesión): "Mixto" — los carruseles rotan las marcas que ya pagaron
  y completan con los espacios disponibles como oferta.
- S3: Banda del hero (captura de referencia del usuario): encabezado con letterspacing
  "CON EL APOYO DE"; área de carrusel; fila CTA bajo el carrusel:
  "¿Tu marca aquí? Una tarjeta destacada, {precio} {cadencia} · ver todos los espacios", con
  "ver todos los espacios" como enlace a `/marcas` en color acento. {precio}/{cadencia} salen de
  los datos del plan destacado disponible (plan disponible de mayor precio visible en la banda
  hero); hardcodear euros o montos está prohibido. La banda reemplaza la actual tarjeta estática
  del slot `patrono` entre el Hero y el diario (`personal-app/src/pages/index.astro:24-28`).
- S4: Banda del footer (captura de referencia): encabezado "SELLOS DE MARCAS AMIGAS"; carrusel;
  fila CTA: "Un sello diminuto, {precio} {cadencia} · una tarjeta destacada, {precio} {cadencia} ·
  ver todos los espacios". Derivar de datos: «sello diminuto» = plan del sello (slug `pie`),
  «tarjeta destacada» = plan disponible destacado (mayor precio); si falta uno de los dos, la
  fila muestra solo la parte disponible; si no hay datos de planes, queda solo el enlace
  "ver todos los espacios". Idioma del copy: español.
- S5: Composición mixto: los sponsors van primero y las ofertas completan. Sponsors activos =
  marcas con `activeUntil` vacío o vigente (misma regla ya declarada en
  `personal-app/src/entities/admin/adapter.ts:22-36` — reutilizar/exportar esa función, no
  reimplementarla). Ocupación: un plan con una marca activa no se ofrece como tarjeta
  «Tu marca aquí». Reparto por banda (A3): sponsors del plan slug `pie` → banda footer; el resto
  de los sponsors → banda hero. Ofertas: footer ← plan `pie` si desocupado; hero ← planes
  `patrono`, `lectura`, `flujo`, `carta` desocupados, en el orden en que la API los trae. Sin
  datos —backend sin cargar o request fallido— (L9): la banda NO muestra ofertas por defecto ni
  colapsa; pasa un único cuadradito punteado reservado (el placeholder del espacio que ocuparía
  el spot) y la fila CTA queda con el enlace "ver todos los espacios".
- S6: Marca sponsor: tarjeta con logo (`imageUrl`), nombre y, si existe, enlace (`target="_blank"`
  `rel="noopener noreferrer"`). El modelo no tiene `url` hoy: agregar columna nullable `url` en
  la entidad `Brand` (`synchronize` la crea), campo opcional en `CreateBrandDto`/`UpdateBrandDto`,
  `url?` en `ApiBrand` (`personal-app/src/entities/admin/types.ts:135-142`), y campo en el panel
  admin. El sello siempre marcado como publicidad (ética publicitaria del sitio).
- S7: Ítems del carrusel: sellos planos de banda, sin tarjeta con marco (como la referencia del
  usuario): sponsor = logo (`imageUrl`) + nombre, con enlace cuando tiene `url`
  (`target="_blank"` `rel="noopener noreferrer"`); oferta = «Tu marca aquí» + nombre del plan +
  precio/cadencia, enlace a `/marcas`. Cada ítem lleva el tag pequeño `PUBLICIDAD` (ética
  publicitaria). No reinyentar cards con marco: la banda es una franja de sellos.
- S8: Movimiento: **marquee**: la franja pasa continua y automáticamente (loop lineal sin dots ni
  botones), banda baja y limpia como la captura del usuario; pausa con hover y con focus dentro
  de la banda; con `prefers-reduced-motion` queda la franja estática (el CSS global ya anula
  animaciones). SSR pura en Astro: la animación es CSS y no requiere isla de cliente.
- S9: FSD y stack: sin dependencias nuevas, sin React; Solid solo donde hay interacción.
  Composición pura en `personal-app/src/features/ad-slot/api/carrusel.ts` (features → entities
  permitido). Panel admin en `personal-app/src/features/ad-slot` + página
  `personal-app/src/pages/admin/publicidad.astro` (la puerta de sesión vive en `AdminTopBar`).
- S10: Verificación: backend `pnpm test` y `pnpm test:e2e` verdes incl. nuevo e2e de `url`/`plan`
  en `GET /brands` público; frontend `pnpm astro check`, `pnpm exec tsc --noEmit`, `pnpm build`
  verdes; probe visual/HTTP de la landing sin backend (fallback) y con backend scratch
  (dos sponsors + planes, un plan `pie`, un sponsor con y otro sin `url`), escritorio + móvil,
  dark mode. Prohibido: metadata `€ 120` hardcodeada; servidor/puerto dejado vivo; scratch dentro
  del repo.

Supuestos declarados (no requisitos del usuario):
- A1: "sello diminuto" ↔ plan slug `pie` (última posición; su precio es el ramo de USD 10).
- A2: «tarjeta destacada» ↔ plan disponible de mayor precio mostrado en la banda.
- A3: reparto footer `pie` / resto hero según S5 (no fue especificado por el usuario).
- A4: copys de encabezados/CTA tomados verbatim de las capturas del usuario (es decir, su sitio de
  referencia); sin acentos raros: "CON EL APOYO DE", "SELLOS DE MARCAS AMIGAS",
  "¿Tu marca aquí?", "ver todos los espacios".

## Tasks

| ID | S# | Contenido | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S6, S10 | Backend: columna nullable `url` en `brands` + DTO + servicio público `GET /brands` incluye relación `plan` (additivo) + e2e RED→GREEN | delegated (writer:contract) | backend `ed51ce1` (r. `feat/brands-carousel-contract`) |
| T2 | S6, S9 | Admin: panel Marcas (sponsor) en `/admin/publicidad`: listar (name, plan, vigencia), crear/editar (name, imageUrl, url, planId, activeUntil) + borrar con confirmación; tipos ApiBrand | delegated (writer) | front `021daae` |
| T3 | S5, S9 | Composición mixto en `features/ad-slot/api/carrusel.ts` (pura; fallback; regla de vigencia reutilizada del adapter) | delegated (writer: beam, reanudado) | front `10c39a7` |
| T4 | S7, S8, S9 | Marquee de sellos plano en banda `AdBand.astro` (SSR puro; strip duplicada, loop CSS continuo, pausa hover/focus; placeholder reservado clicable con CTA a precio por defecto, L9-L10) + types band y composición | delegated (writer: beam, reanudado) + inline (marquee tras L9/cuadradito) | front `10c39a7` + `125ee18` + `e877d5a` + `c6b6655` |
| T5 | S1, S3, S4 | Wiring: banda hero reemplaza bloque `patrono` en `index.astro`; banda footer reemplaza `AdSlot pie` en `SiteFooter.astro` | delegated (writer: beam, reanudado) | front `10c39a7` |

Superficie declarada (max diff esperado): T1 ~80 líneas · T2 ~380 · T3 ~140 · T4 ~260 · T5 ~60 →
~900 líneas → slices: [T1] | [T2] | [T3+T4+T5]. Rutas en paralelo: T1, T2 y T3–T5 son unidades con
superficies disjuntas; se delegan juntas con contrato fijado en Specs. Git lo maneja el padre.

## Log

- L1 (2026-10-19, verbatim): "Vamos a empezar a construir las publicidades: ahora determinamos que
  van a ser de tipo carrusel: [Image 1] [Image 2] tanto en el hero como en el footer." Con dos
  capturas: banda hero "CON EL APOYO DE" con área de carrusel y fila
  "¿Tu marca aquí? Una tarjeta destacada, €120 /mes · ver todos los espacios"; banda footer
  "SELLOS DE MARCAS AMIGAS" con fila "Un sello diminuto, €10 /mes · una tarjeta destacada,
  €90 /mes · ver todos los spaces".
- L2 (2026-10-19): pregunta de producto "¿Qué van a rotar los carruseles del hero y del footer?"
  → respuesta del usuario: "Mixto".
- L3 (2026-10-19, evidencia): mapeo del repo: `brands` ya existe en el backend
  (`brands/entities/brand.entity.ts:11-37`, FK RESTRICT a `advertising_plans`, `activeUntil`
  nullable, sin columna `url`); `GET /brands` es `@AllowAnonymous` y `find()` no incluye la
  relación `plan` (`brands.service.ts`); sin panel admin de marcas; predilección declarada (A1–A4).
  Regla de vigencia existente que se reutiliza: `personal-app/src/entities/admin/adapter.ts:22-36`.
  DB del workspace vacía (0 planes, 0 brands) — los datos viven en el backend real.
- L4 (2026-10-19, advertencia): worktree con cambios sin commitear de otra unidad pendiente
  (`personal-app/src/features/project/api/projects.ts`,
  `personal-app/src/features/tool/api/tools.ts`,
  `personal-app/src/widgets/blog/ToolsBlock.astro`,
  `personal-app/src/widgets/projects/Projects.astro`): no tocar, no commitear, no formatear. Los
  commits de esta feature agregan paths explícitos solamente.
- L5 (2026-10-19, ejecución): 3 slices conmutados. Backend `backend` r. `feat/brands-carousel-contract`
  commit `ed51ce1` — RED→GREEN observado (3 fallas → 4 verdes), unit 9/9, `pnpm lint` 0 errores,
  `pnpm build` ok. Frontend r. `feat/carousel-ads` commits `021daae` (774 líneas) y `10c39a7`
  (516 líneas) — `astro check` 0, `tsc` limpio, `build` completo; probe SSR con backend scratch
  observado: CTA hero "¿Tu marca aquí? Una tarjeta destacada, USD 150 /mes · ver todos los
  espacios", sponsor con url enlaza target=_blank, marca vencida excluida, controles SSR
  ("Tarjeta anterior"/"Ir a la tarjeta N"), primera tarjeta en SSR. El writer original de T3–T5
  murió por rate limit tras avanzar parcialmente; reanudado con writer beam que audito y verificó
  sin nuevos edits. Spot check del padre: e2e brands 4/4, tsc limpio, headings via
  `carrusel.ts:52-53`, CTA solo de datos de planes (`AdBand.astro`).
- L6 (2026-10-19, verificación native + limitación): `gentle-ai review assess` — frontend
  (base `origin/dev`, ambos commits): `risk: medium`, `review_due: false` (`under_budget`);
  backend (base `dev` con inventario canónico, excluyendo untracked ajeno `src/database/seed-projects.ts`):
  `risk: medium`, `review_due: false` (`under_budget`). Limitaciones registradas: (1) las suites
  backend `pnpm test` / `pnpm test:e2e` completas quedan rojas SOLO por 2 aserciones
  pre-existentes en dev-auth (`c31fab8` cambió la sesión a `id: dev-admin`; archivos ajenos), no
  corregidas por esta feature; (2) móvil 390px y dark mode verificados por revisión de clases,
  no visualmente; (3) sin probe HTTP del panel admin (requiere backend + sesión admin, reportado
  N/A por el writer de T2); (4) el fallback sin-backend de la banda no es probeable por una
  `fetchBlogRows` pre-existente que no captura errores en `Blog.astro` (ajeno; la composición se
  probó por lógica + build). Risk lines: T1 `Risk: item 3 (contracto GET /brands, cambio
  additivo — commit aislado)`; T2 `Risk: none (additivo, un nuevo panel)`; T3–T5 `Risk: none
  (cards/copy derivados de datos; rotacion de UI nueva)`.
- L7 (2026-10-19, pendiente): push de ambas ramas + PRs es decisión del usuario. Cargar sponsors
  reales va por el nuevo panel admin (crear `Brand` con plan y vigencia). Archivos ajenos aún
  sin commitear (los 4 de L4).
- L8 (2026-10-19, verbatim): "Agrega la animacion desde ahora que pasen los lugares en el
  carrusel" — pista deslizante `translateX` con `motion-safe:transition-transform`; commit
  `125ee18`; probe SSR con stub validó la pista y los controles. Nota de entorno: el proxy de
  dev está hardcodeado a `:3000` (`astro.config.mjs:32`), el build con env horneado es la vía
  de verificación; el backend vivo del usuario en :3000 responde 200 con colecciones vacías.
- L9 (2026-10-19, verbatim): "Perfecto, dejalo el cuadradito nada mas del espacio que ocuparia y
  ya estaria" + aclaración del usuario: "es el placeholder del lugar que ocuparia en el
  carrusel" — cambia el estado sin datos: adiós ofertas por defecto (`adSlotsFallback` deja de
  usarse en la composición); composición emite `kind: 'placeholder'` (nuevo miembro del union en
  `entities/ad-slot/types.ts`) y `AdBand.astro` lo dibuja como cuadradito punteado
  (`size-10 rounded-[4px] border border-dashed border-border`) que pasa con el mismo marquee; la
  CTA deja precio (no hay datos) y queda "¿Tu marca aquí?" (hero) y solo el enlace (footer).
  Evidencia (probe con stub vacío): placeholders ×4 (2 copias × 2 bandas), 0 chips "Tu marca
  aquí" en marquee, CTA hero "¿Tu marca aquí? · ver todos los espacios", artmarquee vivo en las
  dos bandas. Nota de verificación: un servidor zombie huérfano (ppid 1) sirvió una versión
  anterior durante el probe — hallazgo propio, no del código: mi barrido usaba
  `kill "${f#/proc/}"` con el cmdline como pid; corrección + verificación con `ss` antes de
  cada curl. Commit `e877d5a` (marquee + placeholder + tipos + CSS).
- L10 (2026-10-19, verbatim): "Ultimo cambio y quiero que se vean asi los placeholders pasando
  por la pagina y que al hacerlo click se puedan comprar. [Image 1] ahora esta asi [Image 2]
  entendes la diferencia?" — tres correcciones sobre el estado cuadradito: (1) la fila CTA
  recupera el precio destacado incluso sin datos (imagen 1: «¿Tu marca aquí? Una tarjeta
  destacada, €120/mes»): la composición deriva featured/seal de la copia de slots por defecto
  del sitio (`entities/ad-slot/data.ts`, adSlotsFallback) cuando no hay datos — la banda no
  hardcodea moneda (S10); footer: «Un sello diminuto, USD 10/mes · una tarjeta destacada,
  USD 150/mes». (2) El cuadradito pasa más presente: franja reservada `h-20 w-44` punteada
  (`rounded-[6px]`, hover `border-aka/60`). (3) Clic en el cuadradito → comprar: link a
  `/marcas` con `aria-label="Reservar lugar: ver la tarifa completa"`; la copia decorativa
  sigue aria-hidden + tabindex -1. Evidencia: check 0, tsc limpio, build completo, probe con
  stub (sin datos): links Reservar ×4, franjas ×4, CTA hero «¿Tu marca aquí? Una tarjeta
  destacada, USD 150 /mes · ver todos los espacios», CTA footer con sello + destacada, 0
  errores SSR, puertos liberados. Commit `c6b6655`.
