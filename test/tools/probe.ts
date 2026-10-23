// SPDX-License-Identifier: EPL-2.0
// Native vs port on DOT cases: npx tsx test/tools/probe.ts <bundle> <engine> <case...>
// A case is a path to a DOT file or literal DOT source. Prints SAME/DIFF per case for
// SVG text spans (content + x/y), node shapes (key + ellipse rx/ry) and stderr lines
// (native `<stdin>: ` prefix stripped; native stderr decoded UTF-8, port console
// captured). Each case runs in its own process. PROBE_VERBOSE=1 prints both sides on DIFF.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { compareProbe, formatVerdict } from './lib/probe-compare.js';
import { normalizeStderrLines } from './lib/stderr.js';
import { extractNodeShapes, extractTextSpans } from './lib/svg-extract.js';

interface Bundle {
  renderSvg(src: string, engine: string): string;
}

const ORACLE = `${os.homedir()}/git/graphviz/build/cmd/dot/dot`;
// GV_PLUGINS_DOT: dot-only plugin dir (default /tmp/ghl); GV_PLUGINS_ALL: full plugin dir (required
// for non-dot engines).
const DOTDIR = process.env.GV_PLUGINS_DOT ?? '/tmp/ghl';
const FULL = process.env.GV_PLUGINS_ALL;
const MAX_BUFFER = 1 << 28;
const [bundle = '', engine = '', ...cases] = process.argv.slice(2);

function decode(buf: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

function runAll(): void {
  // One process per case: port module statics carry across renders (follow-up 42).
  let same = 0;
  for (const c of cases) {
    // execArgv carries tsx's loader flags to the child.
    const r = spawnSync(process.execPath, [...process.execArgv, process.argv[1]!, bundle, engine, c], {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
    const out = r.stdout.split('\n').filter((l) => l && !/^\d+\/\d+ SAME$/.test(l));
    process.stdout.write(`${out.join('\n')}\n`);
    if (out[0]?.startsWith('SAME')) same++;
  }
  console.log(`${same}/${cases.length} SAME`);
}

function portRender(DE: Bundle, src: string): { svg: string; err: string } {
  const w: string[] = [];
  const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const k of ['log', 'warn', 'error', 'info'] as const) {
    console[k] = (...a: unknown[]): void => {
      w.push(a.join(' '));
    };
  }
  let svg = '';
  try {
    svg = DE.renderSvg(src, engine);
  } catch (e) {
    svg = `THROW ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    Object.assign(console, saved);
  }
  return { svg, err: w.join('\n') };
}

function verbose(ns: string, ps: string, nerr: string, pe: string, v: ReturnType<typeof compareProbe>): void {
  const j = JSON.stringify;
  if (!v.text) {
    console.log('  text native', j(extractTextSpans(ns)), '\n  text port  ', j(extractTextSpans(ps)));
  }
  if (!v.poly) {
    console.log('  poly native', j(extractNodeShapes(ns)), '\n  poly port  ', j(extractNodeShapes(ps)));
  }
  if (!v.stderr) {
    console.log('  err native', j(normalizeStderrLines(nerr)), '\n  err port  ', j(normalizeStderrLines(pe)));
  }
}

async function runCases(): Promise<void> {
  const DE = (await import(pathToFileURL(bundle).href)) as Bundle;
  const GVBINDIR = engine === 'dot' ? DOTDIR : FULL;
  if (!GVBINDIR) throw new Error('set GV_PLUGINS_ALL to the full 16.1 plugin dir for non-dot engines');
  let diffs = 0;
  for (const c of cases) {
    const src = fs.existsSync(c) ? decode(fs.readFileSync(c)) : c;
    const r = spawnSync(ORACLE, [`-K${engine}`, '-Tsvg'], {
      input: src,
      env: { ...process.env, GVBINDIR },
      maxBuffer: MAX_BUFFER,
    });
    const ns = decode(r.stdout ?? Buffer.alloc(0));
    const nerr = decode(r.stderr ?? Buffer.alloc(0));
    const p = portRender(DE, src);
    const v = compareProbe(ns, p.svg, nerr, p.err);
    if (!v.same) diffs++;
    console.log(formatVerdict(v, c));
    if (!v.same && process.env.PROBE_VERBOSE) verbose(ns, p.svg, nerr, p.err, v);
  }
  console.log(`${cases.length - diffs}/${cases.length} SAME`);
}

if (cases.length > 1) {
  runAll();
  process.exit(0);
}
await runCases();
