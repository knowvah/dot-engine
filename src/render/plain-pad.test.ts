// SPDX-License-Identifier: EPL-2.0
/**
 * plain's graph line under `pad=` (issue #198). write_plain prints job->zoom,
 * and init_job_viewport fits the bb padded by job->pad into `size=`; job->pad
 * is `pad=`, or else the dot render plugin's default_pad of 0. So `pad=` moves
 * the scale only when `size=` shrinks (or, with `!`, grows) the drawing.
 *
 * Every native ref is the carried oracle's own output (ADR-0003), written by
 * the harness's `recapture.sh`, under dot and neato.
 * @see lib/common/output.c:write_plain
 * @see lib/common/emit.c:init_job_pad, init_job_viewport
 */
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import { parse } from '../parser/index.js';

const HARNESS_198 = new URL('../../plans/issue-198-plain-pad/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_198), 'utf8');
const PROBE_COUNT = 16;
const ENGINES: readonly EngineName[] = ['dot', 'neato'];
const FORMATS = ['plain', 'plain-ext'] as const;
const PROBES = readdirSync(new URL('probes/', HARNESS_198))
  .filter((f) => f.endsWith('.gv'))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();

/** The port's output and everything it reported through agerr. */
function port(probe: string, format: string, engine: EngineName): { out: string; err: string } {
  const errs: string[] = [];
  agseterrf((m) => { errs.push(m); return 0; });
  const out = renderFormat(parse(read(`probes/${probe}.gv`)), format, engine);
  return { out, err: errs.join('') };
}

afterEach(() => { agseterrf(null); });

describe('plain graph-line scale under pad= matches native (#198)', () => {
  it('reads every probe', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  it('the issue repro prints the padded fit', () => {
    expect(port('repro', 'plain', 'dot').out.split('\n')[0]).toBe('graph 0.28571 0.75 1.5');
  });

  for (const probe of PROBES) {
    for (const engine of ENGINES) {
      for (const format of FORMATS) {
        it(`${probe} -K${engine} -T${format}`, () => {
          const got = port(probe, format, engine);
          expect(got.out).toBe(read(`native/${probe}.${engine}.${format}`));
          if (format === 'plain') expect(got.err).toBe(read(`native/${probe}.${engine}.err`));
        });
      }
    }
  }
});
