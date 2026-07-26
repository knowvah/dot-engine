// SPDX-License-Identifier: EPL-2.0
//
// Tests for the semantic `-Tdot` (agwrite) comparator.
//
// The load-bearing property here is BOTH directions: the comparator must be
// blind to agwrite's formatting noise (so real sweeps aren't drowned) AND must
// actually fail on every difference class it claims to detect. A comparator
// that only ever passes reports a clean corpus that proves nothing — the
// failure mode that previously hid three defects behind a vacuous zero-diff.

import { describe, it, expect } from 'vitest';
import { compareDot, parseDotOutput, DOT_TOLERANCE } from './compare-dot.js';

const OPTS = { iterative: false };

/** Oracle-shaped agwrite output: multi-line bracket lists, trailing commas. */
const NATIVE = `digraph G {
\tgraph [bb="0,0,176,166",
\t\trankdir=LR
\t];
\tnode [label="\\N"];
\tsubgraph cluster_0 {
\t\tgraph [bb="8,8,168,60"];
\t\ta\t[height=0.5,
\t\t\tpos="43,34",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="133,34",
\t\t\twidth=0.75];
\t\ta -> b\t[pos="e,105.62,34 70.403,34 94.199,34"];
\t}
}
`;

describe('parseDotOutput', () => {
  it('reads the scope tree, defaults, and object attributes', () => {
    const g = parseDotOutput(NATIVE);
    expect(g).toBeDefined();
    expect(g!.id).toBe('[graph]');
    expect(g!.attrs.get('rankdir')).toBe('LR');
    expect(g!.attrs.get('bb')).toBe('0,0,176,166');
    expect(g!.nodeDefaults.get('label')).toBe('\\N');
    expect(g!.subs.map(s => s.id)).toEqual(['subgraph:cluster_0']);
    const c0 = g!.subs[0]!;
    expect(c0.objs.map(o => o.id)).toEqual(['node:a', 'node:b', 'edge:a->b#0']);
    expect(c0.objs[0]!.attrs.get('width')).toBe('0.75');
  });

  it('returns undefined for input that is not a graph', () => {
    expect(parseDotOutput('not a graph at all')).toBeUndefined();
    expect(parseDotOutput('')).toBeUndefined();
  });

  it('numbers parallel edges per scope so they stay distinguishable', () => {
    // An edge statement declares only edges — endpoints are not node
    // statements. (Immaterial for real sweeps: agwrite always emits every
    // laid-out node as its own statement, since each carries pos/width/height.)
    const g = parseDotOutput('digraph { a -> b [w=1]; a -> b [w=2]; }')!;
    expect(g.objs.map(o => o.id)).toEqual(['edge:a->b#0', 'edge:a->b#1']);
  });

  it('strips port/compass suffixes from endpoint identity', () => {
    const g = parseDotOutput('digraph { a:p:n -> b:q [pos="1,2"]; }')!;
    expect(g.objs.some(o => o.id === 'edge:a->b#0')).toBe(true);
  });

  it('records anonymous scopes', () => {
    const g = parseDotOutput('digraph { { rank=same; a; b; } }')!;
    expect(g.subs.map(s => s.id)).toEqual(['subgraph:<anon>']);
    expect(g.subs[0]!.attrs.get('rank')).toBe('same');
  });
});

describe('compareDot — passes on identical and cosmetically-different input', () => {
  it('passes on byte-identical input', () => {
    expect(compareDot(NATIVE, NATIVE, OPTS)).toEqual({ verdict: 'pass', diffs: [] });
  });

  it('ignores number formatting, attribute order, and whitespace layout', () => {
    // Same graph, written the way the port formats it: `.75` not `0.75`,
    // `.5` not `0.5`, space-separated attrs on one line, different attr order.
    const port = `digraph G {
\tgraph [rankdir=LR bb="0,0,176,166"];
\tnode [label="\\N"];
\tsubgraph cluster_0 {
\t\tgraph [bb="8,8,168,60"];
\t\ta [width=.75 pos="43,34" height=.5];
\t\tb [pos="133,34" width=.75 height=.5];
\t\ta -> b [pos="e,105.62,34   70.403,34 94.199,34"];
\t}
}
`;
    expect(compareDot(port, NATIVE, OPTS)).toEqual({ verdict: 'pass', diffs: [] });
  });

  it('accepts numeric drift within tolerance and rejects it beyond', () => {
    const near = NATIVE.replace('pos="43,34"', `pos="43.009,34"`);
    expect(compareDot(near, NATIVE, OPTS).verdict).toBe('pass');

    const far = NATIVE.replace('pos="43,34"', 'pos="43.5,34"');
    const res = compareDot(far, NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs).toHaveLength(1);
    expect(res.diffs[0]!.kind).toBe('numeric');
    expect(res.diffs[0]!.path).toBe('node:a/pos');
    expect(res.diffs[0]!.delta).toBeCloseTo(0.5, 10);
    expect(res.diffs[0]!.delta!).toBeGreaterThan(DOT_TOLERANCE);
  });
});

