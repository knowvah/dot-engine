# issue #178: an HTML label emits in its own obj state

## Observation: inside an HTML label, `job.obj` is a child of the label's owner
- **Context**: porting `allocObj`/`freeObj` into `emitHtmlLabel` (`src/common/htmltable-emit.ts`).
- **Finding**: from #178 on, everything `emitHtmlTbl` calls sees a temporary obj whose `parent` is the owner (root, cluster, node or edge). It carries the owner's paint fields, `type`, `emitState`, `graphObj`, `url`, `tooltip`, `target` and `explicitTooltip`. Its `id`, `label`, `rawStyle`, `gradientFrac` and every map-point field are the defaults (`null`, `[]`), as in C. `withHtmlPaint` pushes its `paintObj` on top of that child. The anchor ids, the default tooltip and the IMG scale still come from module state (`anchorEnv` in `htmltable-emit-rules.ts`), not from `job.obj`.
- **Impact**: code on the label path that needs the owner's `id` or hot spot must read `job.obj.parent` or take it as an argument; a write to `job.obj` there is discarded at the pop. #253 (cell anchors inheriting the owner's url, target, tooltip) can read exactly C's scope from this child obj.
- **Confidence**: High (unit cases in `src/render/map-html-label-obj.test.ts`)

## Observation: label emitters are called with an empty obj stack by unit harnesses only
- **Context**: `allocObj` first threw on `job.obj === null`.
- **Finding**: `npm test` then failed exactly 3 cases, all in `src/gvc/device.test.ts` (`renderOneLabel` twice, `renderClusterLabel` once, on a bare `new RenderJob(...)`). No test that renders through `render()` reached the throw, so no tested render emits an HTML label without an obj. `emitHtmlLabel` therefore emits without a push when there is no owner.
- **Impact**: a null `job.obj` on the label path is a harness state, not a live one.
- **Confidence**: High

## Observation: a brief's "unchanged, byte-equal" claim came from `rowcheck.mjs`'s one-sided counts
- **Context**: the brief listed the `edge` probe as byte-equal to native on the base; the red test showed it lacks native's two cell areas (#252).
- **Finding**: the planning table read `baseDiff 0, headDiff 0, unchanged` as equality. That is the trap `.agent-notes/issue-177.md` describes: the counts are the port's lines missing from native only.
- **Impact**: when planning with `rowcheck.mjs`, `cmp` the base output with native before writing "byte-equal" for an `unchanged` row.
- **Confidence**: High
