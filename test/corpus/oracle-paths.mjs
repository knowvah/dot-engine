// SPDX-License-Identifier: EPL-2.0
// The one source of truth for where the native graphviz oracle lives. Plain
// .mjs so both the TypeScript walkers and the plain-node scripts (bench.mjs,
// capture-native.mjs) import it. @see docs/adr/0002-graphviz-16.1.1-oracle.md
//
// On an oracle bump this is the ONLY file to change, plus the two default
// literals in gen-headless-gvbindir.sh (a shell script cannot import this).
// test/corpus/gvbindir-defaults.test.ts enforces both, and that no other file
// under test/ hardcodes an oracle path or defaults the corpus root elsewhere.

import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** The oracle version every sweep is pinned to. */
export const ORACLE_VERSION = '16.1.1';

/** The oracle's CMake build tree. */
export const ORACLE_GRAPHVIZ_BUILD = join(homedir(), 'git/graphviz-16.1.1/build');

/**
 * The corpus: the oracle checkout's own `tests/` directory, so the inputs and
 * the reference binary always come from the same graphviz version (override
 * per script with CORPUS_ROOT, or `enumerate.ts` argv).
 */
export const ORACLE_CORPUS_ROOT = join(dirname(ORACLE_GRAPHVIZ_BUILD), 'tests');

/** The oracle `dot` binary (override per script with DOT_BIN). */
export const ORACLE_DOT_BIN = join(ORACLE_GRAPHVIZ_BUILD, 'cmd/dot/dot');

/** Headless plugin dir: core + dot_layout only (gen-headless-gvbindir.sh). */
export const ORACLE_GVBINDIR = '/tmp/ghl1611';

/** Plugin dir that also registers neato_layout, for non-dot engines. */
export const ORACLE_GVBINDIR_ALL = '/tmp/ghl1611-all';

/**
 * The plugin dir a sweep of `engine` defaults to: `GVBINDIR` when set, else the
 * dot-only dir for `dot` and the all-engines dir for every other engine.
 * @param {string} engine
 * @returns {string}
 */
export function defaultGvbindir(engine) {
  return process.env.GVBINDIR ?? (engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL);
}
