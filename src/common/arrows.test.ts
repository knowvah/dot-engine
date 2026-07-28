// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { ARROW_NAMES, parseArrow } from './arrows.js';

describe('ARROW_NAMES', () => {
  it('AC1: includes required names', () => {
    expect(ARROW_NAMES.includes('normal')).toBe(true);
    expect(ARROW_NAMES.includes('none')).toBe(true);
    expect(ARROW_NAMES.includes('crow')).toBe(true);
  });
  it('AC1: length matches C table count (13 Arrownames + 1 synonym = 14)', () => {
    expect(ARROW_NAMES.length).toBe(14);
  });
  it('includes inv, vee, tee, box, diamond, dot, open, empty, curve, icurve, invempty', () => {
    const expected = ['inv','vee','tee','box','diamond','dot','open','empty','curve','icurve','invempty'];
    for (const n of expected) expect(ARROW_NAMES.includes(n)).toBe(true);
  });
});

describe('parseArrow — ACs', () => {
  it('AC2: "normal" → normal component', () => {
    expect(parseArrow('normal')).toEqual([{ name: 'normal', open: false, left: false, right: false }]);
  });
  it('AC3: a lone "none" is DROPPED (C gap rule), but a non-lone gap is kept', () => {
    // arrow_match_name discards a GAP that is the entire spec, so `arrowhead=none`
    // yields flag 0 — no arrow at all, not a gap component.
    // @see lib/common/arrows.c:arrow_match_name (`i == 0 && *rest == '\0'`)
    expect(parseArrow('none')).toEqual([]);
    // A gap followed by anything survives.
    expect(parseArrow('nonenone')).toEqual([
      { name: 'none', open: false, left: false, right: false },
      { name: 'none', open: false, left: false, right: false },
    ]);
  });
  it('a GAP in the LAST of the four slots is dropped', () => {
    // @see lib/common/arrows.c:arrow_match_name (`i == NUMB_OF_ARROW_HEADS - 1`)
    expect(parseArrow('teeteeteenone').map((c) => c.name)).toEqual(['tee', 'tee', 'tee']);
    // ...and only the first four components are read at all.
    expect(parseArrow('teeteeteeteetee').map((c) => c.name)).toEqual(['tee', 'tee', 'tee', 'tee']);
  });
  it('AC4: "odot" → dot open=true', () => {
    expect(parseArrow('odot')).toEqual([{ name: 'dot', open: true, left: false, right: false }]);
  });
  it('"inv" parses as base name', () => {
    expect(parseArrow('inv')).toEqual([{ name: 'inv', open: false, left: false, right: false }]);
  });
  it('"vee" parses as base name', () => {
    expect(parseArrow('vee')).toEqual([{ name: 'vee', open: false, left: false, right: false }]);
  });
});

describe('parseArrow — edge cases', () => {
  it('"invempty" synonym resolves', () => {
    const r = parseArrow('invempty');
    expect(r.length).toBe(1); expect(r[0].name).toBe('invempty');
  });
  it('"open" resolves with open=true', () => {
    const r = parseArrow('open');
    expect(r[0].name).toBe('open'); expect(r[0].open).toBe(true);
  });
  it('empty string returns default normal', () => {
    expect(parseArrow('')).toEqual([{ name: 'normal', open: false, left: false, right: false }]);
  });
});
