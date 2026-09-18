## Observation: vite 5 is unpatched; vitepress 1.x needs a scoped vite override
- **Context**: Closing Dependabot alerts for vite (GHSA-fx2h-pf6j-xcff, GHSA-v6wh-96g9-6wx3, GHSA-4w7w-66w2-5vf9) and esbuild (GHSA-67mh-4wv8-2f99) pulled in by vitepress@1.6.4.
- **Finding**: vite 5.x has no patched release (advisories patch 6.4.3 / 7.3.5 / 8.0.16 only). vitepress 1.6.4 declares `vite ^5.4.14`, and `@knowvah/vitepress-plugin-dot` peers on vitepress `^1.0.0`, so vitepress 2 (alpha, vite 8) is not an option. A scoped `overrides.vitepress.vite = ^6.4.3` builds the docs cleanly and pulls esbuild 0.25.12 under vite. npm hoists that vite 6.4.3 to the root and dedupes vitest's vite (was 8.0.16) onto it; vitest 4.1 accepts `^6 || ^7 || ^8`, tests pass.
- **Impact**: Drop the override once vitepress ships a stable release on vite >= 6 and the dot plugin peers on it. Until then vitest runs on vite 6, not 8.
- **Confidence**: High

## Observation: `npm update <pkg>` cannot reach deps bundled inside the `npm` package
- **Context**: ip-address, undici 6.x, tar and brace-expansion alerts pointed at `node_modules/npm/node_modules/*`.
- **Finding**: `@semantic-release/npm` depends on `npm` (^11.6.2), which ships those as bundleDependencies. `npm update ip-address undici` is a no-op for them; `npm update npm` (11.18.0 -> 11.19.1) is what clears them.
- **Impact**: Future alerts on packages under `node_modules/npm/` are fixed by bumping `npm` itself.
- **Confidence**: High
