// SPDX-License-Identifier: EPL-2.0
// Runs port-vs-native.ts with counterfactual.patch's globalThis gates set from CF (A, B or AB).
// A: agwrite falls back to the draw strings an earlier render stored (C's agwrite prints attribute
//    values; xdot_end_node/_edge agxset only non-empty buffers), and a subgraph echoes its stored
//    xdotversion (and _draw_ when not a cluster). Crude: it also prints empty values.
// B: edge_in_box tests the spline's bb, computed as emit.c:init_splines_bb does (arrow_bb
//    approximated by the arrow endpoints).
// Usage (repo root, counterfactual.patch applied, never committed):
//   CF=AB npx tsx plans/post-16-1-followups-11/harness/T7/cf.mts <native-run-dir> [outdir]
const f = process.env.CF ?? '';
(globalThis as Record<string, unknown>).CF_A = f.includes('A');
(globalThis as Record<string, unknown>).CF_B = f.includes('B');
await import('./port-vs-native.ts');
