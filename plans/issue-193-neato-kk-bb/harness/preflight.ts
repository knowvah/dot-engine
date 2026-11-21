// SPDX-License-Identifier: EPL-2.0
// Issue #193: the oracle preflight the corpus scripts run, for the all-engines plugin dir, before
// trusting any native output in the harness.
//   npx tsx plans/issue-193-neato-kk-bb/harness/preflight.ts
import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import { ORACLE_DOT_BIN, ORACLE_GVBINDIR_ALL } from '../../../test/corpus/oracle-paths.mjs';

oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR_ALL, 'neato');
console.log('oracle preflight ok (neato)');
