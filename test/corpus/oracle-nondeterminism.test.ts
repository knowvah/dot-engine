// SPDX-License-Identifier: EPL-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  EXTRA_ORACLE_DRAWS, classifyDivergence, distinctDraws, isWalkRegression, probeOracleDraws,
} from './oracle-nondeterminism.js';

const scratch = mkdtempSync(join(tmpdir(), 'oracle-nondet-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const env = { XDG_CACHE_HOME: scratch };
const key = (id: string) => ({ engine: 'fdp', format: 'xdot', id });

/** Stub oracle returning `outputs` in order, repeating the last; counts calls. */
function stub(outputs: readonly (string | undefined)[]): { draw: () => string | undefined; calls: () => number } {
  let n = 0;
  return { draw: () => outputs[Math.min(n++, outputs.length - 1)], calls: () => n };
}

describe('probeOracleDraws', () => {
  it('reports >= 2 distinct draws when the oracle varies', () => {
    const s = stub(['B', 'A', 'C']);
    expect(probeOracleDraws(key('varies'), 'A', s.draw, env)).toBe(3);
    expect(s.calls()).toBe(EXTRA_ORACLE_DRAWS);
  });

  it('reports 1 for a stable oracle and probes once across walks', () => {
    const first = stub(['A']);
    expect(probeOracleDraws(key('stable'), 'A', first.draw, env)).toBe(1);
    expect(first.calls()).toBe(EXTRA_ORACLE_DRAWS);
    const second = stub(['Z']);
    expect(probeOracleDraws(key('stable'), 'A', second.draw, env)).toBe(1);
    expect(second.calls()).toBe(0);
  });

  it('reuses a recorded nondeterministic outcome without re-running', () => {
    probeOracleDraws(key('rec'), 'A', stub(['B']).draw, env);
    const again = stub(['A']);
    expect(probeOracleDraws(key('rec'), 'A', again.draw, env)).toBe(2);
    expect(again.calls()).toBe(0);
  });

  it('ignores failed draws', () => {
    expect(probeOracleDraws(key('failed'), 'A', stub([undefined, 'A', undefined]).draw, env)).toBe(1);
  });
});

describe('distinctDraws', () => {
  it('counts distinct outputs', () => {
    expect(distinctDraws('A', ['A', 'B', 'B'])).toBe(2);
  });
});

describe('isWalkRegression', () => {
  it('does not report pass -> oracle-nondeterministic', () => {
    expect(isWalkRegression('pass', 'oracle-nondeterministic')).toBe(false);
  });
  it('reports pass -> diverged', () => {
    expect(isWalkRegression('pass', 'diverged')).toBe(true);
  });
  it('does not report non-pass baselines', () => {
    expect(isWalkRegression('diverged', 'diverged')).toBe(false);
  });
});

describe('classifyDivergence', () => {
  it('marks a varying oracle nondeterministic with nDraws >= 2', () => {
    expect(classifyDivergence(key('cd-var'), 'A', stub(['B', 'A', 'A']).draw, env)).toEqual({
      nondeterministic: true, nDraws: 2,
    });
  });
  it('leaves a stable oracle diverged and probes once', () => {
    const s = stub(['A']);
    expect(classifyDivergence(key('cd-stable'), 'A', s.draw, env)).toEqual({ nondeterministic: false, nDraws: 1 });
    classifyDivergence(key('cd-stable'), 'A', s.draw, env);
    expect(s.calls()).toBe(EXTRA_ORACLE_DRAWS);
  });
});
