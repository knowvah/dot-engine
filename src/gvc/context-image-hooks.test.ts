// SPDX-License-Identifier: EPL-2.0

/**
 * ADR-2 (async-api) — per-context image sizer / resolver hooks take
 * precedence over the process-global `setImageSizer` / `setImageResolver`.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import { render as publicRender } from '../render/public.js';
import { setImageSizer } from './usershape.js';
import { setImageResolver, findImageBytes, type ImageResolver } from './image-resolver.js';
import type { ImageSizer } from './usershape.js';

const SRC = 'logo.png';
const IMG_DOT =
  'digraph { A [shape=plaintext label=<<TABLE><TR><TD>' +
  `<IMG SRC="${SRC}"/></TD></TR></TABLE>>]; }`;
const GLOBAL_SIZE = { w: 24, h: 12 };
const CTX_SIZE = { w: 50, h: 30 };
const GLOBAL_BYTES = new Uint8Array([1, 2, 3]);
const CTX_BYTES = new Uint8Array([4, 5, 6]);
// base64 of the byte fixtures above
const GLOBAL_B64 = 'AQID';
const CTX_B64 = 'BAUG';
const OTHER_B64 = 'BwgJ';

/** Lay out and render with an optionally hooked context. */
function renderWith(
  hooks: { sizer?: ImageSizer; resolver?: ImageResolver },
  inline: boolean,
): string {
  const ctx = createDefaultContext();
  if (hooks.sizer !== undefined) ctx.imageSizer = hooks.sizer;
  if (hooks.resolver !== undefined) ctx.imageResolver = hooks.resolver;
  const g = parse(IMG_DOT);
  ctx.layout(g, 'dot');
  const out = deviceRender(ctx, g, 'svg', inline);
  ctx.freeLayout(g, 'dot');
  return out;
}

describe('GvcContext image hooks (ADR-2)', () => {
  afterEach(() => {
    setImageSizer(null);
    setImageResolver(null);
  });

  it('is undefined by default', () => {
    const ctx = createDefaultContext();
    expect(ctx.imageSizer).toBeUndefined();
    expect(ctx.imageResolver).toBeUndefined();
  });

  it('context sizer wins over the global sizer for HTML <IMG>', () => {
    setImageSizer(() => GLOBAL_SIZE);
    const svg = renderWith({ sizer: () => CTX_SIZE }, false);
    expect(svg).toContain('width="50px" height="30px"');
    expect(svg).not.toContain('width="24px" height="12px"');
  });

  it('context resolver wins over the global resolver; global not called', () => {
    setImageSizer(() => GLOBAL_SIZE);
    let globalCalls = 0;
    setImageResolver(() => { globalCalls++; return GLOBAL_BYTES; });
    const svg = renderWith({ resolver: () => ({ bytes: CTX_BYTES, mime: 'image/png' }) }, true);
    expect(svg).toContain(`xlink:href="data:image/png;base64,${CTX_B64}"`);
    expect(svg).not.toContain(GLOBAL_B64);
    expect(globalCalls).toBe(0);
  });

  it('two contexts with different resolvers each use their own', () => {
    setImageSizer(() => GLOBAL_SIZE);
    const a = renderWith({ resolver: () => CTX_BYTES }, true);
    const b = renderWith({ resolver: () => new Uint8Array([7, 8, 9]) }, true);
    expect(a).toContain(`base64,${CTX_B64}"`);
    expect(b).toContain(`base64,${OTHER_B64}"`);
  });

  it('a context resolver miss stays a raw-src passthrough (no global fallback)', () => {
    setImageSizer(() => GLOBAL_SIZE);
    setImageResolver(() => GLOBAL_BYTES);
    const svg = renderWith({ resolver: () => null }, true);
    expect(svg).toContain(`xlink:href="${SRC}"`);
  });

  it('no context hooks: output equals the global-hook path byte-for-byte', () => {
    setImageSizer(() => GLOBAL_SIZE);
    setImageResolver(() => GLOBAL_BYTES);
    const viaCtx = renderWith({}, true);
    const viaPublic = publicRender(parse(IMG_DOT), 'svg', { inlineImages: true });
    expect(viaCtx).toBe(viaPublic);
    expect(viaCtx).toContain(`base64,${GLOBAL_B64}"`);
  });
});

describe('findImageBytes(src, resolver)', () => {
  afterEach(() => setImageResolver(null));

  it('consults the given resolver instead of the global and normalizes', () => {
    setImageResolver(() => GLOBAL_BYTES);
    expect(findImageBytes('a.jpg', () => CTX_BYTES)).toEqual({
      bytes: CTX_BYTES,
      mime: 'image/jpeg',
    });
    expect(findImageBytes('a.png', () => ({ bytes: CTX_BYTES, mime: 'x/y' }))).toEqual({
      bytes: CTX_BYTES,
      mime: 'x/y',
    });
  });

  it('given resolver returning null yields null even if a global is set', () => {
    setImageResolver(() => GLOBAL_BYTES);
    expect(findImageBytes('a.png', () => null)).toBeNull();
  });
});
