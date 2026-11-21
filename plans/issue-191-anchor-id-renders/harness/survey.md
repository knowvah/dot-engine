# Issue #191: evidence

Planning base `70bd5faf`. Oracle: the carried build (ADR-0003),
`~/git/sseely/graphviz-carried`, `GVBINDIR=/tmp/ghl1611-carried`;
`config8` present at planning.

## The C static

`static int anchorId` (`lib/common/htmltable.c:376` in 16.1.1; `:386` in
16.1.0, which `docs/process-statics.md` cites). `initAnchor` takes the next
value whenever an HTML TABLE or TD has `href`, `target` or `title` (or their
aliases) and no `id`, for every renderer, whether or not an anchor opens. C
never assigns it again: not per render, not per layout, not per graph.

## The port

`anchorSeq` (`src/common/htmltable-emit-rules.ts:180`) has two resets:

1. the registered reset (`:221`, `registerRenderState`), which runs at every
   public render entry (AD-4 of part 3) and at every `GvcContext.layout`
   (AD-8 of part 4);
2. a direct call at the start of every `render` (`src/gvc/device.ts:507`,
   added in `d77123b5`, 2026-06-12, before AD-4 existed; its comment, "fresh
   anchorId per dot invocation", is what AD-4 later made general).

Reset 2 is the only one that runs between two renders after one layout.

## Native against base and prototype

`twice.c` (copied from `post-16-1-followups-10/harness/T5`) in `seq:` mode;
`probe.ts` is its port twin. 2 probes x 10 scripts
([results/probes-base.tsv](results/probes-base.tsv),
[results/probes-proto.tsv](results/probes-proto.tsv)):

| script | native ids in the last svg (anchor.gv) | base | prototype |
|---|---|---|---|
| `l,svg,svg` | render 1 `_0 _1`, render 2 `_2 _3` | `_0 _1` twice | equal |
| `l,cmapx,svg` | cmapx `node1_0 node1_1`, svg `_2 _3` | svg `_0 _1` | equal |
| `l,xdot,svg` | `_2 _3` (xdot consumes 2) | `_0 _1` | equal |
| `l,json,svg` | `_4 _5` (json consumes 4) | `_0 _1` | equal |
| `l,json0`/`dot`/`plain`/`imap`,`svg` | `_2 _3` | `_0 _1` | equal |
| `l,svg,f,l,svg` | `_0 _1`, `_2 _3` | `_0 _1` twice | `_0 _1` twice (AD-8) |
| `l,svg,l,svg,l,svg` | `_0 _1`, `_2 _3`, `_4 _5` | `_0 _1` x3 | `_0 _1` x3 (AD-8) |

Base: 0 of 20 jobs agree with native. Prototype: 16 of 20; the 4 left are
the across-layout scripts, which AD-8 keeps (decisions.md AD-1). In the 16,
the full outputs differ from native only in the generator banner and the
`<svg>` attribute wrapping, as on a single render.

## Reach selection

A public entry (`renderSvg`, `render`, `renderXdot`, the async render, and
everything built on them) calls `resetRenderState()` first and renders once,
so dropping reset 2 cannot change its output. Only a caller that renders
twice on one layout through `renderWithContext` sees the change. The corpus
reach is therefore the inputs that reach `initAnchor` at all (an HTML TABLE
or TD with href/url/title/tooltip/target): 9 ids,
[reach-ids.txt](reach-ids.txt). Smoke and reach bytediffs, base against
prototype: 1960/1960 and 360/360 jobs identical
([results/smoke-bytediff.txt](results/smoke-bytediff.txt),
[results/reach-bytediff.txt](results/reach-bytediff.txt)).

## Port-internal renders

`src/render/json.ts:262` (`collectDrawLookup`) runs an inner `xdot`
`deviceRender` during a json render. With reset 2 gone it consumes ids, and
native's json consumes twice as many as one svg (`l,json,svg` gives `_4 _5`):
the port then agrees. `src/render/xdot-public.ts:113` is a public entry.
