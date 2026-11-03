// SPDX-License-Identifier: EPL-2.0
//
// Root attributes (`maxiter`, `epsilon`, `stresswt`) reach each connected
// component of a packed neato layout, against native graphviz 16.1.0
// `-Kneato -Txdot`. Fixtures under __fixtures__/multi-component-attrs/ are the
// oracle's own output and stderr (part-9 T0; regen.sh).
//
// C's agsubg copies the parent's attribute values into a new subgraph, so
// agget(component, "maxiter") sees the root's value; ccomps and pccomps copy
// them here (part-9 AD-1). `major-maxiter3-pin` goes through pccomps.
// @see lib/pack/ccomps.c:ccomps
// @see lib/pack/ccomps.c:pccomps
// @see lib/cgraph/subg.c:agsubg
// @see lib/cgraph/attr.c:agmakeattrs
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import { ccomps, pccomps } from '../pack/index.js';

const FIXTURES = new URL('./__fixtures__/multi-component-attrs/', import.meta.url);

/** compareXdot's test is strict; a one-printed-unit difference is 0.01 + ~1e-11. */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

const MODES = ['major', 'hier', 'sgd', 'kk'] as const;
const ATTRS = ['default', 'maxiter3', 'epsilon', 'stresswt', 'maxiterneg'] as const;
const CASES: string[] = [
  ...MODES.flatMap((m) => ATTRS.map((a) => `${m}-${a}`)),
  'major-maxiter3-cluster',
  'major-maxiter3-pin',
];

const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

function neatoXdot(id: string): { xdot: string; stderr: string } {
  const lines: string[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
  vi.spyOn(console, 'error').mockImplementation((m: unknown) => { lines.push(String(m)); });
  const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'neato' }));
  return { xdot, stderr: lines.map((l) => `${l}\n`).join('') };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('neato components see the root attributes', () => {
  it.each(CASES)('%s matches native', (id) => {
    const r = neatoXdot(id);
    expect(compareXdot(r.xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
    expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
  }, 60_000);
});

describe('ccomps and pccomps copy the parent attributes', () => {
  const g = parse(read('major-maxiter3-pin.gv'));

  it('ccomps components hold a copy of the root maxiter', () => {
    const cs = ccomps(g, '_neato_cc');
    expect(cs.length).toBe(3);
    expect(cs.map((c) => c.attrs.get('maxiter'))).toEqual(['3', '3', '3']);
    cs[0].attrs.set('maxiter', '9');
    expect(g.attrs.get('maxiter')).toBe('3');
  });

  it('pccomps components hold a copy of the root maxiter', () => {
    g.nodes.get('a')!.info.pinned = true;
    const { graphs, pinned } = pccomps(g, '_neato_cc');
    expect(pinned).toBe(true);
    expect(graphs.map((c) => c.attrs.get('maxiter'))).toEqual(['3', '3', '3']);
  });
});
