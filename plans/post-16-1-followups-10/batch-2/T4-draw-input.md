# T4: a golden input with graph `_draw_` and `_background` (122, AD-6)

**Context:** no corpus input carries a graph `_draw_` or `_background`, so the survey and bytediff never reach `init_xdot`'s replay (`lib/common/emit.c:69,1362`).
Only `src/gvc/emit-xdot.test.ts` covers it. Known divergence A13: after a gradient `bgcolor`, native svg prints freed memory (`fill=""`) in the replay and the
port prints the colour C meant, so a fixture that wants exact bytes must avoid that combination, and one case should pin it against A13.

**Task:**
1. Write 2–3 small inputs in `test/golden/inputs/`: `_background` with polygon, text and style operations; a graph `_draw_`; both on one graph. Hand-write them, since
   native-generated `_draw_` can never observe the state `emit_background` leaves (`.agent-notes/post-16-1-followups-9.md`).
2. Capture native refs with `GVBINDIR=/tmp/ghl`, for `svg` and `xdot`, as `pt-issue-*` refs are; add lines to `inputs/PROVENANCE.md`.
3. A golden test comparing the port against the refs at the conformance bar.
4. Add a `--file <path>` option to `test/tools/bytediff.ts`, so a job can name an input outside the manifest; keep its current behaviour otherwise.

**Write-set:** `test/golden/inputs/`, a new `test/golden/draw-replay.test.ts`, `test/tools/bytediff.ts`.

**Acceptance criteria:**
- *Given* each input, *when* rendered, *then* svg and xdot match native's refs, or the one A13 case is pinned as A13.
- *Given* `bytediff --file <input>`, *when* run on two bundles, *then* it compares that input on 8 engines × 5 formats.
- *Given* no `--file`, *then* bytediff's targets are unchanged.
- *Given* `bash test/golden/gates.sh`, *then* 5/5 pass and Gate 4's ratchet holds.

**Commit:** `test(T4): add golden inputs for init_xdot's replay`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
