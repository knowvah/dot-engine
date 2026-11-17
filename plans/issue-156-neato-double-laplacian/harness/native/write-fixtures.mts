// SPDX-License-Identifier: EPL-2.0
/**
 * Write the native vectors of out/imds.json and out/hier.json (capture.mts)
 * into the port's fixtures, replacing only the result fields of each case.
 * Usage: npx tsx write-fixtures.mts
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HERE = new URL('./', import.meta.url);
const FIXTURES = new URL('../../../../src/layout/neato/__fixtures__/', HERE);
const load = <T>(name: string): T => JSON.parse(readFileSync(new URL(`out/${name}`, HERE), 'utf8')) as T;

/** hier-imds.ts style: integral doubles keep a `.0`. */
const imdsNum = (v: number): string => (Number.isInteger(v) && !Object.is(v, -0) ? v.toFixed(1) : String(v));
/** hier-majorization.ts style: shortest round-trip, with `-0` kept. */
const hierNum = (v: number): string => (Object.is(v, -0) ? '-0' : String(v));

function must(text: string, re: RegExp, to: string, what: string): string {
  if (!re.test(text)) throw new Error(`no match for ${what}`);
  return text.replace(re, to);
}

// --- hier-imds.ts ---------------------------------------------------------
const imds = load<Record<string, { rv: number; x: number[]; y: number[] }>>('imds.json');
const imdsFile = new URL('hier-imds.ts', FIXTURES);
let imdsText = readFileSync(imdsFile, 'utf8');
for (const [name, nat] of Object.entries(imds)) {
  const start = imdsText.indexOf(`\n  ${name}: {\n`);
  const end = imdsText.indexOf('\n  },\n', start);
  if (start < 0 || end < 0) throw new Error(`imds case ${name} not found`);
  let block = imdsText.slice(start, end);
  block = must(block, /(tol: [^,]+, rv: )-?\d+,/, `$1${nat.rv},`, `${name} rv`);
  block = must(block, /\n    x: \[[^\]]*\],/, `\n    x: [${nat.x.map(imdsNum).join(', ')}],`, `${name} x`);
  block = must(block, /\n    y: \[[^\]]*\],/, `\n    y: [${nat.y.map(imdsNum).join(', ')}],`, `${name} y`);
  imdsText = imdsText.slice(0, start) + block + imdsText.slice(end);
}
writeFileSync(imdsFile, imdsText);

// --- hier-majorization.ts -------------------------------------------------
const hier = load<Record<string, { rv: number; coords: number[][] }>>('hier.json');
const hierFile = new URL('hier-majorization.ts', FIXTURES);
let hierText = readFileSync(hierFile, 'utf8');
for (const [name, nat] of Object.entries(hier)) {
  const start = hierText.indexOf(`\n    name: ${JSON.stringify(name)},`);
  const end = hierText.indexOf('\n  },\n', start);
  if (start < 0 || end < 0) throw new Error(`hier case ${name} not found`);
  let block = hierText.slice(start, end);
  block = must(block, /(seed: \d+, rv: )-?\d+,/, `$1${nat.rv},`, `${name} rv`);
  const coords = nat.coords.map((a) => `      [${a.map(hierNum).join(', ')}],`).join('\n');
  block = must(block, /\n    coords: \[\n[\s\S]*\n    \],/, `\n    coords: [\n${coords}\n    ],`, `${name} coords`);
  hierText = hierText.slice(0, start) + block + hierText.slice(end);
}
writeFileSync(hierFile, hierText);
