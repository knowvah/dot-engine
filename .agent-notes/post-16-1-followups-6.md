# post-16-1-followups-6 mission — observations (2026-10-29)

## Observation: public `render(g, fmt)` re-lays out on every call
- **Context**: T0/T1 comparing native's one-run `-Tsvg -Txdot` stderr.
- **Finding**: the public `render(parse(src), fmt, {engine})` runs layout each call, so
  rendering one parsed graph twice prints layout-time warnings twice. Native's multi-`-T`
  run lays out once. `createDefaultContext` (internal, not in the bundle) +
  `ctx.layout(g, engine)` + `renderWithContext(ctx, g, fmt)` reproduces native.
- **Impact**: compare multi-format stderr through the context API (tsx against `src/`),
  not the bundle's `render`.
- **Confidence**: High

## Observation: `GVRENDER_DOES_TRANSFORM` is declared but never set
- **Context**: T4 porting `gvrender_usershape`'s `gvrender_ptf` branch.
- **Finding**: `job.flags` never carries `GVRENDER_DOES_TRANSFORM` (`src/gvc/job.ts:77`,
  `device.ts:463-470`); `transformPoint` applies the y-flip, and svg/xdot `usershape`
  take graph coordinates by the `RendererPlugin.usershape` contract (svg negates y
  itself). Porting a C branch keyed on that flag literally negates svg y.
- **Impact**: C branches on DOES_TRANSFORM need a per-renderer reading, not the flag.
- **Confidence**: High

## Observation: `ObjState.graphObj` is always null at emit time
- **Context**: T4 sizer plumbing.
- **Finding**: the render job has no handle on the graph or its gvc during emit; anything
  the context owns (image sizer/resolver) must be put on the job in `device.ts:render()`.
  A per-object workaround (setting it from a node) silently misses graph and cluster
  labels, which emit without a node.
- **Impact**: put context state on the job in `render()`; test graph/cluster/edge labels.
- **Confidence**: High

## Observation: bytediff progress line format
- **Context**: T0 self-check.
- **Finding**: `bytediff.ts` progress lines read `done/total identical N diffs N capped N`
  (the second number is identical, not a diff count). The diff dir holds `index.txt`
  (`n key`) plus `<n>.a.txt`/`<n>.b.txt`, output then `\n--stderr--\n` then console.
  The 17 `&` files include `world.gv`; at load 100+ a T0-vs-T0 run did ~150 jobs/hour.
- **Impact**: read the summary carefully; budget `--amp` runs at high load.
- **Confidence**: High

## Observation: cola's right-multiply matches kD's; the cola prologue is unported
- **Context**: T3 (item 94).
- **Finding**: all four inlined `right_mult_with_vector_ff` copies in the 16.1 neato dylib
  (kD 0x35abc / 0x35e70, cola 0x3b088 / 0x3b444) share one shape: fused diagonal
  (`fmadd` with +0.0), fused scalar remainder, 16-wide `fmul.4s` block with in-order
  `fadd`, fused `fmla.4s` scatter; the stub at 0x6b078 is `_bzero`. Inlined
  `vectors_inner_productf` rounds float products then adds in double (unfused). Native
  `dot -v` with `mode=ipsep` prints the stress every iteration — enough to find where the
  port departs without an instrumented build. The port's cola path skips
  `constrained_majorization_ipsep.c:166-191`, which changes the float trajectory from
  iteration 0.
- **Impact**: follow-ups 95/96; the ready patch is in
  `plans/post-16-1-followups-6/patches/`.
- **Confidence**: High
