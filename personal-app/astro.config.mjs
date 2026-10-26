// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Production API (Render). Unset in dev: the frontend calls relative `/api`
// paths and the dev server proxy below forwards them to the Nest API.
const apiBaseUrl = process.env.PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? '';
const apiOrigin = /^https?:\/\//i.test(apiBaseUrl) ? new URL(apiBaseUrl).origin : '';

export default defineConfig({
	site: 'https://santi.dev',
	integrations: [mdx(), sitemap(), solidJs()],
	// Server rendering everywhere: the base layout (menu links, pie seal) and
	// the landing read the backend on every request instead of baking a build
	// snapshot, so admin edits reflect site-wide without a rebuild. The API
	// outage path is the declared fallback constants, which the loaders keep.
	// Cost: the diario content-collection pages also render on demand; still
	// cheap at this site's scale, and it avoids a static/SSR split.
	//
	// Deploys to Cloudflare Pages (SSR runs as Pages Functions on the Workers
	// runtime; the loaders only use `fetch`, so no Node APIs are needed).
	adapter: cloudflare(),
	output: 'server',
	// Content Security Policy (issue 41). Astro hashes the inline scripts and
	// styles it generates (font faces, island runtime, hydration directives).
	// The site is fully SSR, so Astro sends the policy as a per-render
	// `Content-Security-Policy` response header; `frame-ancestors` stays out of
	// it because browsers ignore that directive in a `<meta>` element and
	// `src/middleware.ts` appends it as a separate policy on the response.
	//
	// Two inline scripts are not tracked by Astro's build-time hasher, so their
	// hashes are supplied by hand (sha256, base64):
	//
	// 1. `ThemeScript.astro`, author-authored `is:inline` code intended to run
	//    before first paint. The hash must match the exact text between its
	//    `<script is:inline>` tags; if that body changes, recompute it or the
	//    browser blocks the theme bootstrap.
	// 2. Solid's SSR hydration bootstrap (`window._$HY`, emitted by
	//    `@astrojs/solid-js` via `renderHydrationScript`, which Astro renders
	//    without adding it to the policy). Without this hash every island
	//    hydration module throws and no Solid component hydrates. Recheck it
	//    when upgrading `solid-js` or `@astrojs/solid-js`.
	//
	// Attributes: no `script-src-attr` entry is needed, `default-src 'none'`
	// already blocks inline event handlers. `style-src-attr 'unsafe-inline'` is
	// required because templates do set inline `style` attributes: `Reveal.astro`
	// writes each stagger delay as `style="--reveal-delay: …"` (8 per page, values
	// come from props) and `BambooArt.astro` sets a font-family on an SVG
	// `<text>`. Hash sources cannot allow style attributes without
	// `'unsafe-hashes'`, and per-render values would need a hash each, so the
	// attribute scope stays `'unsafe-inline'`; `<style>` elements remain
	// hash-only. Revisit if those attributes are replaced by classes.
	security: {
		csp: {
			directives: [
				"default-src 'none'",
				// The admin islands call the API cross-origin in production
				// (Pages → Render), so its origin joins 'self' at build time.
				apiOrigin ? `connect-src 'self' ${apiOrigin}` : "connect-src 'self'",
				// `data:` is the washi paper noise texture (an inline SVG in global.css).
				"img-src 'self' https: data:",
				"font-src 'self'",
				"base-uri 'self'",
				"form-action 'self'",
			],
			scriptDirective: {
				resources: ["'self'"],
				hashes: [
					'sha256-4j2Fjb5t5epKsFGmCGFD0NPY/2JEZi9pUW8KeCytZFk=',
					'sha256-VmEf2BGdqVUwcvyhTyarJo/bY7DNqS2+T2sz4IO/kbw=',
				],
			},
			styleDirective: {
				// Only the attribute scope is listed: Astro keeps its implicit
				// `style-src 'self'` default for elements and adds the generated
				// hashes there. Declaring `'self'` here too would only trigger the
				// "shadowed by style-src-attr" warning for the same output.
				resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }],
			},
		},
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			// Development only: the frontend always calls relative `/api/...`
			// paths, and the dev server forwards them to the Nest API on port
			// 3000. The backend has no global prefix, so domain routes drop the
			// `/api` prefix while Better Auth stays at the real `/api/auth/*`
			// mount. `changeOrigin` stays off because Better Auth validates the
			// browser `Origin` header (`BETTER_AUTH_TRUSTED_ORIGINS`).
			proxy: {
				'/api': {
					target: 'http://localhost:3000',
					changeOrigin: false,
					rewrite: (path) =>
						path.startsWith('/api/auth') ? path : path.replace(/^\/api/, ''),
				},
			},
		},
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Shippori Mincho',
			cssVariable: '--font-shippori',
			fallbacks: ['serif'],
			options: {
				variants: [
					{ src: ['./src/assets/fonts/shippori-mincho-400-latin.woff2'], weight: 400, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/shippori-mincho-600-latin.woff2'], weight: 600, style: 'normal', display: 'swap' },
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Zen Kaku Gothic New',
			cssVariable: '--font-zen',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{ src: ['./src/assets/fonts/zen-kaku-gothic-new-400-latin.woff2'], weight: 400, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/zen-kaku-gothic-new-500-latin.woff2'], weight: 500, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/zen-kaku-gothic-new-700-latin.woff2'], weight: 700, style: 'normal', display: 'swap' },
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Geist Mono',
			cssVariable: '--font-geist-mono',
			fallbacks: ['monospace'],
			options: {
				variants: [
					{ src: ['./src/assets/fonts/geist-mono-400-latin.woff2'], weight: 400, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/geist-mono-600-latin.woff2'], weight: 600, style: 'normal', display: 'swap' },
				],
			},
		},
	],
});
