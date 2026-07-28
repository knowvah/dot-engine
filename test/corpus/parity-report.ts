// SPDX-License-Identifier: EPL-2.0
//
// Cross-engine parity overview generator.
//
// Reads the per-track survey artifacts — parity.json (dot SVG, survey.ts),
// xdot-parity.json (dot xdot, xdot-walk.ts --survey), and parity-<engine>.json
// (non-dot engine walks, engine-walk.ts) — plus test/golden/manifest.json, and
// writes:
//
//   • PARITY.md          — the cross-engine SUMMARY page: one row per track,
//                          the golden-suite counts, and links to the per-track
//                          dashboards. Engines without a survey artifact are
//                          noted as "not yet surveyed".
//   • PARITY-<engine>.md — per-engine detail (diverged + error rosters) for
//                          each engine whose parity-<engine>.json exists.
//
// A report, not a gate. Regenerate: `npx tsx test/corpus/parity-report.ts`.
// Node-only dev/test infra — never imported by src/index.ts.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { SurveyResult, Verdict } from './survey.js';
import type { XdotVerdict, XdotWalkResult } from './xdot-walk.js';
import type { JsonVerdict, JsonWalkResult } from './json-walk.js';
import type { EngineParityReport, EngineWalkRow } from './engine-walk.js';
import type { CorpusEntry } from './enumerate.js';
// format-parity-matrix (BEGIN): plain/plain-ext (all 8 engines) + per-engine
// json/imagemap (7 non-dot engines) track types — see FORMAT block below.
import type { PlainVerdict, PlainWalkResult, PlainParityReport, PlainFormatResult } from './plain-walk.js';
// format-parity-matrix (END)
import { loadAccepted, matchAccepted } from './accepted.js';
import { testIdLink, scrubLocalPaths } from './corpus-links.js';
// map-conformance (BEGIN): dot (imagemap) track types — see MAP block below.
import type { MapVerdict, MapWalkResult, MapFormatResult } from './map-walk.js';
// map-conformance (END)
// T3's oracle-error classifier hook (batch-1/overview.md coordination note —
// T3 exposed renderOracleErrorsSidecar as a standalone export; T2 wires the
// call-site into engineMarkdown below).
import { renderOracleErrorsSidecar } from './oracle-error-classifier.js';

/** Non-dot deterministic engines swept by engine-walk.ts. */
const ENGINES = ['circo', 'twopi', 'osage', 'patchwork'] as const;
/** Iterative force-directed engines: characterized at the looser ±0.5
 * bar (accepted class A1 — fp accumulation JS cannot reproduce exactly).
 * Rendered as a separate Tracks section so their pass %% is never read
 * against the deterministic bar. */
const ITERATIVE_ENGINES = ['neato', 'fdp', 'sfdp'] as const;

const PARITY = new URL('./parity.json', import.meta.url);
const XDOT_PARITY = new URL('./xdot-parity.json', import.meta.url);
const JSON_PARITY = new URL('./json-parity.json', import.meta.url);
const MANIFEST = new URL('./corpus-manifest.json', import.meta.url);
const GOLDEN_MANIFEST = new URL('../golden/manifest.json', import.meta.url);
const OUT = new URL('./PARITY.md', import.meta.url);
// map-conformance (BEGIN): dot (imagemap) track artifact path — see MAP block below.
const MAP_PARITY = new URL('./map-parity.json', import.meta.url);
// map-conformance (END)
// format-parity-matrix (BEGIN): new tracks (mission: format-parity-matrix,
// T9). plain/plain-ext is surveyed for all 8 engines (dot included, one
// walker per AD-2); json/imagemap are surveyed per-engine only for the 7
// non-dot engines (dot's own json/imagemap tracks are JSON_PARITY/MAP_PARITY
// above, AD-3). Accepted-divergence registries are shared across engines,
// scoped per-entry by an optional `engine` field (same convention
// accepted-divergences-engines.json and json-walk.ts/map-walk.ts use).
const PLAIN_ENGINES = ['dot', ...ENGINES, ...ITERATIVE_ENGINES] as const;
const NON_DOT_ENGINES = [...ENGINES, ...ITERATIVE_ENGINES] as const;
const ACCEPTED_PLAIN = new URL('./accepted-divergences-plain.json', import.meta.url);
const ACCEPTED_JSON_ENGINES = new URL('./accepted-divergences-json.json', import.meta.url);
const ACCEPTED_MAP_ENGINES = new URL('./accepted-divergences-map.json', import.meta.url);
// format-parity-matrix (END)

interface SvgParityReport {
  total: number;
  counts: Record<Verdict, number>;
  results: SurveyResult[];
}

interface XdotParityReport {
  total: number;
  counts: Record<XdotVerdict, number>;
  results: XdotWalkResult[];
}

interface JsonParityReport {
  total: number;
  counts: Record<JsonVerdict, number>;
  results: JsonWalkResult[];
}
// map-conformance (BEGIN): dot (imagemap) track report shape.
interface MapParityReport {
  total: number;
  counts: Record<MapVerdict, number>;
  results: MapWalkResult[];
}
// map-conformance (END)

/** One accepted/known divergence for a per-engine xdot track (id-keyed — no
 * glob/engineIn selector, unlike the dot-track registry in accepted.ts). */
interface EngineAcceptedEntry {
  class: string;
  bound?: string;
  ref: string;
}

/** A class-acceptance entry (D2, plans/iterative-parity-campaign/decisions.md):
 * membership is COMPUTED from `attributionFile`'s drift-exonerated verdicts at
 * report time, never hand-enumerated. Discriminated from EngineAcceptedEntry
 * by `class === true` (boolean) vs. `class: string`. */
interface EngineAcceptedClassEntry {
  class: true;
  attributionFile: string;
  ref: string;
}

type EngineAcceptedRegistryEntry = EngineAcceptedEntry | EngineAcceptedClassEntry;

function isClassEntry(e: EngineAcceptedRegistryEntry): e is EngineAcceptedClassEntry {
  return e.class === true;
}

/** attribution-<engine>.json shape (T1 interface contract,
 * plans/iterative-parity-campaign/batch-1/T1-injection-harness.md). */
interface AttributionResultRow {
  id: string;
  verdict: 'drift-exonerated' | 'not-cleared' | 'harness-error';
  baseDiffs: number;
  injectedDiffs: number;
  bucket?: { shape: string; uniformDelta?: [number, number]; mirror?: boolean };
}
interface AttributionReport {
  generatedAt: string;
  oracleSha1: string;
  tolerance: number;
  results: AttributionResultRow[];
}

