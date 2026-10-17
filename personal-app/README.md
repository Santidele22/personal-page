# santi. — web personal

Frontend de la web personal y el diario de Santi, migrado desde Next.js a Astro. El contenido se renderiza con Astro y Solid.js solo se hidrata en las partes interactivas: menú móvil, selector de tema y formulario de newsletter.

## Stack

- Astro con salida estática
- Solid.js para islas interactivas
- Tailwind CSS 4 mediante `@tailwindcss/vite`
- TypeScript
- Markdown/MDX, RSS y sitemap

El backend Nest con arquitectura MVC se integrará en el mismo monolito, pero no forma parte de este paquete todavía.

## Estructura

```text
src/
├── app/        # configuración, estilos globales y layouts
├── pages/      # rutas de Astro
├── widgets/    # secciones completas de las páginas
├── features/   # casos de uso interactivos con Solid
├── entities/   # tipos, datos y UI propia de cada entidad
├── shared/     # API, iconos y componentes reutilizables
└── content/    # colección Markdown/MDX del diario
```

## Desarrollo

Requisitos: Node.js 22.22 o superior y pnpm.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

El sitio está disponible por defecto en `http://localhost:4321`.

## Configuración de API

`PUBLIC_API_BASE_URL` define el origen base de las peticiones del navegador. El valor predeterminado es `/api`, adecuado cuando Astro y Nest comparten origen en el monolito. Durante el desarrollo puede apuntar al origen local de Nest, por ejemplo `http://localhost:3000/api`.

Contrato inicial del newsletter:

```text
POST {PUBLIC_API_BASE_URL}/newsletter/subscribe
Content-Type: application/json

{ "email": "tu@correo.com" }
```

El formulario muestra éxito únicamente después de una respuesta HTTP satisfactoria. El endpoint está aislado en `src/features/newsletter-form/api/subscribeNewsletter.ts` para poder adaptarlo al controlador de Nest sin modificar la UI.

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Genera el sitio de producción en `dist/` |
| `pnpm preview` | Sirve el build de producción |
| `pnpm astro ...` | Ejecuta comandos de Astro CLI |
