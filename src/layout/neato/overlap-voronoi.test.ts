// SPDX-License-Identifier: EPL-2.0

import { describe, it, expect } from 'vitest';
import { renderSvg } from '../../index.js';
import { RenderError } from '../../errors.js';

/**
 * overlap=voronoi selects AM_VOR, whose adjuster (voronoi.c) is not ported.
 * @see lib/neatogen/adjust.c:removeOverlapWith / vAdjust
 */
const BOXES = 'node[shape=box,width=3,height=2,fixedsize=true]';

function failure(src: string, engine: 'neato' | 'fdp' | 'twopi' | 'circo'): unknown {
  try {
    renderSvg(src, engine);
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('overlap=voronoi', () => {
  it('throws UNSUPPORTED_FEATURE naming the value for overlapping neato boxes', () => {
    const err = failure(`graph G { overlap=voronoi; ${BOXES}; a--b; b--c; a--c }`, 'neato');
    expect(err).toBeInstanceOf(RenderError);
    expect((err as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((err as RenderError).message).toBe(
      'overlap=voronoi: Voronoi overlap removal is not supported yet',
    );
  });

  it('matches the value case-insensitively like strcasecmp', () => {
    const err = failure(`graph G { overlap=VoRoNoI; ${BOXES}; a--b; b--c; a--c }`, 'neato');
    expect((err as RenderError).code).toBe('UNSUPPORTED_FEATURE');
  });

  it('does not throw for a 1-node graph (removeOverlapWith short-circuits)', () => {
    expect(failure('graph G { overlap=voronoi; a }', 'neato')).toBeUndefined();
  });

  it('does not throw when no pair overlaps (vAdjust returns before voronoi)', () => {
    const src = 'graph G { overlap=voronoi; a [pos="0,0!"]; b [pos="500,0!"] }';
    expect(failure(src, 'neato')).toBeUndefined();
  });

  it.each(['prism', 'false', 'scale', 'scalexy', 'compress', 'true'])(
    'overlap=%s is unaffected',
    (mode) => {
      const src = `graph G { overlap=${mode}; ${BOXES}; a--b; b--c; a--c }`;
      expect(failure(src, 'neato')).toBeUndefined();
    },
  );

  it('applies a multiplicative sep (no "+") to the node boxes before testing', () => {
    // 1x1in boxes 1.5in apart (neato pos is in inches): disjoint as drawn,
    // but sep=1 scales each half-size by 2 (native -v2: "Node separation:
    // add=0 (2,2)", "overlap [0] : 1"); sep=0.01 gives "overlap [0] : 0".
    const pair = (sep: string): string =>
      `graph G { overlap=voronoi; sep="${sep}"; node[shape=box,width=1,height=1,fixedsize=true]; ` +
      'a [pos="0,0!"]; b [pos="1.5,0!"] }';
    expect((failure(pair('1'), 'neato') as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect(failure(pair('0.01'), 'neato')).toBeUndefined();
  });

  it('throws for twopi, which calls adjustNodes in C', () => {
    const err = failure(`graph G { overlap=voronoi; ${BOXES}; a--b; a--c; a--d; a--e; a--f }`, 'twopi');
    expect((err as RenderError).code).toBe('UNSUPPORTED_FEATURE');
  });
});
