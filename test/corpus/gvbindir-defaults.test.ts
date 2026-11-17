// SPDX-License-Identifier: EPL-2.0
//
// Fitness test (issue #147, docs/adr/0002-graphviz-16.1.1-oracle.md): the
// oracle location lives in ONE module, test/corpus/oracle-paths.mjs. No other
// file under test/ may hardcode the oracle binary or a plugin dir as a code
// default, and the one shell script that cannot import the module must carry
// the same two literals. Retired pango plugin dir check: it added ~55 ms per
// native render and inflated PERF.md.
//
// The corpus root moved with the oracle (issue #148): it is the oracle
// checkout's tests/ directory, ORACLE_CORPUS_ROOT, and no file under test/ may
// default to the 16.1.0 checkout's tests/ again.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  defaultGvbindir,
  ORACLE_CORPUS_ROOT,
  ORACLE_DOT_BIN,
  ORACLE_GRAPHVIZ_BUILD,
  ORACLE_GVBINDIR,
  ORACLE_GVBINDIR_ALL,
} from './oracle-paths.mjs';
import { corpusRoot } from './enumerate.js';

const TEST_DIR = fileURLToPath(new URL('../', import.meta.url));
const GENERATOR = 'test/corpus/gen-headless-gvbindir.sh';
const EXEMPT = new Set([
  'test/corpus/oracle-paths.mjs',
  'test/corpus/oracle-paths.d.mts',
  'test/corpus/gvbindir-defaults.test.ts',
  GENERATOR,
]);
const SOURCE_RE = /\.(ts|mts|mjs|js|sh)$/;
const RETIRED_GVBINDIR = ['/tmp', 'gvplugins'].join('/');
/** A quoted literal (', ", or `) that contains an oracle path: a code default. */
const HARDCODED_RE = /['"`][^'"`\n]*(git\/graphviz\/build|git\/graphviz-16|\/tmp\/ghl)/;
/** A script command line is shell, not a quoted literal: any oracle path is a default. */
const SCRIPT_RE = /git\/graphviz\/build|git\/graphviz-16|\/tmp\/ghl/;
/** The 16.1.0 checkout's corpus root, relative to the home dir (retired by #148). */
const RETIRED_CORPUS_ROOT = ['git', 'graphviz', 'tests'].join('/');
/** A home-dir join of the retired corpus root: a code default, not message data. */
const ROOT_DEFAULT_RE = new RegExp(`homedir\\(\\).*${RETIRED_CORPUS_ROOT}|${RETIRED_CORPUS_ROOT}.*homedir\\(\\)`);
/** Comment-only lines are prose, not defaults. */
const COMMENT_RE = /^\s*(\/\/|\/\*|\*|#)/;
const SH_BUILD_RE = /GRAPHVIZ_BUILD:-\$HOME\/([^}]*)\}/;
const SH_OUT_RE = /OUT="\$\{1:-([^}]*)\}"/;
const SH_ALL_RE = /ALL_OUT="\$\{2:-([^}]*)\}"/;
const PACKAGE_JSON = 'package.json';

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__fixtures__' ? [] : sourcesUnder(full);
    return SOURCE_RE.test(e.name) ? [full] : [];
  });
}

function relPath(full: string): string {
  return `test/${full.slice(TEST_DIR.length)}`;
}

/** Line numbers that hardcode an oracle path inside a string literal. */
function hardcodedLines(src: string): number[] {
  return src.split('\n').flatMap((line, i) => (!COMMENT_RE.test(line) && HARDCODED_RE.test(line) ? [i + 1] : []));
}

/** Line numbers that default the corpus root to the retired 16.1.0 checkout. */
function rootDefaultLines(src: string): number[] {
  return src.split('\n').flatMap((line, i) => (!COMMENT_RE.test(line) && ROOT_DEFAULT_RE.test(line) ? [i + 1] : []));
}

function checkedFiles(): string[] {
  return sourcesUnder(TEST_DIR).filter((f) => !EXEMPT.has(relPath(f)));
}

