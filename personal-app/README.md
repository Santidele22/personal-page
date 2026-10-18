# santi. — web personal

Frontend de la web personal y el diario de Santi, migrado desde Next.js a Astro. El contenido se renderiza con Astro y Solid.js solo se hidrata en las partes interactivas: menú móvil, selector de tema y formulario de newsletter.

## Stack

- Astro con adapter Node y renderizado on-demand (`output: 'server'`): la página completa lee el backend en cada request
- Solid.js para islas interactivas
- Tailwind CSS 4 mediante `@tailwindcss/vite`
- TypeScript
- Markdown/MDX, RSS y sitemap

El backend Nest con arquitectura MVC se integra en la misma caja y provee todo el contenido de la landing (`backend/README.md` del raíz del repositorio).

## Estructura

```text
src/
├── app/        # configuración, estilos globales y layouts
├── pages/      # rutas de Astro (incluye el proxy /api de producción)
├── widgets/    # secciones completas de las páginas
├── features/   # loaders del backend por dominio, islas interactivas y caso de uso del newsletter
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
- **`pnpm build` + `pnpm start`** (adapter Node standalone): `src/pages/api/[...path].ts` actúa de proxy same-origin contra `BACKEND_URL` (`http://localhost:3000` por defecto). Sin proxy externo necesario en despliegue en la misma caja; si el despliegue ya enruta `/api` con un reverse proxy, esa ruta puede desactivarse.
- Con `output: 'server'` todo render ocurre on-demand: los loaders leen la API en cada request y, si el backend no responde, usan los fallbacks declarados (nunca 500).

```text
POST {PUBLIC_API_BASE_URL}/newsletter/subscribe
Content-Type: application/json

{ "email": "tu@correo.com" }
```

El formulario muestra éxito únicamente después de una respuesta HTTP satisfactoria. El endpoint está aislado en `src/features/newsletter-form/api/subscribeNewsletter.ts` para poder adaptarlo al controlador de Nest sin modificar la UI.

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo (proxy `/api` vía Vite) |
| `pnpm build` | Genera el build de producción en `dist/` (`dist/client` + `dist/server`) |
| `pnpm start` | Sirve el build de producción (adapter Node standalone, proxy `/api` interno) |
| `pnpm preview` | Alias histórico del build estático; usar `pnpm start` |
| `pnpm astro ...` | Ejecuta comandos de Astro CLI |
