# T1: the job pad comes from the render device; node_in_box reads the clip

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md) AD-1..AD-4.
C references: `lib/common/emit.c:1636-1639` (`node_in_box`), `:1808` (the gate),
`:3241-3251` (the `pad=` read), `:3290-3304` (`init_job_pad`), `:1550-1564`
(`setup_page` clip). The `default pad` line in each of
`plugin/core/gvrender_core_{svg,dot,json,map}.c`.

## Steps (TDD)

1. **Red.** Write `src/gvc/node-in-box-pad.test.ts`:
   - `parseGraphPad(undefined, 0)` → `{0,0}`; `parseGraphPad('0.5', 0)` → `{36,36}`;
     `parseGraphPad('1,2', 4)` → `{72,144}`; `parseGraphPad('x', 4)` → `{4,4}`.
   - Each built-in renderer's `defaultPad` equals the AD-1 table.
   - Use the AC17 helper shape from `device-styling.test.ts:118-131`. Put a node with
     bbox `[102,108]×[95,105]` beside `job.bb = [0,100]²`. Give it the xdot renderer and
     the `job.clip` that `deviceClip` yields for pad 0: not drawn. Give it svg and the
     pad-4 clip: drawn. Then do the same through `render()` on a graph whose
     `g.info.bb` is set by hand, for `xdot`, `json`, `svg` and `cmapx`, and assert that
     the node's draw ops or area are present only where C's device pad covers it.
   - `deviceClip` on a cmapx renderer with no `pad=` equals `bb ± 4`. With `pad=0` it
     equals `bb`.
2. **Green.** Make the edits in the write-set (AD-1..AD-4). Every changed symbol keeps or
   gains its `@see` tag.
3. Update `device-styling.test.ts` AC17. Each case sets `job.clip` to the box it expects
   (`bb ± 4`) and keeps the outcome it expects (stop-condition-1 exception). Retitle the
   cases "within job.clip".
4. **Probe.** Search for a native input that puts a node outside `GD_bb` within the svg
   pad. Candidates: osage or patchwork packing, `-y` invert, layouts that abort with a
   partial bb (as `2825` does), and `size=` with `ratio=` where bb and coords are
   rescaled separately. Use the plugin dirs from the README. If you find one, add it
   under `plans/issue-141-nodeinbox-pad/harness/` with a `regen.sh` (mirror issue-139's)
   and native refs for xdot, svg, json and cmapx, and pin it in the new test. If you
   find none, write the note (which paths you checked and why each covers every node)
   in `.agent-notes/issue-141.md` and in follow-ups item 155's DONE text. Cap the
   search at 30 minutes.
5. Grep every reader of `job.pad`, `job.scale` and `job.zoom`. If one feeds non-svg,
   non-map output, apply stop condition 4.
6. Mark follow-ups README item 155 `[DONE — issue #141: ...]`.
7. Run gates 1-6, journal them, then commit and squash per the README.

## Write-set

| File | Change |
|---|---|
| `src/gvc/context.ts` | `RendererPlugin.defaultPad?: number` with `@see` |
| `src/gvc/viewport.ts` | `parseGraphPad(raw, fallback)`; `DEFAULT_GRAPH_PAD` constant |
| `src/gvc/device.ts` | `job.pad = parseGraphPad(pad, renderer.defaultPad ?? DEFAULT_GRAPH_PAD)` |
| `src/gvc/emit-xdot.ts` | `deviceClip` uses `job.pad` (AD-3) |
| `src/gvc/emit-gates.ts` | `nodeInBox` reads `job.clip` (AD-2) |
| `src/render/svg.ts` | `defaultPad = SVG_PAD` |
| `src/render/svg-helpers.ts` | only if `SVG_PAD` moves (push-forward) |
| `src/render/dot.ts` | `defaultPad = 0` on xdot (dot inherits); `deviceClip` call site |
| `src/render/json.ts` | `defaultPad = 0` on json and json0 |
| `src/render/map.ts` | `defaultPad = 4` on map renderers, 0 on plain and plain-ext |
| `src/gvc/node-in-box-pad.test.ts` | new |
| `src/gvc/device-styling.test.ts` | AC17 sets `job.clip` |
| `src/gvc/viewport*.test.ts` | existing `parseGraphPad` callers pass the fallback, if any |
| `plans/issue-141-nodeinbox-pad/**` | journal, harness if a probe is found |
| `plans/post-16.1-followups/README.md` | item 155 DONE |
| `plans/decision-journal.md`, `.agent-notes/issue-141.md` | session end |

Other `parseGraphPad` callers in `src/` (grep first) join the write-set only to pass the
fallback. Journal each one.

## Read-set

`src/gvc/job.ts` (`pad`, `clip`), `src/render/svg-graph.ts:70-90, 380-430`,
`src/render/map.ts:600-640`, `src/common/edge-in-box.ts`, `test/corpus/oracle-env.ts`,
`plans/issue-139-empty-graph-name/harness/regen.sh`.

## Interface contract

`RendererPlugin.defaultPad?: number`, in graph units (points), ≥ 0. `parseGraphPad(raw:
string | undefined, fallback: number): Point`. `nodeInBox(n, job)` reads `job.clip`, so
`job.clip` must be set before `renderNode` runs. `render` already does this at
`device.ts:481`.

## Bytediff

Build bundles of the base and the head (`npm run build:js`, copy `dist/index.js` to
`$TMPDIR/issue-141/{base,head}.mjs`). Run
`npx tsx test/tools/bytediff.ts <base>.mjs <head>.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt <out>.json`.
Expect no changed output. Any change has to equal native, or fall under the queue rules'
accepted-row exception.

## Targeted survey

Ids the change can reach are those where the pad or the clip matters. They are the
corpus inputs with `pad=` (`2082`, `2592`, `1879`), the corpus inputs with `size=`
(clip rounding; take up to 15 by grep, smallest first), `2825` (degenerate bb), and the
probe fixture if found. Run each in `svg`, `xdot`, `json` and `cmapx` under its own
engine (or `-Kdot`), comparing base and head against native. Record how you chose the
ids and the per-row result in the journal. A cap of 60 s per native run is fine. List
the capped rows.

## Acceptance criteria

- Given an xdot or json render with no `pad=`, when a node's bbox lies outside `GD_bb` by
  less than 4 pt, then it is not drawn, as C's pad-0 clip excludes it.
- Given an svg or cmapx render with no `pad=`, when the same node is rendered, then it is
  drawn (pad 4).
- Given `pad=0.5` on any device, when rendering, then `job.pad` is `{36,36}` and the
  clip is `bb ± 36` up to `setup_page` rounding.
- Given the smoke list and the targeted survey, when base and head run, then every changed
  output equals native.
- Given follow-ups item 155, when the mission ends, then it is marked DONE with the probe
  result.

## Observability

N/A. This is a library with no runtime telemetry. The evidence is the bytediff and the
survey JSON in `$TMPDIR`, summarized in the journal.

## Rollback

Reversible by reverting the squash commit (see [decisions.md](../decisions.md#rollback)).
