// SPDX-License-Identifier: EPL-2.0
// Issue #175: the corpus scripts' oracle preflight, for dot, neato and fdp.
//   npx tsx plans/issue-175-cmapx-negative-zero/harness/extra/preflight.ts
import { oraclePreflight } from '../../../../test/corpus/oracle-env.js';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL, ORACLE_VERSION,
} from '../../../../test/corpus/oracle-paths.mjs';

for (const engine of ['dot', 'neato', 'fdp']) {
  const dir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  oraclePreflight(ORACLE_DOT_BIN, dir, engine);
  console.log(`preflight ok: ${engine} ${ORACLE_VERSION} ${dir}`);
}
