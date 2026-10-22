// SPDX-License-Identifier: EPL-2.0

/**
 * AD-4: C process-level state is scoped to one public render call.
 *
 * Native Graphviz renders one graph per `dot` process, so every file static
 * (RNG streams, sequence counters, the emit_once warning set) starts at its C
 * initial value. These tests pin the port to that: a render after any other
 * render equals the same render in a fresh module graph (vi.resetModules is
 * the in-test stand-in for a fresh process).
 *
 * @see lib/common/emit.c:emit_once, emit_once_reset
 * @see lib/gvc/gvcontext.c:gvFreeContext
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerRenderState, resetRenderState } from './render-state.js';
import { drand48, srand48 } from './random.js';
import { crand, csrand } from './crand.js';
import { getFamilyMetrics } from './textmeasure-lookup.js';

/** First drand48() of an unseeded macOS libc process (X0 = 0x1234ABCD330E). */
const UNSEEDED_DRAND48 = 0.39646477376027534;
/** First rand() of an unseeded process (srand(1) state, minstd). */
const UNSEEDED_RAND = 16807;
/** The emit_once fallback warning for a face with no hard-coded metrics. */
const MENLO_WARNING = "Warning: no hard-coded metrics for 'Menlo'.  Falling back to 'Times' metrics";

/** Graph A: unknown face (emit_once), html anchors (anchorId), neato drand48. */
const GRAPH_A = 'graph{node[fontname=Menlo]; '
  + 'a[label=<<table href="u"><tr><td href="v">t</td></tr></table>>]; a--b; b--c; c--a}';
/** Graph B: same face, more anchors, and the sfdp rand() stream. */
const GRAPH_B = 'graph{node[fontname=Menlo]; '
  + 'x[label=<<table href="p"><tr><td href="q">s</td></tr></table>>]; x--y; y--z; z--w}';

type RenderSvg = (src: string, engine: string) => string;

/** Render with console.warn/error captured; returns svg + stderr lines. */
function capture(renderSvg: RenderSvg, src: string, engine: string): string {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  const warn = vi.spyOn(console, 'warn').mockImplementation(sink);
  const error = vi.spyOn(console, 'error').mockImplementation(sink);
  try {
    return `${renderSvg(src, engine)}\n--stderr--\n${lines.join('\n')}`;
  } finally {
    warn.mockRestore();
    error.mockRestore();
  }
}

/** A fresh module graph's renderSvg: the in-process stand-in for a new `dot`. */
async function freshRenderSvg(): Promise<RenderSvg> {
  vi.resetModules();
  const mod = await import('../index.js');
  return mod.renderSvg as RenderSvg;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('render-state registry', () => {
  it('runs every registered reset, in registration order', () => {
    const calls: string[] = [];
    registerRenderState(() => calls.push('first'));
    registerRenderState(() => calls.push('second'));
    resetRenderState();
    expect(calls).toEqual(['first', 'second']);
  });

  it('restores the drand48 stream to the unseeded POSIX default', () => {
    srand48(42);
    drand48();
    resetRenderState();
    expect(drand48()).toBe(UNSEEDED_DRAND48);
  });

  it('restores the C rand() stream to its srand(1) start', () => {
    csrand(123);
    crand();
    resetRenderState();
    expect(crand()).toBe(UNSEEDED_RAND);
  });

  it('clears the emit_once set so the fallback warning prints once per render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getFamilyMetrics('Menlo');
    getFamilyMetrics('Menlo');
    resetRenderState();
    getFamilyMetrics('Menlo');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([MENLO_WARNING, MENLO_WARNING]);
  });
});

/** Each test below re-imports all of src/ (vi.resetModules); slow under load. */
const MODULE_RELOAD_TIMEOUT_MS = 60_000;

describe('render output is independent of earlier renders (AD-4)', () => {
  it('A, B, A in one process: both A renders equal A in a fresh process', async () => {
    const fresh = capture(await freshRenderSvg(), GRAPH_A, 'neato');
    const renderSvg = await freshRenderSvg();
    const first = capture(renderSvg, GRAPH_A, 'neato');
    capture(renderSvg, GRAPH_B, 'sfdp');
    const again = capture(renderSvg, GRAPH_A, 'neato');
    expect(fresh).toContain(MENLO_WARNING);
    expect(first).toBe(fresh);
    expect(again).toBe(fresh);
  }, MODULE_RELOAD_TIMEOUT_MS);

  // Item 42's pooled diff, reduced: graphs-Symbol rendered with dot and then
  // neato in one worker lost the neato render's emit_once fallback warning
  // (warnedFontNames still held 'Symbol' from the dot render).
  it('Symbol face: a neato render after a dot render still warns, as native does', async () => {
    const src = 'digraph{a[fontname=Symbol label="for all: &forall;"]}';
    const renderSvg = await freshRenderSvg();
    const fresh = capture(await freshRenderSvg(), src, 'neato');
    capture(renderSvg, src, 'dot');
    const after = capture(renderSvg, src, 'neato');
    expect(after.split('\n--stderr--\n')[1]).toBe(
      "Warning: no hard-coded metrics for 'Symbol'.  Falling back to 'Times' metrics\n" +
        'Warning: Warning: no value for width of non-ASCII character 226. ' +
        'Falling back to width of space character',
    );
    expect(after).toBe(fresh);
  }, MODULE_RELOAD_TIMEOUT_MS);
});
