import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// The "catalog" collection models a generic list of products/services.
// Field names are intentionally generic (not tied to any industry) so
// this schema can back a product catalog, a services list, a menu, etc.
const catalog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/catalog" }),
	schema: z.object({
		name: z.string(),
		category: z.string(),
		shortDescription: z.string(),
		specs: z.array(z.string()),
		images: z.array(z.string()).min(1),
	}),
});

export const collections = { catalog };
