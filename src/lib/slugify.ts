// Shared by Sidenav.astro (builds the hrefs) and catalog.astro (builds the
// matching section ids) — kept in one place so the two never drift apart.
export function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
