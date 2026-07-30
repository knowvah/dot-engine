// SPDX-License-Identifier: EPL-2.0
//
// Guard for engine-walk.ts's render budget.
//
// Until 2026-07-30 this walker hard-coded a 90s port timeout — the only
// un-scaled, un-overridable render budget among the five corpus walkers — and it
// manufactured phantom `timeout` rows (`2108` on all three iterative xdot
// tracks; `1652` on fdp while the same graph rendered fine on neato/sfdp). That
// mattered beyond a wrong row: `attribute-divergence.ts` selects only
// `status === 'diverged'`, so a phantom timeout silently removes a graph from
// injection attribution permanently.
//
// These tests pin the budget's shape, not one magic number: scale by the graph's
// own recorded cost, fall back to a floor that is never 90s, honour env
// overrides, and degrade to the floor (never throw) when a cost file is
// unreadable.

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  budgetConfigFromEnv,
  loadNativeTimes,
  loadPortTimes,
  renderBudgetMs,
  type BudgetConfig,
  type CostTables,
} from './engine-walk.js';

const DEFAULTS: BudgetConfig = budgetConfigFromEnv({});
const NO_COSTS: CostTables = { portMs: {}, nativeMs: {} };
const scratch = mkdtempSync(join(tmpdir(), 'engine-walk-budget-'));

describe('budgetConfigFromEnv', () => {
  it('defaults to a 3x multiplier and a one-hour floor', () => {
    // `timeout` must mean runaway, not slow: an item may legitimately run for up
    // to an hour at this stage of the port, and a tight floor does not fail safe
    // — it fabricates verdicts that are invisible to attribution. The 90s cap
    // produced four such phantom rows; the 300s that briefly replaced it was
    // still chosen to "bound a runaway cheaply" rather than from real costs.
    expect(DEFAULTS.mult).toBe(3);
    expect(DEFAULTS.floorMs).toBe(3_600_000);
    expect(DEFAULTS.floorMs).toBeGreaterThan(90_000);
    expect(DEFAULTS.oracleMs).toBe(300_000);
  });

  it('honours each env override', () => {
    const cfg = budgetConfigFromEnv({
      ENGINE_TIMEOUT_MULT: '5',
      ENGINE_TIMEOUT_FLOOR_MS: '123456',
      ENGINE_ORACLE_TIMEOUT_MS: '654321',
    });
    expect(cfg).toEqual({ mult: 5, floorMs: 123_456, oracleMs: 654_321 });
  });
});

describe('renderBudgetMs', () => {
  it('scales by a recorded port time when that exceeds the floor (AC1)', () => {
    // Must exceed the one-hour floor to be the binding term — 2621's real
    // measured cost (1237043ms) is in this range, which is the point: the heavy
    // tail is budgeted from its own cost, not from the floor.
    const costs: CostTables = { portMs: { big: 1_500_000 }, nativeMs: {} };
    expect(renderBudgetMs('big', 0, DEFAULTS, costs)).toBe(4_500_000);
    // A cost below the floor is not the binding term.
    expect(renderBudgetMs('small', 0, DEFAULTS, { portMs: { small: 500_000 }, nativeMs: {} }))
      .toBe(3_600_000);
  });

  it('falls back to the floor for an id absent from both cost tables, and is never 90s (AC2)', () => {
    const budget = renderBudgetMs('unknown-id', 0, DEFAULTS, NO_COSTS);
    expect(budget).toBe(3_600_000);
    expect(budget).not.toBe(90_000);
  });

  it('lets the floor env override win (AC3)', () => {
    const cfg = budgetConfigFromEnv({ ENGINE_TIMEOUT_FLOOR_MS: '900000' });
    expect(renderBudgetMs('unknown-id', 0, cfg, NO_COSTS)).toBe(900_000);
  });

  it('gives 2621 enough budget that it cannot be cut off (AC5)', () => {
    // Measured 2026-07-29: conformant standalone, portMs 1237043, native 256000.
    const costs: CostTables = { portMs: { '2621': 1_237_043 }, nativeMs: { '2621': 256_000 } };
    expect(renderBudgetMs('2621', 256_000, DEFAULTS, costs)).toBeGreaterThanOrEqual(3_711_129);
  });

  it('takes the largest of floor, native, port and native-table terms', () => {
    // Use an explicit low floor so the cost terms are what is being measured.
    const cfg = budgetConfigFromEnv({ ENGINE_TIMEOUT_FLOOR_MS: '1000' });
    const costs: CostTables = { portMs: { x: 100_000 }, nativeMs: { x: 200_000 } };
    // 3x200_000 = 600_000 beats both 3x100_000 and the floor.
    expect(renderBudgetMs('x', 1_000, cfg, costs)).toBe(600_000);
    // The passed-in nativeMs is honoured even when the tables are empty.
    expect(renderBudgetMs('y', 400_000, cfg, NO_COSTS)).toBe(1_200_000);
    // And a cost term below the DEFAULT floor loses to it.
    expect(renderBudgetMs('x', 1_000, DEFAULTS, costs)).toBe(3_600_000);
  });

  it('rounds up rather than truncating a fractional product', () => {
    const cfg = budgetConfigFromEnv({ ENGINE_TIMEOUT_MULT: '1.5', ENGINE_TIMEOUT_FLOOR_MS: '0' });
    expect(renderBudgetMs('z', 1_001, cfg, NO_COSTS)).toBe(1_502);
  });
});

