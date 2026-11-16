// SPDX-License-Identifier: EPL-2.0

/**
 * Lay a DOT source out through dot's position phase only, for tests that call
 * a router directly on the internal (pre-postprocess) frame.
 */

import { parse } from '../../src/parser/index.js';
import { GvcContext } from '../../src/gvc/context.js';
import { createMeasurer } from '../../src/common/textmeasure-factory.js';
import type { Graph } from '../../src/model/graph.js';
import { DOT_LAYOUT_ENGINE, dotPhaseInit } from '../../src/layout/dot/index.js';
import { dotRank } from '../../src/layout/dot/rank.js';
import { dotMincross } from '../../src/layout/dot/mincross.js';
import { dotPosition } from '../../src/layout/dot/position.js';

/**
 * Parse `src` and run init, rank, mincross and position. Composed from the
 * phase functions rather than the `phase` attribute: C's `phase=3` is a
 * success stop, so `dot_layout` still runs dotneato_postprocess after it and
 * the coordinates come back translated.
 * @see lib/dotgen/dotinit.c:dot_layout
 */
export function layoutToPosition(src: string): Graph {
  const g = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  if (g.info) g.info.gvc = ctx; // the only state GvcContext.layout adds
  dotPhaseInit(g);
  dotRank(g);
  dotMincross(g);
  dotPosition(g);
  return g;
}
