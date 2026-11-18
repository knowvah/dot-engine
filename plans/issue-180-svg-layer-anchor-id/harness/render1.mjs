// SPDX-License-Identifier: EPL-2.0
// Issue #180: render one input with one bundle to stdout (one process per render: module statics).
//   node render1.mjs <bundle.mjs> <engine> <format> <in.gv>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [bundle, engine, fmt, file] = process.argv.slice(2);
const mod = await import(pathToFileURL(bundle).href);
mod.agseterrf(() => 0);
process.stdout.write(mod.render(mod.parse(readFileSync(file, 'utf8')), fmt, { engine }));