/** Pure: ids the injection-attribution harness exonerated as A1-drift (D2) —
 * a missing report (T1's harness has not run for this engine yet) exonerates
 * none, which is exactly the "attribution pending" state the report renders. */
function exoneratedIds(report: AttributionReport | null): Set<string> {
  if (!report) return new Set();
  return new Set(
    report.results.filter((r) => r.verdict === 'drift-exonerated').map((r) => r.id),
  );
}

/** Impure: read `<file>` relative to test/corpus — returns null (never
 * throws) when the file doesn't exist yet, so a class entry is allowed to
 * precede its data (D2; see accepted-divergences-engines.test.ts). */
function loadAttribution(file: string): AttributionReport | null {
  const url = new URL(`./${file}`, import.meta.url);
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as AttributionReport;
}

/** One resolved class-acceptance entry, ready to render/count. */
interface ClassAcceptance {
  name: string;
  attributionFile: string;
  ref: string;
  status: 'pending' | 'loaded';
  exonerated: Set<string>;
}

function resolveClassAcceptance(name: string, entry: EngineAcceptedClassEntry): ClassAcceptance {
  const report = loadAttribution(entry.attributionFile);
  return {
    name,
    attributionFile: entry.attributionFile,
    ref: entry.ref,
    status: report ? 'loaded' : 'pending',
    exonerated: exoneratedIds(report),
  };
}

/** Split a raw registry slice (engine -> name -> entry) into the two shapes
 * it may hold: per-id entries (existing) and class entries (D2), resolved
 * against their attribution files. */
function splitAcceptedMap(
  raw: Record<string, EngineAcceptedRegistryEntry>,
): { perId: Record<string, EngineAcceptedEntry>; classes: ClassAcceptance[] } {
  const perId: Record<string, EngineAcceptedEntry> = {};
  const classes: ClassAcceptance[] = [];
  for (const [key, entry] of Object.entries(raw)) {
    if (isClassEntry(entry)) classes.push(resolveClassAcceptance(key, entry));
    else perId[key] = entry;
  }
  return { perId, classes };
}

/** Every diverged id accepted either by a per-id entry or by class membership
 * (union — an id can't be double-counted even if it somehow appears in both). */
function computeAcceptedIds(
  report: EngineParityReport,
  perId: Record<string, EngineAcceptedEntry>,
  classes: ClassAcceptance[],
): Set<string> {
  const classExonerated = new Set(classes.flatMap((c) => [...c.exonerated]));
  const ids = new Set<string>();
  for (const r of report.results) {
    if (r.status !== 'diverged') continue;
    if (perId[r.id] || classExonerated.has(r.id)) ids.add(r.id);
  }
  return ids;
}

const ACCEPTED_ENGINES = new URL('./accepted-divergences-engines.json', import.meta.url);

/** Read + parse the per-engine accepted-divergence registry (engine -> id -> entry). */
function loadAcceptedEngines(): Record<string, Record<string, EngineAcceptedRegistryEntry>> {
  const raw = JSON.parse(readFileSync(fileURLToPath(ACCEPTED_ENGINES), 'utf8')) as Record<string, unknown>;
  const { comment: _comment, ...engines } = raw;
  return engines as Record<string, Record<string, EngineAcceptedRegistryEntry>>;
}

/** One summary-table row (a "track" = one engine × one comparison surface). */
interface TrackRow {
  track: string;
  surveyed: number;
  pass: number;
  diverged: number;
  accepted: number;
  errors: number;
}

