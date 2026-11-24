// SPDX-License-Identifier: EPL-2.0
// Port twin of capture-native.sh: render one probe file in one format through
// the public parse + render entry of the working tree's src/.
// Usage: npx tsx port-render.ts <file.gv> <format>
import { readFileSync } from 'node:fs';
import { parse, render } from '../../../src/index.js';

const [file = '', fmt = 'dot'] = process.argv.slice(2);
process.stdout.write(render(parse(readFileSync(file, 'utf8')), fmt as 'dot'));
