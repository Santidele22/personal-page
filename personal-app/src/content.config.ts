import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// Portada card columns the diario section renders (`widgets/blog/`).
			// The icon pair mirrors `entities/post/types.ts` PostIcon.
			category: z.string().min(1).optional(),
			icon: z.enum(['compass', 'database', 'blocks', 'wrench', 'scale']).optional(),
			readMin: z.number().int().min(1).optional(),
			featured: z.boolean().optional(),
		}),
});

export const collections = { blog };
