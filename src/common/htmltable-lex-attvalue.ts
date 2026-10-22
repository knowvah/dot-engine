// SPDX-License-Identifier: EPL-2.0
/**
 * expat's handling of an attribute value, which `doAttrs` only ever sees
 * decoded: scanAtts tokenizes the quoted value (a `<`, or an `&` that does not
 * start a well-formed reference, is an invalid token), storeAtts then
 * normalizes it (references decoded, white space to spaces) and reports an
 * undefined entity or a reference to a character XML does not allow.
 *
 * Not vendored with graphviz; read from libexpat R_2_6_4.
 * @see expat lib/xmltok_impl.c:PREFIX(scanAtts)
 * @see expat lib/xmltok_impl.c:PREFIX(scanRef)
 * @see expat lib/xmlparse.c:storeAtts
 * @see expat lib/xmlparse.c:appendAttributeValue
 */

/** expat `XML_ErrorString(XML_ERROR_UNDEFINED_ENTITY)`. */
export const XML_ERROR_UNDEFINED_ENTITY = 'undefined entity';
/** expat `XML_ErrorString(XML_ERROR_BAD_CHAR_REF)`. */
export const XML_ERROR_BAD_CHAR_REF = 'reference to invalid character number';

/** How scanAtts ends a quoted value: at its closing quote, short of data, or on an invalid token. */
export type AttValueScan = { close: number } | { partial: true } | { invalid: number };

/** A storeAtts error: its message and where expat's event pointer is (undefined: the tag's start). */
export interface AttValueError {
  message: string;
  offset?: number;
}

const NAME_START = /[A-Za-z_:\u0080-￿]/;
const NAME_CHAR = /[\w.:\u0080-￿-]/;
const DEC_DIGIT = /[0-9]/;
const HEX_DIGIT = /[0-9A-Fa-f]/;
/** Bytes expat's tokenizer rejects anywhere (BT_NONXML): controls other than tab, LF and CR. */
const NON_XML = /[\x00-\x08\x0b\x0c\x0e-\x1f]/;

/** A reference's digits from `i` up to `;`: the index after it, or where scanning stops. */
function scanDigits(text: string, i: number, digit: RegExp): number | AttValueScan {
  if (i >= text.length) return { partial: true };
  if (!digit.test(text[i]!)) return { invalid: i };
  for (let k = i + 1; k < text.length; k++) {
    if (text[k] === ';') return k + 1;
    if (!digit.test(text[k]!)) return { invalid: k };
  }
  return { partial: true };
}

/**
 * The reference after the `&` at `i - 1`: the index after its `;`, or where
 * scanning stops.
 * @see expat lib/xmltok_impl.c:PREFIX(scanRef)
 * @see expat lib/xmltok_impl.c:PREFIX(scanCharRef)
 */
function scanRef(text: string, i: number): number | AttValueScan {
  const c = text[i];
  if (c === undefined) return { partial: true };
  if (c === '#') return text[i + 1] === 'x' ? scanDigits(text, i + 2, HEX_DIGIT) : scanDigits(text, i + 1, DEC_DIGIT);
  if (!NAME_START.test(c)) return { invalid: i };
  for (let k = i + 1; k < text.length; k++) {
    if (text[k] === ';') return k + 1;
    if (!NAME_CHAR.test(text[k]!)) return { invalid: k };
  }
  return { partial: true };
}

/**
 * scanAtts over the value whose opening quote is at `j`.
 * @see expat lib/xmltok_impl.c:PREFIX(scanAtts) ("in attribute value")
 */
export function scanAttValue(text: string, j: number): AttValueScan {
  const q = text[j];
  let k = j + 1;
  for (;;) {
    const c = text[k];
    if (c === undefined) return { partial: true };
    if (c === q) return { close: k };
    if (c === '<' || NON_XML.test(c)) return { invalid: k };
    if (c !== '&') {
      k++;
      continue;
    }
    const r = scanRef(text, k + 1);
    if (typeof r !== 'number') return r;
    k = r;
  }
}

/**
 * XmlCharRefNumber: the code point of `&#...;`, or -1 for one XML does not
 * allow (controls other than tab, LF and CR; surrogates; U+FFFE and U+FFFF;
 * beyond U+10FFFF).
 * @see expat lib/xmltok_impl.c:PREFIX(charRefNumber)
 * @see expat lib/xmltok.c:checkCharRefNumber
 */
export function charRefNumber(ref: string): number {
  const hex = ref.startsWith('&#x');
  const n = parseInt(ref.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  if (n >= 0x110000) return -1;
  if (n >= 0xd800 && n <= 0xdfff) return -1;
  if (n < 0x20 && NON_XML.test(String.fromCharCode(n))) return -1;
  return n === 0xfffe || n === 0xffff ? -1 : n;
}

const PREDEFINED: Readonly<Record<string, string>> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

/** The references of a well-formed value, and its CR LF pairs. */
const VALUE_PIECE = /&#x?[0-9A-Fa-f]+;|&[^;]+;|\r\n|[\t\n\r]/g;

/**
 * storeAtts' check of a well-formed value (`raw`, between the quotes, at
 * `base`): the first undefined entity or disallowed character reference. No
 * DTD, so only the five predefined entities exist.
 * @see expat lib/xmlparse.c:appendAttributeValue
 */
export function attValueError(raw: string, base: number): AttValueError | undefined {
  for (const m of raw.matchAll(VALUE_PIECE)) {
    const ref = m[0];
    if (!ref.startsWith('&')) continue;
    if (ref.startsWith('&#')) {
      if (charRefNumber(ref) < 0) return { message: XML_ERROR_BAD_CHAR_REF, offset: base + m.index };
    } else if (!Object.hasOwn(PREDEFINED, ref.slice(1, -1))) {
      return { message: XML_ERROR_UNDEFINED_ENTITY };
    }
  }
  return undefined;
}

/**
 * appendAttributeValue for a CDATA attribute (no DTD declares one otherwise)
 * on a value storeAtts accepted: references become their characters, which
 * stay as they are (a `&#9;` is a tab); a tab, LF, CR or CR LF in the source
 * becomes one space.
 * @see expat lib/xmlparse.c:appendAttributeValue
 */
export function decodeAttValue(raw: string): string {
  return raw.replace(VALUE_PIECE, (m) => {
    if (!m.startsWith('&')) return ' ';
    if (m.startsWith('&#')) return String.fromCodePoint(charRefNumber(m));
    return PREDEFINED[m.slice(1, -1)]!;
  });
}
