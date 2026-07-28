// SPDX-License-Identifier: EPL-2.0
//
// Tests for the write_dicts port — the per-scope `graph` / `node` / `edge`
// default statements. @see lib/cgraph/write.c:262 write_dict / :307 write_dicts
//
// These go through the public `render(g, 'dot')` path rather than poking the
// private methods, so they also pin the integration: a dict statement that is
// emitted but never reached by the serializer would pass a unit test and fail
// here.

import { describe, it, expect } from 'vitest';
import { parse } from '../index.js';
import { render } from './public.js';

/** `-Tdot` text for a DOT source. */
function dot(src: string): string {
  return render(parse(src), 'dot', { engine: 'dot' });
}

/** The lines of the first `<kind> [` statement, verbatim (tabs preserved). */
function stmt(out: string, kind: string): string[] {
  const lines = out.split('\n');
  const i = lines.findIndex(l => l.trimStart().startsWith(kind + ' ['));
  if (i < 0) return [];
  const acc = [lines[i]!];
  for (let j = i + 1; j < lines.length; j++) {
    if (acc[acc.length - 1]!.trimEnd().endsWith('];')) break;
    acc.push(lines[j]!);
  }
  return acc;
}

describe('write_dicts — statement presence and scoping', () => {
  it('synthesizes the root node dict label default (N_label)', () => {
    // dot's graph_init installs an AGNODE `label` default of NODENAME_ESC.
    // @see lib/common/input.c:737-739
    expect(dot('digraph { a; }')).toContain('node [label="\\N"];');
  });

  it('does not repeat the synthesized label default in a subgraph', () => {
    const out = dot('digraph { subgraph cluster_0 { a; } }');
    expect(out.match(/node \[label="\\N"\];/g)).toHaveLength(1);
  });

  it('lets an explicit root node default win over the synthesized one', () => {
    const out = dot('digraph { node [label="x"]; a; }');
    expect(out).toContain('node [label=x];');
    expect(out).not.toContain('node [label="\\N"];');
  });

  it('emits an edge dict from edge defaults', () => {
    expect(dot('digraph { edge [color=red]; a -> b; }')).toContain('edge [color=red];');
  });

  it('emits a subgraph-scoped node dict', () => {
    const out = dot('digraph { subgraph cluster_0 { node [shape=box]; a; } }');
    expect(out).toContain('node [shape=box];');
  });

  it('omits a dict statement entirely when the scope declares none', () => {
    // A bare anonymous rank subgraph has no node/edge defaults of its own.
    const out = dot('digraph { { rank=same; a; b; } }');
    expect(out.match(/edge \[/g)).toBeNull();
  });
});

describe('write_dicts — layout', () => {
  it('keeps a single-entry dict on one line', () => {
    const lines = stmt(dot('digraph { a; }'), 'graph');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\tgraph \[bb="[^"]*"\];$/);
  });

  it('breaks a multi-entry dict after each comma, closing at statement level', () => {
    // A graph label adds lp/lwidth/lheight alongside bb — four entries.
    const lines = stmt(dot('digraph { label="hi"; a; }'), 'graph');
    expect(lines.length).toBeGreaterThan(1);
    // First line opens the bracket and ends with a comma.
    expect(lines[0]).toMatch(/^\tgraph \[\S+.*,$/);
    // Body lines sit one level deeper (two tabs). Entries are comma-SEPARATED,
    // so the final entry carries no trailing comma (the oracle's `rankdir=LR`).
    const body = lines.slice(1, -1);
    for (const l of body.slice(0, -1)) expect(l).toMatch(/^\t\t\S+.*,$/);
    expect(body[body.length - 1]).toMatch(/^\t\t\S+[^,]$/);
    // Closing `];` is back at the statement's own level, on its own line.
    expect(lines[lines.length - 1]).toBe('\t];');
  });

  it('indents a nested scope dict one level deeper', () => {
    const out = dot('digraph { subgraph cluster_0 { a; } }');
    expect(out).toMatch(/\n\t\tgraph \[bb="[^"]*"\];\n/);
  });
});

describe('write_dicts — ordering and canonicalization', () => {
  it('orders entries by strcmp of the attribute name', () => {
    // cgraph attr dicts are Dttrees keyed on Agsym_t.name with a NULL comparf
    // (attr.c:34), so dtfirst/dtnext walk them sorted.
    const lines = stmt(dot('digraph { label="hi"; a; }'), 'graph');
    const names = lines.map(l => {
      const m = /([A-Za-z_][A-Za-z_0-9]*)=/.exec(l);
      return m ? m[1]! : '';
    }).filter(n => n !== '');
    expect(names).toEqual([...names].sort());
    expect(names).toContain('bb');
    expect(names).toContain('lp');
  });

  it('quotes a dict value only when it needs quoting', () => {
    const out = dot('digraph { node [shape=box, label="a,b"]; a; }');
    expect(out).toContain('shape=box'); // bare
    expect(out).toContain('label="a,b"'); // comma forces quotes
  });

  it('emits an explicitly-empty default rather than skipping it', () => {
    // write_dict's empty-defval skip is gated on `!sym->print`; an explicitly
    // declared value has print set, so `label=""` must survive.
    expect(dot('digraph { node [label=""]; a; }')).toContain('label=""');
  });
});

describe('write_dicts — xdot parity', () => {
  it('emits the same dict statements under -Txdot', () => {
    // -Tdot and -Txdot share agwrite; only the draw-attribute step differs.
    // @see plugin/core/gvrender_core_dot.c:404 vs :418
    const g = parse('digraph { node [shape=box]; edge [color=red]; a -> b; }');
    const x = render(g, 'xdot', { engine: 'dot' });
    expect(x).toContain('node [label="\\N",');
    expect(x).toContain('shape=box');
    expect(x).toContain('edge [color=red];');
  });
});

describe('write_dicts — input-attribute echo and eager propagation', () => {
  it('echoes a root graph attribute', () => {
    expect(dot('digraph { rankdir=LR; a; }')).toContain('rankdir=LR');
  });

  it('echoes a locally-declared subgraph graph attribute', () => {
    const out = dot('digraph { subgraph cluster_0 { rank=same; label="c"; a; } }');
    expect(out).toContain('label=c');
  });

  it('does not echo an attribute a subgraph merely inherits', () => {
    // The builder seeds inherited label/font keys into subgraph attrs so cluster
    // label inheritance survives layout cluster rebuilds; those are not local
    // declarations and C prints nothing for them.
    const out = dot('digraph { label="root"; subgraph cluster_0 { a; } }');
    const cluster = out.slice(out.indexOf('subgraph cluster_0'));
    expect(cluster).not.toContain('label=root');
  });

  it('reproduces the eager-propagation artifact on a pre-declaration subgraph', () => {
    // cluster_0 opens BEFORE rankdir is declared, so agapply installs rankdir
    // with its empty pre-declaration default there; cluster_1 opens after and
    // inherits. @see lib/cgraph/attr.c:287
    const out = dot(`digraph {
      subgraph cluster_0 { a -> b; }
      rankdir=LR;
      subgraph cluster_1 { c -> d; }
    }`);
    const c0 = out.slice(out.indexOf('subgraph cluster_0'), out.indexOf('subgraph cluster_1'));
    const c1 = out.slice(out.indexOf('subgraph cluster_1'));
    expect(c0).toContain('rankdir=""');
    expect(c1).not.toContain('rankdir');
  });

  it('does not invent the artifact when nothing was declared late', () => {
    const out = dot('digraph { rankdir=LR; subgraph cluster_0 { a -> b; } }');
    expect(out.slice(out.indexOf('subgraph cluster_0'))).not.toContain('rankdir');
  });
});

describe('write_dict — local declaration vs inheritance (provenance)', () => {
  /** The `graph [...]` statement of the first anonymous subgraph. */
  function subgGraphStmt(out: string): string {
    const i = out.indexOf('\t{\n');
    return i < 0 ? '' : stmt(out.slice(i), 'graph').join('\n');
  }

  it('emits a re-declared value even when it equals the inherited one', () => {
    // The load-bearing case: cgraph gives every locally-declared attribute its
    // own dict symbol, and write_dict prints each one WITHOUT comparing against
    // the inherited value — so `foo=x` inside a subgraph that already inherits
    // `foo=x` still prints. Oracle-verified.
    const out = dot('digraph G { foo="x"; { rank=same; foo="x"; a; b } c; }');
    expect(subgGraphStmt(out)).toContain('foo=x');
  });

  it('does not emit an attribute the scope never declared', () => {
    const out = dot('digraph G { foo="x"; { rank=same; a; b } c; }');
    expect(subgGraphStmt(out)).not.toContain('foo');
  });

  it('keeps builder-seeded label-family inheritance invisible', () => {
    // The builder seeds GRAPH_LABEL_INHERIT_KEYS into a subgraph's own attrs so
    // label inheritance survives the layout's cluster rebuilds; those carry no
    // dict symbol in C and must not print. Only `seededAttrs` distinguishes
    // them from the re-declaration above, which has the identical value.
    const out = dot('digraph G { fontcolor="white"; { rank=same; a; b } c; }');
    expect(subgGraphStmt(out)).not.toContain('fontcolor');
  });

  it('emits a locally re-declared label-family key', () => {
    const out = dot('digraph G { fontcolor="white"; { rank=same; fontcolor="white"; a; b } c; }');
    expect(subgGraphStmt(out)).toContain('fontcolor=white');
  });
});

describe('write_dict — conditional empty-value skip', () => {
  function subgGraphStmt(out: string): string {
    const i = out.indexOf('\t{\n');
    return i < 0 ? '' : stmt(out.slice(i), 'graph').join('\n');
  }

  it('prints an empty local value when nothing is inherited', () => {
    const out = dot('digraph G { { rank=same; foo=""; a; b } c; }');
    expect(subgGraphStmt(out)).toContain('foo=""');
  });

  it('prints an empty local value when the inherited value is non-empty', () => {
    const out = dot('digraph G { foo="x"; { rank=same; foo=""; a; b } c; }');
    expect(subgGraphStmt(out)).toContain('foo=""');
  });

  it('skips an empty local value when the inherited value is empty too', () => {
    const out = dot('digraph G { foo=""; { rank=same; foo=""; a; b } c; }');
    expect(subgGraphStmt(out)).not.toContain('foo');
  });

  it('prints the root graph’s own empty value', () => {
    // The root inherits nothing, so write_dict’s `view == NULL` skip must NOT
    // be ported literally — native emits `foo=""` here.
    const out = dot('digraph G { foo=""; a; }');
    expect(stmt(out, 'graph').join('\n')).toContain('foo=""');
  });
});
