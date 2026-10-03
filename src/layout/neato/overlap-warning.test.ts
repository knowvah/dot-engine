// SPDX-License-Identifier: EPL-2.0
/**
 * getAdjustMode's fallback for an `overlap` value that is neither a mode nor
 * a boolean warns `Unrecognized overlap value "%s" - using false` (and uses
 * false, i.e. prism). The count per render follows C's call sites: once per
 * graphAdjustMode (neato, sfdp), once per removeOverlapAs with ≥2 nodes
 * (twopi and fdp per component, circo's single-component path). Expected
 * counts are native `dot -K<engine>` stderr.
 *
 * @see lib/neatogen/adjust.c:getAdjustMode
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';

type Engine = 'neato' | 'twopi' | 'circo' | 'sfdp' | 'fdp';
const MSG = 'Unrecognized overlap value "bogus" - using false';

afterEach(() => { vi.restoreAllMocks(); });

function warnings(engine: Engine, body: string, overlap = 'bogus'): string[] {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  render(parse(`graph g { overlap=${overlap}; ${body} }`), 'plain', { engine });
  return warn.mock.calls.map((c) => String(c[0])).filter((m) => m.startsWith('Unrecognized overlap'));
}

describe('Unrecognized overlap value warning (native counts)', () => {
  it.each([
    ['neato', 'a--b--c', 1], ['neato', 'a--b; c--d--e', 1], ['neato', 'a', 1],
    ['twopi', 'a--b--c', 1], ['twopi', 'a--b; c--d--e', 2], ['twopi', 'a', 0],
    ['circo', 'a--b--c', 1], ['circo', 'a--b; c--d--e', 0], ['circo', 'a', 0],
    ['sfdp', 'a--b--c', 1], ['sfdp', 'a--b; c--d--e', 1], ['sfdp', 'a', 1],
    ['fdp', 'a--b--c', 1], ['fdp', 'a--b; c--d--e', 2], ['fdp', 'a', 0],
  ] as const)('%s [%s] warns %i time(s)', (engine, body, n) => {
    expect(warnings(engine, body)).toEqual(Array<string>(n).fill(MSG));
  });

  it('keeps the original spelling in the message', () => {
    expect(warnings('neato', 'a--b', 'Maybe')).toEqual(['Unrecognized overlap value "Maybe" - using false']);
  });

  it.each(['false', 'true', 'no', 'yes', '0', '2', 'prism', 'prism500', 'scale', 'VPSC', 'ortho_yx'])(
    'does not warn for overlap=%s', (v) => {
      expect(warnings('neato', 'a--b--c', v)).toEqual([]);
    });

  it('renders like overlap=false (prism), as C uses false', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const src = (o: string): string =>
      `graph g { overlap=${o}; node[shape=box width=1 height=1 fixedsize=true]; a[pos="0,0"]; b[pos="0.3,0.2"]; a--b }`;
    expect(render(parse(src('bogus')), 'plain', { engine: 'neato' }))
      .toBe(render(parse(src('false')), 'plain', { engine: 'neato' }));
  });
});