function hardcodedOffenders(): string[] {
  return checkedFiles().flatMap((f) =>
    hardcodedLines(readFileSync(f, 'utf8')).map((n) => `${relPath(f)}:${n}`),
  );
}

function rootDefaultOffenders(): string[] {
  return checkedFiles().flatMap((f) =>
    rootDefaultLines(readFileSync(f, 'utf8')).map((n) => `${relPath(f)}:${n}`),
  );
}

function retiredOffenders(): string[] {
  return checkedFiles()
    .filter((f) => readFileSync(f, 'utf8').includes(RETIRED_GVBINDIR))
    .map(relPath);
}

/** package.json scripts whose command line hardcodes an oracle path. */
function scriptOffenders(scripts: Record<string, string>): string[] {
  return Object.entries(scripts).flatMap(([name, cmd]) => (SCRIPT_RE.test(cmd) ? [`package.json script "${name}"`] : []));
}

function packageScripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(join(TEST_DIR, '..', PACKAGE_JSON), 'utf8')) as { scripts: Record<string, string> };
  return pkg.scripts;
}

/** Run `fn` with GVBINDIR set (or deleted when undefined), restoring it after. */
function withGvbindir<T>(value: string | undefined, fn: () => T): T {
  const saved = process.env.GVBINDIR;
  if (value === undefined) delete process.env.GVBINDIR;
  else process.env.GVBINDIR = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.GVBINDIR;
    else process.env.GVBINDIR = saved;
  }
}

/** Run `fn` with argv[2] and CORPUS_ROOT set (or absent when undefined), restoring both after. */
function withRootInputs<T>(argvRoot: string | undefined, envRoot: string | undefined, fn: () => T): T {
  const savedArgv = process.argv;
  const savedEnv = process.env.CORPUS_ROOT;
  process.argv = [...savedArgv.slice(0, 2), ...(argvRoot === undefined ? [] : [argvRoot])];
  if (envRoot === undefined) delete process.env.CORPUS_ROOT;
  else process.env.CORPUS_ROOT = envRoot;
  try {
    return fn();
  } finally {
    process.argv = savedArgv;
    if (savedEnv === undefined) delete process.env.CORPUS_ROOT;
    else process.env.CORPUS_ROOT = savedEnv;
  }
}

describe('defaultGvbindir', () => {
  it('uses the dot-only dir for dot and the all-engines dir otherwise', () => {
    withGvbindir(undefined, () => {
      expect(defaultGvbindir('dot')).toBe('/tmp/ghl1611');
      expect(defaultGvbindir('neato')).toBe('/tmp/ghl1611-all');
      expect(defaultGvbindir('circo')).toBe(ORACLE_GVBINDIR_ALL);
      expect(defaultGvbindir('dot')).toBe(ORACLE_GVBINDIR);
    });
  });

  it('lets GVBINDIR win for every engine', () => {
    withGvbindir('/x', () => {
      expect(defaultGvbindir('dot')).toBe('/x');
      expect(defaultGvbindir('neato')).toBe('/x');
    });
  });
});

describe('package.json scripts', () => {
  it('no script hardcodes an oracle path', () => {
    expect(scriptOffenders(packageScripts())).toEqual([]);
  });

  it('the matcher names the failing script', () => {
    expect(scriptOffenders({ ok: 'tsx a.ts', survey: 'GVBINDIR=${GVBINDIR:-/tmp/ghl} tsx s.ts' })).toEqual([
      'package.json script "survey"',
    ]);
  });
});