describe('compareDot — fails on every class it claims to detect', () => {
  it('reports a missing subgraph as a structure diff', () => {
    const flat = `digraph G {
\tgraph [bb="0,0,176,166", rankdir=LR];
\tnode [label="\\N"];
\ta [height=0.5, pos="43,34", width=0.75];
\tb [height=0.5, pos="133,34", width=0.75];
\ta -> b [pos="e,105.62,34 70.403,34 94.199,34"];
}
`;
    const res = compareDot(flat, NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs.filter(d => d.kind === 'structure').map(d => d.object)).toEqual([
      'subgraph:cluster_0',
    ]);
    // The flattened members surface as root-scope extras.
    expect(res.diffs.filter(d => d.kind === 'extra').map(d => d.object).sort()).toEqual([
      'edge:a->b#0',
      'node:a',
      'node:b',
    ]);
  });

  it('reports an attribute present on only one side', () => {
    const noRankdir = NATIVE.replace(/,\n\t\trankdir=LR\n\t/, '');
    const res = compareDot(noRankdir, NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    const d = res.diffs.find(x => x.attr === 'rankdir');
    expect(d).toMatchObject({ kind: 'attr-set', port: '<absent>', native: 'LR' });
  });

  it('reports a missing `node [...]` default statement', () => {
    const res = compareDot(NATIVE.replace('\tnode [label="\\N"];\n', ''), NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs.some(d => d.path === '[graph]/node/label')).toBe(true);
  });

  it('reports the eager-propagation artifact when one side omits it', () => {
    // C installs a pre-declaration default locally on an earlier subgraph
    // (attr.c:287 agapply/addattr), so agwrite emits rankdir="" there. A lazily
    // resolving port omits it — this must be visible, not normalized away.
    const withEager = NATIVE.replace(
      '\t\tgraph [bb="8,8,168,60"];',
      '\t\tgraph [bb="8,8,168,60", rankdir=""];',
    );
    const res = compareDot(NATIVE, withEager, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs).toHaveLength(1);
    expect(res.diffs[0]).toMatchObject({
      kind: 'attr-set',
      object: 'subgraph:cluster_0',
      attr: 'rankdir',
      port: '<absent>',
      native: '',
    });
  });

  it('reports a non-numeric value difference', () => {
    const res = compareDot(NATIVE.replace('rankdir=LR', 'rankdir=TB'), NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs[0]).toMatchObject({ kind: 'value', attr: 'rankdir', port: 'TB', native: 'LR' });
  });

  it('reports a spline marker change as a value diff, not a numeric one', () => {
    const res = compareDot(NATIVE.replace('pos="e,105.62,34', 'pos="s,105.62,34'), NATIVE, OPTS);
    expect(res.diffs[0]!.kind).toBe('value');
  });

  it('reports a differing point count as a value diff', () => {
    const res = compareDot(NATIVE.replace(' 94.199,34"', '"'), NATIVE, OPTS);
    expect(res.diffs[0]!.kind).toBe('value');
  });

  it('reports an anonymous-scope count mismatch', () => {
    const a = 'digraph { { rank=same; a; } }';
    const b = 'digraph { { rank=same; a; } { rank=same; b; } }';
    const res = compareDot(a, b, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs.some(d => d.path === '[graph]/<anon>[count]')).toBe(true);
  });

  it('unfolds agwrite `\\`+newline continuations before comparing', () => {
    // agwrite breaks long values at ~128 bytes (write.c:113). Without
    // unfolding, the native side reads as truncated at the break and every
    // long spline pos false-diverges.
    const long = 'e,1,2 3,4 5,6 7,8 9,10 11,12 13,14 15,16 17,18 19,20';
    const folded = long.replace('13,14', '13,\\\n\t\t14');
    const a = `digraph { a -> b [pos="${long}"]; }`;
    const b = `digraph { a -> b [pos="${folded}"]; }`;
    expect(compareDot(a, b, OPTS)).toEqual({ verdict: 'pass', diffs: [] });
  });

  it('strips BOTH s, and e, spline markers so drift stays numeric', () => {
    // `pos="s,X,Y e,X,Y p..."` — stripping only the first leaves `e,` embedded,
    // which fails the numeric test and downgrades real drift to `value`.
    const a = 'digraph { a -> b [pos="s,377.76,150 e,230.46,150 366.39,150"]; }';
    const b = 'digraph { a -> b [pos="s,377.54,150 e,230.24,150 366.09,150"]; }';
    const res = compareDot(a, b, OPTS);
    expect(res.diffs).toHaveLength(1);
    expect(res.diffs[0]!.kind).toBe('numeric');
    // delta is the WORST field: 366.39−366.09, not the leading 377.76−377.54.
    expect(res.diffs[0]!.delta).toBeCloseTo(0.3, 6);
    // ...and within tolerance it passes rather than exact-comparing.
    const near = 'digraph { a -> b [pos="s,377.765,150 e,230.46,150 366.39,150"]; }';
    expect(compareDot(near, a, OPTS).verdict).toBe('pass');
  });

  it('reports unparseable output as a parse diff rather than throwing', () => {
    const res = compareDot('§ not dot §', NATIVE, OPTS);
    expect(res.verdict).toBe('diverged');
    expect(res.diffs[0]).toMatchObject({ kind: 'parse', port: 'unparseable', native: 'parsed' });
  });
});

describe('compareDot — iterative mode (AD-4)', () => {
  it('skips numeric comparison but still catches structure and attr sets', () => {
    const shifted = NATIVE.replace('pos="43,34"', 'pos="900,900"');
    expect(compareDot(shifted, NATIVE, { iterative: true }).verdict).toBe('pass');

    const flat = NATIVE.replace(/\tsubgraph cluster_0 \{\n\t\tgraph \[bb="8,8,168,60"\];\n/, '');
    const res = compareDot(flat, NATIVE, { iterative: true });
    expect(res.verdict).toBe('diverged');
    expect(res.diffs.some(d => d.kind === 'structure')).toBe(true);
  });
});
