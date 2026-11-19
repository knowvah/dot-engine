// SPDX-License-Identifier: EPL-2.0
// Planning trace for issue #175: the port's url_map_p for the root graph area,
// with the sign of zero, at the point the cmapx formatter receives it.
//   npx tsx plans/issue-175-cmapx-negative-zero/harness/trace-port.ts
import { mapTransform, type MapCtx } from '../../../src/gvc/anchor.js';

const show = (v: number): string => (Object.is(v, -0) ? '-0' : String(v));
// MapCtx of `digraph{URL="x"; a}` under -Tcmapx: bb 0,0,54,36, pad 4, dpi 96.
const ctx: MapCtx = {
  bb: { ll: { x: 0, y: 0 }, ur: { x: 54, y: 36 } }, pad: { x: 4, y: 4 },
  scale: 96 / 72, marginOff: { x: 0, y: 0 }, mapPolygon: true,
};
const ll = { x: -4, y: -4 };
const ur = { x: 54 + 4, y: 36 + 4 };
for (const p of [mapTransform(ll, ctx), mapTransform(ur, ctx)]) {
  console.log(show(p.x), show(p.y));
}
