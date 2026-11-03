// T7: compares the port's sorted events with native's per case, kind by kind and size by size.
// usage: npx tsx cmp-port.mts [stable] (from the repo root). "stable" measures Array.sort, the
// port's order before T7; without it, the code in src/vpsc/SweepLine.ts is what the sites use.
import fs from 'node:fs';
import { buildXEvents, buildYEvents } from '../../../../src/vpsc/SweepLine.ts';
import { Rectangle } from '../../../../src/vpsc/Solver.ts';
import { Variable } from '../../../../src/vpsc/Variable.ts';
import { EvType, type SweepEvent } from '../../../../src/vpsc/sweepTypes.ts';

const here = new URL('./dumps/', import.meta.url);
const native = JSON.parse(fs.readFileSync(new URL('events.json', here), 'utf8')) as Record<string, string>;
const mode = process.argv[2] ?? 'stable';

function layout(kind: string, n: number): Rectangle[] {
  const side = Math.ceil(Math.sqrt(n));
  return Array.from({ length: n }, (_, i) => {
    const col = i % side, row = Math.trunc(i / side);
    switch (kind) {
      case 'row': return new Rectangle(i * 10, i * 10 + 8, 0, 4);
      case 'col': return new Rectangle(0, 8, i * 10, i * 10 + 4);
      case 'same': return new Rectangle(0, 8, 0, 4);
      case 'grid': return new Rectangle(col * 10, col * 10 + 8, row * 10, row * 10 + 8);
      case 'touch': return new Rectangle(i * 8, i * 8 + 8, 0, 4);
      case 'overlap': return new Rectangle(i * 4, i * 4 + 8, 0, 4);
      default: return new Rectangle(i * 10, i * 10, 0, 0);
    }
  });
}
const lt = (a: SweepEvent, b: SweepEvent): number => {
  if (a.node.r === b.node.r) return a.type === EvType.Open && b.type !== EvType.Open ? -1 : 1;
  return a.pos < b.pos ? -1 : a.pos > b.pos ? 1 : 0;
};
async function sorter(): Promise<(e: SweepEvent[]) => void> {
  if (mode === 'stable') return (e) => void e.sort(lt);
  const sw = await import('../../../../src/vpsc/SweepLine.ts');
  const { libcxxSort } = await import('../../../../src/util/libcxx-sort.ts');
  return (e) => libcxxSort(e, (sw as unknown as { compareEvents: (a: SweepEvent, b: SweepEvent) => boolean }).compareEvents);
}
const sort = await sorter();
const table = new Map<number, { same: number; diff: string[] }>();
for (const [key, want] of Object.entries(native)) {
  const [kind, ns, pass] = key.split(' ') as [string, string, string];
  const n = Number(ns);
  const rects = layout(kind, n);
  const vs = rects.map((_, i) => new Variable(i, 0, 1));
  const ev = pass === 'X' ? buildXEvents(rects, vs) : buildYEvents(rects, vs);
  sort(ev);
  const got = ev.map((e) => `${e.type === EvType.Open ? 'o' : 'c'}${e.node.v.id}`).join(' ');
  const row = table.get(n) ?? { same: 0, diff: [] };
  if (got === want.trim()) row.same++;
  else row.diff.push(`${kind}/${pass}`);
  table.set(n, row);
}
for (const [n, r] of table) console.log(`n=${n} events=${2 * n} agree=${r.same} differ=${r.diff.length} ${r.diff.join(' ')}`);
