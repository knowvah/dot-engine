## Observation: npm prefers a scope registry over --registry and publishConfig.registry
- **Context**: Adding `@knowvah:registry=https://npm.pkg.github.com` to .npmrc so the docs theme (`@knowvah/theme`, GitHub Packages only) installs.
- **Finding**: `npm-registry-fetch` `pickRegistry` returns `opts['@scope:registry']` before `opts.registry`. With the scope mapping in .npmrc, `npm publish` went to GitHub Packages even with `publishConfig.registry` set and even with an explicit `--registry https://registry.npmjs.org/` (npm 11.19.1, dry-run verified). Fix: pin `publishConfig["@knowvah:registry"]` to npmjs. A CLI flag overrides the same-named publishConfig key (publish.js filters publishConfig by cliFlags), so the GitHub Packages mirror/backfill steps must pass `--@knowvah:registry=<gh>`; a plain `--registry <gh>` now lands on npmjs.
- **Impact**: Any repo mapping @knowvah to GitHub Packages that publishes to npmjs needs the scoped publishConfig key, not just `registry`. plantuml-ts's publishConfig sets only `registry` (not checked how it publishes).
- **Confidence**: High

## Observation: GitHub Packages drops peerDependenciesMeta from its packument
- **Context**: Same change; the lockfile gained `canvas` (native addon) and prebuild-install.
- **Finding**: `@knowvah/dot-engine@1.7.0` on npmjs has `peerDependenciesMeta.canvas.optional = true`; the GitHub Packages metadata for the same version has the peer but `peerDependenciesMeta: null`, so npm treats canvas as a required peer. The plugin's `@knowvah/dot-engine` peer copy is therefore pinned via `overrides` to the npmjs tarball URL.
- **Impact**: Bump that override URL when bumping @knowvah/vitepress-plugin-dot's dot-engine peer. Any optional peer of a GitHub-Packages-resolved package can resurface this way.
- **Confidence**: High
