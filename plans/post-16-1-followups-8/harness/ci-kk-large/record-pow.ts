// SPDX-License-Identifier: EPL-2.0
//
// Writes src/layout/neato/__fixtures__/models/kk-large.pow.json: every x^1.5
// the kk-large layout asks for where macOS pow differs from exactPow15.
// Run on the oracle's platform only (macOS), from the repo root:
//   npx esbuild plans/post-16-1-followups-8/harness/ci-kk-large/record-pow.ts \
//     --bundle --platform=node --format=esm --outfile=$SCRATCH/record-pow.mjs
//   node $SCRATCH/record-pow.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, render } from '../../../../src/index.js';
import { exactPow15 } from '../../../../test/helpers/exact-pow15.js';

const FIXTURES = 'src/layout/neato/__fixtures__/models/';

if (process.platform !== 'darwin') throw new Error('kk-large.pow.json records macOS pow; run this on macOS');

const realPow = Math.pow;
const differing = new Map<number, number>();
let calls = 0;
let outsideDomain = 0;
Math.pow = (x: number, y: number): number => {
  const result = realPow(x, y);
  if (y !== 1.5) return result;
  calls++;
  if (!(x > 0) || !Number.isFinite(x)) outsideDomain++;
  else if (result !== exactPow15(x)) differing.set(x, result);
  return result;
};

const xdot = String(render(parse(readFileSync(`${FIXTURES}kk-large.gv`, 'utf8')), 'xdot', { engine: 'neato' }));
Math.pow = realPow;

const rows = [...differing].map(([x, y]) => `[${x},${y}]`);
writeFileSync(`${FIXTURES}kk-large.pow.json`, `[\n${rows.join(',\n')}\n]\n`);
console.log(JSON.stringify({ calls, outsideDomain, differing: differing.size, xdotBytes: xdot.length }));
