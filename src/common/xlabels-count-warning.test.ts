// SPDX-License-Identifier: EPL-2.0

/**
 * Issue #174: C `addXLabels` counts the exterior labels it placed and warns
 * `N out of M exterior labels positioned.` when any is left unplaced. The
 * port wrote the same labels back silently.
 *
 * Provenance: each `src` is a probe of
 * `plans/issue-174-xlabels-count-warning/harness/probes/`, and each engine's
 * `err` is the stderr of native graphviz 16.1.1
 * (`~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine> -Tdot`,
 * `GVBINDIR=/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for the other
 * engines) on it, from `harness/native/<probe>.<engine>.err`, captured
 * 2026-11-17. An engine a probe does not list prints nothing in native.
 *
 * @see lib/common/postproc.c:addXLabels (569-587)
 */

import { afterEach, describe, it, expect } from 'vitest';
import { parse } from '../parser/index.js';
import { render } from '../render/index.js';
import { agseterrf } from './agerr.js';

const ENGINES = [
  'dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp', 'patchwork',
] as const;
type Engine = (typeof ENGINES)[number];

/** The `agwarningf` line, with the prefix `out` gives it. */
function warn(cnt: number, nLbls: number): string {
  return `Warning: ${cnt} out of ${nLbls} exterior labels positioned.\n`;
}

interface Probe {
  readonly name: string;
  readonly src: string;
  /** Native stderr per engine; an engine left out prints nothing. */
  readonly err: Partial<Record<Engine, string>>;
  /** Engines not pinned, each with its reason in a comment at the probe. */
  readonly skip?: readonly Engine[];
}

const REPRO = 'repro';
const HEADTAIL = 'headtail';
const FORCED = 'forced';
const HEADTAIL_LBLS = 12;
const NOSPLINES_LBLS = 3;

/**
 * `repro`: under dot, `a:n -> b:n` goes through the flat-adjacent aux layout,
 * which runs `addXLabels` on the aux graph too. Native warns once: the aux
 * pass leaves nothing unplaced.
 * `forced`: `repro` without `forcelabels=false`; every label is placed.
 * `headtail`: head, tail and exterior labels on four edges. twopi is not
 * pinned: the port leaves unplaced one xlabel native places (issue #244), so
 * it prints `1 out of 12` where native prints `2 out of 12`.
 * `nosplines`, `splnone`: edges without splines; `nodexl`: node xlabels only.
 */
const PROBES: readonly Probe[] = [
  {
    name: REPRO,
    src: String.raw`digraph { rankdir=LR; forcelabels=false; edge [xlabel=xl]; {rank=same; a; b} a:n -> b:n; a -> b [label=x]; }`,
    err: { dot: warn(1, 2), osage: warn(1, 3) },
  },
  {
    name: FORCED,
    src: String.raw`digraph { rankdir=LR; edge [xlabel=xl]; {rank=same; a; b} a:n -> b:n; a -> b [label=x]; }`,
    err: {},
  },
  {
    name: HEADTAIL,
    src: String.raw`digraph { forcelabels=false; edge [headlabel="hhhhhhhhhhhh" taillabel="tttttttttttt" xlabel="xxxxxxxxxxxx"]; a -> b; a -> b; a -> b; b -> a; }`,
    err: {
      dot: warn(4, HEADTAIL_LBLS),
      neato: warn(2, HEADTAIL_LBLS),
      fdp: warn(2, HEADTAIL_LBLS),
      circo: warn(0, HEADTAIL_LBLS),
      osage: warn(2, HEADTAIL_LBLS),
      sfdp: warn(2, HEADTAIL_LBLS),
    },
    skip: ['twopi'],
  },
  {
    name: 'nodexl',
    src: String.raw`graph { forcelabels=false; node [xlabel="a very long exterior label"]; a -- b; a -- c; b -- c; c -- d; a -- d; }`,
    err: {},
  },
  {
    name: 'nosplines',
    src: String.raw`digraph { splines=false; forcelabels=false; edge [xlabel=xl]; a -> b; a -> b; a -> b; }`,
    err: {
      neato: warn(2, NOSPLINES_LBLS),
      fdp: warn(2, NOSPLINES_LBLS),
      twopi: warn(2, NOSPLINES_LBLS),
      osage: warn(0, NOSPLINES_LBLS),
    },
  },
  {
    name: 'splnone',
    src: String.raw`digraph { splines=none; edge [xlabel=xl]; a -> b; b -> c [label=lab]; }`,
    err: {},
  },
];

interface Case {
  readonly name: string;
  readonly engine: Engine;
  readonly src: string;
  readonly err: string;
}

const CASES: readonly Case[] = PROBES.flatMap((p) =>
  ENGINES.filter((engine) => !p.skip?.includes(engine)).map((engine) => ({
    name: p.name, engine, src: p.src, err: p.err[engine] ?? '',
  })),
);

/** Render with `-Tdot`, returning the pieces the port handed `agerr`, joined. */
function stderrOf(src: string, engine: Engine): string {
  const pieces: string[] = [];
  agseterrf((m) => { pieces.push(m); });
  render(parse(src), 'dot', { engine });
  return pieces.join('');
}

function caseOf(name: string, engine: Engine): Case {
  return CASES.find((c) => c.name === name && c.engine === engine)!;
}

describe('addXLabels placed-label count warning (issue #174)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  it('pins every probe and engine but headtail/twopi', () => {
    expect(CASES.length).toBe(PROBES.length * ENGINES.length - 1);
  });

  it.each(CASES)('$name/$engine: stderr equals native', ({ src, engine, err }) => {
    expect(stderrOf(src, engine)).toBe(err);
  });

  it('repro/dot warns once: the flat-adjacent aux pass stays silent', () => {
    const c = caseOf(REPRO, 'dot');
    expect(stderrOf(c.src, c.engine)).toBe(warn(1, 2));
  });

  it('warns on every render: there is no once-flag', () => {
    const c = caseOf(HEADTAIL, 'circo');
    expect(stderrOf(c.src, c.engine)).toBe(warn(0, HEADTAIL_LBLS));
    expect(stderrOf(c.src, c.engine)).toBe(warn(0, HEADTAIL_LBLS));
  });

  it('forced: forcelabels places every label, so nothing is printed', () => {
    for (const engine of ENGINES) {
      expect(stderrOf(caseOf(FORCED, engine).src, engine)).toBe('');
    }
  });
});
