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
