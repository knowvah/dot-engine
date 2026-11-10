# T1: pin json's stored draw strings on undrawn objects

## Context

C's json writer prints `agxget` values (`write_attrs`, `gvrender_core_json.c:342-362`),
after an inner xdot render that agxsets only non-empty buffers
(`gvrender_core_dot.c:237-291`). An object that render does not draw (invisible,
outside the clip, outside the layer) keeps what the input or an earlier render stored.
The port's `emitAttrs` (`src/render/json.ts:397-419`) merges `base` (the object's own
attributes: input values plus the last write-back) under `overlay`, the re-parsed xdot
text. That text prints `renderedDraws` (`src/render/dot/write-back.ts:136-146`).
`drawStringsByObject` overlays this render's strings only, for `"` fidelity.
[README](../README.md) gives the planning evidence that the port already equals native.

## Task

1. **Native refs:** run `oraclePreflight(dot, '/tmp/ghl', 'dot')`, then
   `GVBINDIR=/tmp/ghl bash plans/issue-140-json-stored-draws/harness/regen.sh`, then
   `git diff --exit-code plans/issue-140-json-stored-draws/harness/out`. Any diff is
   stop condition 3. Journal it.
2. **Test (a regression pin; it passes on the base by design):** create
   `src/render/json-stored-draws.test.ts`. Give it an SPDX header and a doc comment
   that states the C rule and cites `@see plugin/core/gvrender_core_json.c:write_attrs`
   and `@see plugin/core/gvrender_core_dot.c:xdot_end_node`. Add a module-level
   `HARNESS_140` URL constant, as `json0-node-attrs.test.ts` has `HARNESS_136`. Use one
   `createDefaultContext()` per case and `deviceRender` (`src/gvc/device.ts`), engine dot.
   Cases:
   - `hidden` × fmt1 ∈ {xdot, json}: parse `harness/hidden.gv`, `ctx.layout`, render
     fmt1, then set `style=invis` and `color=red` in every node's and edge's `attrs`, then
     render json. Render 1 (json case only) and render 2 must equal
     `out/hidden.<fmt1>-json`, split on `/^== render \d+\n/m`.
   - `stored-input`: one render of `harness/stored-input.gv` against
     `out/stored-input.json`.
   - `subg subnofree`: parse `plans/post-16-1-followups-11/harness/T0/subg.gv`. Layout and
     render `g`; `freeLayout(g)`; layout and render `s`; layout and render `g` with no free
     of `s` (`subg-after-free.c` `subnofree`). All three renders are compared with
     `out/subg.s.subnofree.json`.
   - Each comparison follows AD-3: per object (the root, `objects` keyed by
     `name`+`_gvid`, `edges` keyed by `tail>head#k`), the six draw keys and `xdotversion`
     deep-equal native after `JSON.parse`, and `compareJson(port, native).pass` is true.
     Add one explicit assertion per case that names what it pins. For `hidden`, render 2's
     node `a` `_draw_` holds `#000000`, not `#ff0000` (it was not redrawn). For
     `subnofree`, render 3's object `s` has `xdotversion`.
   Run the file: it must pass on the base. If it fails, that is stop condition 4.
3. **Mutation check:** in the worktree, temporarily make json take draw keys only from
   this render's side table, as planning did: in `collectDrawLookup` delete
   `XDOT_ATTR_NAMES` keys from the `graphAttrs`/`node`/`cluster`/`edge` maps before the
   `applyDraws` overlay, and in `emitAttrs` delete them from `merged` before the overlay
   loop. Run the test. Every case must fail (planning: 6 diffs on `stored-input`, 7 on each
   `hidden` render 2, `s._draw_` on `subg` render 3). Revert with `git checkout --
   src/render/json.ts` and confirm `git diff --stat src/render/json.ts` is empty. Journal
   the failing counts. If any case still passes under the mutation, strengthen it before
   moving on.
4. **Comments (AD-2):** `src/render/dot.ts:107-108`, plus one sentence in `json.ts`
   (module header sourcing paragraph or `emitAttrs` doc). Edit in place; stop
   condition 6 applies.
5. Mark item 154 in `plans/post-16.1-followups/README.md` (line ~715)
   `**[DONE — issue #140: no defect; json prints stored draw strings through emitAttrs's
   base and the xdot overlay; pinned by json-stored-draws.test.ts]**`, in item 153's style.
