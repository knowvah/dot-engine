// SPDX-License-Identifier: EPL-2.0

/**
 * Built-in SVG scrubber (ADR-6). Uses only DOM Level 2 members of
 * `Document`/`Element`/`Attr`/`Node`, so it runs on browser documents and on
 * xmldom documents alike. This is a deny-list for the vectors the library's
 * own output can carry (README "Security"); callers needing a stricter policy
 * pass their own `sanitize` or a CSP.
 */

const ELEMENT_NODE = 1;
const PROCESSING_INSTRUCTION_NODE = 7;

/** Elements removed outright, with their whole subtree (local name, lowercase). */
const BANNED_ELEMENTS: ReadonlySet<string> = new Set(['script', 'foreignobject']);

/** SMIL elements that can write an attribute value (local name, lowercase). */
const ANIMATION_ELEMENTS: ReadonlySet<string> = new Set([
  'set',
  'animate',
  'animatemotion',
  'animatetransform',
]);

const EVENT_ATTRIBUTE_PREFIX = 'on';
const HREF_LOCAL_NAME = 'href';
const IMAGE_ELEMENT = 'image';
const ATTRIBUTE_NAME = 'attributeName';
const XML_STYLESHEET_TARGET = 'xml-stylesheet';

const SCRIPT_SCHEMES: readonly string[] = ['javascript:', 'vbscript:'];
const DATA_SCHEME = 'data:';
const DATA_IMAGE_PREFIX = 'data:image/';

// ASCII whitespace plus every C0 control and DEL; browsers drop tab/CR/LF
// anywhere in a URL and C0/space at its ends, so stripping all of them is a
// superset that cannot let an obfuscated scheme through.
// eslint-disable-next-line no-control-regex
const IGNORED_URL_CHARS = /[\u0000- \u007f]/g;

/** Structural subset of `DOMParser` used by {@link scrubSvgString}. */
export interface SvgParserLike {
  parseFromString(source: string, mimeType: 'image/svg+xml'): Document;
}

/** Structural subset of `XMLSerializer` used by {@link scrubSvgString}. */
export interface SvgSerializerLike {
  serializeToString(node: Node): string;
}

function localNameOf(node: { localName?: string | null; nodeName: string }): string {
  const local = node.localName;
  const name = typeof local === 'string' && local !== '' ? local : node.nodeName;
  const colon = name.lastIndexOf(':');
  return (colon >= 0 ? name.slice(colon + 1) : name).toLowerCase();
}

function normalizeUrl(value: string): string {
  return value.replace(IGNORED_URL_CHARS, '').toLowerCase();
}

function isHostileUrl(value: string, element: Element): boolean {
  const url = normalizeUrl(value);
  if (SCRIPT_SCHEMES.some((scheme) => url.startsWith(scheme))) return true;
  if (!url.startsWith(DATA_SCHEME)) return false;
  return !(localNameOf(element) === IMAGE_ELEMENT && url.startsWith(DATA_IMAGE_PREFIX));
}

function isEventAttribute(attr: Attr): boolean {
  return (
    attr.name.toLowerCase().startsWith(EVENT_ATTRIBUTE_PREFIX) ||
    localNameOf(attr).startsWith(EVENT_ATTRIBUTE_PREFIX)
  );
}

function isHostileAttribute(attr: Attr, element: Element): boolean {
  if (isEventAttribute(attr)) return true;
  return localNameOf(attr) === HREF_LOCAL_NAME && isHostileUrl(attr.value, element);
}

/**
 * An animation targeting `href` (any prefix or case) or an event handler can
 * write a hostile value after the static attribute scrub ran.
 */
function isHostileAnimation(element: Element): boolean {
  if (!ANIMATION_ELEMENTS.has(localNameOf(element))) return false;
  const target = (element.getAttribute(ATTRIBUTE_NAME) ?? '').trim().toLowerCase();
  const local = target.slice(target.lastIndexOf(':') + 1);
  return local === HREF_LOCAL_NAME || local.startsWith(EVENT_ATTRIBUTE_PREFIX);
}

function scrubAttributes(element: Element): void {
  const doomed: Attr[] = [];
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes.item(i);
    if (attr !== null && isHostileAttribute(attr, element)) doomed.push(attr);
  }
  for (const attr of doomed) element.removeAttributeNode(attr);
}

function isDoomedNode(node: Node): boolean {
  if (node.nodeType === PROCESSING_INSTRUCTION_NODE) {
    return node.nodeName.toLowerCase() === XML_STYLESHEET_TARGET;
  }
  if (node.nodeType !== ELEMENT_NODE) return false;
  return BANNED_ELEMENTS.has(localNameOf(node)) || isHostileAnimation(node as Element);
}

/**
 * Scrub `doc` in place: remove `script`/`foreignObject`, `href`-targeting
 * animations, every `on*` attribute, `javascript:`/`vbscript:` hrefs, `data:`
 * hrefs other than `data:image/*` on `<image>`, and `xml-stylesheet`
 * processing instructions. Element, attribute and PI matching ignores case and
 * namespace prefix.
 *
 * @param doc - A document parsed from SVG; mutated.
 */
export function scrubSvgDocument(doc: Document): void {
  const pending: Node[] = [doc];
  while (pending.length > 0) {
    const parent = pending.pop() as Node;
    const children = Array.from(parent.childNodes);
    for (const child of children) {
      if (isDoomedNode(child)) {
        parent.removeChild(child);
      } else if (child.nodeType === ELEMENT_NODE) {
        scrubAttributes(child as Element);
        pending.push(child);
      }
    }
  }
}

/**
 * Parse `svg`, scrub it with {@link scrubSvgDocument} and serialize it back.
 *
 * @param svg - SVG source text.
 * @param parser - A `DOMParser`-like object.
 * @param serializer - An `XMLSerializer`-like object.
 * @returns The scrubbed SVG text.
 */
export function scrubSvgString(
  svg: string,
  parser: SvgParserLike,
  serializer: SvgSerializerLike,
): string {
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  scrubSvgDocument(doc);
  return serializer.serializeToString(doc);
}
