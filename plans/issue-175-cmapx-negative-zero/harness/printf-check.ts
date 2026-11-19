// SPDX-License-Identifier: EPL-2.0
// Planning check for issue #175: what printfFixed(v, 0) gives where C's "%.0f"
// prints a sign or rounds a tie.  npx tsx <this file>
import { printfFixed } from '../../../src/util/printf-round.js';

for (const v of [-0, 0, -0.3, -0.5, 0.5, 1.5, 2.5, -2.5, 82.66666666666666]) {
  console.log(Object.is(v, -0) ? '-0' : String(v), printfFixed(v, 0), String(Math.round(v)));
}