describe('oracle location', () => {
  it('no file under test/ hardcodes the oracle binary or plugin dir', () => {
    expect(hardcodedOffenders()).toEqual([]);
  });

  it('the matcher flags code defaults but not comments or other paths', () => {
    expect(hardcodedLines("const A = process.env.X ?? '/tmp/ghl';")).toEqual([1]);
    expect(hardcodedLines("const A = '/tmp/ghl1611';")).toEqual([1]);
    expect(hardcodedLines("join(homedir(), 'git/graphviz/build/cmd/dot/dot')")).toEqual([1]);
    expect(hardcodedLines('const D = `${h}/git/graphviz-16.1.1/build`;')).toEqual([1]);
    expect(hardcodedLines("// 'GVBINDIR=/tmp/ghl1611' dot -Tsvg")).toEqual([]);
    expect(hardcodedLines(' * Refs (`GVBINDIR=/tmp/ghl dot -Tsvg`);')).toEqual([]);
  });

  it('the shell generator carries the same literals as oracle-paths.mjs', () => {
    const sh = readFileSync(join(TEST_DIR, '..', GENERATOR), 'utf8');
    expect(`${homedir()}/${SH_BUILD_RE.exec(sh)?.[1]}`).toBe(ORACLE_GRAPHVIZ_BUILD);
    expect(SH_OUT_RE.exec(sh)?.[1]).toBe(ORACLE_GVBINDIR);
  });

  it('no script references the retired pango plugin dir', () => {
    expect(retiredOffenders()).toEqual([]);
  });

  it('the shell generator carries the all-engines default of oracle-paths.mjs', () => {
    const sh = readFileSync(join(TEST_DIR, '..', GENERATOR), 'utf8');
    expect(SH_ALL_RE.exec(sh)?.[1]).toBe(ORACLE_GVBINDIR_ALL);
  });
});

describe('corpus root', () => {
  it('is the oracle checkout\'s tests directory', () => {
    expect(ORACLE_CORPUS_ROOT).toBe(join(dirname(ORACLE_GRAPHVIZ_BUILD), 'tests'));
  });

  it('enumerate.ts resolves argv, then CORPUS_ROOT, then the constant', () => {
    expect(withRootInputs('/argv', '/env', corpusRoot)).toBe('/argv');
    expect(withRootInputs(undefined, '/env', corpusRoot)).toBe('/env');
    expect(withRootInputs(undefined, undefined, corpusRoot)).toBe(ORACLE_CORPUS_ROOT);
  });

  it('no file under test/ defaults to the retired 16.1.0 corpus root', () => {
    expect(rootDefaultOffenders()).toEqual([]);
  });

  it('the matcher flags a home-dir join of the retired root', () => {
    expect(rootDefaultLines(`join(homedir(), '${RETIRED_CORPUS_ROOT}')`)).toEqual([1]);
    expect(rootDefaultLines(`const R = env.CORPUS_ROOT ?? path.join(os.homedir(), '${RETIRED_CORPUS_ROOT}');`)).toEqual([1]);
    expect(rootDefaultLines(`const R = \`\${homedir()}/${RETIRED_CORPUS_ROOT}\`;`)).toEqual([1]);
  });

  it('the matcher passes comments, message data and the constant', () => {
    expect(rootDefaultLines(`// join(homedir(), '${RETIRED_CORPUS_ROOT}')`)).toEqual([]);
    expect(rootDefaultLines(`'-Txdot /Users/x/${RETIRED_CORPUS_ROOT}/1447.dot';`)).toEqual([]);
    expect(rootDefaultLines('const R = process.env.CORPUS_ROOT ?? ORACLE_CORPUS_ROOT;')).toEqual([]);
  });
});

describe.skipIf(!existsSync(ORACLE_DOT_BIN))('gen-headless-gvbindir.sh all mode', () => {
  // Writes a temp dir, never the live ORACLE_GVBINDIR_ALL: a corpus walk may be
  // reading that dir's config8 while the suite runs.
  it('links core, dot_layout and neato_layout into the all-engines dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ghl-all-'));
    try {
      const out = execFileSync('sh', [join(TEST_DIR, '..', GENERATOR), 'all', dir], { encoding: 'utf8' });
      expect(out).toContain(`headless GVBINDIR ready at ${dir}`);
      for (const plugin of ['core', 'dot_layout', 'neato_layout']) {
        const lib = readdirSync(dir).find((f) => f.startsWith(`libgvplugin_${plugin}.`));
        expect(lib, plugin).toBeDefined();
        expect(readlinkSync(join(dir, lib ?? ''))).toContain(`plugin/${plugin}/`);
      }
      expect(readFileSync(join(dir, 'config8'), 'utf8')).toContain('neato_layout');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
