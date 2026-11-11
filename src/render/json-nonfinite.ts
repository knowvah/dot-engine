// SPDX-License-Identifier: EPL-2.0
/**
 * The json writers' serialization step. C prints every draw-op number with
 * `%.03f`, and on the oracle platform (macOS libc) that prints a non-finite
 * double as the bare token `inf`, `-inf` or `nan` (a negative NaN prints
 * `nan` too). `JSON.stringify` would print `null`, so the tree is serialized
 * with those tokens instead. A document that holds one is not valid JSON,
 * exactly as native's is not; a tree with no non-finite number serializes
 * byte for byte as `JSON.stringify(tree, null, 2)`.
 * @see plugin/core/gvrender_core_json.c:write_polyline (%.03f)
 */

const JSON_INDENT = 2;

const INF_TOKEN = 'inf';
const NEG_INF_TOKEN = '-inf';
const NAN_TOKEN = 'nan';

/**
 * Brackets a token while it travels through JSON.stringify as a string. A C
 * string cannot hold NUL, so no attribute value cgraph could store spells a
 * bracketed token.
 */
const MARK = '\u0000';
/** MARK as JSON.stringify escapes it. */
const ESCAPED_MARK = JSON.stringify(MARK).slice(1, -1).replace(/\\/g, '\\\\');
/** A whole string value that is one bracketed token. */
const QUOTED_TOKEN = new RegExp(
  `"${ESCAPED_MARK}(${INF_TOKEN}|${NEG_INF_TOKEN}|${NAN_TOKEN})${ESCAPED_MARK}"`, 'g',
);

/** What C's `%.03f` prints for a non-finite double. */
function nonFiniteToken(v: number): string {
  if (Number.isNaN(v)) return NAN_TOKEN;
  return v > 0 ? INF_TOKEN : NEG_INF_TOKEN;
}

/**
 * `JSON.stringify(tree, null, 2)`, except that a non-finite number prints as
 * C's `%.03f` token.
 * @see plugin/core/gvrender_core_json.c:write_polyline (%.03f)
 */
export function stringifyJsonTree(tree: unknown): string {
  let sawNonFinite = false;
  const text = JSON.stringify(tree, (_key, v: unknown) => {
    if (typeof v !== 'number' || Number.isFinite(v)) return v;
    sawNonFinite = true;
    return `${MARK}${nonFiniteToken(v)}${MARK}`;
  }, JSON_INDENT);
  return sawNonFinite ? text.replace(QUOTED_TOKEN, '$1') : text;
}