describe('cost table loaders', () => {
  it('degrades to the floor instead of throwing when perf.json is missing (AC4)', () => {
    const costs: CostTables = {
      portMs: loadPortTimes(join(scratch, 'does-not-exist.json')),
      nativeMs: loadNativeTimes(join(scratch, 'does-not-exist.json')),
    };
    expect(costs.portMs).toEqual({});
    expect(costs.nativeMs).toEqual({});
    expect(renderBudgetMs('anything', 0, DEFAULTS, costs)).toBe(3_600_000);
  });

  it('degrades to an empty table when a cost file is malformed (AC4)', () => {
    const bad = join(scratch, 'malformed.json');
    writeFileSync(bad, '{ this is not json');
    expect(loadPortTimes(bad)).toEqual({});
    expect(loadNativeTimes(bad)).toEqual({});
  });

  it('reads real cost tables and skips rows with no usable portMs', () => {
    const perf = join(scratch, 'perf.json');
    writeFileSync(perf, JSON.stringify({
      results: [
        { id: 'a', portMs: 1234 },
        { id: 'b' },              // no portMs — bench recorded an error row
        { id: 'c', portMs: 0 },   // zero is not a usable cost
      ],
    }));
    expect(loadPortTimes(perf)).toEqual({ a: 1234 });

    const native = join(scratch, 'native.json');
    writeFileSync(native, JSON.stringify({ timings: { a: 58, b: 270_306 } }));
    expect(loadNativeTimes(native)).toEqual({ a: 58, b: 270_306 });
  });

  it('reads the committed cost tables, and 2621 is present in both', () => {
    // Regression guard for the gap that made 2621 fragile: it was
    // perf-quarantined when both captures ran and neither was re-run after the
    // quarantine lifted, leaving it with no cost datum at all.
    const repo = new URL('../../', import.meta.url).pathname;
    const portMs = loadPortTimes(join(repo, 'test/corpus/perf.json'));
    const nativeMs = loadNativeTimes(join(repo, 'test/corpus/native-timings.json'));
    // Far fewer keys than perf.json has rows, by design: ~279 of its rows record
    // portMs 0 (sub-millisecond renders) and 9 are oracle-error rows with no
    // portMs at all. A zero cannot raise a max, so dropping it is equivalent to
    // keeping it and costs nothing.
    expect(Object.keys(portMs).length).toBeGreaterThan(400);
    expect(portMs['2621']).toBeGreaterThan(1_000_000);
    expect(nativeMs['2621']).toBeGreaterThan(200_000);
  });
});
