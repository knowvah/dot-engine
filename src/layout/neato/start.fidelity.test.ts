// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import {
  INIT_RANDOM, INIT_REGULAR, INIT_SELF, initRegular, parseStart,
} from './start.js';

const plain = async (src: string): Promise<string> =>
  String(await render(parse(src), 'plain', { engine: 'neato' }));

const UNSUPPORTED = { code: 'UNSUPPORTED_FEATURE' };
const CYCLE = 'a--b--c--d--e--a; a--c';

afterEach(() => { vi.restoreAllMocks(); });

describe('parseStart', () => {
  it.each([
    [undefined, INIT_RANDOM, 1], ['', INIT_RANDOM, 1], ['42', INIT_RANDOM, 42],
    ['random7', INIT_RANDOM, 7], ['regular', INIT_REGULAR, 1], ['regularX', INIT_REGULAR, 1],
    ['self', INIT_SELF, 1], ['selfish', INIT_SELF, 1], ['bogus', INIT_RANDOM, 1],
    ['-3', INIT_RANDOM, 1],
  ])('start=%s -> init %s seed %s', (p, init, seed) => {
    expect(parseStart(p, INIT_RANDOM)).toEqual({ init, seed });
  });

  it('falls back to the supplied default for an unknown keyword', () => {
    expect(parseStart('bogus', INIT_SELF).init).toBe(INIT_SELF);
  });
});

describe('initRegular', () => {
  it('places n nodes on a circle of radius n and marks them P_SET', () => {
    const g = new Graph('g', 'undirected');
    const ns = [0, 1, 2, 3].map((i) => new Node(i, `n${i}`, g));
    ns.forEach((n) => { g.nodes.set(n.name, n); n.info.pinned = true; });
    initRegular(g, 4);
    expect(ns[0]!.info.pos![0]).toBeCloseTo(4, 12);
    expect(ns[1]!.info.pos![1]).toBeCloseTo(4, 12);
    expect(ns[2]!.info.pos![0]).toBeCloseTo(-4, 12);
    expect(ns.every((n) => n.info.posSet === true && n.info.pinned === false)).toBe(true);
  });
});

describe('start=regular end to end', () => {
  it('equals the same graph with the polygon given as pos attributes', async () => {
    const names = ['a', 'b', 'c', 'd', 'e'];
    const decl = names.map((nm, i) => {
      const t = (2 * Math.PI * i) / 5;
      return `${nm} [pos="${(5 * Math.cos(t)).toPrecision(17)},${(5 * Math.sin(t)).toPrecision(17)}"];`;
    }).join(' ');
    const viaStart = await plain(`graph { start=regular; ${CYCLE} }`);
    const viaPos = await plain(`graph { ${decl} ${CYCLE} }`);
    expect(viaStart).toBe(viaPos);
  });

  it('differs from the random start', async () => {
    expect(await plain(`graph { start=regular; ${CYCLE} }`)).not.toBe(await plain(`graph { ${CYCLE} }`));
  });

  it('warns that node positions are ignored unless start=random', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await plain('graph { start=regular; a [pos="1,1"]; a--b--c }');
    expect(warn).toHaveBeenCalledWith('node positions are ignored unless start=random');
  });

  it('is honoured by mode=sgd (positions kept as the starting layout)', async () => {
    const out = await plain(`graph { mode=sgd; start=regular; ${CYCLE} }`);
    expect(out).not.toBe(await plain(`graph { mode=sgd; ${CYCLE} }`));
  });
});

describe('loud checks', () => {
  it.each([
    ['mode=hier', 'mode=hier: hierarchical stress majorization is not supported yet'],
    ['start=self', 'start=self: smart initialisation is not supported yet'],
    ['start=selfish', 'start=selfish: smart initialisation is not supported yet'],
    ['model=subset', 'model=subset: the subset distance model is not supported yet'],
    ['model=circuit', 'model=circuit: the circuit distance model is not supported yet'],
    ['mode=ipsep; diredgeconstraints=true', 'mode=ipsep: constrained (ipsep) majorization is not supported yet'],
    ['mode=ipsep; diredgeconstraints=Hier', 'mode=ipsep: constrained (ipsep) majorization is not supported yet'],
    ['mode=ipsep; overlap=ipsep', 'mode=ipsep: constrained (ipsep) majorization is not supported yet'],
    ['mode=KK; model=subset', 'model=subset: the subset distance model is not supported yet'],
    ['mode=KK; model=circuit', 'model=circuit: the circuit distance model is not supported yet'],
  ])('%s throws UNSUPPORTED_FEATURE', async (attrs, message) => {
    await expect(plain(`graph { ${attrs}; ${CYCLE} }`)).rejects.toMatchObject({ ...UNSUPPORTED, message });
  });

  it('mode=ipsep with a cluster throws', async () => {
    await expect(plain('graph { mode=ipsep; subgraph cluster_x { a; b } b--c--d }'))
      .rejects.toMatchObject(UNSUPPORTED);
  });

  it('mode=hier throws for each disconnected component too', async () => {
    await expect(plain('graph { mode=hier; a--b; c--d }')).rejects.toMatchObject(UNSUPPORTED);
  });

  it.each([
    'mode=ipsep', 'mode=sgd; model=subset', 'mode=sgd; model=circuit',
    'mode=hier; maxiter=-1', 'model=mds', 'start=random5', 'start=3',
  ])('%s renders', async (attrs) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await plain(`graph { ${attrs}; a--b--c--d; a--c [len=2] }`)).toMatch(/^graph /);
  });

  it('a single node never reaches the checks', async () => {
    expect(await plain('graph { mode=hier; start=self; model=subset; a }')).toMatch(/^graph /);
  });
});

describe('KK / sgd start=self and KK circuit fallback', () => {
  it('KK and sgd warn once per render for start=self and continue', async () => {
    // C warns once per process; each render is a fresh C process, so every
    // render warns once and no state leaks between diagrams.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const mode of ['KK', 'sgd', 'KK']) {
      await plain(`graph { mode=${mode}; start=self; a--b--c }`);
    }
    const hits = warn.mock.calls.filter((c) => c[0] === 'start=0 not supported with mode=self - ignored');
    expect(hits).toHaveLength(3);
  });

  it('mode=KK model=circuit on a disconnected graph warns and uses shortpath', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await plain('graph G { mode=KK; model=circuit; a--b; c--d }');
    expect(out).toMatch(/^graph /);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('graph G is disconnected. Hence, the circuit model\nis undefined. Reverting to the shortest path model.'));
  });

  it('mode=KK model=circuit with pack set is per-component and therefore loud', async () => {
    await expect(plain('graph { mode=KK; model=circuit; pack=true; a--b; c--d }'))
      .rejects.toMatchObject(UNSUPPORTED);
  });
});
