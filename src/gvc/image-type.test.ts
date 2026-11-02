// SPDX-License-Identifier: EPL-2.0
// imagetype: the gvusershape.c magic table over resolver bytes (AD-5).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ImageType, imagetype } from './image-type.js';

const FIX = new URL('./__fixtures__/p7/images/', import.meta.url);
const fixture = (n: string): Uint8Array => new Uint8Array(readFileSync(new URL(n, FIX)));
const pad = (head: number[] | string, total = 32): Uint8Array => {
  const out = new Uint8Array(total);
  const h = typeof head === 'string' ? Array.from(head, c => c.charCodeAt(0)) : head;
  out.set(h);
  return out;
};

describe('imagetype', () => {
  it.each([
    ['r.png', ImageType.FT_PNG, 'png'],
    ['g.gif', ImageType.FT_GIF, 'gif'],
    ['j.jpg', ImageType.FT_JPEG, 'jpeg'],
    ['s.svg', ImageType.FT_SVG, 'svg'],
  ] as const)('sniffs fixture %s', (name, type, stringtype) => {
    expect(imagetype(fixture(name))).toEqual({ type, stringtype });
  });

  it('bare <svg without an xml declaration is FT_NULL', () => {
    expect(imagetype(fixture('sb.svg'))).toEqual({ type: ImageType.FT_NULL, stringtype: '(lib)' });
  });

  it('hello (shorter than HDRLEN) is FT_NULL', () => {
    expect(imagetype(fixture('bad.png'))).toEqual({ type: ImageType.FT_NULL, stringtype: '(lib)' });
  });

  it('a 19-byte PNG header is FT_NULL, a 20-byte one is FT_PNG', () => {
    const head = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect(imagetype(pad(head, 19)).type).toBe(ImageType.FT_NULL);
    expect(imagetype(pad(head, 20)).type).toBe(ImageType.FT_PNG);
  });

  it.each([
    ['%!PS-Adobe-3.0', ImageType.FT_PS, 'ps'],
    ['BM', ImageType.FT_BMP, 'bmp'],
    ['%PDF-1.4', ImageType.FT_PDF, 'pdf'],
    ['RIFF', ImageType.FT_RIFF, 'riff'],
  ] as const)('sniffs %s', (head, type, stringtype) => {
    expect(imagetype(pad(head))).toEqual({ type, stringtype });
  });

  it('sniffs EPS binary header and ICO', () => {
    expect(imagetype(pad([0xc5, 0xd0, 0xd3, 0xc6]))).toEqual({ type: ImageType.FT_EPS, stringtype: 'eps' });
    expect(imagetype(pad([0, 0, 1, 0]))).toEqual({ type: ImageType.FT_ICO, stringtype: 'ico' });
  });

  it('RIFF with WEBP at offset 8 is FT_WEBP', () => {
    const b = pad('RIFF');
    b.set(Array.from('WEBP', c => c.charCodeAt(0)), 8);
    expect(imagetype(b)).toEqual({ type: ImageType.FT_WEBP, stringtype: 'webp' });
  });

  it('xml whose declaration closes after the header scans on for <svg', () => {
    const s = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!-- c -->\n<svg xmlns="x"/>';
    expect(imagetype(new TextEncoder().encode(s)))
      .toEqual({ type: ImageType.FT_SVG, stringtype: 'svg' });
  });

  it('xml without <svg stays FT_XML', () => {
    const s = '<?xml version="1.0"?>\n<html><body>text</body></html>';
    expect(imagetype(new TextEncoder().encode(s))).toEqual({ type: ImageType.FT_XML, stringtype: 'xml' });
  });

  it('xml with no closing > in the file stays FT_XML', () => {
    expect(imagetype(new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"')).type)
      .toBe(ImageType.FT_XML);
  });

  it('xml whose tail is shorter than the 4-byte window stays FT_XML', () => {
    expect(imagetype(new TextEncoder().encode('<?xml version="1.0" ?>\n<s')).type).toBe(ImageType.FT_XML);
  });
});
