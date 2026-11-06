// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect, vi } from 'vitest';
import { renderSvg, tryRenderSvg, RenderError, ParseError, agseterrf } from './index.js';

const VALID = 'digraph { a -> b }';

describe('tryRenderSvg success', () => {
  it('returns svg and no errors for a valid graph (XOR)', () => {
    const r = tryRenderSvg(VALID, 'dot');
    expect(typeof r.svg).toBe('string');
    expect(r.svg!.length).toBeGreaterThan(0);
    expect(r.errors).toBeUndefined();
  });
});

describe('tryRenderSvg syntax failure', () => {
  it('returns one structured syntax error with a location', () => {
    const r = tryRenderSvg('digraph { a ->', 'dot');
    expect(r.svg).toBeUndefined();
    expect(r.errors).toHaveLength(1);
    const e = r.errors![0]!;
    expect(e.type).toBe('syntax');
    expect(e.code).toBe('SYNTAX_UNEXPECTED_EOF');
    expect(e.location).toBeDefined();
    expect(e.location!.line).toBeGreaterThanOrEqual(1);
  });

  it('returns a plain JSON-serializable object with no stack', () => {
    const r = tryRenderSvg('digraph { a ->', 'dot');
    const e = r.errors![0]!;
    expect('stack' in e).toBe(false);
    const round = JSON.parse(JSON.stringify(e));
    expect(round.type).toBe(e.type);
    expect(round.code).toBe(e.code);
    expect(round.message).toBe(e.message);
    expect(round.friendlyMessage).toBe(e.friendlyMessage);
  });
});

describe('render-stage failure', () => {
  // 2.0: an unregistered engine argument is a caller mistake (ADR-3), thrown
  // as TypeError ERR_INVALID_ARG_VALUE by both entry points (ADR-5).
  it('tryRenderSvg throws (not returns) for an unregistered engine', () => {
    let err: unknown;
    try { tryRenderSvg(VALID, 'bogus'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TypeError);
    expect((err as { code?: string }).code).toBe('ERR_INVALID_ARG_VALUE');
  });

  it('renderSvg throws TypeError ERR_INVALID_ARG_VALUE, not a RenderError', () => {
    let err: unknown;
    try { renderSvg(VALID, 'bogus'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TypeError);
    expect(err).not.toBeInstanceOf(RenderError);
    expect((err as { code?: string }).code).toBe('ERR_INVALID_ARG_VALUE');
  });
});

describe('exports', () => {
  it('re-exports ParseError and RenderError', () => {
    expect(new ParseError('x', 'SYNTAX_ERROR', { line: 1, column: 1 })).toBeInstanceOf(Error);
    expect(new RenderError('x')).toBeInstanceOf(Error);
  });
});

describe('agseterrf (plantuml-ts 42)', () => {
  // Native 16.1.0 stderr for this graph, `dot -Tsvg`, 2026-11-06.
  const TOO_SMALL = 'digraph{a[shape=plaintext,label=<<TABLE FIXEDSIZE="TRUE" WIDTH="5" '
    + 'HEIGHT="5"><TR><TD>long text</TD></TR></TABLE>>]}';
  const NATIVE_STDERR = 'Warning: table size too small for content\nin label of node a\n';

  it('takes engine messages off the console and gives them to the caller', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const got: string[] = [];
    agseterrf((m) => { got.push(m); });
    try {
      renderSvg(TOO_SMALL, 'dot');
    } finally {
      agseterrf(null);
      warn.mockRestore();
    }
    expect(got.join('')).toBe(NATIVE_STDERR);
    expect(warn).not.toHaveBeenCalled();
  });
});
