// SPDX-License-Identifier: EPL-2.0
//
// Fitness test for docs/process-statics.md (issue #138): every non-test module
// under src/ that registers a per-render reset has at least one row in the
// audit table, no row names a module that registers none, and every row carries
// a verdict. Adding or removing a registerRenderState call without touching the
// doc fails here.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = 'docs/process-statics.md';
/** The module that defines registerRenderState; it registers nothing. */
const REGISTRY = 'src/common/render-state.ts';
const REGISTER_CALL = 'registerRenderState(';
const VERDICTS = ['M', 'N', 'S'];
/** A table row whose first cell is a backticked src path. */
const ROW = /^\|\s*`(src\/[^`]+\.ts)`\s*\|/;

/** Non-test modules under src/ that call registerRenderState. */
function registeringFiles(): string[] {
  const names = readdirSync(`${ROOT}src`, { recursive: true, encoding: 'utf8' });
  return names
    .map((name) => `src/${name.replaceAll('\\', '/')}`)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== REGISTRY)
    .filter((file) => readFileSync(ROOT + file, 'utf8').includes(REGISTER_CALL))
    .sort();
}

interface Row { file: string; cells: string[] }

/** The audit table's rows: file (first cell) and every cell, trimmed. */
function docRows(): Row[] {
  const rows: Row[] = [];
  for (const line of readFileSync(ROOT + DOC, 'utf8').split('\n')) {
    const m = ROW.exec(line);
    if (m === null) continue;
    rows.push({ file: m[1]!, cells: line.split('|').slice(1, -1).map((c) => c.trim()) });
  }
  return rows;
}

describe('docs/process-statics.md', () => {
  const rows = docRows();

  it('has a row for every module that registers a per-render reset, and no other', () => {
    const documented = [...new Set(rows.map((r) => r.file))].sort();
    expect(documented).toEqual(registeringFiles());
  });

  it('gives every row a C static with a file:line and a verdict of M, N or S', () => {
    const bad = rows.filter((r) => !VERDICTS.includes(r.cells[4] ?? '')
      || !/\.(c|h):\d+/.test(r.cells[2] ?? ''));
    expect(bad.map((r) => `${r.file}: ${r.cells[1]}`)).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(registeringFiles().length);
  });
});