/** Escape a markdown table cell (pipes + newlines). */
function cell(s: string | undefined): string {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Escape a free-text cell: pipes, newlines, and raw `<`/`>` (VitePress-safe). */
function escText(s: string | undefined): string {
  return cell(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pct(n: number, d: number): string {
  return d === 0 ? '0%' : `${((100 * n) / d).toFixed(1)}%`;
}

/**
 * The dot (SVG) track: parity.json joined with the accepted-divergence
 * registry (same join dashboard.ts performs) so `accepted` splits out of the
 * non-conformant set and `diverged` counts only tracked gaps.
 */
function dotSvgRow(report: SvgParityReport, manifest: CorpusEntry[]): TrackRow {
  const c: Record<Verdict, number> = Object.assign(
    { conformant: 0, 'structural-match': 0, diverged: 0, errored: 0, timeout: 0, 'oracle-error': 0 },
    report.counts,
  );
  const acceptedReg = loadAccepted();
  const engineOf = new Map(manifest.map((e) => [e.id, e.engine]));
  let accepted = 0;
  for (const r of report.results) {
    if (r.verdict !== 'diverged' && r.verdict !== 'structural-match') continue;
    if (matchAccepted(r.id, engineOf.get(r.id), 'parity', acceptedReg)) accepted++;
  }
  return {
    track: '[dot (SVG)](./PARITY-dot.md)',
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged + c['structural-match'] - accepted,
    accepted,
    errors: c.errored + c.timeout + c['oracle-error'],
  };
}

function dotXdotRow(report: XdotParityReport): TrackRow {
  const c: Record<XdotVerdict, number> = Object.assign(
    { conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0 },
    report.counts,
  );
  return {
    track: '[dot (xdot)](./PARITY-XDOT.md)',
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c['port-error'] + c['oracle-error'] + c.timeout,
  };
}

function dotJsonRow(report: JsonParityReport): TrackRow {
  const c: Record<JsonVerdict, number> = Object.assign(
    { conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0 },
    report.counts,
  );
  return {
    track: '[dot (json)](./PARITY-JSON.md)',
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c['port-error'] + c['oracle-error'] + c.timeout,
  };
}

// map-conformance (BEGIN): dot (imagemap) track row. Overall verdict per id
// is already the worst-of-{cmapx,imap} (map-walk.ts worstVerdict) — no extra
// join needed here, unlike the per-engine accepted-registry join above.
function dotMapRow(report: MapParityReport): TrackRow {
  const c: Record<MapVerdict, number> = Object.assign(
    { conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0 },
    report.counts,
  );
  return {
    track: '[dot (imagemap)](./PARITY-MAP.md)',
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c['port-error'] + c['oracle-error'] + c.timeout,
  };
}
// map-conformance (END)

// format-parity-matrix (BEGIN): plain/plain-ext + per-engine json/imagemap
// track rows (mission: format-parity-matrix, T9). Unlike the xdot engineRow
// above, these three walkers (plain-walk.ts/json-walk.ts/map-walk.ts) already
// resolve `accepted` into the verdict themselves (per-engine accepted-
// divergence registry join happens at walk time, not report time) — no
// separate registry join needed here, only a straight counts read.

/** `dot` + the plain-track engine set: plain/plain-ext is surveyed for every
 * engine (AD-2), unlike json/imagemap below which stay dot-only + 7 others. */
function plainRow(engine: string, report: PlainParityReport): TrackRow {
  const c: Record<PlainVerdict, number> = Object.assign(
    { pass: 0, diverged: 0, accepted: 0, oracleError: 0, portError: 0, timeout: 0 },
    report.counts,
  );
  return {
    track: `[${engine} (plain)](./PARITY-${engine}-plain.md)`,
    surveyed: report.total,
    pass: c.pass,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c.oracleError + c.portError + c.timeout,
  };
}

/** Per-engine json track row (AD-3 — dot's own json track is dotJsonRow above). */
function jsonEngineRow(engine: string, report: JsonParityReport): TrackRow {
  const c: Record<JsonVerdict, number> = Object.assign(
    { conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0 },
    report.counts,
  );
  return {
    track: `[${engine} (json)](./PARITY-${engine}-json.md)`,
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c['port-error'] + c['oracle-error'] + c.timeout,
  };
}

/** Per-engine imagemap track row (AD-3 — dot's own map track is dotMapRow above). */
function mapEngineRow(engine: string, report: MapParityReport): TrackRow {
  const c: Record<MapVerdict, number> = Object.assign(
    { conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0 },
    report.counts,
  );
  return {
    track: `[${engine} (imagemap)](./PARITY-${engine}-map.md)`,
    surveyed: report.total,
    pass: c.conformant,
    diverged: c.diverged,
    accepted: c.accepted,
    errors: c['port-error'] + c['oracle-error'] + c.timeout,
  };
}
// format-parity-matrix (END)

function engineRow(
  engine: string,
  report: EngineParityReport,
  rawAcceptedMap: Record<string, EngineAcceptedRegistryEntry>,
): TrackRow {
  const c = Object.assign(
    { pass: 0, diverged: 0, 'oracle-error': 0, 'port-error': 0, timeout: 0 },
    report.counts,
  );
  const { perId, classes } = splitAcceptedMap(rawAcceptedMap);
  const accepted = computeAcceptedIds(report, perId, classes).size;
  return {
    track: `[${engine} (xdot)](./PARITY-${engine}.md)`,
    surveyed: report.total,
    pass: c.pass,
    diverged: c.diverged - accepted,
    accepted,
    errors: c['oracle-error'] + c['port-error'] + c.timeout,
  };
}

function trackTable(rows: TrackRow[]): string {
  const body = rows.map(
    (r) =>
      `| ${r.track} | ${r.surveyed} | ${r.pass} | ${r.diverged} | ${r.accepted} | ` +
      `${r.errors} | ${pct(r.pass, r.surveyed)} |`,
  );
  return [
    '| track | surveyed | conformant / pass | diverged | accepted | errors | pass % |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...body,
    '',
  ].join('\n');
}

/** Golden counts per engine from test/golden/manifest.json. */
function goldensSection(): string {
  const manifest = JSON.parse(readFileSync(GOLDEN_MANIFEST, 'utf8')) as Array<{ engine: string }>;
  const byEngine = new Map<string, number>();
  for (const e of manifest) byEngine.set(e.engine, (byEngine.get(e.engine) ?? 0) + 1);
  const rows = [...byEngine.entries()].map(([eng, n]) => `| ${eng} | ${n} |`);
  return [
    '## Goldens',
    '',
    `${manifest.length} pinned golden inputs (\`test/golden/manifest.json\`), by engine:`,
    '',
    '| engine | goldens |',
    '|---|---:|',
    ...rows,
    '',
    'The golden xdot suite gates these in CI (`test/golden/xdot-suite.test.ts`).',
    '',
  ].join('\n');
}

/** Accepted-deltas table for an engine track: id | #diffs | class | bound | ref.
 * `pathById` resolves each id's corpus-relative path (from the dot-track
 * survey this engine's roster is a subset of) so the id column links to its
 * gitlab blob; omitted when the id isn't in the map. */
function engineAcceptedTable(
  rows: Array<{ r: EngineWalkRow; e: EngineAcceptedEntry }>,
  pathById: Map<string, string> = new Map(),
): string {
  if (rows.length === 0) return '_(none in this corpus)_\n';
  const sorted = [...rows].sort((a, b) => a.e.class.localeCompare(b.e.class) || a.r.id.localeCompare(b.r.id));
  const body = sorted.map(
    ({ r, e }) =>
      `| ${testIdLink(r.id, pathById.get(r.id))} | ${r.nDiffs ?? 0} | ${e.class} | ${escText(e.bound)} | ${escText(e.ref)} |`,
  );
  return ['| id | #diffs | class | bound | ref |', '|---|---:|---|---|---|', ...body, ''].join('\n');
}

/** Class-acceptance section for a PARITY-<engine>.md page (D2). Deliberately
 * NOT a per-id table — roster-brevity convention (2026-07-11 journal entry):
 * link the attribution JSON, don't enumerate members. Renders "attribution
 * pending" with 0 members when the harness hasn't produced the file yet, so
 * an engine without it reads identically to having no class entry at all. */
function classAcceptanceSection(classes: ClassAcceptance[]): string {
  if (classes.length === 0) return '';
  const items = classes.map((c) => {
    const n = c.exonerated.size;
    const status = c.status === 'pending'
      ? `_attribution pending_ — \`${c.attributionFile}\` not generated yet, 0 members`
      : `**${n}** member${n === 1 ? '' : 's'} — full per-id evidence in ` +
        `[\`${c.attributionFile}\`](./${c.attributionFile})`;
    return `- **${c.name}**: ${status}. Rationale: ` +
      `[Known divergences](../../docs/${c.ref}).`;
  });
  return [
    `## Accepted class: A1-drift — computed, not enumerated`,
    '',
    'Membership is computed at report time from the injection-attribution',
    'harness output (D2) — every diverged id whose native pre-routing position',
    'exonerates it (`verdict: drift-exonerated`) is subtracted from the',
    'Diverged table below and counted in Summary; an id that starts passing',
    'outright leaves the class silently on the next report regen.',
    '',
    ...items,
    '',
  ].join('\n');
}

/** Per-engine detail page (PARITY-<engine>.md). `pathById` resolves each id's
 * corpus-relative path (dot-track survey; this engine's roster is always a
 * subset) so per-id table rows link to their gitlab blob (AD-4). */
function engineMarkdown(
  engine: string,
  report: EngineParityReport,
  rawAcceptedMap: Record<string, EngineAcceptedRegistryEntry>,
  pathById: Map<string, string> = new Map(),
): string {
  const c = Object.assign(
    { pass: 0, diverged: 0, 'oracle-error': 0, 'port-error': 0, timeout: 0 },
    report.counts,
  );
  const { perId: acceptedMap, classes } = splitAcceptedMap(rawAcceptedMap);
  const classExonerated = new Set(classes.flatMap((cl) => [...cl.exonerated]));
  const allDiverged = report.results
    .filter((r) => r.status === 'diverged')
    .sort((a, b) => (b.nDiffs ?? 0) - (a.nDiffs ?? 0) || a.id.localeCompare(b.id));

  // Split accepted (documented, won't-fix) deltas out of the tracked backlog —
  // same join accepted.ts performs for the dot track (see accepted-divergences.json).
  // Class-exonerated ids are also excluded here (D2) but rendered separately
  // by classAcceptanceSection, not inlined into this per-id table.
  const acceptedRows: Array<{ r: EngineWalkRow; e: EngineAcceptedEntry }> = [];
  const diverged: EngineWalkRow[] = [];
  for (const r of allDiverged) {
    const e = acceptedMap[r.id];
    if (e) acceptedRows.push({ r, e });
    else if (!classExonerated.has(r.id)) diverged.push(r);
  }
  const classAcceptedCount = allDiverged.filter(
    (r) => !acceptedMap[r.id] && classExonerated.has(r.id),
  ).length;

  const faults = report.results
    .filter((r) => r.status === 'oracle-error' || r.status === 'port-error' || r.status === 'timeout')
    .sort((a, b) => a.status.localeCompare(b.status) || a.id.localeCompare(b.id));

  // T3's oracle-error classifier hook (D6, batch-1/T3-oracle-error-classifier.md
  // #Interface contracts) — reads oracle-errors-<engine>.json when present,
  // '' otherwise (tolerates T3 not having run for this engine yet).
  const oracleErrorsSidecar = renderOracleErrorsSidecar(engine);

  const divergedTable = diverged.length === 0
    ? '_(none)_\n'
    : [
        '| id | size | #diffs | firstDiff |',
        '|---|---:|---:|---|',
        ...diverged.map(
          (r: EngineWalkRow) =>
            `| ${testIdLink(r.id, pathById.get(r.id))} | ${r.size} | ${r.nDiffs ?? 0} | \`${cell(r.firstDiff)}\` |`,
        ),
        '',
      ].join('\n');

  const faultTable = faults.length === 0
    ? '_(none)_\n'
    : [
        '| id | status | message |',
        '|---|---|---|',
        ...faults.map(
          (r) => `| ${testIdLink(r.id, pathById.get(r.id))} | ${r.status} | ${escText(scrubLocalPaths(r.err ?? ''))} |`,
        ),
        '',
      ].join('\n');

  return [
    '<!-- SPDX-License-Identifier: EPL-2.0 -->',
    `<!-- GENERATED by test/corpus/parity-report.ts from parity-${engine}.json — do not edit by hand. -->`,
    '',
    `# ${engine} parity dashboard`,
    '',
    `Differential survey of @knowvah/dot-engine \`${engine}\` xdot output vs the native`,
    `\`dot -K ${engine} -Txdot\` oracle over the dot-track SVG-conformant corpus`,
    'set (semantic draw-op comparison at ±0.01 — see `test/golden/compare-xdot.ts`;',
    'per [docs/conformance.md](../../docs/conformance.md), not byte equality).',
    `Regenerate: \`npx tsx test/corpus/engine-walk.ts ${engine} && npx tsx`,
    'test/corpus/parity-report.ts`.',
    '',
    '## Summary',
    '',
    `- **Surveyed:** ${report.total} (generated ${report.generatedAt})`,
    `- **pass:** ${c.pass} (${pct(c.pass, report.total)}) · **diverged (tracked):** ${diverged.length} · ` +
      `**accepted (documented, won't-fix):** ${acceptedRows.length}` +
      (classes.length ? ` · **accepted (A1-drift class):** ${classAcceptedCount}` : ''),
    `- **oracle-error:** ${c['oracle-error']} · **port-error:** ${c['port-error']} · ` +
      `**timeout:** ${c.timeout}`,
    '',
    `## Accepted deltas (${acceptedRows.length}) — documented, not chased`,
    '',
    'Deliberate, root-caused differences we have chosen not to make conformant. Source of',
    'truth: `test/corpus/accepted-divergences-engines.json`; rationale in',
    '[Known divergences](../../docs/known-divergences.md). Excluded from the diverged',
    'table below.',
    '',
    engineAcceptedTable(acceptedRows, pathById),
    ...(classes.length ? [classAcceptanceSection(classes)] : []),
    `## Diverged (${diverged.length})`,
    '',
    divergedTable,
    `## Errors and timeouts (${faults.length})`,
    '',
    faultTable,
    ...(oracleErrorsSidecar ? [oracleErrorsSidecar] : []),
    `_Passing ids (${c.pass}) are omitted for brevity — the full roster is in`,
    `\`parity-${engine}.json\`._`,
    '',
  ].join('\n');
}

// format-parity-matrix (BEGIN): plain/plain-ext + per-engine json/imagemap
// detail pages (mission: format-parity-matrix, T9). Each of the three
// walkers already bakes 'accepted' into its own per-id verdict (unlike the
// xdot engineMarkdown above, whose accepted set is computed by a report-time
// registry join), so the detail-page adapters below only need to normalize
// each walker's own verdict enum + pick a single diff summary out of the
// dual-format (plain/plain-ext, cmapx/imap) shapes — no join required.

/** One shared per-id row shape the three new tracks' detail pages render
 * from, after each track's own result shape (dual-format for plain/map,
 * single-value for json) has been normalized to it. */
interface FormatDetailRow {
  id: string;
  path: string;
  size: number;
  status: 'pass' | 'accepted' | 'diverged' | 'error';
  nDiffs: number;
  firstDiff: string;
  errMsg: string;
}

const PLAIN_VERDICT_RANK: Record<PlainVerdict, number> = {
  pass: 0, accepted: 1, diverged: 2, timeout: 3, portError: 4, oracleError: 5,
};

/** The worse of a plain-track row's `plain` / `plain-ext` sub-results (AD-2's
 * worst-of aggregation, mirrored here for the detail-page diff summary). */
function plainWorstFormat(r: PlainWalkResult): PlainFormatResult {
  return PLAIN_VERDICT_RANK[r.formats.plain.verdict] >= PLAIN_VERDICT_RANK[r.formats['plain-ext'].verdict]
    ? r.formats.plain
    : r.formats['plain-ext'];
}

function plainDetailRow(r: PlainWalkResult): FormatDetailRow {
  const worst = plainWorstFormat(r);
  const status: FormatDetailRow['status'] =
    r.verdict === 'pass' ? 'pass' : r.verdict === 'accepted' ? 'accepted' : r.verdict === 'diverged' ? 'diverged' : 'error';
  return {
    id: r.id,
    path: r.path,
    size: r.size,
    status,
    nDiffs: worst.diffCount ?? 0,
    firstDiff: (worst.firstDiffs ?? []).join('; '),
    errMsg: worst.errMsg ?? '',
  };
}

const MAP_VERDICT_RANK: Record<MapVerdict, number> = {
  conformant: 0, accepted: 1, diverged: 2, timeout: 3, 'port-error': 4, 'oracle-error': 5,
};

/** The worse of a map-track row's `cmapx` / `imap` sub-results (map-walk.ts's
 * own worst-of aggregation, mirrored here for the diff summary). */
function mapWorstFormat(r: MapWalkResult): MapFormatResult {
  return MAP_VERDICT_RANK[r.cmapx.verdict] >= MAP_VERDICT_RANK[r.imap.verdict] ? r.cmapx : r.imap;
}

function mapDetailRow(r: MapWalkResult): FormatDetailRow {
  const worst = mapWorstFormat(r);
  const status: FormatDetailRow['status'] =
    r.verdict === 'conformant' ? 'pass' : r.verdict === 'accepted' ? 'accepted' : r.verdict === 'diverged' ? 'diverged' : 'error';
  return {
    id: r.id,
    path: r.path,
    size: r.size,
    status,
    nDiffs: worst.diffCount ?? 0,
    firstDiff: worst.firstDiff ?? '',
    errMsg: worst.errMsg ?? '',
  };
}

function jsonDetailRow(r: JsonWalkResult): FormatDetailRow {
  const status: FormatDetailRow['status'] =
    r.verdict === 'conformant' ? 'pass' : r.verdict === 'accepted' ? 'accepted' : r.verdict === 'diverged' ? 'diverged' : 'error';
  return {
    id: r.id,
    path: r.path,
    size: r.size,
    status,
    nDiffs: r.diffCount ?? 0,
    firstDiff: r.firstDiff ?? '',
    errMsg: r.errMsg ?? '',
  };
}

/** One accepted-divergence registry entry, shared shape across the
 * plain/json/map registries (field names vary slightly — `reason` for plain,
 * `rationale` for json/map — normalized by `acceptedReasonsForEngine`). An
 * entry without `engine` applies to every engine (same convention
 * json-walk.ts's own loadAccepted uses). */
interface FormatAcceptedEntry {
  id: string;
  engine?: string;
  reason?: string;
  rationale?: string;
}

/** Read `<url>`'s `{ divergences: [...] }` roster, tolerating a missing file
 * (registries may not exist for a track yet) the same way loadAttribution
 * does for the class-acceptance registry above. */
function loadFormatAccepted(url: URL): FormatAcceptedEntry[] {
  if (!existsSync(url)) return [];
  const raw = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as { divergences?: FormatAcceptedEntry[] };
  return raw.divergences ?? [];
}

/** id -> reason text, scoped to `engine` (entries without `engine` apply to
 * every engine). */
function acceptedReasonsForEngine(entries: FormatAcceptedEntry[], engine: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entries) {
    if (e.engine !== undefined && e.engine !== engine) continue;
    m.set(e.id, e.reason ?? e.rationale ?? '');
  }
  return m;
}

/** Per-track detail page (PARITY-<engine>-plain.md / -json.md / -map.md):
 * summary line, diverged table (worst-first), accepted table (with reason,
 * when the registry carries one), and an errors/timeouts table. Mirrors
 * engineMarkdown's section shape, simplified to these tracks' own
 * already-resolved verdicts (no class-acceptance section — none of these
 * three registries define a class entry). */
function formatDetailMarkdown(
  surface: 'plain' | 'json' | 'map',
  engine: string,
  sourceFile: string,
  total: number,
  row: TrackRow,
  rows: FormatDetailRow[],
  reasons: Map<string, string>,
): string {
  const surfaceLabel = surface === 'plain' ? 'plain/plain-ext' : surface === 'json' ? 'json' : 'imagemap (cmapx/imap)';
  const walker = surface === 'plain' ? 'plain-walk.ts' : surface === 'json' ? 'json-walk.ts' : 'map-walk.ts';

  const diverged = rows
    .filter((r) => r.status === 'diverged')
    .sort((a, b) => b.nDiffs - a.nDiffs || a.id.localeCompare(b.id));
  const acceptedRows = rows
    .filter((r) => r.status === 'accepted')
    .sort((a, b) => a.id.localeCompare(b.id));
  const faults = rows
    .filter((r) => r.status === 'error')
    .sort((a, b) => a.id.localeCompare(b.id));

  const divergedTable = diverged.length === 0
    ? '_(none)_\n'
    : [
        '| id | size | #diffs | firstDiff |',
        '|---|---:|---:|---|',
        ...diverged.map((r) => `| ${testIdLink(r.id, r.path)} | ${r.size} | ${r.nDiffs} | \`${cell(r.firstDiff)}\` |`),
        '',
      ].join('\n');

  const acceptedTable = acceptedRows.length === 0
    ? '_(none)_\n'
    : [
        '| id | #diffs | firstDiff | reason |',
        '|---|---:|---|---|',
        ...acceptedRows.map(
          (r) => `| ${testIdLink(r.id, r.path)} | ${r.nDiffs} | \`${cell(r.firstDiff)}\` | ${escText(reasons.get(r.id))} |`,
        ),
        '',
      ].join('\n');

  const faultTable = faults.length === 0
    ? '_(none)_\n'
    : [
        '| id | message |',
        '|---|---|',
        ...faults.map((r) => `| ${testIdLink(r.id, r.path)} | ${escText(scrubLocalPaths(r.errMsg))} |`),
        '',
      ].join('\n');

  return [
    '<!-- SPDX-License-Identifier: EPL-2.0 -->',
    `<!-- GENERATED by test/corpus/parity-report.ts from ${sourceFile} — do not edit by hand. -->`,
    '',
    `# ${engine} ${surfaceLabel} parity dashboard`,
    '',
    `Differential survey of @knowvah/dot-engine \`${engine}\` ${surfaceLabel} output vs the`,
    `native \`dot -K ${engine}\` oracle (\`test/corpus/${walker}\`), semantic`,
    'comparison per [docs/conformance.md](../../docs/conformance.md) (±0.01',
    'deterministic tolerance, ±0.5 for the iterative engines). Regenerate:',
    `\`npx tsx test/corpus/${walker} ${engine} && npx tsx test/corpus/parity-report.ts\`.`,
    '',
    '## Summary',
    '',
    `- **Surveyed:** ${total}`,
    `- **pass:** ${row.pass} (${pct(row.pass, total)}) · **diverged (tracked):** ${diverged.length} · ` +
      `**accepted (documented, won't-fix):** ${acceptedRows.length}`,
    `- **errors (oracle/port/timeout, excluded from scoring):** ${row.errors}`,
    '',
    `## Diverged (${diverged.length})`,
    '',
    divergedTable,
    `## Accepted (${acceptedRows.length}) — documented, not chased`,
    '',
    acceptedTable,
    `## Errors and timeouts (${faults.length})`,
    '',
    faultTable,
    `_Passing ids (${row.pass}) are omitted for brevity — the full roster is in`,
    `\`${sourceFile}\`._`,
    '',
  ].join('\n');
}
// format-parity-matrix (END)

/** Normalized per-id status in one output format. */
type FmtStatus = 'conformant' | 'accepted' | 'diverged' | 'error';
const FMT_RANK: Record<FmtStatus, number> = {
  conformant: 0, accepted: 1, diverged: 2, error: 3,
};

/** Map an xdot/json walk verdict to a {@link FmtStatus}. */
function normDotVerdict(v: XdotVerdict | JsonVerdict): FmtStatus {
  if (v === 'conformant') return 'conformant';
  if (v === 'accepted') return 'accepted';
  if (v === 'diverged') return 'diverged';
  return 'error';
}

/**
 * Cross-format view of the three deterministic dot outputs (SVG · xdot · json),
 * joined by id. xdot and json survey the SVG-conformant roster, so the join is
 * that intersection: it reports how many inputs the port renders faithfully in
 * EVERY format, and lists the ids that fall short in any one. SVG `accepted` is
 * resolved through the same registry join dotSvgRow uses.
 */
function dotFormatsSection(
  svg: SvgParityReport,
  xdot: XdotParityReport,
  json: JsonParityReport,
  manifest: CorpusEntry[],
): string {
  const reg = loadAccepted();
  const engineOf = new Map(manifest.map((e) => [e.id, e.engine]));
  const svgStatus = (r: SurveyResult): FmtStatus => {
    if (r.verdict === 'conformant') return 'conformant';
    if (r.verdict === 'diverged' || r.verdict === 'structural-match') {
      return matchAccepted(r.id, engineOf.get(r.id), 'parity', reg) ? 'accepted' : 'diverged';
    }
    return 'error';
  };
  const svgMap = new Map(svg.results.map((r) => [r.id, svgStatus(r)]));
  const xdotMap = new Map(xdot.results.map((r) => [r.id, normDotVerdict(r.verdict)]));
  const jsonMap = new Map(json.results.map((r) => [r.id, normDotVerdict(r.verdict)]));

  const ids = [...jsonMap.keys()].filter((id) => svgMap.has(id) && xdotMap.has(id));
  const worstOf = (id: string): number => Math.max(
    FMT_RANK[svgMap.get(id)!], FMT_RANK[xdotMap.get(id)!], FMT_RANK[jsonMap.get(id)!],
  );
  let allClean = 0, acceptedOnly = 0, notClean = 0;
  for (const id of ids) {
    const w = worstOf(id);
    if (w === 0) allClean++;
    else if (w === 1) acceptedOnly++;
    else notClean++;
  }
  const n = ids.length;
  const detailRows = ids
    .filter((id) => worstOf(id) > 0)
    .sort((a, b) => worstOf(b) - worstOf(a) || a.localeCompare(b))
    .map((id) => `| \`${id}\` | ${svgMap.get(id)} | ${xdotMap.get(id)} | ${jsonMap.get(id)} |`);
  const detail = detailRows.length === 0
    ? ['_Every surveyed input is conformant in all three outputs._', '']
    : [
        'Per-format status of the ids not conformant in all three:',
        '',
        '| id | SVG | xdot | json |',
        '|---|---|---|---|',
        ...detailRows,
        '',
      ];
  return [
    '## Dot output formats (SVG · xdot · json)',
    '',
    'How faithfully the port renders each input across all three deterministic',
    'dot outputs, joined by id. xdot and json survey the SVG-conformant roster,',
    `so this is the intersection (${n} inputs); an input is *conformant in all`,
    'three* only when every format agrees with the oracle within tolerance.',
    '',
    '| status across SVG · xdot · json | count | % |',
    '|---|---:|---:|',
    `| conformant in all three | ${allClean} | ${pct(allClean, n)} |`,
    `| accepted (won't-fix) in ≥1, diverged in none | ${acceptedOnly} | ${pct(acceptedOnly, n)} |`,
    `| diverged / errored in ≥1 | ${notClean} | ${pct(notClean, n)} |`,
    '',
    ...detail,
  ].join('\n');
}

/** One "not yet surveyed" note line for a track group, matching the wording
 * convention of the xdot-track missingNote below — `''` (rendered as
 * nothing) when every engine in the group has a summary file. */
function missingTrackNote(label: string, missing: string[], cmd: string): string {
  return missing.length
    ? `_${label} not yet surveyed: ${missing.map((e) => `\`${e}\``).join(', ')} ` +
      `(run \`${cmd}\` to add a track)._`
    : '';
}

/** Build the cross-engine PARITY.md summary page. */
function buildSummary(
  rows: TrackRow[],
  missingEngines: string[],
  presentEngines: string[],
  iterativeRows: TrackRow[] = [],
  // map-conformance (BEGIN): dot (imagemap) link, gated on artifact presence
  // the same way engine links are — see MAP block in the main body below.
  mapPresent = false,
  // map-conformance (END)
  // Pre-rendered "Dot output formats (SVG · xdot · json)" cross-format section
  // (dotFormatsSection); '' when the json survey artifact is absent.
  dotFormats = '',
  // format-parity-matrix (BEGIN): additional per-track dashboard links +
  // "not yet surveyed" notes for the plain/json/imagemap tracks (T9) — kept
  // as pre-rendered strings (rather than more positional params per track)
  // so this signature doesn't keep growing per new track added later.
  extraLinks: string[] = [],
  extraMissingNotes: string[] = [],
  // format-parity-matrix (END)
): string {
  const links = [
    '- [PARITY-dot.md](./PARITY-dot.md) — dot (SVG) dashboard (`dashboard.ts`)',
    '- [PARITY-XDOT.md](./PARITY-XDOT.md) — dot (xdot) dashboard (`xdot-dashboard.ts`)',
    '- [PARITY-JSON.md](./PARITY-JSON.md) — dot (json) dashboard (`json-dashboard.ts`)',
    // map-conformance (BEGIN)
    ...(mapPresent ? ['- [PARITY-MAP.md](./PARITY-MAP.md) — dot (imagemap) dashboard (`map-dashboard.ts`)'] : []),
    // map-conformance (END)
    ...presentEngines.map(
      (e) => `- [PARITY-${e}.md](./PARITY-${e}.md) — ${e} (xdot) dashboard (\`parity-report.ts\`)`,
    ),
    ...extraLinks,
  ];
  const missingNote = missingEngines.length
    ? `_Not yet surveyed: ${missingEngines.map((e) => `\`${e}\``).join(', ')} ` +
      '(run `npx tsx test/corpus/engine-walk.ts <engine>` to add a track)._'
    : '';
  return [
    '<!-- SPDX-License-Identifier: EPL-2.0 -->',
    '<!-- GENERATED by test/corpus/parity-report.ts — do not edit by hand. -->',
    '',
    '# Parity overview',
    '',
    'Cross-engine conformance summary of @knowvah/dot-engine vs the native Graphviz',
    'oracle, one row per track (engine × comparison surface). A report, not a',
    'gate. Regenerate: `npx tsx test/corpus/parity-report.ts` (after refreshing',
    'the per-track surveys it reads).',
    '',
    '**conformant / pass** is the ±0.01 deterministic-tolerance verdict per',
    '[docs/conformance.md](../../docs/conformance.md) — numeric payloads agree',
    'within tolerance and non-numeric content is exactly equal — not byte',
    'equality. **errors** = oracle-error + port-error/errored + timeout',
    '(excluded from scoring). **accepted** = documented won\'t-fix deltas',
    '(0 for engines without an acceptance list).',
    '',
    '## Tracks',
    '',
    trackTable(rows),
    '',
    ...(iterativeRows.length
      ? [
          '### Iterative engines (±0.5 characterization)',
          '',
          'neato/fdp/sfdp are iterative force-directed solvers whose results',
          'depend on floating-point accumulation (FMA, `Math.pow`, libm) that',
          'JavaScript cannot reproduce bit-for-bit — accepted class',
          '[A1](../../docs/known-divergences.md). These rows are compared at a',
          '**±0.5pt** tolerance to *characterize* behavior, not to gate',
          'byte-fidelity; do not read their pass % against the deterministic',
          'bar above.',
          '',
          trackTable(iterativeRows),
          '',
        ]
      : []),
    missingNote,
    ...extraMissingNotes,
    '',
    ...(dotFormats ? [dotFormats, ''] : []),
    goldensSection(),
    '## Per-track dashboards',
    '',
    ...links,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------

// Guarded so importing this module for its pure/rendering functions (unit
// tests, T3's report-hook coordination) never triggers the report's file
// I/O side effects — mirrors the isMain pattern used by engine-walk.ts,
// survey.ts, xdot-walk.ts, json-walk.ts, and map-walk.ts.
function main(): void {
  const svgReport = JSON.parse(readFileSync(PARITY, 'utf8')) as SvgParityReport;
  const xdotReport = JSON.parse(readFileSync(XDOT_PARITY, 'utf8')) as XdotParityReport;
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as CorpusEntry[];
  // Every engine-walk roster is a subset of the dot-track (SVG) survey, so its
  // corpus-relative paths resolve every per-engine id (AD-4 gitlab links).
  const pathById = new Map(svgReport.results.map((r) => [r.id, r.path]));

  const acceptedEngines = loadAcceptedEngines();
  const rows: TrackRow[] = [dotSvgRow(svgReport, manifest), dotXdotRow(xdotReport)];
  let dotFormats = '';
  if (existsSync(JSON_PARITY)) {
    const jsonReport = JSON.parse(readFileSync(JSON_PARITY, 'utf8')) as JsonParityReport;
    rows.push(dotJsonRow(jsonReport));
    dotFormats = dotFormatsSection(svgReport, xdotReport, jsonReport, manifest);
  }
  const iterativeRows: TrackRow[] = [];
  const presentEngines: string[] = [];
  const missingEngines: string[] = [];
  for (const engine of [...ENGINES, ...ITERATIVE_ENGINES]) {
    const url = new URL(`./parity-${engine}.json`, import.meta.url);
    if (!existsSync(url)) {
      missingEngines.push(engine);
      continue;
    }
    const report = JSON.parse(readFileSync(url, 'utf8')) as EngineParityReport;
    const acceptedMap = acceptedEngines[engine] ?? {};
    const isIterative = (ITERATIVE_ENGINES as readonly string[]).includes(engine);
    (isIterative ? iterativeRows : rows).push(engineRow(engine, report, acceptedMap));
    presentEngines.push(engine);
    const out = fileURLToPath(new URL(`./PARITY-${engine}.md`, import.meta.url));
    writeFileSync(out, engineMarkdown(engine, report, acceptedMap, pathById));
    process.stderr.write(`wrote PARITY-${engine}.md (${report.total} surveyed)\n`);
  }

  // map-conformance (BEGIN): dot (imagemap) track row — reads map-parity.json
  // (written by map-walk.ts --survey). map-dashboard.ts owns PARITY-MAP.md
  // itself; this block only folds its summary row into PARITY.md.
  const mapPresent = existsSync(MAP_PARITY);
  if (mapPresent) {
    const mapReport = JSON.parse(readFileSync(MAP_PARITY, 'utf8')) as MapParityReport;
    rows.push(dotMapRow(mapReport));
  }
  // map-conformance (END)

  // format-parity-matrix (BEGIN): plain/plain-ext (8 engines, dot included,
  // AD-2) + per-engine json/imagemap (7 non-dot engines, AD-3) tracks
  // (mission: format-parity-matrix, T9). Same deterministic/iterative split
  // and "not yet surveyed" tolerance as the xdot per-engine loop above; each
  // present track also gets its own PARITY-<engine>-<surface>.md detail page.
  const acceptedPlain = loadFormatAccepted(ACCEPTED_PLAIN);
  const acceptedJsonEngines = loadFormatAccepted(ACCEPTED_JSON_ENGINES);
  const acceptedMapEngines = loadFormatAccepted(ACCEPTED_MAP_ENGINES);

  const missingPlain: string[] = [];
  const presentPlain: string[] = [];
  for (const engine of PLAIN_ENGINES) {
    const url = new URL(`./plain-parity-${engine}.json`, import.meta.url);
    if (!existsSync(url)) {
      missingPlain.push(engine);
      continue;
    }
    const report = JSON.parse(readFileSync(url, 'utf8')) as PlainParityReport;
    const row = plainRow(engine, report);
    const isIterative = (ITERATIVE_ENGINES as readonly string[]).includes(engine);
    (isIterative ? iterativeRows : rows).push(row);
    presentPlain.push(engine);
    const reasons = acceptedReasonsForEngine(acceptedPlain, engine);
    const sourceFile = `plain-parity-${engine}.json`;
    const out = fileURLToPath(new URL(`./PARITY-${engine}-plain.md`, import.meta.url));
    writeFileSync(
      out,
      formatDetailMarkdown('plain', engine, sourceFile, report.total, row, report.results.map(plainDetailRow), reasons),
    );
    process.stderr.write(`wrote PARITY-${engine}-plain.md (${report.total} surveyed)\n`);
  }

  const missingJsonEngines: string[] = [];
  const presentJsonEngines: string[] = [];
  for (const engine of NON_DOT_ENGINES) {
    const url = new URL(`./json-parity-${engine}.json`, import.meta.url);
    if (!existsSync(url)) {
      missingJsonEngines.push(engine);
      continue;
    }
    const report = JSON.parse(readFileSync(url, 'utf8')) as JsonParityReport;
    const row = jsonEngineRow(engine, report);
    const isIterative = (ITERATIVE_ENGINES as readonly string[]).includes(engine);
    (isIterative ? iterativeRows : rows).push(row);
    presentJsonEngines.push(engine);
    const reasons = acceptedReasonsForEngine(acceptedJsonEngines, engine);
    const sourceFile = `json-parity-${engine}.json`;
    const out = fileURLToPath(new URL(`./PARITY-${engine}-json.md`, import.meta.url));
    writeFileSync(
      out,
      formatDetailMarkdown('json', engine, sourceFile, report.total, row, report.results.map(jsonDetailRow), reasons),
    );
    process.stderr.write(`wrote PARITY-${engine}-json.md (${report.total} surveyed)\n`);
  }

  const missingMapEngines: string[] = [];
  const presentMapEngines: string[] = [];
  for (const engine of NON_DOT_ENGINES) {
    const url = new URL(`./map-parity-${engine}.json`, import.meta.url);
    if (!existsSync(url)) {
      missingMapEngines.push(engine);
      continue;
    }
    const report = JSON.parse(readFileSync(url, 'utf8')) as MapParityReport;
    const row = mapEngineRow(engine, report);
    const isIterative = (ITERATIVE_ENGINES as readonly string[]).includes(engine);
    (isIterative ? iterativeRows : rows).push(row);
    presentMapEngines.push(engine);
    const reasons = acceptedReasonsForEngine(acceptedMapEngines, engine);
    const sourceFile = `map-parity-${engine}.json`;
    const out = fileURLToPath(new URL(`./PARITY-${engine}-map.md`, import.meta.url));
    writeFileSync(
      out,
      formatDetailMarkdown('map', engine, sourceFile, report.total, row, report.results.map(mapDetailRow), reasons),
    );
    process.stderr.write(`wrote PARITY-${engine}-map.md (${report.total} surveyed)\n`);
  }

  const extraLinks = [
    ...presentPlain.map(
      (e) => `- [PARITY-${e}-plain.md](./PARITY-${e}-plain.md) — ${e} (plain) dashboard (\`parity-report.ts\`)`,
    ),
    ...presentJsonEngines.map(
      (e) => `- [PARITY-${e}-json.md](./PARITY-${e}-json.md) — ${e} (json) dashboard (\`parity-report.ts\`)`,
    ),
    ...presentMapEngines.map(
      (e) => `- [PARITY-${e}-map.md](./PARITY-${e}-map.md) — ${e} (imagemap) dashboard (\`parity-report.ts\`)`,
    ),
  ];
  const extraMissingNotes = [
    missingTrackNote('plain', missingPlain, 'test/corpus/plain-walk.ts <engine>'),
    missingTrackNote('json', missingJsonEngines, 'test/corpus/json-walk.ts <engine>'),
    missingTrackNote('imagemap', missingMapEngines, 'test/corpus/map-walk.ts <engine>'),
  ].filter((n) => n.length > 0);
  // format-parity-matrix (END)

  writeFileSync(
    OUT,
    buildSummary(
      rows,
      missingEngines,
      presentEngines,
      iterativeRows,
      mapPresent,
      dotFormats,
      extraLinks,
      extraMissingNotes,
    ),
  );
  process.stderr.write(
    `wrote PARITY.md (${rows.length} tracks; not yet surveyed: ${missingEngines.join(', ') || 'none'})\n`,
  );
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) main();

// Exported for test/corpus/parity-report.test.ts and any future report-hook
// coordination (e.g. T3) — pure functions/types only, no file I/O at import
// time (see the isMain guard above).
export {
  isClassEntry,
  exoneratedIds,
  resolveClassAcceptance,
  splitAcceptedMap,
  computeAcceptedIds,
  classAcceptanceSection,
  engineRow,
  engineMarkdown,
};
export type {
  EngineAcceptedEntry,
  EngineAcceptedClassEntry,
  EngineAcceptedRegistryEntry,
  AttributionReport,
  AttributionResultRow,
  ClassAcceptance,
};
