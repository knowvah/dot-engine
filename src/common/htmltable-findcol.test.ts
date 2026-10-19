// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { parseHtmlLabel, layoutHtmlTable } from './htmltable.js';
import type { TextMeasurer } from './htmltable.js';
import type { HtmlTable } from './htmltable-types.js';

const measurer: TextMeasurer = {
  measure: (text, _font, fontSize) => ({ w: text.length * fontSize * 0.6, h: fontSize }),
};

const placements = (src: string): [number, number][] => {
  const label = parseHtmlLabel(src);
  if (label.kind !== 'table') throw new Error('expected a table label');
  const tbl: HtmlTable = label.table;
  return layoutHtmlTable(tbl, measurer).entries.map(e => [e.col, e.row]);
};

describe('htmltable.c:findCol / processTbl occupancy', () => {
  it('skips columns held by a rowspan from an earlier row', () => {
    expect(placements(
      '<TABLE><TR><TD ROWSPAN="2">a</TD><TD>b</TD></TR><TR><TD>c</TD></TR></TABLE>',
    )).toEqual([[0, 0], [1, 0], [1, 1]]);
  });

  it('jumps past a colspan x rowspan block and keeps later cells clear of it', () => {
    expect(placements(
      '<TABLE><TR><TD COLSPAN="2" ROWSPAN="2">a</TD><TD>b</TD></TR>' +
      '<TR><TD>c</TD><TD>d</TD></TR></TABLE>',
    )).toEqual([[0, 0], [2, 0], [2, 1], [3, 1]]);
  });

  it('moves a wide cell past conflicts at both ends of its window', () => {
    expect(placements(
      '<TABLE><TR><TD ROWSPAN="2">a</TD><TD>b</TD><TD ROWSPAN="2">c</TD></TR>' +
      '<TR><TD COLSPAN="2">d</TD></TR></TABLE>',
    )).toEqual([[0, 0], [1, 0], [2, 0], [3, 1]]);
  });
});
