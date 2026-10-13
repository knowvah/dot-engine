// SPDX-License-Identifier: EPL-2.0

/**
 * C's default fontname is the PostScript name "Times-Roman" (const.h:67,
 * non-Windows). The headless estimator finds it in the hard-coded metrics
 * table, so native prints no "no hard-coded metrics" fallback warning; xdot
 * and json name the face `Times-Roman`; svg_textspan maps it through the
 * PostScript alias table to font-family="Times,serif".
 *
 * Expected values: native graphviz 16.1.0 (`dot -Txdot` / `-Tsvg`,
 * GVBINDIR=/tmp/ghl) on `digraph{a}`.
 *
 * @see lib/common/const.h:67 (DEFAULT_FONTNAME)
 * @see lib/common/textspan_lut.c:get_metrics_for_font_family
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render, renderSvg } from '../index.js';
import type { OutputFormat } from '../render/public.js';

const SRC = 'digraph{a}';

describe('DEFAULT_FONTNAME', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('measures the default face without the metrics fallback warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSvg(SRC, 'dot');
    const fallback = warn.mock.calls.map((c) => String(c[0]))
      .filter((m) => m.startsWith('Warning: no hard-coded metrics'));
    expect(fallback).toEqual([]);
  });

  it('names the face Times-Roman in xdot, as native does', () => {
    const xdot = render(parse(SRC), 'xdot' as OutputFormat, { engine: 'dot' });
    expect(xdot).toContain('F 14 11 -Times-Roman');
  });

  it('still renders the svg family through the PostScript alias', () => {
    expect(renderSvg(SRC, 'dot')).toContain('font-family="Times,serif" font-size="14.00"');
  });
});
