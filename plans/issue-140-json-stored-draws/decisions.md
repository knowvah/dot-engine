# Decisions: issue #140

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-10.
Nobody confirmed these. Each names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: no behaviour change; pin the done condition with native refs

- **Decision:** the issue's done condition ("a no-free second json render of a graph
  with undrawn objects equals native") already holds at `2b03bae9`. T1 adds a
  regression test against native refs and changes no output.
- **Rejected:** (a) rewriting `collectDrawLookup` to read `renderedDraws` directly.
  No output would change, and a fix with no observed discrepancy has no mechanism to
  state (CLAUDE.md diagnosis rule). (b) Parking the issue for a ruling. The done
  condition is objective, and planning measured it as met. A pin plus "no defect" in the
  follow-ups ledger closes it on its own terms. (c) Closing with no test: nothing would
  then stop a later json refactor from dropping the base layer.
- **Evidence:** README "Planning evidence". C: `write_attrs`
  (`gvrender_core_json.c:342-362`) prints `agxget`; `xdot_end_node`/`xdot_end_edge`
  agxset only non-empty buffers, `xdot_end_cluster` always sets `_draw_`, and
  `xdot_end_graph` sets the render root's `_draw_`/`xdotversion`
  (`gvrender_core_dot.c:237-291,427-438`). `emit_node` returns before `emit_begin_node`
  for `invis` (`lib/common/emit.c:emit_node`). Port: `emitAttrs` base is
  `nodeEffectiveAttrs(n)` / `e.attrs` / `graphEffectiveAttrs` (`json.ts:505-546,575+`),
  and the overlay is the re-parsed xdot text (`json.ts:250-280`).

### AD-2: correct the two comments that name the side table as json's source

- **Decision:** `src/render/dot.ts:107-108` (`drawStringsByObject`): this render's
  strings, which `-Tjson` lays over the re-parsed xdot text only to keep `"` lossless
  (id 2239). Stored strings reach json through that text (`renderedDraws`) and the
  object's own attributes. In `src/render/json.ts`, add one sentence to the module
  header's "Draw-op / layout-attr sourcing" paragraph or to `emitAttrs`'s doc (lines
  388-396): an object this render does not draw prints the stored strings from `base`,
  as `write_attrs` prints `agxget`. Edit in place; neither file grows (stop condition 6).
- **Rejected:** leaving them. The `dot.ts` comment is where follow-up 154 came from.

### AD-3: native refs in `harness/out/`, made by `harness/regen.sh`; the test reads them

- **Decision:** four refs generated at planning: `hidden.xdot-json`, `hidden.json-json`,
  `stored-input.json` and `subg.s.subnofree.json`. The executor re-runs `regen.sh` after
  preflight and requires `git diff --exit-code harness/out` (stop condition 3). The test
  (`src/render/json-stored-draws.test.ts`) replays each sequence on the port. It
  compares, for every object (root, `objects`, `edges`) of every json render, the keys
  `_draw_`, `_ldraw_`, `_hdraw_`, `_tdraw_`, `_hldraw_`, `_tldraw_` and `xdotversion` by
  `JSON.parse` deep equality. It also runs `compareJson(port, native).pass` on each json
  render.
- **Rejected:** hand-written expected strings; the refs must come from native. Reusing
  `__fixtures__/subg-renders/subg-renders.ts`: its `SubgFmt` is `xdot | svg` and its modes
  are `root | nofree`. Widening it touches part 11's fixture for one case. The test
  replays `subnofree` itself in about six lines.

### AD-4: file the viewport gap as a follow-up, do not fix it here

- **Decision:** T1 files [followup-viewport.md](followup-viewport.md) with label
  `follow-up` (queue rules: new defects are `follow-up`, not `queue:ready`).
- **Rejected:** fixing it in this mission. It is unrelated to stored strings, touches
  `src/gvc` page setup for every renderer, and no corpus input sets `viewport`.
- **Evidence:** `viewport="60,60,1,30,30"` on `a -> b -> c -> d`: native svg is 60×60pt and
  draws one node; the port's is 62×260pt and draws four. `xdot` and `json` differ the same
  way. No `src/` file reads the `viewport` attribute (grep `'viewport'`).

## Rollback

Reversible: revert the one commit. It adds a test, fixtures and plan docs and edits two
comments. No output changes (gate 5 checks this).
