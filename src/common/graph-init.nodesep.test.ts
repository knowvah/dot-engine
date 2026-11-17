// SPDX-License-Identifier: EPL-2.0
//
// Issue #162 (AD-3). graph_init stores POINTS(nodesep) in the `int`
// GD_nodesep. POINTS is ROUND(x * 72) = (int)(f + .5); past INT_MAX that
// conversion is undefined in C, and the oracle's arm64 build saturates it
// (scalar fcvtzs). Evidence: corpus 2758 (`nodesep=40000000`, 2.88e9 pt)
// makes native 16.1.1 report `Edge length 2147483701.000000`, which is
// 2147483647 + 27 + 27: the saturated nodesep plus two 54-pt nodes' halves.
// @see lib/common/input.c:657-659 (graph_init), lib/common/types.h:GD_nodesep
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { graphInit } from './graph-init.js';

const INT_MAX = 2147483647;

/** GD_nodesep after graph_init of a graph with the given `nodesep`. */
function nodesepOf(value: string): number | undefined {
  const g = parse(`digraph { nodesep=${value}; a }`);
  graphInit(g, true);
  return g.info.nodesep;
}

describe('graph_init: GD_nodesep is an int', () => {
  it('saturates a nodesep above INT_MAX points (corpus 2758)', () => {
    expect(nodesepOf('40000000')).toBe(INT_MAX);
  });

  it('keeps the last value below the limit: 29826161 in = 2147483592 pt', () => {
    expect(nodesepOf('29826161')).toBe(2147483592);
  });

  it('leaves ordinary values alone', () => {
    expect(nodesepOf('0.25')).toBe(18);
    expect(nodesepOf('1.5')).toBe(108);
  });
});
