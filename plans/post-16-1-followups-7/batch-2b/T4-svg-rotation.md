# T4: svg image rotation (item 100, AD-7)

**Context:** `svgRenderer.usershape` (`src/render/svg.ts:240-256`) ports only the
unrotated branch of `plugin/core/gvloadimage_core.c:core_loadimage_svg` (60–88). When
`job->rotation` is non-zero (set from `rotate=90` / `landscape`, `src/gvc/device.ts:498`),
C does the following:
- writes `width` and `height` swapped (its own `// FIXME - this is messed up`);
- uses `preserveAspectRatio="xMidYMid meet"`;
- appends ` transform="rotate(%d %g %g)"` with `job->rotation`, `originx`, `-originy`.

**Task:**
1. Test first, from the fixture `images/100-rotate.svg`: the `<image>` element is byte-equal
   to native's.
2. Port the branch verbatim, FIXME included. Keep the comment.

**Write-set:** `src/render/svg.ts` (+ its test).
**Read-set:** `plugin/core/gvloadimage_core.c:60-88`, `src/gvc/job.ts:287`,
`src/gvc/device.ts:490-504`.

**Acceptance criteria:**
- *Given* `digraph{rotate=90;a[image="r.png"]}` with a 40×20 sizer, *when* rendered to
  svg, *then* the `<image>` line equals native's.
- *Given* `rotate=0`, *then* svg output is unchanged.
- *Given* the corpus, *when* bytediff runs, *then* output is identical (stop 8).

**Commit:** `fix(T4): port core_loadimage_svg rotation branch`.
**Observability:** N/A. **Rollback:** reversible.
