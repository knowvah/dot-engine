// SPDX-License-Identifier: EPL-2.0
// Issue #258: the oracle preflight the corpus scripts run, for dot and for the
// all-engines plugin dir, before trusting any native output in compare.mjs or
// residual.mjs.   npx tsx plans/issue-258-reopened-subgraph/harness/preflight.ts
import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR, 'dot');
oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR_ALL, 'sfdp');
console.log('oracle preflight ok (dot, sfdp)');
