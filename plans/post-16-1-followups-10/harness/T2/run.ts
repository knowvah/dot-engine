// SPDX-License-Identifier: EPL-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, renderWithContext } from './src/index.js';
import { createDefaultContext } from './src/gvc/default-context.js';
const [,, file, out] = process.argv;
const ctx = createDefaultContext();
const g = parse(readFileSync(file!, 'utf8'));
ctx.layout(g, 'sfdp');
const s = renderWithContext(ctx, g, 'xdot');
writeFileSync(out!, s as string);
