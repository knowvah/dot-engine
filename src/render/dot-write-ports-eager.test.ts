// SPDX-License-Identifier: EPL-2.0
//
// Tests for three agwrite mechanisms that were unported or misported until the
// -Tdot track closed out: `write_port` endpoint syntax, the canonicalization of
// COMPUTED attribute values (quoting decision + long-line breaking), and the
// eager-empty graph attribute a subgraph inherits from a later declaration.
//
// @see lib/cgraph/write.c:565 write_port · :174 (_agstrcanon line breaking)
// @see lib/cgraph/attr.c:232 unviewsubgraphsattr · :257 setattr

import { describe, it, expect } from 'vitest';
import { parse } from '../index.js';
import { render } from './public.js';

/** `-Tdot` text for a DOT source. */
function dot(src: string): string {
  return render(parse(src), 'dot', { engine: 'dot' });
}

/** The `graph [ … ]` body lines of the named subgraph, trimmed. */
function subgGraphStmt(out: string, name: string): string[] {
  const lines = out.split('\n');
  const i = lines.findIndex(l => l.includes('subgraph ' + name + ' {'));
  if (i < 0) return [];
  const acc: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j]!.trim();
    if (t.startsWith('subgraph ') || t === '}') break;
    acc.push(t);
    if (t.endsWith('];')) break;
  }
  return acc;
}

describe('write_port — `:port` / `:port:compass` endpoint syntax', () => {
  it('re-emits a record port as endpoint syntax, not as a tailport attribute', () => {
    const out = dot('digraph { a[shape=record,label="<f0>x|<f1>y"]; b; a:f0 -> b; }');
    expect(out).toContain('a:f0 -> b');
    expect(out).not.toContain('tailport');
  });

  it('splits `port:compass` on the FIRST colon, canonicalizing each half', () => {
    // C: strchr(val, ':') then two separate _agstrcanon calls. write.c:580-588
    const out = dot('digraph { a[shape=record,label="<f0>x"]; b; a:f0:ne -> b:n; }');
    expect(out).toContain('a:f0:ne -> b:n');
  });

  it('writes both endpoints and omits an empty port', () => {
    const out = dot('digraph { a; b; a -> b:n; }');
    expect(out).toContain('a -> b:n');
  });
});

describe('computed attribute values go through the canonicalizer', () => {
  it('leaves a numeric computed value unquoted', () => {
    // agwrite canonicalizes on the way out, and `_agstrcanon` returns a bare
    // numeral untouched — native prints `lheight=0.23`, never `lheight="0.23"`.
    const out = dot('digraph { subgraph cluster0 { label="L"; a; } }');
    expect(out).toMatch(/lheight=[0-9.]+,/);
    expect(out).not.toMatch(/lheight="/);
  });

  it('quotes a computed value containing a comma', () => {
    expect(dot('digraph { a; }')).toMatch(/pos="[0-9.]+,[0-9.]+"/);
  });

  it('breaks a long computed pos across lines with a trailing backslash', () => {
    // Max_outputline is 128 BYTES OF THE VALUE (not of the line), so the fixture
    // needs a back edge over enough wide nodes to push one `pos` past it. The
    // break lands after a non-id char where the next is an id char, and the
    // emitted line then ends in a bare `\`. @see write.c:174-190
    const chain = Array.from({ length: 40 }, (_, i) => 'n' + String(i).padStart(2, '0'));
    const src = 'digraph { node [width=2]; ' + chain.join(' -> ') + '; ' +
      chain[chain.length - 1] + ' -> ' + chain[0] + '; }';
    const wrapped = dot(src).split('\n').filter(l => l.endsWith('\\'));
    expect(wrapped.length).toBe(1);
  });
});

describe('eager-empty graph attributes (unviewsubgraphsattr)', () => {
  it('seeds a DIRECT child of the declaring scope', () => {
    const out = dot('digraph G { subgraph clusterA { x -> y } graph [label="L"] }');
    expect(subgGraphStmt(out, 'clusterA').join(' ')).toContain('label=""');
  });

  it('does NOT seed a grandchild — the walk is not recursive', () => {
    const out = dot(
      'digraph G { subgraph clusterA { subgraph clusterB { x -> y } } graph [label="L"] }',
    );
    expect(subgGraphStmt(out, 'clusterB').join(' ')).not.toContain('label=""');
  });

  it('seeds from a NON-root declaring scope', () => {
    const out = dot(
      'digraph G { subgraph clusterA { subgraph clusterB { x -> y } graph [fill="late"] } }',
    );
    expect(subgGraphStmt(out, 'clusterB').join(' ')).toContain('fill=""');
  });

  it('does NOT seed when a sibling scope declared the key first', () => {
    // setattr then takes the "new local definition" branch, which never reaches
    // unviewsubgraphsattr — the same statement seeds nothing. attr.c:275-280
    const out = dot(
      'digraph G { subgraph clusterZ { graph [fill="early"]; z1 -> z2 } ' +
      'subgraph clusterA { subgraph clusterB { x -> y } graph [fill="late"] } }',
    );
    expect(subgGraphStmt(out, 'clusterB').join(' ')).not.toContain('fill=""');
  });

  it('still seeds from the root when a sibling declared first', () => {
    // Global symbols live in the ROOT's own dict, so a root declaration always
    // finds a local symbol and always takes the unview branch.
    const out = dot(
      'digraph G { subgraph clusterA { subgraph clusterB { graph [label="C2"]; x -> y } } ' +
      'graph [label="root"] }',
    );
    expect(subgGraphStmt(out, 'clusterA').join(' ')).toContain('label=""');
  });
});
