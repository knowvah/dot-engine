// SPDX-License-Identifier: EPL-2.0

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../index.js';
import { parse } from '../parser/index.js';
import { ParseError } from '../parser/index.js';
import { canvasFont } from '../common/css-font.js';
import { renderAsync, renderSvgAsync } from './render-async.js';
import type { FontSetLike } from './fonts.js';
import { setTextMeasurer } from '../common/textmeasure-factory.js';
import { EstimateTextMeasurer } from '../common/textmeasure.js';

const GOLDEN_DIR = join(import.meta.dirname, '../../test/golden/inputs');
const OTHER_ENGINES = ['neato', 'fdp', 'circo', 'twopi'] as const;
const OTHER_SAMPLE = 4;
const GOLDEN_TIMEOUT_MS = 300_000;
const SRC = 'logo.png';
const IMG_DOT =
  'digraph { A [shape=plaintext label=<<TABLE><TR><TD>' +
  `<IMG SRC="${SRC}"/></TD></TR></TABLE>>]; }`;
const SIZE = { w: 50, h: 30 };
const BYTES_A = new Uint8Array([1, 2, 3]);
const BYTES_B = new Uint8Array([7, 8, 9]);
const B64_A = 'AQID';
const B64_B = 'BwgJ';
const TEXT_DOT = 'digraph { a [fontname="Helvetica" label="hi"]; }';

const goldenFiles = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.dot')).sort();

/** Outcome of a render as comparable data (value or error name+message). */
function settleSync(src: string, engine: string): string {
  try {
    return renderSvg(src, engine);
  } catch (e) {
    return `ERR:${(e as Error).name}:${(e as Error).message}`;
  }
}

async function settleAsync(src: string, engine: string): Promise<string> {
  try {
    return (await renderSvgAsync(src, engine)).svg;
  } catch (e) {
    return `ERR:${(e as Error).name}:${(e as Error).message}`;
  }
}

describe('byte-identical to sync API without async options', () => {
  it('matches renderSvg for every golden input (dot)', async () => {
    expect(goldenFiles.length).toBeGreaterThan(0);
    for (const f of goldenFiles) {
      const src = readFileSync(join(GOLDEN_DIR, f), 'utf8');
      expect(await settleAsync(src, 'dot'), f).toBe(settleSync(src, 'dot'));
    }
  }, GOLDEN_TIMEOUT_MS);

  it('matches renderSvg under other engines (sample)', async () => {
    const sample = goldenFiles.slice(0, OTHER_SAMPLE);
    for (const engine of OTHER_ENGINES) {
      for (const f of sample) {
        const src = readFileSync(join(GOLDEN_DIR, f), 'utf8');
        expect(await settleAsync(src, engine), `${engine} ${f}`).toBe(settleSync(src, engine));
      }
    }
  }, GOLDEN_TIMEOUT_MS);

  it('reports empty fontIssues', async () => {
    expect((await renderSvgAsync('digraph { a -> b }', 'dot')).fontIssues).toEqual([]);
  });
});

describe('async image hooks', () => {
  it('sizes an HTML <IMG> from the async sizer', async () => {
    const { svg } = await renderSvgAsync(IMG_DOT, 'dot', { imageSizer: async () => SIZE });
    expect(svg).toContain('width="50px" height="30px"');
  });

  it('a rejecting or throwing sizer takes the missing-image path', async () => {
    const baseline = await renderSvgAsync(IMG_DOT, 'dot');
    const rejected = await renderSvgAsync(IMG_DOT, 'dot', {
      imageSizer: () => Promise.reject(new Error('nope')),
    });
    const thrown = await renderSvgAsync(IMG_DOT, 'dot', {
      imageSizer: () => {
        throw new Error('sync');
      },
    });
    expect(rejected.svg).toBe(baseline.svg);
    expect(thrown.svg).toBe(baseline.svg);
  });

  it('inlines bytes from the async resolver', async () => {
    const { svg } = await renderSvgAsync(IMG_DOT, 'dot', {
      inlineImages: true,
      imageSizer: async () => SIZE,
      imageResolver: async () => ({ bytes: BYTES_A, mime: 'image/png' }),
    });
    expect(svg).toContain(`xlink:href="data:image/png;base64,${B64_A}"`);
  });

  it('a rejecting resolver leaves the raw src passthrough', async () => {
    const { svg } = await renderSvgAsync(IMG_DOT, 'dot', {
      inlineImages: true,
      imageSizer: async () => SIZE,
      imageResolver: () => Promise.reject(new Error('nope')),
    });
    expect(svg).toContain(`xlink:href="${SRC}"`);
  });

  it('calls each hook once per distinct src', async () => {
    const dot =
      'digraph { A [shape=plaintext label=<<TABLE><TR><TD><IMG SRC="x.png"/></TD>' +
      '<TD><IMG SRC="x.png"/></TD></TR></TABLE>>]; }';
    const sizer = vi.fn(async () => SIZE);
    const resolver = vi.fn(async () => BYTES_A);
    await renderSvgAsync(dot, 'dot', {
      inlineImages: true, imageSizer: sizer, imageResolver: resolver,
    });
    expect(sizer).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls each use their own resolver', async () => {
    const slow = async (): Promise<Uint8Array> => {
      await new Promise((r) => setTimeout(r, 10));
      return BYTES_A;
    };
    const [a, b] = await Promise.all([
      renderSvgAsync(IMG_DOT, 'dot', { inlineImages: true, imageSizer: async () => SIZE, imageResolver: slow }),
      renderSvgAsync(IMG_DOT, 'dot', { inlineImages: true, imageSizer: async () => SIZE, imageResolver: async () => BYTES_B }),
    ]);
    expect(a.svg).toContain(`base64,${B64_A}"`);
    expect(b.svg).toContain(`base64,${B64_B}"`);
  });
});

