// SPDX-License-Identifier: EPL-2.0
// Unit tests for gen-svg-refs.ts. The oracle is a fake shell script, so no real
// graphviz is needed. Node-only dev/test infra.

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL } from '../corpus/oracle-paths.mjs';
import { generateRefs, gvbindirFor, planJobs, type ManifestEntry } from './gen-svg-refs.js';

const scratch = mkdtempSync(join(tmpdir(), 'gen-svg-refs-test-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const entry = (id: string, engine: string, extra: Partial<ManifestEntry> = {}): ManifestEntry => ({
  id,
  engine,
  input: `test/golden/inputs/${id}.dot`,
  reference: `test/golden/refs/${id}.svg`,
  ...extra,
});

describe('gvbindirFor', () => {
  it('uses the dot-only dir for dot and the all-engines dir otherwise', () => {
    expect(gvbindirFor('dot', {})).toBe(ORACLE_GVBINDIR);
    expect(gvbindirFor('neato', {})).toBe(ORACLE_GVBINDIR_ALL);
  });

  it('lets GVBINDIR override both', () => {
    expect(gvbindirFor('dot', { GVBINDIR: '/x' })).toBe('/x');
    expect(gvbindirFor('fdp', { GVBINDIR: '/x' })).toBe('/x');
  });
});

describe('planJobs', () => {
  it('plans one svg job per manifest entry with the entry engine', () => {
    const jobs = planJobs([entry('a', 'dot'), entry('b', 'neato')], [], []);
    expect(jobs).toEqual([
      { id: 'a', engine: 'dot', format: 'svg', input: 'test/golden/inputs/a.dot', output: 'test/golden/refs/a.svg' },
      { id: 'b', engine: 'neato', format: 'svg', input: 'test/golden/inputs/b.dot', output: 'test/golden/refs/b.svg' },
    ]);
  });

  it('skips entries whose reference lives under refs-port/', () => {
    const port = entry('p', 'dot', { reference: 'test/golden/refs-port/p.svg' });
    expect(planJobs([port, entry('a', 'dot')], [], []).map((j) => j.id)).toEqual(['a']);
  });

  it('plans dot-engine svg jobs for non-manifest refs and xdot jobs for non-manifest xdot refs', () => {
    const jobs = planJobs([entry('a', 'dot')], ['a.svg', 'pt-issue-1.svg', 'notes.stderr'], ['a.xdot', 'draw-replay-x.xdot']);
    expect(jobs.slice(1)).toEqual([
      {
        id: 'pt-issue-1',
        engine: 'dot',
        format: 'svg',
        input: 'test/golden/inputs/pt-issue-1.dot',
        output: 'test/golden/refs/pt-issue-1.svg',
      },
      {
        id: 'draw-replay-x',
        engine: 'dot',
        format: 'xdot',
        input: 'test/golden/inputs/draw-replay-x.dot',
        output: 'test/golden/refs-xdot/draw-replay-x.xdot',
      },
    ]);
  });
});

describe('generateRefs', () => {
  const root = join(scratch, 'root');
  mkdirSync(join(root, 'test/golden/refs'), { recursive: true });
  mkdirSync(join(root, 'test/golden/refs-xdot'), { recursive: true });
  mkdirSync(join(root, 'test/golden/inputs'), { recursive: true });
  writeFileSync(join(root, 'test/golden/inputs/a.dot'), 'digraph{a}');

  /** Fake dot: prints the argv and GVBINDIR in a complete svg, with `tail` appended. */
  function fakeDot(name: string, body: string): string {
    const p = join(scratch, name);
    writeFileSync(p, `#!/bin/sh\n${body}\n`);
    chmodSync(p, 0o755);
    return p;
  }
  const echoDot = fakeDot('echo.sh', `echo "<svg>$1 $2 $3 $GVBINDIR</svg>"`);
  const job = planJobs([entry('a', 'dot')], [], [])[0]!;

  it('invokes the oracle with -K<engine> -T<format> <input> and writes the ref', () => {
    const r = generateRefs([job], { rootDir: root, dotBin: echoDot, env: {} });
    expect(r).toEqual({ written: 1, skipped: [] });
    expect(readFileSync(join(root, 'test/golden/refs/a.svg'), 'utf8')).toBe(
      `<svg>-Kdot -Tsvg ${join(root, 'test/golden/inputs/a.dot')} ${ORACLE_GVBINDIR}</svg>\n`,
    );
  });

  it('refuses incomplete oracle output and leaves the ref untouched', () => {
    const out = join(root, 'test/golden/refs/a.svg');
    const before = readFileSync(out, 'utf8');
    const bad = fakeDot('bad.sh', 'echo "<svg>trunc"');
    const r = generateRefs([job], { rootDir: root, dotBin: bad, env: {} });
    expect(r.written).toBe(0);
    expect(r.skipped).toEqual(['a: incomplete oracle output']);
    expect(readFileSync(out, 'utf8')).toBe(before);
  });

  it('accepts complete output from an oracle that exits non-zero (native exits 1 on routing warnings)', () => {
    const warn = fakeDot('warn.sh', 'echo "<svg>ok</svg>"; echo "Error: routing" >&2; exit 1');
    expect(generateRefs([job], { rootDir: root, dotBin: warn, env: {} }).written).toBe(1);
    expect(readFileSync(join(root, 'test/golden/refs/a.svg'), 'utf8')).toBe('<svg>ok</svg>\n');
  });

  it('skips when the oracle prints nothing, writing no file', () => {
    const none = { ...job, id: 'z', output: 'test/golden/refs/z.svg' };
    const r = generateRefs([none], { rootDir: root, dotBin: fakeDot('none.sh', 'exit 2'), env: {} });
    expect(r.skipped).toEqual(['z: incomplete oracle output']);
    expect(existsSync(join(root, 'test/golden/refs/z.svg'))).toBe(false);
  });

  it('accepts xdot output that ends with a closing brace', () => {
    const xjob = { ...job, id: 'x', format: 'xdot' as const, output: 'test/golden/refs-xdot/x.xdot' };
    const dot = fakeDot('xdot.sh', 'echo "digraph { }"');
    expect(generateRefs([xjob], { rootDir: root, dotBin: dot, env: {} }).written).toBe(1);
    expect(readFileSync(join(root, 'test/golden/refs-xdot/x.xdot'), 'utf8')).toBe('digraph { }\n');
  });

  it('honours the GVBINDIR override from env', () => {
    generateRefs([job], { rootDir: root, dotBin: echoDot, env: { GVBINDIR: '/over' } });
    expect(readFileSync(join(root, 'test/golden/refs/a.svg'), 'utf8')).toContain(' /over</svg>');
  });
});
