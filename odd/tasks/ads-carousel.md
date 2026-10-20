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
  `patrono`, `lectura`, `flujo`, `carta` desocupados, en el orden en que la API los trae. Si el
  backend falla: usar el fallback declarado (`adSlotsFallback`) como ofertas; si no hay datos en
  absoluto, cada banda colapsa a encabezado + fila CTA (como las capturas).
- S6: Marca sponsor: tarjeta con logo (`imageUrl`), nombre y, si existe, enlace (`target="_blank"`
  `rel="noopener noreferrer"`). El modelo no tiene `url` hoy: agregar columna nullable `url` en
  la entidad `Brand` (`synchronize` la crea), campo opcional en `CreateBrandDto`/`UpdateBrandDto`,
  `url?` en `ApiBrand` (`personal-app/src/entities/admin/types.ts:135-142`), y campo en el panel
  admin. El sello siempre marcado como publicidad (ética publicitaria del sitio).
- S7: Tarjeta de oferta: reutilizar el diseño existente de `personal-app/src/entities/ad-slot/AdSlot.astro`
  (encabezado "PUBLICIDAD · DISPONIBLE", precio, acceso a `/marcas`) en versión tarjetas de
  carrusel; no reinventar el look.
- S8: Carrusel: rotación automática (~6 s), pausa con hover/focus, puntos de posición y botones
  anterior/siguiente con `aria-label`; contenedor `aria-roledescription="carrusel"`. Con
  `prefers-reduced-motion` (`personal-app/src/app/styles/global.css:163-175` ya anula animaciones):
  sin autoavance, cambio instantáneo por controles. Hidratación con la directiva más restrictiva
  útil, sin HTML inútil antes de hidratar: la primera tarjeta renderiza en SSR.
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
| T1 | S6, S10 | Backend: columna nullable `url` en `brands` + DTO + servicio público `GET /brands` incluye relación `plan` (additivo) + e2e RED→GREEN | delegated (writer:contract) | pendiente |
| T2 | S6, S9 | Admin: panel Marcas (sponsor) en `/admin/publicidad`: listar (name, plan, vigencia), crear/editar (name, imageUrl, url, planId, activeUntil) + borrar con confirmación; tipos ApiBrand | delegated (writer) | pendiente |
| T3 | S5, S9 | Composición mixto en `features/ad-slot/api/carrusel.ts` (pura; fallback; regla de vigencia reutilizada del adapter) | delegated (writer) | pendiente |
| T4 | S7, S8, S9 | Isla Solid `SponsorCarousel` + banda `AdBand.astro` (encabezado, carrusel, fila CTA) accesible y responsive (390px+), light/dark | delegated (writer) | pendiente |
| T5 | S1, S3, S4 | Wiring: banda hero reemplaza bloque `patrono` en `index.astro`; banda footer reemplaza `AdSlot pie` en `SiteFooter.astro` | delegated (writer) | pendiente |

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
