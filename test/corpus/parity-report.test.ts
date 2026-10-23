// SPDX-License-Identifier: EPL-2.0
//
// Unit tests for parity-report.ts's A1-drift class-acceptance wiring (T2,
// plans/iterative-parity-campaign/batch-1/T2-class-acceptance-reports.md, D2).
//
// Exercises the pure class-membership functions directly (no file I/O side
// effects — parity-report.ts's top-level report generation is guarded by
// `isMain`, so importing it here is safe) plus one real-file round trip
// against test/corpus/fixtures/attribution-fixture.json — a small,
// clearly-named fixture standing in for T1's attribution-<engine>.json
// output while T1's harness has not run for any engine yet (batch-1
// overview.md: T2 depends only on T1's output SHAPE, not its generated
// files).

import { describe, it, expect } from 'vitest';
import type { EngineParityReport, EngineWalkRow } from './engine-walk.js';
import {
  exoneratedIds,
  resolveClassAcceptance,
  splitAcceptedMap,
  computeAcceptedIds,
  classAcceptanceSection,
  engineRow,
  engineMarkdown,
  formatDetailMarkdown,
  normDotVerdict,
  tallyFormats,
  oracleSummary,
  type EngineAcceptedRegistryEntry,
  type AttributionReport,
} from './parity-report.js';

const FIXTURE_FILE = 'fixtures/attribution-fixture.json';

const fixtureReport: AttributionReport = {
  generatedAt: '2026-07-12T00:00:00.000Z',
  oracleSha1: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  tolerance: 0.5,
  results: [
    { id: 'fixture-drift-a', verdict: 'drift-exonerated', baseDiffs: 6, injectedDiffs: 0 },
    { id: 'fixture-drift-b', verdict: 'drift-exonerated', baseDiffs: 12, injectedDiffs: 0 },
    { id: 'fixture-not-cleared', verdict: 'not-cleared', baseDiffs: 40, injectedDiffs: 38 },
    { id: 'fixture-harness-error', verdict: 'harness-error', baseDiffs: 0, injectedDiffs: 0 },
  ],
};

describe('exoneratedIds', () => {
  it('is empty for a missing report (harness has not run for this engine)', () => {
    expect(exoneratedIds(null)).toEqual(new Set());
  });

  it('includes only drift-exonerated ids, not not-cleared/harness-error', () => {
    expect(exoneratedIds(fixtureReport)).toEqual(new Set(['fixture-drift-a', 'fixture-drift-b']));
  });
});

describe('resolveClassAcceptance (real file I/O against the fixture)', () => {
  it('status=loaded and exonerated set populated when the attribution file exists', () => {
    const r = resolveClassAcceptance('A1-drift', {
      class: true,
      attributionFile: FIXTURE_FILE,
      ref: 'known-divergences.md#a1-drift-iterative-engines',
    });
    expect(r.status).toBe('loaded');
    expect(r.exonerated).toEqual(new Set(['fixture-drift-a', 'fixture-drift-b']));
  });

  it('status=pending and empty exonerated set when the file does not exist yet', () => {
    const r = resolveClassAcceptance('A1-drift', {
      class: true,
      attributionFile: 'attribution-does-not-exist-yet.json',
      ref: 'known-divergences.md#a1-drift-iterative-engines',
    });
    expect(r.status).toBe('pending');
    expect(r.exonerated).toEqual(new Set());
  });
});

describe('splitAcceptedMap', () => {
  const raw: Record<string, EngineAcceptedRegistryEntry> = {
    'some-id': { class: 'A9', bound: 'x', ref: 'known-divergences.md#a9' },
    'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'known-divergences.md#a1-drift-iterative-engines' },
  };

  it('separates per-id entries from class entries and resolves the class', () => {
    const { perId, classes } = splitAcceptedMap(raw);
    expect(Object.keys(perId)).toEqual(['some-id']);
    expect(classes).toHaveLength(1);
    expect(classes[0]!.name).toBe('A1-drift');
    expect(classes[0]!.exonerated).toEqual(new Set(['fixture-drift-a', 'fixture-drift-b']));
  });
});

function walkRow(id: string, status: EngineWalkRow['status']): EngineWalkRow {
  return { id, size: 100, status, nDiffs: status === 'diverged' ? 3 : undefined };
}

