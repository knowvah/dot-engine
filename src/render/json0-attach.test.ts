// SPDX-License-Identifier: EPL-2.0
/**
 * json0 prints what attach_attrs stored: C's json_begin_graph runs it for
 * FORMAT_JSON0 before json_end_graph writes, so the root's and every
 * cluster's `bb` and every edge's `pos` are in the output (with `lp`,
 * `lwidth`, `lheight`, `xlp`, `head_lp`, `tail_lp` where they apply).
 *
 * Every native ref is graphviz 16.1.1's own stdout, captured 2026-11-17 by
 * `plans/issue-184-json0-attach-before-write/harness/json0-compare.ts` with
 * `NATIVE_DIR=native`: `~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine>
 * -Tjson0 probes/<probe>.gv`, `GVBINDIR=/tmp/ghl1611` for dot and
 * `/tmp/ghl1611-all` for the other engines. The comparison is structural
 * (`compareJson`): json0's key order and root name are not native's.
 * @see plugin/core/gvrender_core_json.c:json_begin_graph
 * @see lib/common/output.c:attach_attrs
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import { parse } from '../parser/index.js';

const HARNESS_184 = new URL('../../plans/issue-184-json0-attach-before-write/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_184), 'utf8');

const FORMAT = 'json0';
const ENGINES: readonly EngineName[] = [
  'dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp', 'patchwork',
];
/** What each probe reaches is in the harness's `survey.md`. */
const PROBES = [
  'ab', 'labels', 'nested', 'lr', 'clusteredge', 'concentrate', 'noedges', 'inputbb', 'ortho',
  'multi',
] as const;
/**
 * The one row whose layout differs from native's: sfdp lays the 4-cycle of
 * `concentrate.gv` out in another orientation (issue #257's family), and
 * `-Tjson` shows the same difference. Its keys are all present.
 */
const SFDP_ORIENTATION_ROW = { probe: 'concentrate', engine: 'sfdp' } as const;
const MISSING_SUFFIX = '[missing]';

const ROWS = PROBES.flatMap((probe) => ENGINES.map((engine) => ({ probe, engine })));
const isOrientationRow = (r: { probe: string; engine: string }): boolean =>
  r.probe === SFDP_ORIENTATION_ROW.probe && r.engine === SFDP_ORIENTATION_ROW.engine;

const portJson0 = (probe: string, engine: EngineName): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), FORMAT, engine);
const nativeJson0 = (probe: string, engine: EngineName): string =>
  read(`native/${probe}.gv.${engine}.${FORMAT}`);

// The `ortho` probe warns under dot and neato (issue #246 owns that line).
beforeEach(() => { agseterrf(() => 0); });
afterEach(() => { agseterrf(null); });

describe('json0 equals native 16.1.1 through compareJson', () => {
  it.each(ROWS.filter((r) => !isOrientationRow(r)))('$probe under $engine', ({ probe, engine }) => {
    expect(compareJson(portJson0(probe, engine), nativeJson0(probe, engine)).diffs).toEqual([]);
  });

  it('concentrate under sfdp prints every key native prints (layout: issue #257)', () => {
    const { probe, engine } = SFDP_ORIENTATION_ROW;
    const { diffs } = compareJson(portJson0(probe, engine), nativeJson0(probe, engine));
    expect(diffs.filter((d) => d.path.endsWith(MISSING_SUFFIX))).toEqual([]);
  });
});

describe('json0 of `digraph { a -> b }` under dot', () => {
  interface Doc { bb?: string; edges: Array<{ pos?: string }> }
  const doc = (): Doc => JSON.parse(renderFormat(parse('digraph { a -> b }'), FORMAT, 'dot')) as Doc;

  it('prints the root bb attach_attrs stored', () => {
    expect(doc().bb).toBe('0,0,54,108');
  });

  it('prints the edge pos attach_attrs stored', () => {
    expect(doc().edges[0]?.pos).toBe('e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536');
  });
});
