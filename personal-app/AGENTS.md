# AGENTS.md — santi.

## Alcance

Estas instrucciones se aplican a `personal-app`, el frontend de la web personal y el diario. El backend Nest con arquitectura MVC se integrará en el mismo monolito, pero todavía no pertenece a este paquete.

## Stack

- Astro 7 con salida estática.
- Solid.js únicamente para islas interactivas.
- Tailwind CSS 4 mediante `@tailwindcss/vite`.
- TypeScript 6 y `@astrojs/check`.
- Markdown/MDX, content collections, RSS y sitemap.

No incorporar React, Next.js, Framer Motion ni un segundo framework de componentes. Cualquier dependencia nueva debe resolver una necesidad concreta y quedar registrada en `package.json`.

## Arquitectura Feature-Based / FSD

```text
src/
├── app/        # configuración, estilos globales y layouts
├── pages/      # rutas de Astro
├── widgets/    # secciones completas de páginas
├── features/   # casos de uso interactivos y acceso a API
├── entities/   # tipos, datos y UI propia de cada entidad
├── shared/     # API, iconos y componentes reutilizables
└── content/    # contenido Markdown/MDX del diario
```

Reglas de dependencias:

- `pages` contiene rutas finas y composición, no lógica de negocio.
- `widgets` puede usar `features`, `entities`, `shared` y la configuración pública de `app/config`.
- `features` puede usar `entities` y `shared`.
- `entities` puede usar `shared`, pero no widgets ni features.
- `shared` no importa desde ninguna otra capa.
- `app/layouts` puede componer widgets y elementos compartidos.
- Evitar imports cruzados entre slices de una misma capa y cualquier ciclo de dependencias.

## Astro y Solid

- Usar componentes `.astro` por defecto para contenido, layouts, tarjetas, iconos e ilustraciones.
- Crear componentes Solid `.tsx` solo cuando exista estado o comportamiento de cliente.
- Hidratar con la directiva más restrictiva posible: `client:media`, `client:visible` o `client:idle`; usar `client:load` solo si la interacción debe estar disponible inmediatamente.
- No añadir directivas `client:*` a componentes Astro.
- Mantener el HTML útil antes de la hidratación y respetar `prefers-reduced-motion`.
- Actualmente solo hay tres islas: menú móvil, selector de tema y newsletter.

## Estilos, fuentes y contenido

- Usar utilidades Tailwind y los tokens washi/sumi/aka definidos en `src/app/styles/global.css`.
- Mantener compatibilidad con modo claro, modo oscuro y móvil desde 390 px.
- Las fuentes se alojan localmente en `src/assets/fonts` con subconjunto latín y pesos explícitos. No volver a `fontProviders.google()` para las familias japonesas: genera cientos de archivos y HTML de más de 1 MB.
- El idioma principal es español; conservar `lang="es"`, metadata, canonical, Open Graph, RSS y sitemap.
- Los artículos usan la colección definida en `src/content.config.ts`; validar cualquier cambio de frontmatter contra su esquema.

## API y backend

- La URL pública base se configura con `PUBLIC_API_BASE_URL`; el valor predeterminado es `/api`.
- Nunca guardar secretos, tokens de LinkedIn ni credenciales en variables `PUBLIC_*`, en el frontend o en Git.
- La comunicación HTTP se aísla en `shared/api` y en la carpeta `api` de cada feature.
- No simular respuestas exitosas del backend. La UI debe reflejar estados de carga, éxito y error reales.
- Contrato inicial del newsletter: `POST {PUBLIC_API_BASE_URL}/newsletter/subscribe` con `{ "email": "..." }`.

## Comandos

Ejecutar desde `personal-app`:

```sh
pnpm install
pnpm dev
pnpm build
pnpm astro check
pnpm exec tsc --noEmit
pnpm preview
```

Para desarrollo en segundo plano, usar:

```sh
pnpm astro dev --background
pnpm astro dev status
pnpm astro dev logs
pnpm astro dev stop
```

Detener siempre el servidor al terminar y eliminar capturas o perfiles temporales creados durante la validación.

## Verificación obligatoria

Antes de dar una tarea por terminada:

1. Ejecutar `pnpm build`.
2. Ejecutar `pnpm astro check` y `pnpm exec tsc --noEmit`.
3. Probar con peticiones reales las rutas modificadas.
4. Revisar visualmente los estados afectados en escritorio y móvil; incluir dark mode cuando se modifiquen estilos o tema.
5. No presentar como verificada una interacción que dependa de un backend o credenciales todavía inexistentes.

## Git y GitHub

- No commitear `node_modules`, `dist`, `.astro`, `.env`, capturas temporales ni credenciales.
- Mantener `.env.example` actualizado solo con variables públicas o placeholders.
- El repositorio remoto es `git@github.com:Santidele22/personal-page.git` y la rama principal es `main`.
- Crear issues con objetivo, alcance y criterios de aceptación verificables.

## Documentación

Documentación principal: https://docs.astro.build

Consultar las guías oficiales antes de trabajar en el área correspondiente:

- Routing: https://docs.astro.build/en/guides/routing/
- Componentes Astro: https://docs.astro.build/en/basics/astro-components/
- Islas y frameworks: https://docs.astro.build/en/guides/framework-components/
- Content collections: https://docs.astro.build/en/guides/content-collections/
- Estilos y Tailwind: https://docs.astro.build/en/guides/styling/
- View Transitions: https://docs.astro.build/en/guides/view-transitions/
- Internacionalización: https://docs.astro.build/en/guides/internationalization/
