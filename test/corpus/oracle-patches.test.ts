// SPDX-License-Identifier: EPL-2.0
//
// Validates test/corpus/oracle-patches/manifest.json against the *.patch files
// beside it (ADR-0003, docs/adr/0003-upstream-fix-forward.md): the carried
// oracle is graphviz 16.1.1 plus these patches, and a patch is carried only
// once its upstream MR is filed.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface CarriedPatch {
  patch: string;
  slug: string;
  forkBranch: string;
  upstreamMr: number | null;
  upstreamIssue: number | null;
  status: 'filed' | 'merged';
  dotEngineIssue: number | null;
}
interface CarriedManifest {
  patches: CarriedPatch[];
}

const PATCH_DIR = fileURLToPath(new URL('./oracle-patches/', import.meta.url));
const MANIFEST_FILE = 'manifest.json';
const PATCH_EXT = '.patch';
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FORK_BRANCH_PREFIX = 'carried/';
const STATUSES: ReadonlySet<string> = new Set(['filed', 'merged']);

/** Every problem found, each naming the offending file; empty when valid. */
function validateManifest(manifest: CarriedManifest, fileNames: string[]): string[] {
  const problems: string[] = [];
  const patchFiles = fileNames.filter((f) => f.endsWith(PATCH_EXT));
  const listed = new Set<string>();
  for (const p of manifest.patches) {
    if (listed.has(p.patch)) problems.push(`${p.patch}: duplicate manifest entry`);
    listed.add(p.patch);
    if (!patchFiles.includes(p.patch)) problems.push(`${p.patch}: manifest entry has no patch file`);
    if (!KEBAB_RE.test(p.slug)) problems.push(`${p.patch}: slug "${p.slug}" is not kebab-case`);
    if (p.forkBranch !== `${FORK_BRANCH_PREFIX}${p.slug}`) {
      problems.push(`${p.patch}: forkBranch must be "${FORK_BRANCH_PREFIX}${p.slug}"`);
    }
    if (!STATUSES.has(p.status)) problems.push(`${p.patch}: status "${p.status}" is not filed|merged`);
    if (p.status === 'filed' && p.upstreamMr === null) {
      problems.push(`${p.patch}: status filed requires upstreamMr (carried only once filed)`);
    }
  }
  for (const f of patchFiles) {
    if (!listed.has(f)) problems.push(`${f}: patch file has no manifest entry`);
  }
  const order = manifest.patches.map((p) => p.patch);
  if (order.join('\n') !== [...order].sort().join('\n')) {
    problems.push('manifest.json: entries are not in lexical (application) order');
  }
  return problems;
}

const entry = (over: Partial<CarriedPatch> = {}): CarriedPatch => ({
  patch: '0001-fix-x.patch',
  slug: 'fix-x',
  forkBranch: 'carried/fix-x',
  upstreamMr: 5152,
  upstreamIssue: null,
  status: 'filed',
  dotEngineIssue: null,
  ...over,
});

describe('validateManifest', () => {
  it('accepts the empty series', () => {
    expect(validateManifest({ patches: [] }, [MANIFEST_FILE])).toEqual([]);
  });

  it('accepts a matching entry and file', () => {
    expect(validateManifest({ patches: [entry()] }, [MANIFEST_FILE, '0001-fix-x.patch'])).toEqual([]);
  });

  it('names a patch file with no manifest entry', () => {
    expect(validateManifest({ patches: [] }, ['0002-orphan.patch'])).toEqual([
      '0002-orphan.patch: patch file has no manifest entry',
    ]);
  });

  it('names a manifest entry with no patch file', () => {
    expect(validateManifest({ patches: [entry()] }, [])).toEqual([
      '0001-fix-x.patch: manifest entry has no patch file',
    ]);
  });

  it('rejects status filed with a null upstreamMr', () => {
    expect(validateManifest({ patches: [entry({ upstreamMr: null })] }, ['0001-fix-x.patch'])).toEqual([
      '0001-fix-x.patch: status filed requires upstreamMr (carried only once filed)',
    ]);
  });

  it('rejects a non-kebab slug and a mismatched fork branch', () => {
    const bad = entry({ slug: 'Fix_X', forkBranch: 'carried/fix-x' });
    expect(validateManifest({ patches: [bad] }, ['0001-fix-x.patch'])).toEqual([
      '0001-fix-x.patch: slug "Fix_X" is not kebab-case',
      '0001-fix-x.patch: forkBranch must be "carried/Fix_X"',
    ]);
  });

  it('rejects a duplicate entry and out-of-order entries', () => {
    const a = entry();
    const b = entry({ patch: '0002-fix-y.patch', slug: 'fix-y', forkBranch: 'carried/fix-y' });
    const files = ['0001-fix-x.patch', '0002-fix-y.patch'];
    expect(validateManifest({ patches: [a, a] }, files)).toContain('0001-fix-x.patch: duplicate manifest entry');
    expect(validateManifest({ patches: [b, a] }, files)).toEqual([
      'manifest.json: entries are not in lexical (application) order',
    ]);
  });
});

describe('oracle-patches directory', () => {
  it('manifest.json matches the patch files on disk', () => {
    const manifest = JSON.parse(readFileSync(join(PATCH_DIR, MANIFEST_FILE), 'utf8')) as CarriedManifest;
    expect(validateManifest(manifest, readdirSync(PATCH_DIR))).toEqual([]);
  });
});
