// SPDX-License-Identifier: EPL-2.0
//
// Native json prints a non-finite draw coordinate with %.03f, which gives the
// bare tokens `inf`, `-inf` and `nan` (plugin/core/gvrender_core_json.c
// write_polyline). The comparator reads those tokens on both sides and
// compares non-finite values exactly: same kind passes, anything else is a
// diff. NATIVE_1221 is native dot 16.1.0's own `-Kosage -Tjson` output for
// corpus 1221 (plans/issue-144-json-nonfinite-draw/harness/regen.sh).

import { readFileSync } from 'node:fs';
import { describe, test, expect } from 'vitest';
import { compareJson } from './compare-json.js';

const NATIVE_1221 = readFileSync(
  new URL('../../plans/issue-144-json-nonfinite-draw/harness/out/1221.osage.json', import.meta.url),
  'utf8',
);
const NATIVE_POINTS = '[[inf,inf],[inf,nan],[nan,nan],[nan,inf]]';
const NATIVE_BB = '"bb": "inf,inf,nan,nan"';
const CLUSTER = 'cluster:cluster_2';

/** NATIVE_1221 with cluster_2's frame points replaced. */
function withPoints(points: string): string {
  expect(NATIVE_1221).toContain(NATIVE_POINTS);
  return NATIVE_1221.replace(NATIVE_POINTS, points);
}

/** A one-node document whose node carries the given op and attribute text. */
function doc(op: string, attrs = ''): string {
  return `{ "name": "G", "directed": true, "strict": false, "_subgraph_cnt": 0,
    "objects": [ { "_gvid": 0, "name": "a", "pos": "1,1", "_draw_": [ ${op} ]${attrs} } ] }`;
}

