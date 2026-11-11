// SPDX-License-Identifier: EPL-2.0
// Issue #170: the port's mincross trajectory, in the format of native `dot -v`.
//   npx tsx plans/issue-170-aux-ordering-mincross/harness/trajectory.mts <input.gv>
// Prints the `mincross: pass P iter I ...` lines of every dot_mincross call (main
// graph first, then the flat-adjacent aux) on stderr, through the existing
// setMincrossTrace hook. Compare with harness/native/<id>.trajectory, which is
// `grep '^mincross: '` of native `-v` stderr. Reads live src/: run it on the tree
// under test.
import { readFileSync } from 'node:fs';
import { setMincrossTrace } from '../../../src/layout/dot/mincross-order.js';
import { parse, render } from '../../../src/index.js';

setMincrossTrace((line) => console.error(line));
render(parse(readFileSync(process.argv[2]!, 'utf8')), 'plain', { engine: 'dot' });
