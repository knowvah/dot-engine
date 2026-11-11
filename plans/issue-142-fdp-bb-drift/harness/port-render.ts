// SPDX-License-Identifier: EPL-2.0
// Renders one input with the port's fdp from the live source (so temporary traces in src/ run).
// Usage (repo root): npx tsx plans/issue-142-fdp-bb-drift/harness/port-render.ts <file> <format>
import { readFileSync } from 'node:fs';
import { parse, render } from '../../../src/index.js';

const [file, format] = process.argv.slice(2);
if (!file || !format) throw new Error('usage: port-render.ts <file> <format>');
process.stdout.write(render(parse(readFileSync(file, 'latin1')), format as 'xdot', { engine: 'fdp' }));
