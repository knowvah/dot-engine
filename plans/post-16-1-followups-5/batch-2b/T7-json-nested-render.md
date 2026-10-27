# T7: `-Tjson` nested xdot render order (AD-18, item 78)

**Context:** C's `json_begin_graph` runs the nested xdot render first, so for a layered
graph the warning order is `layers not supported in xdot output` then `… json output`.
The port runs `collectDrawLookup` (`src/render/json.ts:240`) from `JsonRenderer.endGraph`,
after its own `beginGraph` warning: `json` then `xdot`.

**Task:** (1) Move the nested render to `JsonRenderer.beginGraph`, holding the draw lookup
on the renderer instance for `endGraph`. (2) Confirm no other `beginGraph`-time side effect
(colour warnings, missing-image warnings) now prints in the wrong order against
`$BASE/native/78*`. (3) Test: warning order for `digraph{layers="a:b";a}` -Tjson.

**Write-set:** `src/render/json.ts`, `src/render/json.test.ts`.
**Read-set:** `plugin/core/gvrender_core_json.c` `json_begin_graph`/`json_end_graph`;
`.agent-notes/post-16-1-followups-4.md` ("-Tjson runs a nested xdot render").

**Acceptance criteria:**
- *Given* `digraph{layers="a:b";a}` -Tjson, *then* stderr lines are `xdot` then `json`,
  equal to native.
- *Given* the json walk ids, *then* bytediff identical (json output and console).

**Observability:** N/A. **Rollback:** reversible.
