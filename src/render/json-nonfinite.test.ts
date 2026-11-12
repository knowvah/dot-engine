// SPDX-License-Identifier: EPL-2.0
/**
 * `-Tjson` prints every draw-op number with `%.03f`, which gives the bare
 * tokens `inf`, `-inf` and `nan` for a non-finite double (macOS libc, the
 * oracle platform; a negative NaN prints `nan` too). A cluster whose bb is
 * inf,inf,nan,nan gets the xdot frame `p 4 inf inf inf nan nan nan nan inf`,
 * and native json keeps it as a `p` op with those points, so its document is
 * not valid JSON. The native references are 16.1.0's own `-Kosage -Tjson`
 * output (`plans/issue-144-json-nonfinite-draw/harness/regen.sh`).
 * @see plugin/core/gvrender_core_json.c:write_polyline
 * @see lib/xdot/xdot.c:parsePolyline
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse, render } from '../index.js';
import { stringifyJsonTree } from './json-nonfinite.js';

const HARNESS = new URL('../../plans/issue-144-json-nonfinite-draw/harness/out/', import.meta.url);
const native = (id: string): string => readFileSync(new URL(`${id}.osage.json`, HARNESS), 'utf8');

const ENGINE = 'osage';
/** Corpus 1221: cluster_2 holds only a node cluster_1 already placed. */
const SRC_1221 = `digraph "Graph d718cbc6-5e20-4417-a41a-e1e380469dd2" {
	graph [
		newrank=true
	];
	subgraph "cluster_1" {
		1;
	}
	subgraph "cluster_2" {
		1
	}
}
`;
/** Corpus 2721: the same shape, with quoted names. */
const SRC_2721 = `digraph G {
subgraph "cluster_std" {
"622";
}
subgraph "cluster_uni" {
"622";
}
}
`;
/** The frame's points as native prints them, and as they read without whitespace. */
const FRAME_POINTS = '[[inf,inf],[inf,nan],[nan,nan],[nan,inf]]';
const JSON_INDENT = 2;

const squeeze = (text: string): string => text.replace(/\s+/g, '');
const DRAW_KEY = '"_draw_":';
/** A JSON string literal, for looking only at what lies outside strings. */
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"/g;

/** The text of one named object's `_draw_` array, whitespace removed. */
function drawOf(text: string, name: string): string {
  const flat = squeeze(text);
  const obj = flat.indexOf(`"name":"${name}",`);
  expect(obj, `object ${name}`).toBeGreaterThan(-1);
  // Attribute order within an object differs from native's; find the key.
  const start = flat.indexOf(DRAW_KEY, obj);
  return flat.slice(start + DRAW_KEY.length, flat.indexOf('],"bb"', start) + 1);
}

describe('json: a cluster frame with inf/nan points', () => {
  it.each([
    ['1221', SRC_1221, 'cluster_2'],
    ['2721', SRC_2721, 'cluster_uni'],
  ])('osage %s keeps the p op and prints C tokens', (id, src, cluster) => {
    const text = render(parse(src), 'json', { engine: ENGINE });
    expect(drawOf(text, cluster)).toBe(
      `[{"op":"c","grad":"none","color":"#000000"},{"op":"p","points":${FRAME_POINTS}}]`,
    );
    expect(drawOf(native(id), cluster)).toBe(drawOf(text, cluster));
    expect(compareJson(text, native(id))).toEqual({ pass: true, diffs: [] });
  });

  it('is not valid JSON, exactly as the native document is not', () => {
    const text = render(parse(SRC_1221), 'json', { engine: ENGINE });
    expect(() => JSON.parse(text)).toThrow(SyntaxError);
    expect(() => JSON.parse(native('1221'))).toThrow(SyntaxError);
  });

  it('leaves the bb string and every finite number as they were', () => {
    const text = render(parse(SRC_1221), 'json', { engine: ENGINE });
    expect(squeeze(text)).toContain('"bb":"inf,inf,nan,nan"');
    // Only the frame's eight coordinates are bare tokens.
    expect(text.replace(STRING_LITERAL, '""').match(/-?(?:inf|nan)/g)).toEqual(
      ['inf', 'inf', 'inf', 'nan', 'nan', 'nan', 'nan', 'inf'],
    );
  });

  it('json0 has no draw ops, so it stays valid JSON', () => {
    const text = renderFormat(parse(SRC_1221), 'json0', ENGINE);
    const root = JSON.parse(text) as { objects: Array<Record<string, unknown>> };
    expect(root.objects.map((o) => o.name)).toEqual(['cluster_1', 'cluster_2', '1']);
    expect(root.objects.some((o) => '_draw_' in o)).toBe(false);
  });
});

describe('stringifyJsonTree', () => {
  it('prints non-finite numbers as inf, -inf and nan', () => {
    const tree = { pt: [Infinity, -Infinity, NaN, -NaN], width: NaN, size: -Infinity, r: Infinity };
    expect(stringifyJsonTree(tree)).toBe(`{
  "pt": [
    inf,
    -inf,
    nan,
    nan
  ],
  "width": nan,
  "size": -inf,
  "r": inf
}`);
  });

  it('is JSON.stringify for a tree with no non-finite number', () => {
    const tree = {
      name: 'G', directed: true, n: [0, -0, 1.5, 1e21, 5e-324, -27.123],
      label: 'inf', other: 'nan', neg: '-inf', quoted: '"inf"', esc: 'a\\u0000inf\\u0000b',
      nested: [{ op: 'T', text: 'inf', width: 7 }, []], empty: {},
    };
    expect(stringifyJsonTree(tree)).toBe(JSON.stringify(tree, null, JSON_INDENT));
  });

  it('keeps strings that spell a token quoted beside real non-finite numbers', () => {
    const tree = { label: 'inf', text: 'nan', neg: '-inf', esc: '\\u0000inf\\u0000', pt: [NaN, 1] };
    const expected = JSON.stringify({ ...tree, pt: ['@', 1] }, null, JSON_INDENT).replace('"@"', 'nan');
    expect(stringifyJsonTree(tree)).toBe(expected);
    expect(stringifyJsonTree(tree)).toContain('"label": "inf"');
    expect(stringifyJsonTree(tree)).toContain('"esc": "\\\\u0000inf\\\\u0000"');
  });
});
