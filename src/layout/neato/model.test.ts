// SPDX-License-Identifier: EPL-2.0
//
// parseModel (C neatoModel) against the T0 native fixtures in
// __fixtures__/models/ and __fixtures__/ipsep/ (graphviz 16.1.0, neato).
// stderr is byte-equal; the xdot is held to 0.01 through compareXdot.
// @see lib/neatogen/neatoinit.c:neatoModel
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import { parseModel, MODEL_MDS, MODEL_SHORTPATH, MODEL_CIRCUIT, MODEL_SUBSET } from './index.js';

const MODELS = new URL('./__fixtures__/models/', import.meta.url);
const IPSEP = new URL('./__fixtures__/ipsep/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

const read = (dir: URL, name: string): string => readFileSync(new URL(name, dir), 'utf8');

function captured(run: () => unknown): { result: unknown; stderr: string } {
  const lines: string[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
  vi.spyOn(console, 'error').mockImplementation((m: unknown) => { lines.push(String(m)); });
  const result = run();
  return { result, stderr: lines.map((l) => `${l}\n`).join('') };
}

afterEach(() => { vi.restoreAllMocks(); });

/** [dir, id, expected parseModel value]; stderr is the fixture's own. */
const CASES: ReadonlyArray<readonly [URL, string, number]> = [
  [MODELS, 'major-mds-nolen', MODEL_SHORTPATH],
  [MODELS, 'major-mds-nolen-anon', MODEL_SHORTPATH],
  [MODELS, 'hier-mds-nolen', MODEL_SHORTPATH],
  [MODELS, 'kk-mds-nolen', MODEL_SHORTPATH],
  [MODELS, 'major-model-foo', MODEL_SHORTPATH],
  [MODELS, 'major-model-foo-anon', MODEL_SHORTPATH],
  [MODELS, 'major-model-Subset', MODEL_SHORTPATH],
  [MODELS, 'major-mds-edge-default', MODEL_MDS],
  [IPSEP, 'model-mds', MODEL_SHORTPATH],
  [IPSEP, 'model-mds-len', MODEL_MDS],
  [IPSEP, 'model-circuit', MODEL_CIRCUIT],
  [IPSEP, 'model-subset', MODEL_SUBSET],
];

describe('parseModel against native', () => {
  it.each(CASES)('%#: value and stderr', (dir, id, expected) => {
    const g = parse(read(dir, `${id}.gv`));
    const { result, stderr } = captured(() => parseModel(g));
    expect(result).toBe(expected);
    expect(stderr).toBe(read(dir, `${id}.xdot.stderr`));
  });

  it.each(CASES)('%#: renders as native', (dir, id) => {
    const { result, stderr } = captured(() =>
      String(render(parse(read(dir, `${id}.gv`)), 'xdot', { engine: 'neato' })));
    expect(stderr).toBe(read(dir, `${id}.xdot.stderr`));
    expect(compareXdot(String(result), read(dir, `${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  }, 60_000);
});

describe('parseModel values without a warning', () => {
  it.each([
    ['', MODEL_SHORTPATH], ['shortpath', MODEL_SHORTPATH], ['circuit', MODEL_CIRCUIT],
    ['subset', MODEL_SUBSET],
  ] as const)('model=%j', (value, expected) => {
    const g = parse(`graph { model="${value}"; a -- b }`);
    const { result, stderr } = captured(() => parseModel(g));
    expect(result).toBe(expected);
    expect(stderr).toBe('');
  });

  it('is MODEL_SHORTPATH when model is unset', () => {
    const { result, stderr } = captured(() => parseModel(parse('graph { a -- b }')));
    expect(result).toBe(MODEL_SHORTPATH);
    expect(stderr).toBe('');
  });
});

/** Native 16.1.0 (neato -Txdot): `edge [len]` anywhere declares; `node [len]` does not. */
describe('parseModel edge len declaration', () => {
  it.each([
    ['subgraph edge default with an edge', 'graph{model=mds; a--b; subgraph s{edge[len=2]; c--d}}', MODEL_MDS],
    ['subgraph edge default, no edge using it', 'graph{model=mds; a--b; subgraph s{edge[len=2]; c}}', MODEL_MDS],
    ['edge default and no edges', 'graph{model=mds; edge[len=2]; a}', MODEL_MDS],
    ['edge default after the last edge', 'graph{model=mds; a--b; edge[len=2]}', MODEL_MDS],
    ['per-edge len', 'graph{model=mds; a--b[len=2]}', MODEL_MDS],
    ['node default len', 'graph{model=mds; a--b; node[len=2]}', MODEL_SHORTPATH],
  ] as const)('%s', (_name, src, expected) => {
    expect(captured(() => parseModel(parse(src))).result).toBe(expected);
  });
});
