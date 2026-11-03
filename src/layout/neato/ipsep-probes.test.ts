// SPDX-License-Identifier: EPL-2.0
//
// mode=ipsep (neatoinit.c:majorization -> stress_majorization_cola) against
// native graphviz 16.1.0 `-Kneato -Txdot` output. Fixtures under
// __fixtures__/ipsep/ are the oracle's own output (GVBINDIR=ghl16-all), with
// `<case>.xdot.stderr` and the `-v` stress trace as `<case>.trace`. C has no
// ipsep tests, so these probes are the specification (part-7 AD-4).
//
// The 7 unconstrained probes are byte-identical (part-7 AD-2); the constrained
// ones are held to 0.01 through compareXdot. Each runs the whole neato pipeline
// (no driver swap): stress_majorization_cola via solveStress.
//
// Native is not deterministic on the directed-edge probes: the VPSC solver's
// block order follows heap addresses (follow-up 106). In 40 native runs
// dired-true and start-self-dired gave 2 distinct traces, dired-hier 3,
// dired-hier-sep 4 and big-dired 21; the runs depart from each other at
// iteration 2-3. The port equals one native run byte for byte on the first
// four, and on big-dired is within 0.01 per node of the fixture, as native
// runs are. A probe that misses the committed fixture only because the
// fixture is one sample of that spread is `it.fails` below.
// @see lib/neatogen/neatoinit.c:majorization
// @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';

const FIXTURES = new URL('./__fixtures__/ipsep/', import.meta.url);

/** No constraint options: the cola driver runs plain stress majorization. */
const UNCONSTRAINED = [
  'ipsep-grid', 'ipsep-k6', 'ipsep-rand', 'ipsep-rand-len', 'ipsep-tree', 'kd-ipsep', 'kd-ipsep-len',
] as const;

/** diredgeconstraints, overlap=ipsep|vpsc, clusters, models and start=self. */
const CONSTRAINED = [
  'big-dired', 'cluster', 'dired-hier', 'dired-hier-levelsgap', 'dired-hier-sep', 'dired-true',
  'len-dired', 'model-circuit', 'model-mds', 'model-mds-len', 'model-subset', 'overlap-ipsep',
  'overlap-vpsc', 'start-self', 'start-self-dired',
] as const;

/**
 * 0.01 plus slack for decimal representation: xdot prints two decimals, so a
 * one-unit rounding difference shows as 0.01 + ~1e-11 in binary (big-dired:
 * 176 such coordinates, none larger).
 */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** What one render wrote to stderr (console.warn / console.error), newline-terminated. */
interface Rendered { xdot: string; stderr: string }

function neatoXdot(id: string): Rendered {
  const lines: string[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
  vi.spyOn(console, 'error').mockImplementation((m: unknown) => { lines.push(String(m)); });
  const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'neato' }));
  return { xdot, stderr: lines.map((l) => `${l}\n`).join('') };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('unconstrained ipsep probes are byte-identical to native', () => {
  it.each(UNCONSTRAINED)('%s', (id) => {
    const r = neatoXdot(id);
    expect(r.xdot).toBe(read(`${id}.xdot`));
    expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
  }, 60_000);
});

describe('constrained ipsep probes match native at 0.01', () => {
  it.each(CONSTRAINED)('%s', (id) => {
    const r = neatoXdot(id);
    const cmp = compareXdot(r.xdot, read(`${id}.xdot`), POSITION_TOLERANCE);
    expect(cmp.diffs).toEqual([]);
    expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
  }, 60_000);
});
