// SPDX-License-Identifier: EPL-2.0
// Usage: npx tsx test/tools/failure-sites/cli.ts --c <libRoot> --src src --out <json>
//
// Scans the C tree (libRoot, plus the sibling plugin/ dir when present) and the
// port's src/, joins them, merges into the registry at --out (hand-edited
// fields and hand-seeded rows survive) and prints counts by kind and class.
// C file names are stored as `lib/<dir>/<file>.c` / `plugin/<dir>/<file>.c`.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildRegistry,
  countUnparsedSee,
  join,
  parseRegistry,
  scanC,
  scanPort,
  type CSite,
  type FailureSiteRegistry,
  type FailureSiteRow,
  type PortSite,
} from './scan.js';

interface Args {
  c: string;
  src: string;
  out: string;
}

const USAGE = 'usage: cli.ts --c <libRoot> --src <srcDir> --out <registry.json>';

function parseArgs(argv: readonly string[]): Args {
  const flag = (name: string): string => {
    const v = argv[argv.indexOf(name) + 1];
    if (argv.indexOf(name) < 0 || v === undefined) throw new Error(`missing ${name}\n${USAGE}`);
    return v;
  };
  return { c: flag('--c'), src: flag('--src'), out: flag('--out') };
}

async function walk(dir: string, ext: RegExp): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name), ext) : ext.test(e.name) ? [path.join(dir, e.name)] : [],
    ),
  );
  return files.flat().sort();
}

const posix = (p: string): string => p.split(path.sep).join('/');

async function scanCTree(root: string, prefix: string): Promise<CSite[]> {
  const files = await walk(root, /\.c$/);
  const perFile = await Promise.all(
    files.map(async (f) => scanC(`${prefix}/${posix(path.relative(root, f))}`, await fs.readFile(f, 'utf8'))),
  );
  return perFile.flat();
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(
    () => true,
    () => false,
  );
}

async function scanAllC(libRoot: string): Promise<CSite[]> {
  const plugin = path.join(path.dirname(libRoot), 'plugin');
  const lib = await scanCTree(libRoot, 'lib');
  return (await exists(plugin)) ? [...lib, ...(await scanCTree(plugin, 'plugin'))] : lib;
}

async function scanSrc(srcDir: string): Promise<{ sites: PortSite[]; unparsed: number }> {
  const files = (await walk(srcDir, /\.ts$/)).filter((f) => !f.endsWith('.d.ts'));
  const texts = await Promise.all(files.map(async (f) => [f, await fs.readFile(f, 'utf8')] as const));
  return {
    sites: texts.flatMap(([f, t]) => scanPort(posix(path.join(srcDir, path.relative(srcDir, f))), t)),
    unparsed: texts.reduce((n, [, t]) => n + countUnparsedSee(t), 0),
  };
}

async function readExisting(out: string): Promise<FailureSiteRegistry | null> {
  if (!(await exists(out))) return null;
  return parseRegistry(JSON.parse(await fs.readFile(out, 'utf8')) as unknown);
}

function tally(rows: readonly FailureSiteRow[], key: (r: FailureSiteRow) => string): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, n]) => `  ${k}: ${n}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const libRoot = path.resolve(args.c);
  const cRoot = `${path.basename(path.dirname(libRoot))}/${path.basename(libRoot)}`;
  const [cSites, port, existing] = await Promise.all([
    scanAllC(libRoot),
    scanSrc(args.src),
    readExisting(args.out),
  ]);
  const registry = buildRegistry(existing, cRoot, join(cSites, port.sites));
  await fs.writeFile(args.out, `${JSON.stringify(registry, null, 2)}\n`);
  const lines = [
    `rows: ${registry.rows.length}`,
    'by kind:',
    ...tally(registry.rows, (r) => r.c?.kind ?? 'port-only'),
    'by class:',
    ...tally(registry.rows, (r) => r.class),
    `unparsed @see tags: ${port.unparsed}`,
  ];
  console.log(lines.join('\n'));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