function fakeReport(rows: EngineWalkRow[]): EngineParityReport {
  return {
    generatedAt: '2026-07-12T00:00:00.000Z',
    generatedWith: 'test fixture',
    engine: 'neato',
    tolerance: 0.5,
    total: rows.length,
    counts: {
      pass: rows.filter((r) => r.status === 'pass').length,
      diverged: rows.filter((r) => r.status === 'diverged').length,
      'oracle-error': rows.filter((r) => r.status === 'oracle-error').length,
      'port-error': rows.filter((r) => r.status === 'port-error').length,
      timeout: rows.filter((r) => r.status === 'timeout').length,
      'oracle-nondeterministic': rows.filter((r) => r.status === 'oracle-nondeterministic').length,
    },
    results: rows,
  };
}

describe('computeAcceptedIds', () => {
  it('unions per-id and class-exonerated diverged ids without double-counting', () => {
    const report = fakeReport([
      walkRow('per-id-a', 'diverged'),
      walkRow('fixture-drift-a', 'diverged'),
      walkRow('fixture-drift-b', 'diverged'),
      walkRow('untouched', 'diverged'),
      walkRow('per-id-a', 'pass'), // duplicate id, different status — ignored below
    ]);
    const perId = { 'per-id-a': { class: 'A9', ref: 'x' } };
    const { classes } = splitAcceptedMap({
      'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'x' },
    });
    const ids = computeAcceptedIds(report, perId, classes);
    expect(ids).toEqual(new Set(['per-id-a', 'fixture-drift-a', 'fixture-drift-b']));
  });

  it('only counts drift-exonerated ids that are actually diverged in this report', () => {
    // fixture-not-cleared/fixture-harness-error are never drift-exonerated,
    // and fixture-drift-a isn't even in this report's results — none count.
    const report = fakeReport([walkRow('fixture-not-cleared', 'diverged')]);
    const { classes } = splitAcceptedMap({
      'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'x' },
    });
    expect(computeAcceptedIds(report, {}, classes)).toEqual(new Set());
  });

  it('an id that starts passing outright leaves the class silently (acceptance criterion)', () => {
    // fixture-drift-a used to diverge (and would have been drift-exonerated);
    // this fresh engine-walk.ts sweep now records it as 'pass' — it must NOT
    // be counted as class-accepted (it isn't a divergence to accept any
    // more), and nothing here should throw or require a registry edit.
    const report = fakeReport([
      walkRow('fixture-drift-a', 'pass'),
      walkRow('fixture-drift-b', 'diverged'),
    ]);
    const { classes } = splitAcceptedMap({
      'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'x' },
    });
    const ids = computeAcceptedIds(report, {}, classes);
    expect(ids).toEqual(new Set(['fixture-drift-b']));
    expect(ids.has('fixture-drift-a')).toBe(false);
    const row = engineRow('neato', report, {
      'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'x' },
    });
    expect(row.pass).toBe(1);
    expect(row.diverged).toBe(0); // fixture-drift-b was the only diverged row, now accepted
    expect(row.accepted).toBe(1);
  });
});

describe('classAcceptanceSection (roster-brevity convention)', () => {
  it('renders a member count and a link, never enumerates member ids', () => {
    const { classes } = splitAcceptedMap({
      'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'known-divergences.md#a1-drift-iterative-engines' },
    });
    const md = classAcceptanceSection(classes);
    expect(md).toContain('**2** members');
    expect(md).toContain(`[\`${FIXTURE_FILE}\`]`);
    // brevity: the individual exonerated ids must NOT be inlined.
    expect(md).not.toContain('fixture-drift-a');
    expect(md).not.toContain('fixture-drift-b');
  });

  it('renders "attribution pending" with 0 members when the file is absent', () => {
    const { classes } = splitAcceptedMap({
      'A1-drift': { class: true, attributionFile: 'attribution-does-not-exist-yet.json', ref: 'known-divergences.md#a1-drift-iterative-engines' },
    });
    const md = classAcceptanceSection(classes);
    expect(md).toContain('attribution pending');
    expect(md).toContain('0 members');
  });

  it('renders nothing for an engine with no class entries', () => {
    expect(classAcceptanceSection([])).toBe('');
  });
});

