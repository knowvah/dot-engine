// SPDX-License-Identifier: EPL-2.0

/**
 * Image type sniffing: the magic-byte table and `imagetype` of gvusershape.c,
 * run over the bytes the caller's image resolver supplies (AD-5) instead of a
 * `FILE *`.
 *
 * `ImageType` is an as-const object rather than C's enum / a `const enum`
 * (TS6-forward: `const enum` does not survive declaration boundaries); its
 * members and order are `imagetype_t`.
 *
 * @see lib/common/usershape.h:imagetype_t, lib/gvc/gvusershape.c:55-175
 */

/** @see lib/common/usershape.h:24-27 */
export const ImageType = {
  FT_NULL: 0,
  FT_BMP: 1,
  FT_GIF: 2,
  FT_PNG: 3,
  FT_JPEG: 4,
  FT_PDF: 5,
  FT_PS: 6,
  FT_EPS: 7,
  FT_SVG: 8,
  FT_XML: 9,
  FT_RIFF: 10,
  FT_WEBP: 11,
  FT_ICO: 12,
  FT_TIFF: 13,
} as const;
export type ImageType = (typeof ImageType)[keyof typeof ImageType];

/** @see lib/gvc/gvusershape.c:HDRLEN */
const HDRLEN = 20;

/** @see lib/gvc/gvusershape.c:knowntype_t */
interface KnownType {
  readonly template: readonly number[];
  readonly type: ImageType;
  readonly stringtype: string;
}

const bytesOf = (s: string): number[] => Array.from(s, c => c.charCodeAt(0));

/** @see lib/gvc/gvusershape.c:XML_MAGIC */
const XML_MAGIC = bytesOf('<?xml');
/** @see lib/gvc/gvusershape.c:SVG_MAGIC */
const SVG_MAGIC = bytesOf('<svg');
/** @see lib/gvc/gvusershape.c:WEBP_MAGIC */
const WEBP_MAGIC = bytesOf('WEBP');
const GT = 0x3e; // '>'

/** @see lib/gvc/gvusershape.c:knowntypes (PNG_MAGIC .. ICO_MAGIC) */
const KNOWN_TYPES: readonly KnownType[] = [
  { template: [0x89, ...bytesOf('PNG'), 0x0d, 0x0a, 0x1a, 0x0a], type: ImageType.FT_PNG, stringtype: 'png' },
  { template: bytesOf('%!PS-Adobe-'), type: ImageType.FT_PS, stringtype: 'ps' },
  { template: bytesOf('BM'), type: ImageType.FT_BMP, stringtype: 'bmp' },
  { template: bytesOf('GIF8'), type: ImageType.FT_GIF, stringtype: 'gif' },
  { template: [0xff, 0xd8, 0xff], type: ImageType.FT_JPEG, stringtype: 'jpeg' },
  { template: bytesOf('%PDF-'), type: ImageType.FT_PDF, stringtype: 'pdf' },
  { template: [0xc5, 0xd0, 0xd3, 0xc6], type: ImageType.FT_EPS, stringtype: 'eps' },
  { template: XML_MAGIC, type: ImageType.FT_XML, stringtype: 'xml' },
  { template: bytesOf('RIFF'), type: ImageType.FT_RIFF, stringtype: 'riff' },
  { template: [0x00, 0x00, 0x01, 0x00], type: ImageType.FT_ICO, stringtype: 'ico' },
];

/** Result of `imagetype`: `us->type` and `us->stringtype`. */
export interface ImageTypeResult {
  type: ImageType;
  stringtype: string;
}

const matchesAt = (bytes: Uint8Array, at: number, template: readonly number[]): boolean =>
  template.every((b, i) => bytes[at + i] === b);

/**
 * The FT_XML tail of `imagetype`: skip to the end of the XML declaration when
 * the header did not hold its `>`, then slide a 4-byte window looking for
 * `<svg`. Exhausting the bytes leaves the type FT_XML. The window starts at
 * the file position after the header (or after the `>` found by the scan), as
 * C's `fread` does.
 * @see lib/gvc/gvusershape.c:imagetype (the FT_XML branch)
 */
function scanXmlForSvg(bytes: Uint8Array): ImageTypeResult {
  const xml: ImageTypeResult = { type: ImageType.FT_XML, stringtype: 'xml' };
  let pos = HDRLEN;
  if (!bytes.subarray(0, HDRLEN).includes(GT)) {
    for (;;) {
      if (pos >= bytes.length) return xml;
      if (bytes[pos++] === GT) break;
    }
  }
  if (bytes.length - pos < SVG_MAGIC.length) return xml;
  let tag = pos;
  pos += SVG_MAGIC.length;
  for (;;) {
    if (matchesAt(bytes, tag, SVG_MAGIC)) return { type: ImageType.FT_SVG, stringtype: 'svg' };
    if (pos >= bytes.length) return xml;
    tag++;
    pos++;
  }
}

/**
 * Sniff the image type from its leading bytes. Fewer than HDRLEN bytes, or no
 * matching template, is FT_NULL with stringtype "(lib)".
 * @see lib/gvc/gvusershape.c:imagetype
 */
export function imagetype(bytes: Uint8Array): ImageTypeResult {
  if (bytes.length >= HDRLEN) {
    for (const known of KNOWN_TYPES) {
      if (!matchesAt(bytes, 0, known.template)) continue;
      if (known.type === ImageType.FT_XML) return scanXmlForSvg(bytes);
      if (known.type === ImageType.FT_RIFF && matchesAt(bytes, 8, WEBP_MAGIC)) {
        return { type: ImageType.FT_WEBP, stringtype: 'webp' };
      }
      return { type: known.type, stringtype: known.stringtype };
    }
  }
  return { type: ImageType.FT_NULL, stringtype: '(lib)' };
}
