// SPDX-License-Identifier: EPL-2.0
/**
 * A subgraph inherits the `cluster` graph attribute (issue #183): cgraph
 * copies every graph attribute in effect in the parent into a subgraph when it
 * opens, so `is_a_cluster`'s `agget(g, "cluster")` sees an inherited value and
 * every engine draws the subgraph as a cluster.
 *
 * Provenance: every expectation is native graphviz 16.1.1's own output
 * (`~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine> -T<fmt> <probe>.gv`,
 * `GVBINDIR=/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for the other
 * engines), captured 2026-11-17 into
 * `plans/issue-183-inherited-cluster/harness/native/<probe>.<engine>.<fmt>`,
 * with stderr in `<...>.err` when native printed any.
 *
 * @see lib/cgraph/attr.c:agmakeattrs
 * @see lib/common/utils.c:is_a_cluster
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import { parse } from '../parser/index.js';

const HARNESS_183 = new URL('../../plans/issue-183-inherited-cluster/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_183), 'utf8');

const PROBES = [
  'r1', 'r2', 'late', 'nestlate', 'off', 'num', 'anon', 'mixed', 'sibling',
  'attrstmt', 'rankset', 'pack', 'pack2',
] as const;
const ENGINES: readonly EngineName[] = [
  'dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp', 'patchwork',
];
const FORMATS = ['dot', 'xdot'] as const;

type Row = readonly [probe: string, engine: EngineName, format: string];
const ROWS: readonly Row[] = PROBES.flatMap((p) =>
  ENGINES.flatMap((e) => FORMATS.map((f) => [p, e, f] as const)));
const rowKey = ([probe, engine]: Row): string => `${probe}/${engine}`;

/**
 * `num`/fdp: native's `bb` for cluster `p` starts at `7.9936e-15` where the
 * port has `0`. The same line differs for a plain `subgraph cluster_p`, so it
 * is fdp's cluster drift from Apple libm last bits (issue #209), not
 * inheritance.
 */
const NUM_FDP = 'num/fdp';
const NUM_FDP_NATIVE_BB = 'bb="7.9936e-15,98.504,99.434,195.79"';
const NUM_FDP_PORT_BB = 'bb="0,98.504,99.434,195.79"';
/**
 * `mixed`/sfdp: sfdp draws no clusters, and the same graph with no cluster at
 * all differs from native in the same lines (an sfdp layout divergence), so
 * only stderr is checked.
 */
const MIXED_SFDP = 'mixed/sfdp';
const STDOUT_EXCEPTIONS: ReadonlySet<string> = new Set([NUM_FDP, MIXED_SFDP]);

/** Native's stderr for one row; no `.err` file means native printed nothing. */
function nativeStderr(probe: string, engine: string, format: string): string {
  const name = `native/${probe}.${engine}.${format}.err`;
  return existsSync(new URL(name, HARNESS_183)) ? read(name) : '';
}

/** The port's stdout and stderr for one row. */
function portRun([probe, engine, format]: Row): { out: string; err: string } {
  const errs: string[] = [];
  agseterrf((s) => { errs.push(s); return 0; });
  const out = renderFormat(parse(read(`probes/${probe}.gv`)), format, engine);
  return { out, err: errs.join('') };
}

/** Indices of the lines at which two outputs of equal line count differ. */
function differingLines(a: string, b: string): number[] {
  const al = a.split('\n');
  const bl = b.split('\n');
  expect(al.length).toBe(bl.length);
  return al.flatMap((line, i) => (line === bl[i] ? [] : [i]));
}

afterEach(() => { agseterrf(null); });

describe('inherited cluster attribute: stdout equals native 16.1.1', () => {
  const exact = ROWS.filter((r) => !STDOUT_EXCEPTIONS.has(rowKey(r)));

  it('covers every row but the two listed exceptions', () => {
    expect(ROWS).toHaveLength(208);
    expect(exact).toHaveLength(204);
  });

  it.each(exact)('%s -K%s -T%s', (probe, engine, format) => {
    const native = read(`native/${probe}.${engine}.${format}`);
    expect(portRun([probe, engine, format]).out).toBe(native);
  });

  it.each(FORMATS)('num -Kfdp -T%s differs only in cluster p\'s bb (issue #209)', (format) => {
    const native = read(`native/num.fdp.${format}`);
    const { out } = portRun(['num', 'fdp', format]);
    const diff = differingLines(out, native);
    expect(diff).toHaveLength(1);
    const at = diff[0]!;
    expect(native.split('\n')[at]).toContain(NUM_FDP_NATIVE_BB);
    expect(out.split('\n')[at]).toContain(NUM_FDP_PORT_BB);
  });
});

describe('inherited cluster attribute: stderr equals native 16.1.1', () => {
  it.each(ROWS)('%s -K%s -T%s', (probe, engine, format) => {
    expect(portRun([probe, engine, format]).err).toBe(nativeStderr(probe, engine, format));
  });

  it('fdp warns about the second inherited cluster of one name, as fillMap does', () => {
    expect(nativeStderr('r1', 'fdp', 'dot'))
      .toBe('Warning: Two clusters named q - the second will be ignored\n');
  });
});
