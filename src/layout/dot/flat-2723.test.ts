// SPDX-License-Identifier: EPL-2.0
//
// Corpus 2723: native dot SEGFAULTS (exit 139) on this input, so C has no
// correct output to match. Upstream issue 2723 is open and
// tests/test_regression.py:test_2723 is xfail. The port's honest failure
// stands (ADR-5): flatLabelYpos hits `rank[r-1]` undefined and the foreign
// TypeError is wrapped as InternalError. If upstream fixes 2723, update this
// test (and the A4 note in docs/known-divergences.md).
// @see https://gitlab.com/graphviz/graphviz/-/issues/2723
import { describe, expect, test } from 'vitest';
import { renderSvg } from '../../index.js';
import { InternalError } from '../../errors.js';

/** Verbatim copy of graphviz tests/2723.dot. */
const SRC_2723 = `graph {
  407 [label = "@-407", style = filled, fillcolor = lightpink]
  407 -- 1875 [dir=forward, label = "Fun"]
  407 -- 1876 [dir=forward, label = "Arg"]
  { rank = same; 1875; 1876}
  1875 -- 1876 [dir=forward, style=invis]
  408 [label = "@-408", style = filled, fillcolor = lightpink]
  408 -- 1877 [dir=forward, label = "Fun"]
  408 -- 417 [dir=forward, label = "Arg"]
  { rank = same; 1877; 417}
  1877 -- 417 [dir=forward, style=invis]
  412 [label = "@-412", style = filled, fillcolor = lightpink]
  412 -- 1878 [dir=forward, label = "Fun"]
  412 -- 1879 [dir=forward, label = "Arg"]
  { rank = same; 1878; 1879}
  1878 -- 1879 [dir=forward, style=invis]
  413 [label = "@-413", style = filled, fillcolor = lightpink]
  413 -- 412 [dir=forward, label = "Fun"]
  413 -- 1880 [dir=forward, label = "Arg"]
  { rank = same; 412; 1880}
  412 -- 1880 [dir=forward, style=invis]
  414 [label = "@-414", style = filled, fillcolor = lightpink]
  414 -- 408 [dir=forward, label = "Fun"]
  414 -- 413 [dir=forward, label = "Arg"]
  { rank = same; 408; 413}
  408 -- 413 [dir=forward, style=invis]
  415 [label = "@-415", style = filled, fillcolor = lightpink]
  415 -- 407 [dir=forward, label = "Fun"]
  415 -- 414 [dir=forward, label = "Arg"]
  { rank = same; 407; 414}
  407 -- 414 [dir=forward, style=invis]
  416 [label = "@-416", style = filled, fillcolor = lightpink]
  416 -- 407 [dir=forward, label = "Fun"]
  416 -- 415 [dir=forward, label = "Arg"]
  { rank = same; 407; 415}
  407 -- 415 [dir=forward, style=invis]
  417 [label = "@-417", style = filled, fillcolor = lightpink]
  417 -- 407 [dir=forward, label = "Fun"]
  417 -- 416 [dir=forward, label = "Arg"]
  { rank = same; 407; 416}
  407 -- 416 [dir=forward, style=invis]
  1875 [label = "S", style = filled, fillcolor = lightgoldenrodyellow]
  1876 [label = "O", style = filled, fillcolor = lightgoldenrodyellow]
  1877 [label = "B", style = filled, fillcolor = lightgoldenrodyellow]
  1878 [label = "C", style = filled, fillcolor = lightgoldenrodyellow]
  1879 [label = "+", style = filled, fillcolor = plum1]
  1880 [label = "#1", style = filled, fillcolor = lightblue]
}
`;

function capture(): unknown {
  try {
    renderSvg(SRC_2723, 'dot');
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('corpus 2723 (C segfaults; upstream xfail)', () => {
  test('throws InternalError INTERNAL_ERROR with a TypeError cause', () => {
    const err = capture();
    expect(err).toBeInstanceOf(InternalError);
    const ie = err as InternalError;
    expect(ie.code).toBe('INTERNAL_ERROR');
    expect(ie.cause).toBeInstanceOf(TypeError);
  });
});