describe('compareJson: non-finite tokens', () => {
  test("native's 1221 json compares equal to itself", () => {
    expect(compareJson(NATIVE_1221, NATIVE_1221)).toEqual({ pass: true, diffs: [] });
  });

  test('the same non-finite points written with other whitespace pass', () => {
    const spaced = withPoints('[\n[ inf , inf ],[inf,\tnan],[nan,nan],[nan,inf\n]\n]');
    expect(compareJson(spaced, NATIVE_1221)).toEqual({ pass: true, diffs: [] });
  });

  test('inf against nan is a numeric diff on each swapped coordinate', () => {
    const swapped = withPoints('[[inf,inf],[nan,inf],[nan,nan],[nan,inf]]');
    const { pass, diffs } = compareJson(swapped, NATIVE_1221);
    expect(pass).toBe(false);
    expect(diffs.map((d) => [d.path, d.actual, d.expected, d.kind, d.delta])).toEqual([
      [`${CLUSTER}/_draw_/op[1].p[2]`, 'NaN', 'Infinity', 'numeric', Infinity],
      [`${CLUSTER}/_draw_/op[1].p[3]`, 'Infinity', 'NaN', 'numeric', Infinity],
    ]);
  });

  test('infinities of opposite sign are a diff', () => {
    const { pass, diffs } = compareJson(
      doc('{ "op": "L", "points": [[-inf,1.000]] }'),
      doc('{ "op": "L", "points": [[inf,1.000]] }'),
    );
    expect(pass).toBe(false);
    expect(diffs.map((d) => [d.path, d.actual, d.expected])).toEqual([
      ['node:a/_draw_/op[0].L[0]', '-Infinity', 'Infinity'],
    ]);
  });

  test('the same negative infinity passes', () => {
    const text = doc('{ "op": "e", "rect": [-inf,1.000,2.000,3.000] }');
    expect(compareJson(text, text)).toEqual({ pass: true, diffs: [] });
  });

  test('nan against a finite value is a diff, on either side', () => {
    const nan = doc('{ "op": "L", "points": [[nan,1.000]] }');
    const five = doc('{ "op": "L", "points": [[5.000,1.000]] }');
    for (const [port, oracle, actual, expected] of [
      [nan, five, 'NaN', '5'], [five, nan, '5', 'NaN'],
    ]) {
      const { pass, diffs } = compareJson(port, oracle);
      expect(pass).toBe(false);
      expect(diffs.map((d) => [d.path, d.actual, d.expected, d.kind])).toEqual([
        ['node:a/_draw_/op[0].L[0]', actual, expected, 'numeric'],
      ]);
    }
  });

  test('a non-finite text width and font size are read as numbers', () => {
    const text = doc(
      '{ "op": "F", "size": inf, "face": "Times-Roman" },'
      + ' { "op": "T", "pt": [nan,1.000], "align": "c", "width": -inf, "text": "x" }',
    );
    expect(compareJson(text, text)).toEqual({ pass: true, diffs: [] });
    const finite = text.replace('"size": inf', '"size": 14.000');
    const { diffs } = compareJson(finite, text);
    expect(diffs.map((d) => [d.path, d.actual, d.expected])).toEqual([
      ['node:a/_draw_/op[0].F[0]', '14', 'Infinity'],
    ]);
  });

  test('a positional string of inf and nan equals itself and differs from finite numbers', () => {
    const finiteBb = NATIVE_1221.replace(NATIVE_BB, '"bb": "1,2,3,4"');
    expect(finiteBb).not.toBe(NATIVE_1221);
    const { pass, diffs } = compareJson(finiteBb, NATIVE_1221);
    expect(pass).toBe(false);
    expect(diffs.map((d) => [d.path, d.actual, d.expected, d.kind])).toEqual([
      [`${CLUSTER}/bb[0]`, '1', 'Infinity', 'numeric'],
      [`${CLUSTER}/bb[1]`, '2', 'Infinity', 'numeric'],
      [`${CLUSTER}/bb[2]`, '3', 'NaN', 'numeric'],
      [`${CLUSTER}/bb[3]`, '4', 'NaN', 'numeric'],
    ]);
  });

  test('a positional string with a different non-finite kind is a diff', () => {
    const other = NATIVE_1221.replace(NATIVE_BB, '"bb": "inf,-inf,nan,inf"');
    const { diffs } = compareJson(other, NATIVE_1221);
    expect(diffs.map((d) => [d.path, d.actual, d.expected])).toEqual([
      [`${CLUSTER}/bb[1]`, '-Infinity', 'Infinity'],
      [`${CLUSTER}/bb[3]`, 'Infinity', 'NaN'],
    ]);
  });

  test('strings that spell inf or nan stay strings', () => {
    const op = '{ "op": "T", "pt": [1.000,1.000], "align": "c", "width": 7.000, "text": "nan" }';
    const text = doc(op, ', "label": "inf", "comment": "[inf,nan]", "tip": "say \\"nan\\", inf"');
    expect(compareJson(text, text)).toEqual({ pass: true, diffs: [] });
    const { diffs } = compareJson(text.replace('"label": "inf"', '"label": "info"'), text);
    expect(diffs.map((d) => [d.path, d.actual, d.expected, d.kind])).toEqual([
      ['node:a/label', 'info', 'inf', 'value'],
    ]);
    const other = compareJson(text.replace('"text": "nan"', '"text": "inf"'), text);
    expect(other.diffs.map((d) => [d.actual, d.expected])).toEqual([['inf', 'nan']]);
  });

  test('a bare word that is not a number token is still a parse diff', () => {
    for (const bad of ['[[info,1.000]]', '[[infinity,1.000]]', '[[NaN,1.000]]']) {
      const { pass, diffs } = compareJson(doc(`{ "op": "L", "points": ${bad} }`), NATIVE_1221);
      expect(pass).toBe(false);
      expect(diffs.map((d) => [d.path, d.kind])).toEqual([['[parse]/port', 'parse']]);
    }
    const oracleBad = compareJson(NATIVE_1221, '{ not json');
    expect(oracleBad.diffs.map((d) => [d.path, d.kind])).toEqual([['[parse]/oracle', 'parse']]);
  });

  test('a token in a key position is not rewritten', () => {
    const { diffs } = compareJson('{ "name": "G", inf: 1 }', NATIVE_1221);
    expect(diffs.map((d) => d.path)).toEqual(['[parse]/port']);
  });
});
