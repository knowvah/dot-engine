# Follow-up to file: svg: margin= is not scaled by dpi in the page size, viewBox and translate

Labels: `follow-up`, `bug`. Planning could not file it: the session's
permission classifier refused `gh issue create`. The executor files it (T1
step 9) if it can; otherwise the maintainer does.

---

With both `margin=` and a `dpi` other than 72, the port's SVG width, height,
viewBox and page translate differ from native (carried 16.1.1 oracle).

Repro (dot):

```
digraph G { dpi=144; margin=1; a -> b }
```

- native: `width="412pt" height="520pt"`, `viewBox="144.00 144.00 268.00 376.00"`,
  `translate(76 184)`
- port: `width="268pt" height="376pt"`, `viewBox="72.00 72.00 196.00 304.00"`,
  `translate(40 148)`

Mechanism (from reading the C; not yet instrumented):

- `init_job_pagination` sets `job->width = ROUND((pageSize.x + 2 * margin.x) *
  job->dpi.x / POINTS_PER_INCH)` (`lib/common/emit.c:init_job_pagination`):
  the margin is scaled by dpi/72 with the page. `emitSvgTag`
  (`src/render/svg-graph.ts`) adds `2 * job.margin.x` after the dpi scale, and
  takes the viewBox origin as `ROUND(margin)` where C's `pageBoundingBox.LL` is
  `ROUND(canvasBox.LL * dpi / 72)`.
- `setup_page` adds `canvasBox.LL.x / job->zoom` to the translation, where
  `job->zoom` is Z (1 here). `svgBeginPage` divides by `job.scale.x`, which is
  Z * dpi / 72 (2 here): 72 / 2 = 36 against native's 72, the 36-unit gap in
  the translate.

With dpi = 72 (the default) or margin = 0 the two agree, which is why the
corpus does not show it.

Found while planning #197 (`plans/issue-197-viewport/`), which leaves these
formulas as they are.
