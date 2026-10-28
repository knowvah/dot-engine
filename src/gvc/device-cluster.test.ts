// SPDX-License-Identifier: EPL-2.0
//
// Item 89 (AD-6): cluster attributes read the dict snapshotted when the
// cluster opened (agsubg), not live ancestor attrs. A root `graph[key=v]`
// declared AFTER the cluster is ignored; declared BEFORE it applies.
// Expectations are the native 16.1.0 SVG fragments ($BASE/native/89-*).
// @see lib/cgraph/graph.c:agsubg

import { describe, it, expect } from 'vitest';
import { renderSvg } from '../index.js';

const BOX = 'points="8,-8 8,-60 78,-60 78,-8 8,-8"';
const poly = (fill: string, stroke: string, extra = ''): string =>
  `<polygon fill="${fill}" stroke="${stroke}"${extra} ${BOX}/>`;

interface Case {
  readonly key: string;
  readonly inner: string;
  readonly decl: string;
  readonly after: string | null;
  readonly before: string | null;
}

const CASES: readonly Case[] = [
  { key: 'style', inner: '', decl: 'style=filled', after: poly('none', 'black'), before: poly('lightgrey', 'black') },
  { key: 'color', inner: '', decl: 'color=white', after: poly('none', 'black'), before: poly('none', 'white') },
  { key: 'pencolor', inner: '', decl: 'pencolor=red', after: poly('none', 'black'), before: poly('none', 'red') },
  { key: 'fillcolor', inner: 'style=filled;', decl: 'fillcolor=yellow', after: poly('lightgrey', 'black'), before: poly('yellow', 'black') },
  { key: 'bgcolor', inner: '', decl: 'bgcolor=green', after: poly('none', 'black'), before: poly('green', 'black') },
  { key: 'penwidth', inner: '', decl: 'penwidth=5', after: poly('none', 'black'), before: poly('none', 'black', ' stroke-width="5"') },
  { key: 'gradientangle', inner: 'style=filled;fillcolor="red:blue";', decl: 'gradientangle=90', after: 'x1="8" y1="-34" x2="78" y2="-34"', before: 'x1="43" y1="-8" x2="43" y2="-60"' },
  { key: 'peripheries', inner: '', decl: 'peripheries=0', after: poly('none', 'black'), before: null },
  { key: 'colorscheme', inner: 'color=3;', decl: 'colorscheme=blues9', after: poly('none', '#000000'), before: poly('none', '#c6dbef') },
];

const src = (c: Case, declFirst: boolean): string =>
  declFirst
    ? `digraph{graph[${c.decl}]; subgraph cluster_x{${c.inner} a}}`
    : `digraph{subgraph cluster_x{${c.inner} a}; graph[${c.decl}]}`;

describe('cluster attrs use the parse-time snapshot', () => {
  for (const c of CASES) {
    it(`${c.key}: declared after the cluster is ignored`, () => {
      const svg = renderSvg(src(c, false), 'dot');
      if (c.after !== null) expect(svg).toContain(c.after);
      if (c.before !== null) expect(svg).not.toContain(c.before);
    });
    it(`${c.key}: declared before the cluster applies`, () => {
      const svg = renderSvg(src(c, true), 'dot');
      if (c.before !== null) expect(svg).toContain(c.before);
      else expect(svg).not.toContain(BOX);
    });
  }
});
