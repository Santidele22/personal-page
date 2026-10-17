// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
	site: 'https://santi.dev',
	integrations: [mdx(), sitemap(), solidJs()],
	vite: {
		plugins: [tailwindcss()],
		server: {
			// Development only: the frontend always calls relative `/api/...`
			// paths, and the dev server forwards them to the Nest API on port
			// 3000. The backend has no global prefix, so the path is unchanged.
			// `changeOrigin` stays off because Better Auth validates the browser
			// `Origin` header (`BETTER_AUTH_TRUSTED_ORIGINS`).
			proxy: {
				'/api': {
					target: 'http://localhost:3000',
					changeOrigin: false,
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
