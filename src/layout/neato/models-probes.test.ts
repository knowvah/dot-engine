// SPDX-License-Identifier: EPL-2.0
//
// neato `model=` (shortpath, subset, circuit, mds) on the major, KK and hier
// paths against native graphviz 16.1.0 `-Kneato -Txdot`. Fixtures under
// __fixtures__/models/ are the oracle's own output and stderr (part-8 AD-5);
// inputs come from plans/post-16-1-followups-8/harness/T0/gen-models.py.
//
// Native facts these cases pin down:
// - Major and hier pack by default (neato_layout: `Pack < 0 && layoutMode`), so
//   `*-disc-circuit` is split into connected components and never warns.
//   `*-pin-disc-circuit` keeps pinned nodes in one component (pccomps), which
//   is what reaches stress.c's disconnected warning.
// - KK `circuit_model` indexes by the 1-based AGSEQ (circuit.c:46), so row 0 of
//   Gm is never written and lu_decompose reports a zero row on every graph,
//   connected or not: native KK circuit always warns and falls back to shortest
//   paths. When the last-created node has an edge C also reads past the row
//   pointers and usually exits 139 (regen.sh keeps the first run that survives).
//   `kk-iso-*` end in an isolated node, so nothing overflows and native is
//   deterministic.
// - KK mds has the same overflow on GD_dist (neatoinit.c:1231). `kk-len-mds`
//   survived about 1 run in 1500; the port drops the out-of-range cells and
//   matches that run at 0.01.
// - A case with a `.native-crash` marker never survived (0 of 3000 runs for both
//   pack cases): there is no native output, so the port defines the result
//   (docs/known-divergences.md). Its stderr fixture holds what native printed
//   before crashing.
// @see lib/neatogen/neatoinit.c:neato_layout
// @see lib/neatogen/neatoinit.c:kkNeato
// @see lib/neatogen/stress.c:stress_majorization_kD_mkernel
// @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';

const FIXTURES = new URL('./__fixtures__/models/', import.meta.url);

/** compareXdot's test is strict; a one-printed-unit difference is 0.01 + ~1e-11. */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

/** Cases the port already lays out as native does, by mode. */
const MAJOR = [
  'major-default', 'major-len-mds', 'major-long-shortpath', 'major-mds-edge-default', 'major-shortpath',
] as const;
const HIER = ['hier-default', 'hier-len-mds', 'hier-long-mds', 'hier-shortpath'] as const;
const KK = ['kk-default', 'kk-iso-len-mds', 'kk-iso-long-mds', 'kk-len-mds', 'kk-shortpath'] as const;

/** Flipped to assertions by T6 (major, hier) and T7 (KK). */
const MAJOR_TODO = [
  'large-circuit', 'major-circuit', 'major-disc-circuit', 'major-len-circuit', 'major-len-subset',
  'major-long-mds', 'major-mds-nolen', 'major-mds-nolen-anon', 'major-model-Subset', 'major-model-foo',
  'major-model-foo-anon', 'major-pin-disc-circuit', 'major-subset',
] as const;
const HIER_TODO = [
  'hier-circuit', 'hier-disc-circuit', 'hier-len-circuit', 'hier-len-subset', 'hier-mds-nolen',
  'hier-pin-disc-circuit', 'hier-subset',
] as const;
const KK_TODO = [
  'kk-circuit', 'kk-disc-circuit', 'kk-iso-circuit', 'kk-iso-len-circuit', 'kk-len-circuit', 'kk-len-subset',
  'kk-mds-nolen', 'kk-subset',
] as const;

/** Native exits 139 on every run: no output to compare with. */
const KK_NATIVE_CRASH_TODO = ['kk-disc-circuit-pack', 'kk-disc4-circuit-pack'] as const;

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

function expectNative(id: string): void {
  const r = neatoXdot(id);
  expect(compareXdot(r.xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
}

afterEach(() => { vi.restoreAllMocks(); });

describe('major path models match native', () => {
  it.each(MAJOR)('%s', expectNative, 60_000);
  for (const id of MAJOR_TODO) it.todo(id);
});

describe('hier path models match native', () => {
  it.each(HIER)('%s', expectNative, 60_000);
  for (const id of HIER_TODO) it.todo(id);
});

describe('KK path models match native', () => {
  it.each(KK)('%s', expectNative, 60_000);
  for (const id of KK_TODO) it.todo(id);
});

describe('KK pack cases native cannot finish', () => {
  it.each(KK_NATIVE_CRASH_TODO)('%s has no native output', (id) => {
    expect(read(`${id}.native-crash`)).toMatch(/^exit 139 on all \d+ runs\n$/);
    expect(read(`${id}.xdot`)).toBe('');
  });
  for (const id of KK_NATIVE_CRASH_TODO) it.todo(`${id} lays out as the port defines`);
});