describe('fonts', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('loads the requested face via the supplied fontSet', async () => {
    const load = vi.fn(async () => [{ status: 'loaded' }]);
    const fontSet: FontSetLike = { load };
    const r = await renderSvgAsync(TEXT_DOT, 'dot', { fontSet });
    expect(load).toHaveBeenCalledWith(canvasFont('Helvetica', 14));
    expect(r.fontIssues).toEqual([]);
  });

  it('reports a timeout and still resolves with output', async () => {
    const fontSet: FontSetLike = { load: () => new Promise(() => undefined) };
    const r = await renderSvgAsync(TEXT_DOT, 'dot', { fontSet, fontTimeoutMs: 5 });
    expect(r.svg).toContain('<svg');
    expect(r.fontIssues).toEqual([{ face: canvasFont('Helvetica', 14), reason: 'timeout' }]);
  });

  it('reports a failed load', async () => {
    const fontSet: FontSetLike = { load: async () => { throw new Error('x'); } };
    const r = await renderSvgAsync(TEXT_DOT, 'dot', { fontSet });
    expect(r.fontIssues.map((i) => i.reason)).toEqual(['failed']);
  });
});

describe('renderAsync', () => {
  it('matches render output for a parsed graph and other formats', async () => {
    const r = await renderAsync(parse('digraph { a -> b }'), 'xdot', { engine: 'neato' });
    expect(r.output).toContain('digraph');
    expect(r.fontIssues).toEqual([]);
  });
});

describe('errors reject (ADR-5)', () => {
  it('rejects non-string source with ERR_INVALID_ARG_TYPE', async () => {
    await expect(renderSvgAsync(1 as unknown as string, 'dot')).rejects.toMatchObject({
      name: 'TypeError', code: 'ERR_INVALID_ARG_TYPE',
    });
  });

  it('rejects non-string engine with ERR_INVALID_ARG_TYPE', async () => {
    await expect(renderSvgAsync('digraph{}', 5 as unknown as string)).rejects.toMatchObject({
      code: 'ERR_INVALID_ARG_TYPE',
    });
  });

  it('rejects an unknown engine with ERR_INVALID_ARG_VALUE', async () => {
    await expect(renderSvgAsync('digraph{}', 'nope')).rejects.toMatchObject({
      name: 'TypeError', code: 'ERR_INVALID_ARG_VALUE',
    });
  });

  it('rejects bad DOT with ParseError', async () => {
    await expect(renderSvgAsync('digraph {', 'dot')).rejects.toBeInstanceOf(ParseError);
  });

  it('renderAsync rejects bad g, format and opts', async () => {
    const g = parse('digraph{}');
    await expect(renderAsync(null as never, 'svg')).rejects.toMatchObject({ code: 'ERR_INVALID_ARG_TYPE' });
    await expect(renderAsync(g, 1 as never)).rejects.toMatchObject({ code: 'ERR_INVALID_ARG_TYPE' });
    await expect(renderAsync(g, 'svg', 3 as never)).rejects.toMatchObject({ code: 'ERR_INVALID_ARG_TYPE' });
  });

  it('renderAsync rejects an unknown format with ERR_INVALID_ARG_VALUE', async () => {
    await expect(renderAsync(parse('digraph{}'), 'bogus' as never)).rejects.toMatchObject({
      code: 'ERR_INVALID_ARG_VALUE',
    });
  });
});

describe('default font set (document.fonts)', () => {
  // A stub `document` would make the measurer factory pick canvas; pin the
  // estimate measurer so only the font-set discovery is under test.
  beforeEach(() => { setTextMeasurer(new EstimateTextMeasurer()); });
  afterEach(() => { vi.unstubAllGlobals(); setTextMeasurer(undefined); });

  const DOT = 'digraph { a [fontname="Inter"] }';

  it('loads through globalThis.document.fonts when present', async () => {
    const load = vi.fn(async () => []);
    vi.stubGlobal('document', { fonts: { load } });
    const { fontIssues } = await renderSvgAsync(DOT, 'dot');
    expect(fontIssues).toEqual([]);
    expect(load).toHaveBeenCalledWith(canvasFont('Inter', 14));
  });

  it('skips font loading when the document has no fonts set', async () => {
    vi.stubGlobal('document', {});
    const { svg, fontIssues } = await renderSvgAsync(DOT, 'dot');
    expect(fontIssues).toEqual([]);
    expect(svg).toContain('<svg');
  });

  it('loads through globalThis.fonts in a Worker (no document)', async () => {
    const load = vi.fn(async () => []);
    vi.stubGlobal('fonts', { load });
    const { fontIssues } = await renderSvgAsync(DOT, 'dot');
    expect(fontIssues).toEqual([]);
    expect(load).toHaveBeenCalledWith(canvasFont('Inter', 14));
  });

  it('skips font loading when document is not an object', async () => {
    vi.stubGlobal('document', null);
    const { fontIssues } = await renderSvgAsync(DOT, 'dot');
    expect(fontIssues).toEqual([]);
  });
});
