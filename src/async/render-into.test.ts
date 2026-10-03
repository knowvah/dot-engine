// SPDX-License-Identifier: EPL-2.0

import { DOMParser } from '@xmldom/xmldom';
import { beforeAll, describe, expect, it } from 'vitest';
import { RenderError } from '../errors.js';
import { renderSvgInto } from './render-into.js';
import type { RenderSvgIntoOptions } from './render-into.js';
import type { SvgParserLike } from './sanitize.js';

const TARGET_ID = 'graph';
const HOSTILE_DOT = 'digraph { a [URL="javascript:alert(1)"]; }';
const SIMPLE_DOT = 'digraph { a -> b }';
const PAGE = `<html><body><div id="${TARGET_ID}"><p>old</p></div></body></html>`;

const xmlParser = new DOMParser({ onError: () => undefined });

function makeDocument(): Document {
  return xmlParser.parseFromString(PAGE, 'text/xml') as unknown as Document;
}

function opts(extra: Partial<RenderSvgIntoOptions> = {}): RenderSvgIntoOptions {
  return {
    document: makeDocument(),
    domParser: xmlParser as unknown as SvgParserLike,
    ...extra,
  };
}

async function rejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (err: unknown) {
    return err;
  }
  throw new Error('expected rejection');
}

beforeAll(() => {
  // Test-only polyfill: xmldom's Element lacks replaceChildren (production
  // code relies on the real DOM method, ADR-6).
  const proto = Object.getPrototypeOf(makeDocument().documentElement) as Record<string, unknown>;
  proto['replaceChildren'] ??= function (this: Node, ...nodes: Node[]): void {
    while (this.firstChild !== null) this.removeChild(this.firstChild);
    for (const n of nodes) this.appendChild(n);
  };
});

describe('renderSvgInto', () => {
  it('makes the svg the only child and returns it', async () => {
    const o = opts();
    const { element, fontIssues } = await renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', o);
    const div = o.document!.getElementById(TARGET_ID)!;
    expect(div.childNodes.length).toBe(1);
    expect(div.firstChild).toBe(element);
    expect(element.nodeName).toBe('svg');
    expect(fontIssues).toEqual([]);
  });

  it('scrubs javascript: hrefs by default', async () => {
    const o = opts();
    await renderSvgInto(TARGET_ID, HOSTILE_DOT, 'dot', o);
    const html = new (await import('@xmldom/xmldom')).XMLSerializer().serializeToString(
      o.document as unknown as Node as never,
    );
    expect(html).not.toContain('javascript:');
  });

  it('keeps javascript: hrefs when trusted', async () => {
    const o = opts({ trusted: true });
    await renderSvgInto(TARGET_ID, HOSTILE_DOT, 'dot', o);
    const html = new (await import('@xmldom/xmldom')).XMLSerializer().serializeToString(
      o.document as unknown as Node as never,
    );
    expect(html).toContain('javascript:alert(1)');
  });

  it('inserts the custom sanitizer result and skips the scrubber', async () => {
    const seen: string[] = [];
    const custom = (svg: string): string => {
      seen.push(svg);
      return '<svg xmlns="http://www.w3.org/2000/svg"><script id="kept"/></svg>';
    };
    const o = opts({ sanitize: custom });
    const { element } = await renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', o);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('<svg');
    expect(element.firstChild?.nodeName).toBe('script');
  });

  it('rejects ERR_INVALID_ARG_VALUE for a missing element', async () => {
    const err = await rejection(renderSvgInto('nope', SIMPLE_DOT, 'dot', opts()));
    expect(err).toBeInstanceOf(TypeError);
    expect((err as { code: string }).code).toBe('ERR_INVALID_ARG_VALUE');
  });

  it('rejects ERR_INVALID_ARG_TYPE for a non-string id', async () => {
    const err = await rejection(renderSvgInto(5 as unknown as string, SIMPLE_DOT, 'dot', opts()));
    expect((err as { code: string }).code).toBe('ERR_INVALID_ARG_TYPE');
  });

  it('rejects ERR_INVALID_STATE without a document', async () => {
    const err = await rejection(renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot'));
    expect((err as { code: string }).code).toBe('ERR_INVALID_STATE');
  });

  it('rejects ERR_INVALID_STATE without a DOMParser', async () => {
    const err = await rejection(
      renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', { document: makeDocument() }),
    );
    expect((err as { code: string }).code).toBe('ERR_INVALID_STATE');
  });

  it('leaves the target untouched when the element is missing', async () => {
    const o = opts();
    await rejection(renderSvgInto('nope', SIMPLE_DOT, 'dot', o));
    expect(o.document!.getElementById(TARGET_ID)!.firstChild?.nodeName).toBe('p');
  });

  it.each([
    ['root parsererror', '<parsererror>bad</parsererror>'],
    ['nested parsererror', '<svg xmlns="http://www.w3.org/2000/svg"><parsererror/></svg>'],
  ])('rejects RenderError on %s', async (_n, markup) => {
    const o = opts({ sanitize: () => markup });
    const err = await rejection(renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', o));
    expect(err).toBeInstanceOf(RenderError);
    expect(o.document!.getElementById(TARGET_ID)!.firstChild?.nodeName).toBe('p');
  });

  it('rejects RenderError when the parser throws', async () => {
    const throwing: SvgParserLike = {
      parseFromString: () => {
        throw new Error('boom');
      },
    };
    const err = await rejection(
      renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', opts({ domParser: throwing })),
    );
    expect(err).toBeInstanceOf(RenderError);
    expect(((err as Error).cause as Error).message).toBe('boom');
  });

  it('uses the document window DOMParser when no seam is given', async () => {
    const doc = makeDocument();
    Object.defineProperty(doc, 'defaultView', { value: { DOMParser } });
    const { element } = await renderSvgInto(TARGET_ID, SIMPLE_DOT, 'dot', { document: doc });
    expect(element.nodeName).toBe('svg');
  });
});
