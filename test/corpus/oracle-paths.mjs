// SPDX-License-Identifier: EPL-2.0
// The one source of truth for where the native graphviz oracle lives. Plain
// .mjs so both the TypeScript walkers and the plain-node scripts (bench.mjs,
// capture-native.mjs) import it. @see docs/adr/0002-graphviz-16.1.1-oracle.md
// and docs/adr/0003-upstream-fix-forward.md: the oracle is now the CARRIED
// build (tag 16.1.1 + test/corpus/oracle-patches/*.patch); the pristine 16.1.1
// build is kept as the bisect build (ORACLE_PRISTINE_*).
//
// Oracle locations are literals in exactly three files: this one, and two
// shell scripts that cannot import it: gen-headless-gvbindir.sh (pristine
// defaults) and build-carried-oracle.sh (carried GVBINDIRs and worktree, and
// the pristine build default). test/corpus/gvbindir-defaults.test.ts enforces
// that all three agree, that no other file under test/ hardcodes an oracle
// path, and that none defaults the corpus root elsewhere.

import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** The oracle version every sweep is pinned to. */
export const ORACLE_VERSION = '16.1.1';

/** The pristine 16.1.1 checkout's CMake build tree (the bisect build). */
export const ORACLE_PRISTINE_GRAPHVIZ_BUILD = join(homedir(), 'git/graphviz-16.1.1/build');

/** The pristine build's `dot` binary. */
export const ORACLE_PRISTINE_DOT_BIN = join(ORACLE_PRISTINE_GRAPHVIZ_BUILD, 'cmd/dot/dot');

/** Pristine headless plugin dir: core + dot_layout only (gen-headless-gvbindir.sh). */
export const ORACLE_PRISTINE_GVBINDIR = '/tmp/ghl1611';

/** Pristine plugin dir that also registers neato_layout, for non-dot engines. */
export const ORACLE_PRISTINE_GVBINDIR_ALL = '/tmp/ghl1611-all';

/** The oracle's CMake build tree: the carried build (build-carried-oracle.sh). */
export const ORACLE_GRAPHVIZ_BUILD = join(homedir(), 'git/sseely/graphviz-carried/build');

/**
 * The corpus: the PRISTINE checkout's own `tests/` directory, so the inputs
 * never change when patches are carried (override per script with CORPUS_ROOT,
 * or `enumerate.ts` argv).
 */
export const ORACLE_CORPUS_ROOT = join(dirname(ORACLE_PRISTINE_GRAPHVIZ_BUILD), 'tests');

/** The oracle `dot` binary (override per script with DOT_BIN). */
export const ORACLE_DOT_BIN = join(ORACLE_GRAPHVIZ_BUILD, 'cmd/dot/dot');

/** Headless plugin dir: core + dot_layout only (build-carried-oracle.sh). */
export const ORACLE_GVBINDIR = '/tmp/ghl1611-carried';

/** Plugin dir that also registers neato_layout, for non-dot engines. */
export const ORACLE_GVBINDIR_ALL = '/tmp/ghl1611-carried-all';

/**
 * The plugin dir a sweep of `engine` defaults to: `GVBINDIR` when set, else the
 * dot-only dir for `dot` and the all-engines dir for every other engine.
 * @param {string} engine
 * @returns {string}
 */
export function defaultGvbindir(engine) {
  return process.env.GVBINDIR ?? (engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL);
}
