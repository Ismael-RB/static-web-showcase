// @ts-check
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist/", ".astro/", ".wrangler/", ".claude/"] },
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
);