describe('engineRow + engineMarkdown integration (class exoneration removes ids from Diverged)', () => {
  const report = fakeReport([
    walkRow('fixture-drift-a', 'diverged'),
    walkRow('fixture-drift-b', 'diverged'),
    walkRow('still-tracked', 'diverged'),
    walkRow('a-pass', 'pass'),
  ]);
  const acceptedMap: Record<string, EngineAcceptedRegistryEntry> = {
    'A1-drift': { class: true, attributionFile: FIXTURE_FILE, ref: 'known-divergences.md#a1-drift-iterative-engines' },
  };

  it('engineRow subtracts class-exonerated ids from diverged and counts them accepted', () => {
    const row = engineRow('neato', report, acceptedMap);
    expect(row.diverged).toBe(1); // still-tracked only
    expect(row.accepted).toBe(2); // fixture-drift-a, fixture-drift-b
  });

  it('engineMarkdown removes exonerated ids from the Diverged table and links the class', () => {
    const md = engineMarkdown('neato', report, acceptedMap);
    expect(md).toContain('`still-tracked`');
    expect(md).not.toContain('`fixture-drift-a`');
    expect(md).not.toContain('`fixture-drift-b`');
    expect(md).toContain('Accepted class: A1-drift');
    expect(md).toContain("accepted (A1-drift class):** 2");
  });

  it('a class entry with no attribution file yet renders "pending" and leaves Diverged untouched', () => {
    const pendingMap: Record<string, EngineAcceptedRegistryEntry> = {
      'A1-drift': { class: true, attributionFile: 'attribution-does-not-exist-yet.json', ref: 'x' },
    };
    const md = engineMarkdown('neato', report, pendingMap);
    expect(md).toContain('`fixture-drift-a`');
    expect(md).toContain('`fixture-drift-b`');
    expect(md).toContain('`still-tracked`');
    expect(md).toContain('attribution pending');
  });

  it('an engine with no class entry at all renders exactly as before (no class section)', () => {
    const md = engineMarkdown('circo', report, {});
    expect(md).not.toContain('Accepted class');
    expect(md).not.toContain('A1-drift');
  });
});

// registry-faults-staleness T3 (AD-3): a per-id entry declaring
// verdict 'port-error' + errIncludes accepts a matching port-error row at
// report time; the row leaves the fault table instead of the diverged table.
describe('engineRow + engineMarkdown fault acceptance (A10)', () => {
  const MAP_MAX = 'Map maximum size exceeded';
  const faultRow = (id: string, status: 'port-error' | 'timeout', err?: string): EngineWalkRow => ({
    ...walkRow(id, status),
    ...(err === undefined ? {} : { err }),
  });
  const report = fakeReport([
    faultRow('2784', 'port-error', MAP_MAX),
    faultRow('other-fault', 'port-error', 'splines=compound: not supported yet'),
    faultRow('slow', 'timeout'),
    walkRow('still-tracked', 'diverged'),
    walkRow('a-pass', 'pass'),
  ]);
  const acceptedMap: Record<string, EngineAcceptedRegistryEntry> = {
    '2784': { class: 'A10', verdict: 'port-error', errIncludes: MAP_MAX, ref: 'known-divergences.md#a10' },
    // Same declaration, but this row's error does not carry errIncludes.
    'other-fault': { class: 'A10', verdict: 'port-error', errIncludes: MAP_MAX, ref: 'x' },
    // No verdict: a diverged-only entry never accepts a fault row.
    slow: { class: 'A9', bound: 'b', ref: 'x' },
  };

  it('computeAcceptedIds accepts only the matching port-error row', () => {
    const { perId, classes } = splitAcceptedMap(acceptedMap);
    expect(computeAcceptedIds(report, perId, classes)).toEqual(new Set(['2784']));
  });

  it('engineRow moves the accepted fault from portFaults to accepted', () => {
    const row = engineRow('circo', report, acceptedMap);
    expect(row.accepted).toBe(1);
    expect(row.portFaults).toBe(2); // other-fault, slow
    expect(row.diverged).toBe(1); // still-tracked
    expect(row.pass + row.diverged + row.accepted + row.portFaults + row.oracleErrors).toBe(row.surveyed);
  });

  it('a diverged row is not accepted by a port-error entry', () => {
    const r = fakeReport([walkRow('2784', 'diverged')]);
    const row = engineRow('circo', r, { '2784': acceptedMap['2784']! });
    expect(row.accepted).toBe(0);
    expect(row.diverged).toBe(1);
  });

  it('engineMarkdown lists the accepted fault in the accepted table, not the fault table', () => {
    const md = engineMarkdown('circo', report, acceptedMap);
    const [head, rest] = md.split('## Diverged');
    const faults = rest!.split('## Errors and timeouts')[1]!;
    expect(head).toContain(`| \`2784\` |  | A10 | ${MAP_MAX} | known-divergences.md#a10 |`);
    expect(head).toContain('## Accepted deltas (1)');
    expect(faults).not.toContain('`2784`');
    expect(faults).toContain('`other-fault`');
    expect(faults).toContain('`slow`');
    expect(md).toContain('## Errors and timeouts (2)');
    expect(md).toContain('**port-error:** 1 · **timeout:** 1');
    expect(md).toContain("**accepted (documented, won't-fix):** 1");
  });
});

