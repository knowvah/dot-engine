// SPDX-License-Identifier: EPL-2.0

/**
 * AD-8 (part 4, item 47): `GvcContext.layout` resets C process state on
 * entry, so the low-level layout + renderWithContext pipeline behaves as one
 * native run per graph. Caller-installed hooks are not reset.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import { setTextMeasurer } from '../common/textmeasure-factory.js';
import type { TextMeasurer } from '../common/textmeasure.js';

const UNKNOWN_FONT = 'NoSuchFontForReset';
const FONT_DOT = `digraph { node [fontname="${UNKNOWN_FONT}"]; a -> b }`;
const FONT_WARNING = `no hard-coded metrics for '${UNKNOWN_FONT}'`;

/** One low-level pipeline run on a shared context. */
function runOnce(ctx: ReturnType<typeof createDefaultContext>): void {
  const g = parse(FONT_DOT);
  ctx.layout(g, 'dot');
  deviceRender(ctx, g, 'svg');
  ctx.freeLayout(g, 'dot');
}

/** Count warn calls whose text mentions the unknown font. */
function fontWarnings(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((c: unknown[]) => String(c[0]).includes(FONT_WARNING)).length;
}

describe('GvcContext.layout render-state reset (AD-8)', () => {
  afterEach(() => {
    setTextMeasurer(undefined);
    vi.restoreAllMocks();
  });

  it('prints a once-only warning for each graph run on one context', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ctx = createDefaultContext();
    runOnce(ctx);
    expect(fontWarnings(spy)).toBe(1);
    runOnce(ctx);
    expect(fontWarnings(spy)).toBe(2);
  });

  it('keeps a caller-installed text measurer installed across layout', () => {
    const inner = createDefaultContext().textMeasurer;
    const calls: string[] = [];
    const custom: TextMeasurer = {
      measure: (...args: Parameters<TextMeasurer['measure']>) => {
        calls.push(String(args[0]));
        return inner.measure(...args);
      },
    } as TextMeasurer;
    setTextMeasurer(custom);
    const ctx = createDefaultContext();
    runOnce(ctx);
    expect(ctx.textMeasurer).toBe(custom);
    expect(createDefaultContext().textMeasurer).toBe(custom);
    expect(calls.length).toBeGreaterThan(0);
  });
});
