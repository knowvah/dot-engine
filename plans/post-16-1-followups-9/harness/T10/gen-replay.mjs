// SPDX-License-Identifier: EPL-2.0
// Part-9 T10: native output for the replay of hand-written `_background` ops, across bgcolor forms.
// usage: node gen-replay.mjs <repo root>   (GVBINDIR=/tmp/ghl, oracle 16.1.0)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.argv[2];
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const op = (s) => `${s.length} -${s}`;
const LIN = '[0 0 100 0 2 0 3 -red 1 4 -blue]';
const RAD = '(0 0 0 20 20 30 2 0 3 -red 1 4 -blue)';
const RAD_SAME = '(5 5 0 5 5 30 2 0 3 -red 1 4 -blue)';
const POLY = 'P 4 0 0 0 40 40 40 40 0 ';
const OPEN = 'p 4 0 0 0 40 40 40 40 0 ';
const LINE = 'L 2 0 0 40 40 ';
const OPS = {
  'bare-poly': POLY,
  'bare-open': OPEN,
  'bare-line': LINE,
  'linear-fill': `C ${op(LIN)} ${POLY}`,
  'radial-fill': `C ${op(RAD)} ${POLY}`,
  'radial-same': `C ${op(RAD_SAME)} ${POLY}`,
  'grad-pen': `c ${op(LIN)} ${LINE}`,
  image: `I 0 0 20 20 ${op('a.png')} ${POLY}`,
  style: `S ${op('dashed')} ${LINE}`,
  'style-after': `S ${op('dashed')} ${LINE} ${POLY}`,
  solid: `c ${op('#ff0000')} C ${op('#00ff00')} e 20 20 10 10 `,
  'fill-only': `C ${op('#00ff00')} ${POLY}`,
  'pen-only': `c ${op('#ff0000')} ${POLY}`,
};
const BG = {
  none: '',
  yellow: 'bgcolor=yellow;',
  transparent: 'bgcolor=transparent;',
  grad: 'bgcolor="red:blue";',
  radial: 'bgcolor="red:blue"; style=radial;',
};
const sources = {};
for (const [o, s] of Object.entries(OPS)) for (const [b, a] of Object.entries(BG)) sources[`${o}.${b}`] = `digraph G { ${a} _background="${s}"; a -> b; }`;
for (const [b, a] of Object.entries(BG)) sources[`label.${b}`] = `digraph G { ${a} label="L"; _background="${POLY}"; subgraph cluster_c { x } a -> b; }`;
const out = {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-'));
for (const [name, src] of Object.entries(sources)) {
  const f = path.join(tmp, 'c.gv');
  fs.writeFileSync(f, src);
  const run = (fmt) => spawnSync(DOT, [`-T${fmt}`, f], { encoding: 'utf8', env: { ...process.env, GVBINDIR: '/tmp/ghl' } });
  const svg = run('svg');
  const xdot = run('xdot');
  if (svg.status !== 0 || xdot.status !== 0) throw new Error(`native failed on ${name}`);
  out[name] = { src, svg: svg.stdout.slice(svg.stdout.indexOf('<g id=')), xdot: xdot.stdout, stderr: svg.stderr };
}
fs.writeFileSync(path.join(root, 'src/gvc/__fixtures__/replay-native.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(Object.keys(out).length, 'cases');
