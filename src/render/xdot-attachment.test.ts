// SPDX-License-Identifier: EPL-2.0
//
// decorate=true label attachment in xdot (`_ldraw_`). emit_attachment draws it
// through the generic render calls — gvrender_set_style(defaultlinestyle),
// gvrender_set_pencolor(fontcolor), gvrender_polyline — so the xdot renderer
// writes `S 5 -solid c <fontcolor> L 3 ...` into the edge-label buffer right
// after the label's text. Every expectation is native 16.1 `-Txdot` output.
// @see lib/common/emit.c:emit_attachment (1870-1894)
// @see plugin/core/gvrender_core_dot.c:xdot_polyline

import { describe, it, expect } from 'vitest';
import { parse } from '../index.js';
import { render } from './public.js';
import type { EngineName } from '../gvc/context.js';

/** The `_ldraw_` value of the a->b edge, with xdot line continuations removed. */
function edgeLdraw(src: string, engine: EngineName): string {
  const out = render(parse(src), 'xdot', { engine }).replace(/\\\n/g, '');
  const m = /a -> b\t\[[^\]]*?_ldraw_="([^"]*)"/.exec(out);
  return m === null ? '' : m[1]!;
}

describe('xdot emit_attachment (decorate=true)', () => {
  it('appends the attachment polyline after the label text (dot)', () => {
    expect(edgeLdraw('digraph{a->b[label="x",decorate=true]}', 'dot')).toBe(
      'F 14 11 -Times-Roman c 7 -#000000 T 30.5 58.2 0 7 1 -x '
        + 'S 5 -solid c 7 -#000000 L 3 34 54 27 54 27 62.48 ',
    );
  });

  it('appends the attachment polyline after the label text (circo)', () => {
    expect(edgeLdraw('digraph{a->b[label="x",decorate=true]}', 'circo')).toBe(
      'F 14 11 -Times-Roman c 7 -#000000 T 80.9 22.2 0 7 1 -x '
        + 'S 5 -solid c 7 -#000000 L 3 84.4 18 77.4 18 80.79 18 ',
    );
  });

  it('uses the default line style and fontcolor, not the edge style', () => {
    // style=dashed penwidth=3 stay on _draw_; the attachment resets to solid,
    // penwidth 1 (no setlinewidth op), pen = fontcolor; the xlabel gets one too.
    const src = 'digraph{a->b[label="x",xlabel="y",decorate=true,'
      + 'style=dashed,penwidth=3,fontcolor=red]}';
    expect(edgeLdraw(src, 'dot')).toBe(
      'F 14 11 -Times-Roman c 7 -#ff0000 T 30.5 58.2 0 7 1 -x '
        + 'S 5 -solid c 7 -#ff0000 L 3 34 54 27 54 27 62.57 '
        + 'F 14 11 -Times-Roman c 7 -#ff0000 T 23.5 66.77 0 7 1 -y '
        + 'S 5 -solid c 7 -#ff0000 L 3 27 62.57 20 62.57 27 71.16 ',
    );
  });

  it('draws nothing without decorate', () => {
    expect(edgeLdraw('digraph{a->b[label="x"]}', 'dot')).toBe(
      'F 14 11 -Times-Roman c 7 -#000000 T 30.5 58.2 0 7 1 -x ',
    );
  });
});
