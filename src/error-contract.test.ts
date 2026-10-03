// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DotEngineError,
  InternalError,
  ParseError,
  RenderError,
  getDrawOps,
  isGvError,
  parse,
  render,
  renderSvg,
  tryRenderSvg,
} from './index.js';
import type { Graph } from './index.js';
import { DOT_LAYOUT_ENGINE } from './layout/dot/index.js';

const VALID = 'digraph { a -> b }';
const UNSUPPORTED = 'graph{rotation=45; a--b}';
const UNKNOWN_LAYOUT = 'graph{layout=nope; a--b}';
const NULL = null as never;

interface Probe {
  readonly name: string;
  /** Runs the entry point; `dot` is DOT source, `engine` the engine argument. */
  readonly run: (dot: string, engine: string) => unknown;
}

/** Entry points that take DOT source (parse happens inside the boundary). */
const DOT_ENTRY_POINTS: readonly Probe[] = [
  { name: 'renderSvg', run: (dot, engine) => renderSvg(dot, engine) },
  {
    name: 'render',
    run: (dot, engine) => render(parse(dot), 'svg', { engine }),
  },
  {
    name: 'getDrawOps',
    run: (dot, engine) => getDrawOps(parse(dot), { engine }),
  },
];

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err: unknown) {
    return err;
  }
  throw new Error('expected the call to throw');
}