// Every generated page states which graphviz build the walk measured against
// (post-16.1 follow-up 4); a summary written before the walker recorded the
// version says so instead of guessing.
describe('oracle version on generated pages', () => {
  const report = fakeReport([walkRow('a-pass', 'pass')]);

  it('engineRow carries the walk summary\'s oracleVersion', () => {
    expect(engineRow('circo', { ...report, oracleVersion: 'dot 16.1.0' }, {}).oracle).toBe('dot 16.1.0');
    expect(engineRow('circo', report, {}).oracle).toBeUndefined();
  });

  it('engineMarkdown states the oracle, or that it was not recorded', () => {
    expect(engineMarkdown('circo', { ...report, oracleVersion: 'dot 16.1.0' }, {})).toContain(
      '- **Oracle:** dot 16.1.0\n',
    );
    expect(engineMarkdown('circo', report, {})).toContain('- **Oracle:** not recorded\n');
  });

  it('formatDetailMarkdown states the oracle from its track row', () => {
    const row = {
      track: 't', surveyed: 1, pass: 1, diverged: 0, accepted: 0, portFaults: 0, oracleErrors: 0,
      oracle: 'dot 16.1.0',
    };
    const md = formatDetailMarkdown('json', 'circo', 'json-parity-circo.json', 1, row, [], new Map());
    expect(md).toContain('- **Oracle:** dot 16.1.0\n');
  });

  it('oracleSummary names one version for uniform tracks and counts a mix', () => {
    const r = (oracle?: string) => ({
      track: 't', surveyed: 1, pass: 1, diverged: 0, accepted: 0, portFaults: 0, oracleErrors: 0, oracle,
    });
    expect(oracleSummary([r('dot 16.1.0'), r('dot 16.1.0')])).toBe('dot 16.1.0 (all 2 tracks)');
    expect(oracleSummary([r('dot 16.1.0'), r('dot 15.0.0'), r('dot 16.1.0'), r()])).toBe(
      'dot 16.1.0 (2 tracks), dot 15.0.0 (1 track), not recorded (1 track)',
    );
  });
});

// AD-13: an oracle-nondeterministic row is neither pass nor diverged nor a
// fault; reports count it separately and drop it from the pass-% denominator.
describe('oracle-nondeterministic rows (AD-13)', () => {
  const report = fakeReport([
    walkRow('a-pass', 'pass'),
    walkRow('a-div', 'diverged'),
    walkRow('flaky-oracle', 'oracle-nondeterministic'),
  ]);

  it('engineRow counts it separately from pass, diverged and faults', () => {
    const row = engineRow('fdp', report, {});
    expect(row.pass).toBe(1);
    expect(row.diverged).toBe(1);
    expect(row.portFaults).toBe(0);
    expect(row.oracleNondeterministic).toBe(1);
  });

  it('engineMarkdown reports the count and omits the row from the Diverged table', () => {
    const md = engineMarkdown('fdp', report, {});
    expect(md).toContain('**oracle-nondeterministic:** 1');
    expect(md).toContain('**pass:** 1 (50.0%)');
    expect(md.split('## Diverged')[1]).not.toContain('flaky-oracle');
  });
});

describe('cross-format section and oracle-nondeterministic (AD-13)', () => {
  it('normDotVerdict keeps the status distinct from error', () => {
    expect(normDotVerdict('oracle-nondeterministic')).toBe('oracle-nondeterministic');
    expect(normDotVerdict('port-error')).toBe('error');
  });

  it('tallyFormats counts a nondeterministic id apart, not as clean or failing', () => {
    expect(tallyFormats([
      ['conformant', 'conformant', 'conformant'],
      ['conformant', 'accepted', 'conformant'],
      ['conformant', 'conformant', 'oracle-nondeterministic'],
      ['diverged', 'conformant', 'oracle-nondeterministic'],
    ])).toEqual({ allClean: 1, acceptedOnly: 1, notClean: 1, nondeterministic: 1 });
  });
});
