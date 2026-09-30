// SPDX-License-Identifier: EPL-2.0
//
// Copy brand assets from `@knowvah/theme` into docs-site/public/ so VitePress
// can reference them by URL. `themeConfig.logo` and `<link rel="icon">` take
// URLs, and the VitePress config runs in Node, where Vite's `?url` asset
// imports are unavailable — so the package is the source and this copy is
// the bridge. Same shape as plantuml-ts's docs-site/copy-brand-assets.mjs.
//
// The copies are gitignored; `docs:dev` and `docs:build` run this first
// (see package.json), so CI's `npm run docs:build` picks them up.

import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

/** Published path under docs-site/public → path inside the theme package. */
const ASSETS = {
  'knowvah_logo.svg': '@knowvah/theme/assets/knowvah_logo.svg',
};

mkdirSync(PUBLIC_DIR, { recursive: true });
for (const [target, source] of Object.entries(ASSETS)) {
  const from = require.resolve(source);
  const to = join(PUBLIC_DIR, target);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  process.stderr.write(`copy-brand-assets: ${source} -> docs-site/public/${target}\n`);
}