function expectCode(err: unknown, ctor: new (...a: never[]) => Error, code: string): void {
  expect(err).toBeInstanceOf(ctor);
  expect((err as { code?: unknown }).code).toBe(code);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(DOT_ENTRY_POINTS)('$name error contract', ({ run }) => {
  it('throws RenderError UNKNOWN_LAYOUT (semantic) for layout=nope in DOT', () => {
    const err = thrownBy(() => run(UNKNOWN_LAYOUT, 'dot'));
    expectCode(err, RenderError, 'UNKNOWN_LAYOUT');
    expect((err as RenderError).type).toBe('semantic');
    expect(err).toBeInstanceOf(DotEngineError);
  });

  it('throws RenderError UNSUPPORTED_FEATURE for sfdp rotation', () => {
    const err = thrownBy(() => run(UNSUPPORTED, 'sfdp'));
    expectCode(err, RenderError, 'UNSUPPORTED_FEATURE');
    expect((err as RenderError).type).toBe('semantic');
  });

  it('throws TypeError ERR_INVALID_ARG_VALUE for an unknown engine argument', () => {
    expectCode(thrownBy(() => run(VALID, 'nope')), TypeError, 'ERR_INVALID_ARG_VALUE');
  });

  it('wraps a foreign throw inside layout as InternalError with cause', () => {
    const boom = new TypeError('boom');
    vi.spyOn(DOT_LAYOUT_ENGINE, 'layout').mockImplementation(() => {
      throw boom;
    });
    const err = thrownBy(() => run(VALID, 'dot'));
    expectCode(err, InternalError, 'INTERNAL_ERROR');
    expect((err as InternalError).cause).toBe(boom);
    expect((err as InternalError).message).toBe('boom');
    expect((err as InternalError).name).toBe('InternalError');
  });

  it('keeps UNKNOWN_LAYOUT and INTERNAL_ERROR out of the usage-error family', () => {
    const err = thrownBy(() => run(UNKNOWN_LAYOUT, 'dot'));
    expect(isGvError(err)).toBe(true);
    expect((err as { code: string }).code).not.toMatch(/^ERR_/);
  });
});

describe('renderSvg / tryRenderSvg argument checks', () => {
  const cases: readonly [string, () => unknown][] = [
    ['renderSvg non-string dotSource', () => renderSvg(NULL, 'dot')],
    ['renderSvg non-string engine', () => renderSvg(VALID, 42 as never)],
    ['tryRenderSvg non-string dotSource', () => tryRenderSvg(NULL, 'dot')],
    ['tryRenderSvg non-string engine', () => tryRenderSvg(VALID, undefined as never)],
    ['render null graph', () => render(NULL, 'svg')],
    ['render non-string format', () => render(parse(VALID), 7 as never)],
    ['render null opts', () => render(parse(VALID), 'svg', NULL)],
    ['render string opts', () => render(parse(VALID), 'svg', 'dot' as never)],
    ['getDrawOps null graph', () => getDrawOps(NULL)],
    ['getDrawOps null opts', () => getDrawOps(parse(VALID), NULL)],
  ];

  it.each(cases)('%s throws TypeError ERR_INVALID_ARG_TYPE', (_n, fn) => {
    const err = thrownBy(fn);
    expectCode(err, TypeError, 'ERR_INVALID_ARG_TYPE');
    expect((err as Error).message).not.toMatch(/Cannot read properties/);
    expect(isGvError(err)).toBe(false);
  });

  it('render rejects an unregistered format with ERR_INVALID_ARG_VALUE', () => {
    expectCode(
      thrownBy(() => render(parse(VALID), 'pdf' as never)),
      TypeError,
      'ERR_INVALID_ARG_VALUE',
    );
  });

  it('names the offending parameter in the message', () => {
    expect((thrownBy(() => renderSvg(NULL, 'dot')) as Error).message).toContain('"dotSource"');
    expect((thrownBy(() => render(NULL, 'svg')) as Error).message).toContain('"g"');
    expect((thrownBy(() => getDrawOps(NULL)) as Error).message).toContain('"g"');
  });
});

describe('renderSvg input failures are DotEngineErrors', () => {
  it('throws ParseError SYNTAX_UNEXPECTED_EOF for truncated DOT', () => {
    const err = thrownBy(() => renderSvg('digraph{', 'dot'));
    expectCode(err, ParseError, 'SYNTAX_UNEXPECTED_EOF');
    expect(err).toBeInstanceOf(DotEngineError);
  });

  it('wraps a foreign RangeError (stack-overflow style) as InternalError', () => {
    const range = new RangeError('Maximum call stack size exceeded');
    vi.spyOn(DOT_LAYOUT_ENGINE, 'layout').mockImplementation(() => {
      throw range;
    });
    const err = thrownBy(() => renderSvg(VALID, 'dot'));
    expect((err as InternalError).cause).toBe(range);
  });
});

describe('tryRenderSvg result contract', () => {
  it('returns SYNTAX_UNEXPECTED_EOF for truncated DOT', () => {
    const r = tryRenderSvg('digraph{', 'dot');
    expect(r.svg).toBeUndefined();
    expect(r.errors).toHaveLength(1);
    expect(r.errors?.[0]?.code).toBe('SYNTAX_UNEXPECTED_EOF');
    expect(r.errors?.[0]?.type).toBe('syntax');
  });

  it('throws TypeError ERR_INVALID_ARG_VALUE for an unknown engine', () => {
    expectCode(
      thrownBy(() => tryRenderSvg('digraph{a}', 'nope')),
      TypeError,
      'ERR_INVALID_ARG_VALUE',
    );
  });

  it('returns UNKNOWN_LAYOUT as data', () => {
    const r = tryRenderSvg(UNKNOWN_LAYOUT, 'dot');
    expect(r.errors?.[0]?.code).toBe('UNKNOWN_LAYOUT');
    expect(r.errors?.[0]?.type).toBe('semantic');
  });

  it('returns UNSUPPORTED_FEATURE as data', () => {
    expect(tryRenderSvg(UNSUPPORTED, 'sfdp').errors?.[0]?.code).toBe('UNSUPPORTED_FEATURE');
  });

  it('returns a foreign layout throw as INTERNAL_ERROR data without a cause', () => {
    vi.spyOn(DOT_LAYOUT_ENGINE, 'layout').mockImplementation(() => {
      throw new TypeError('boom');
    });
    const r = tryRenderSvg(VALID, 'dot');
    const e = r.errors?.[0];
    expect(e?.code).toBe('INTERNAL_ERROR');
    expect(e?.type).toBe('render');
    expect(e !== undefined && 'cause' in e).toBe(false);
    expect(Object.keys(e ?? {}).sort()).toEqual(['code', 'friendlyMessage', 'message', 'type']);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it('returns svg for valid input', () => {
    expect(tryRenderSvg(VALID, 'dot').svg).toContain('<svg');
  });
});

describe('graph objects reach render/getDrawOps unchanged', () => {
  it('render and getDrawOps still succeed on a parsed graph', () => {
    const g: Graph = parse(VALID);
    expect(render(g, 'svg')).toContain('<svg');
    expect(getDrawOps(parse(VALID)).length).toBeGreaterThan(0);
  });
});