6. File [followup-viewport.md](../followup-viewport.md): run
   `gh issue create --label follow-up --label bug` with its title and body. First check
   that no open issue covers `viewport` (`gh issue list --search viewport`). Journal the
   number.
7. Gates 1-6 (README), journal, `.agent-notes/issue-140.md`, then the squash.

## Write-set

- `src/render/json-stored-draws.test.ts` (new)
- `src/render/dot.ts` (the `drawStringsByObject` doc comment only)
- `src/render/json.ts` (one doc comment only; the step 3 mutation is reverted)
- `plans/issue-140-json-stored-draws/harness/out/*` (regenerated; must not change)
- `plans/issue-140-json-stored-draws/harness/*` (only to add a push-forward fixture)
- `plans/post-16.1-followups/README.md` (item 154 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README/overview checkboxes
- `.agent-notes/issue-140.md`

## Read-set

- `src/render/json.ts:1-60,190-330,395-420,505-560,640-722`
- `src/render/dot.ts:75-130`; `src/render/dot/write-back.ts:100-170`
- `src/render/json0-node-attrs.test.ts` (test shape), `test/golden/compare-json.ts:602+`
- `src/gvc/__fixtures__/subg-renders/subg-renders.ts` (the port's subgraph sequence)
- `plans/post-16-1-followups-10/harness/T15/subg-after-free.c` (modes)
- `~/git/graphviz/plugin/core/gvrender_core_json.c:57-68,336-362,695-705`;
  `~/git/graphviz/plugin/core/gvrender_core_dot.c:237-291,420-440`;
  `~/git/graphviz/lib/common/emit.c` (`emit_node`, `emit_edge`, `emit_clusters`)

## Interface contracts

None. No export changes; only comments change in `src/`.

## Acceptance criteria

- Given `hidden.gv` laid out once and rendered as xdot (or json), when every node and
  edge is then made `invis` and red and json is rendered again, then every object's draw
  keys equal native's render 2. They hold render 1's black strings, `\"` text included.
- Given `stored-input.gv`, when rendered as json, then the input draw strings of the
  invisible node, edge and cluster, and the subgraph's `_draw_`/`xdotversion`, print as
  native prints them.
- Given `subg.gv` in `subnofree` order, when render 3 is json, then `s` carries the
  `_draw_` and `xdotversion` it kept from render 2, as native does.
- Given the step 3 mutation, when the test runs, then every case fails; after the
  revert, `json.ts` is byte-equal to the base apart from the AD-2 comment.

## Bytediff

`src/` changes (comments only), so gate 5 applies. Build the base bundle from
`git archive 2b03bae9` in `$TMPDIR/issue140-base` (`node_modules` symlinked,
`npm run parser:regen`, `npm run build:js`) and the head bundle from the worktree. Copy
each `dist/index.js` to `$TMPDIR/issue140-{base,head}.mjs`. Record whether
`cmp` finds them identical (esbuild drops non-legal comments), then run:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue140-base.mjs $TMPDIR/issue140-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue140-bytediff.json
```

Expected: 0 changed jobs. Any change is stop condition 5.

## Targeted survey

How chosen: no output changes, so the survey checks the claim itself on real inputs.
It takes corpus inputs with objects a render does not draw (`style=invis`, `layers=`,
`layerselect`) and inputs that carry draw strings. At planning, a regex scan of the
applicable manifest entries (`/invis|layerselect|layers\s*=/` over each file) gave 35
ids, all dot ([harness/survey-ids.txt](../harness/survey-ids.txt): id, engine, path).
Add `test/golden/inputs/draw-replay-*.dot` (5 inputs with input draw strings; no corpus
input has any). Per input, run head only, one process each, 120 s cap:

```
npx tsx plans/issue-140-json-stored-draws/harness/draw-keys.mts <file> dot /tmp/ghl
```

Pass: `diffs` is 0 on every row where native finishes. For a row with diffs, run the
same probe against the base tree from gate 5 (`$TMPDIR/issue140-base`, with `REPO`
pointed there) on the same input.
A diff that also exists on the base and comes from layout, not draw-string sourcing, is
pre-existing. Name it and check it against `accepted-divergences-json.json`. It is not a
halt, but a new diff is. Journal the ids, the counts, and how they were chosen.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
