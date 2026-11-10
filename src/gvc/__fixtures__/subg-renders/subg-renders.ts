// SPDX-License-Identifier: EPL-2.0
// The renders part-11 T7's harness compares with native (harness/T7/port-vs-native.ts):
// subg-after-free.c's modes on harness/T0/subg.gv, fdp and osage, xdot and svg.
//   root:   layout root, render, free; layout subgraph, render, free; layout root, render, free
//   nofree: layout root, render; layout subgraph (no free), render, free
// Native refs: harness/T7b/noaddr (fdp's settled, ND_id-ordered class; regen.sh).
import { readFileSync } from 'node:fs';
import { parse } from '../../../parser/index.js';
import type { EngineName } from '../../context.js';
import { createDefaultContext } from '../../default-context.js';
import { render as deviceRender } from '../../device.js';

const HARNESS = new URL('../../../../plans/post-16-1-followups-11/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'latin1');

export type SubgMode = 'root' | 'nofree';
export type SubgFmt = 'xdot' | 'svg';

/** Native's renders of one case, in order (harness/T7b/noaddr). */
export function nativeSubgRenders(engine: EngineName, sub: string, mode: SubgMode, fmt: SubgFmt): string[] {
  return read(`T7b/noaddr/subg-${engine}.${sub}.${mode}.${fmt}`).split(/^== render \d+\n/m).slice(1);
}

/** The port's renders of one case, in the harness's order. */
export function portSubgRenders(engine: EngineName, sub: string, mode: SubgMode, fmt: SubgFmt): string[] {
  const g = parse(read('T0/subg.gv'));
  const s = g.subgraphs.get(sub);
  if (s === undefined) throw new Error(`no subgraph ${sub}`);
  const ctx = createDefaultContext();
  const out: string[] = [];
  ctx.layout(g, engine);
  out.push(deviceRender(ctx, g, fmt));
  if (mode !== 'nofree') ctx.freeLayout(g, engine);
  ctx.layout(s, engine);
  out.push(deviceRender(ctx, s, fmt));
  ctx.freeLayout(s, engine);
  if (mode === 'root') {
    ctx.layout(g, engine);
    out.push(deviceRender(ctx, g, fmt));
    ctx.freeLayout(g, engine);
  }
  return out;
}

/** svg's generator banner and `<svg>` tag layout differ from native's on every render; drop them. */
export function svgBody(svg: string): string {
  return svg.slice(svg.indexOf('<g id="graph'));
}
