// SPDX-License-Identifier: EPL-2.0
// Fitness test for the failure-site registry (graceful-failure D5): every
// `throw new (Internal|Render)?Error` in src/ must be covered by a row of
// test/corpus/failure-sites.json, keyed by port file + symbol (never by line).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ORACLE_VERSION } from './oracle-paths.mjs';
import {
  parseRegistry,
  scanPort,
  type FailureSiteRow,
  type PortSite,
} from '../tools/failure-sites/scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const REGISTRY_PATH = path.join(HERE, 'failure-sites.json');
const SRC_DIR = path.join(REPO, 'src');
const THROW_KINDS: ReadonlySet<string> = new Set(['throws-internal', 'throws-render', 'throws-error']);
const MAX_ORDINAL = 99;
const NOTE_REQUIRED: ReadonlySet<string> = new Set(['graceful', 'upstream-fix']);
const DIVERGENCES_DOC = 'docs/known-divergences.md';
const PART10 = `${DIVERGENCES_DOC}#native-crashes-and-heap-address-variation-part-10`;

/** Seeded native-crash rows (A13, the five part-10 items, #266) and their divergence links. */
const SEEDED: readonly (readonly [id: string, divergence: string])[] = [
  ['lib/common/emit.c#emit_background#native-crash#1', `${DIVERGENCES_DOC}#a13-freed-fill-in-the-background-replay`],
  ['lib/neatogen/stress.c#sparse_stress_subspace_majorization_kD#native-crash#1', PART10],
  ['lib/neatogen/stress.c#stress_majorization_kD_mkernel#native-crash#1', PART10],
  ['lib/fdpgen/layout.c#deriveGraph#native-crash#1', PART10],
  ['lib/common/emit.c#emit_xdot#native-crash#1', PART10],
  ['lib/neatogen/neatoinit.c#neato_layout#native-crash#1', PART10],
  ['lib/common/output.c#canon#native-crash#1', 'https://github.com/knowvah/dot-engine/issues/266'],
];

/** Throw sites whose port file + symbol no row names. Pure: no IO. */
export function unregisteredThrows(portSites: readonly PortSite[], rows: readonly FailureSiteRow[]): PortSite[] {
  const covered = new Set(rows.flatMap((r) => (r.port ? [`${r.port.file}#${r.port.symbol}`] : [])));
  return portSites.filter((s) => THROW_KINDS.has(s.kind) && !covered.has(`${s.file}#${s.symbol}`));
}

function walkSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__fixtures__' ? [] : walkSrc(p);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

function scanSrcThrows(): PortSite[] {
  return walkSrc(SRC_DIR)
    .sort()
    .flatMap((f) => scanPort(path.relative(REPO, f).split(path.sep).join('/'), readFileSync(f, 'utf8')));
}

const registry = parseRegistry(JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as unknown);
const rows = registry.rows;
const ordinalOf = (id: string): number => Number(id.slice(id.lastIndexOf('#') + 1));

describe('unregisteredThrows', () => {
  it('reports file and symbol of a throw with no row', () => {
    const text = 'export function boom(): never {\n  throw new InternalError("x");\n}\n';
    const sites = scanPort('src/fixture/boom.ts', text);
    expect(unregisteredThrows(sites, rows).map((s) => `${s.file}#${s.symbol}`)).toEqual([
      'src/fixture/boom.ts#boom',
    ]);
  });

  it('accepts a throw once a row names its file and symbol', () => {
    const sites = scanPort('src/fixture/boom.ts', 'export function boom(): never {\n  throw new Error("x");\n}\n');
    const row: FailureSiteRow = {
      id: 'port#src/fixture/boom.ts#boom#1',
      c: null,
      port: { file: 'src/fixture/boom.ts', symbol: 'boom', behaviour: 'throws-error' },
      class: 'port-only',
      status: 'none',
      links: {},
      note: '',
    };
    expect(unregisteredThrows(sites, [row])).toEqual([]);
  });
});

describe('failure-sites.json', () => {
  it('is accepted by parseRegistry', () => {
    expect(registry.generatedFrom.oracle).toBe(ORACLE_VERSION);
    expect(rows.length).toBeGreaterThan(SEEDED.length);
  });

  it('has a row for every throw in src/', () => {
    const missing = unregisteredThrows(scanSrcThrows(), rows).map((s) => `${s.file}#${s.symbol}`);
    expect(missing).toEqual([]);
  });

  it('has unique ids', () => {
    const ids = rows.map((r) => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('has line-free ids that end in a small ordinal', () => {
    const bad = rows.filter((r) => {
      const n = ordinalOf(r.id);
      const lineSeg = r.c !== null && r.c.line > MAX_ORDINAL && r.id.split('#').includes(String(r.c.line));
      return !Number.isInteger(n) || n < 1 || n > MAX_ORDINAL || lineSeg;
    });
    expect(bad.map((r) => r.id)).toEqual([]);
  });

  it('gives every graceful or upstream-fix row a non-empty note', () => {
    const bare = rows.filter((r) => NOTE_REQUIRED.has(r.class) && r.note.trim() === '');
    expect(bare.map((r) => r.id)).toEqual([]);
  });

  it.each(SEEDED)('seeds native-crash row %s', (id, divergence) => {
    const row = rows.find((r) => r.id === id);
    expect(row?.c?.kind).toBe('native-crash');
    expect(row?.links.divergence).toBe(divergence);
    expect(row?.class).toBe('graceful');
    expect(row?.status).toBe('none');
    expect(row?.port?.behaviour).toBe('renders');
    expect(row?.note.trim()).not.toBe('');
  });
});
