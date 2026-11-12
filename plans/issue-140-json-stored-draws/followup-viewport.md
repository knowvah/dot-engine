# Draft follow-up issue (T1 files it)

**Title:** render: the `viewport` graph attribute is not ported

**Labels:** `follow-up`, `bug`

**Body:**

C's `init_job_viewport` reads `viewport` (`W,H,Z,x,y` or `W,H,Z,node`) and sets the
job's view, zoom and focus (`lib/common/emit.c:init_job_viewport`). The view then
fixes the page size and `job->clip`, so objects outside the view are not drawn.
No file under `src/` reads `viewport`, so the port draws the whole graph at its
natural size.

Repro (dot, 16.1.0 oracle):

```
digraph G { viewport="60,60,1,30,30"; a -> b -> c; d; c -> d }
```

- svg: native `width="60pt" height="60pt"` with one node group; the port
  `62pt`×`260pt` with four.
- xdot/json: native's canvas `_draw_` polygon is `0 0 0 60 60 60 60 0` and nodes
  `a`, `b`, `c` have no draw strings. The port boxes `0 0 0 252 54 252 54 0` and
  draws them all.

No corpus input sets `viewport` (manifest scan, 2026-11-10), so the survey does not
see this.

**Done when:** `viewport`'s parse, zoom and focus follow `init_job_viewport`, and the
repro equals native in svg, xdot and json.

Found while planning #140 (`plans/issue-140-json-stored-draws/`).
