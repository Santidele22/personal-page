# santi. — web personal

Frontend de la web personal y el diario de Santi, migrado desde Next.js a Astro. El contenido se renderiza con Astro y Solid.js solo se hidrata en las partes interactivas: menú móvil y selector de tema.

## Stack

- Astro con `@astrojs/cloudflare` 14 y renderizado on-demand (`output: 'server'`) en Cloudflare Workers
- Solid.js para islas interactivas
- Tailwind CSS 4 mediante `@tailwindcss/vite`
- TypeScript
- Markdown/MDX, RSS y sitemap

El backend Nest con arquitectura MVC provee el contenido de la landing y se despliega en Render (`backend/README.md` del raíz del repositorio).

## Estructura

```text
src/
├── app/        # configuración, estilos globales y layouts
├── pages/      # rutas de Astro (incluye el proxy /api de producción)
├── widgets/    # secciones completas de las páginas
├── features/   # loaders del backend por dominio e islas interactivas
├── entities/   # tipos, fallbacks declarados y UI propia de cada entidad
├── shared/     # API, iconos y componentes reutilizables
└── content/    # colección Markdown/MDX del diario
```

> Los widgets de la landing no importan datos de `entities/*/data.ts`: importan loaders de `features/<dominio>/api/` que leen la API en el render y declaran al data.ts como **fallback offline** para cuando el backend no responde (`null` en la API no solo se ignora: se encarga del copy de siempre, sin 500).

## Desarrollo

Requisitos: Node.js 22.22 o superior y pnpm.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

El sitio está disponible por defecto en `http://localhost:4321`.

## Configuración de API

`PUBLIC_API_BASE_URL` define el origen base de las peticiones del navegador. El valor predeterminado es `/api`, adecuado cuando Astro y Nest comparten origen en el monolito.

Resolución del `/api` según entorno:

- **`pnpm dev`**: el proxy de Vite en `astro.config.mjs` redirige `/api/*` a `http://localhost:3000` — igual que en producción, respetando el mount exacto `/api/auth/*` de Better Auth.
- **Workers**: `src/pages/api/[...path].ts` actúa de proxy same-origin. `BACKEND_URL` y `NEON_AUTH_BASE_URL` se leen de `cloudflare:workers` y se configuran en `wrangler.jsonc`; auth va a Neon y el resto a Render. En modo administrado, las escrituras admin envían JWT Bearer mediante `shared/api/authorizedHttp.ts`.
- Con `output: 'server'` todo render ocurre on-demand: los loaders leen la API en cada request y, si el backend no responde, usan los fallbacks declarados (nunca 500).

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo (proxy `/api` vía Vite) |
| `pnpm build` | Genera el build de producción en `dist/` (`dist/client` + `dist/server`) |
| `pnpm preview` | Sirve el build con el runtime Workers local |
| `pnpm deploy:dry-run` | Valida el despliegue con Wrangler sin publicarlo |
| `pnpm deploy` | Construye y despliega en Cloudflare Workers |
| `pnpm cf:types` | Regenera los tipos del runtime tras cambiar `wrangler.jsonc` |
| `pnpm astro ...` | Ejecuta comandos de Astro CLI |
