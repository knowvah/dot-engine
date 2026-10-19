// SPDX-License-Identifier: EPL-2.0
/**
 * prerror messages of Pshortestpath.
 * @see ~/git/graphviz/lib/pathplan/shortest.c:170-340
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { shortestPath } from './index.js';
import type { Point, Poly } from './types.js';

const pt = (x: number, y: number): Point => ({ x, y });
const SQUARE: Poly = { ps: [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)] };

const MSG_SRC = 'source point not in any triangle';
const MSG_DST = 'destination point not in any triangle';
const MSG_PATH = 'cannot find triangle path';
const MSG_TRI = 'triangulation failed';

afterEach(() => vi.restoreAllMocks());

describe('shortestPath / prerror messages', () => {
  it('warns when the source is in no triangle and returns null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shortestPath(SQUARE, [pt(-1, 5), pt(5, 5)])).toBeNull();
    expect(warn.mock.calls).toEqual([[MSG_SRC]]);
  });

  it('warns when the destination is in no triangle and returns null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shortestPath(SQUARE, [pt(5, 5), pt(15, 5)])).toBeNull();
    expect(warn.mock.calls).toEqual([[MSG_DST]]);
  });

  it('warns once for the source when both points are outside', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shortestPath(SQUARE, [pt(-1, 5), pt(15, 5)])).toBeNull();
    expect(warn.mock.calls).toEqual([[MSG_SRC]]);
  });

  it('prints nothing on a successful path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shortestPath(SQUARE, [pt(1, 1), pt(9, 9)])).toEqual([pt(1, 1), pt(9, 9)]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('shortestPath / partial triangulation', () => {
  // Self-touching polygon: ear clipping dead-ends, leaving disconnected triangles.
  const BROKEN: Poly = {
    ps: [pt(0, 7), pt(1, 2), pt(1, 9), pt(2, 1), pt(9, 7), pt(4, 0), pt(1, 2)],
  };

  it('warns "cannot find triangle path" and returns the straight line', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shortestPath(BROKEN, [pt(5, 7), pt(1, 3)])).toEqual([pt(5, 7), pt(1, 3)]);
    expect(warn.mock.calls).toEqual([[MSG_TRI], [MSG_PATH]]);
  });
});
