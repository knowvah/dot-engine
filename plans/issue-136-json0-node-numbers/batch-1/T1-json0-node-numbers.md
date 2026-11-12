# T1: json0 node pos, width and height as attach_attrs prints them

## Context

C (`plugin/core/gvrender_core_json.c:57-68`): `json_begin_graph` runs
`attach_attrs(g)` for FORMAT_JSON0. `attach_attrs_and_arrows`
(`lib/common/output.c:254-330`) sets each node's `pos` to `%.5g,%.5g` of `ND_coord`, or
to `odim` coordinates when `GD_odim >= 3`. It sets `height` to `%.5g` of
`PS2INCH(ND_ht)` and `width` to `%.5g` of `PS2INCH(ND_lw + ND_rw)`. `write_attrs` then
prints those strings.

The port: `Json0Renderer.endGraph` (`src/render/json.ts:681-685`) calls
`buildJson(g, false)` and runs `attachAttrs` afterwards (part 9 AD-12: the serializer
overlays the values, the write-back follows). With no draw lookup, `buildNodeObject`
(`json.ts:513-533`) sets the three values from `printNum(coord.x/y)`,
`printNum(info.width)` and `printNum(info.height)`. `printNum`
(`src/render/dot/xdot-ops.ts:77-83`) is the xdot draw-op number format. `attachNode`
(`src/render/dot/write-back.ts:32-45`) already formats the three as C does. So json0 now
prints values different from the ones its own write-back stores.

Mechanism, origin and evidence are in the [README](../README.md#objective). The planning
probe shows that the fix is the formatting: each differing value equals the port's
`-Tjson` value, and `-Tjson` reads the xdot path's write-back.

## Task (TDD)

1. **Setup.** File [../followup-anon-root-name.md](../followup-anon-root-name.md) with
   `gh issue create --label bug --label follow-up`, taking the title from the file and
   the body from the part after `---`. Journal the number and put it in the draft's first
   line. If `gh` is refused, journal that and leave the draft for the maintainer. Check
   or build the neato plugin dir (README, Oracle). Preflight `/tmp/ghl` for dot and the
   neato dir for neato. Run
   `GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<dir> bash plans/issue-136-json0-node-numbers/harness/regen.sh`,
   then `git diff --exit-code plans/issue-136-json0-node-numbers/harness/out`. If that
   shows a diff, it is stop condition 3.
2. **Red.** Create `src/render/json0-node-attrs.test.ts` with:
   - the SPDX header and `@see` lines (`gvrender_core_json.c:json_begin_graph`,
     `output.c:attach_attrs_and_arrows`);
   - a module-level `HARNESS_136` URL constant;
   - a `nodesOf(text)` helper that keeps objects with no `bb`, `nodes`, `subgraphs` or
     `edges` key.

   Cases:
   - `sizes`, `frac` (dot) and `dim3` (neato) × json0: for each node in the ref,
     `pos`, `width` and `height` are `toBe` the ref's strings. Use `it.each` over
     fixture × key, or one assertion per node with a message.
   - `frac` × dot: the json0 and `-Tjson` values of the three keys agree on every node.
   - The exported function (step 3), on node `c` of `sizes.gv` after a dot layout:
     `{ pos: '90,90', height: '0.34444', width: '0.5' }`. Read these from
     `harness/out/sizes.dot.json0` and cross-check before inlining them.

   Run the file. The fixture cases must fail on the base code (`.75` vs `0.75`), and the
   unit case fails on the missing export.
3. **Green (AD-1).** Export the function from `write-back.ts`; `attachNode` uses it.
   Replace `json.ts:520-522` with a call to it, keeping `eff`'s key order (pos, width,
   height). Drop `printNum` from `json.ts`'s import, then check
   `grep -na printNum src/render/json.ts` prints nothing and `wc -l src/render/json.ts`
   ≤ 723. Update the fallback's comment to name `attach_attrs` (`output.c:296-309`). Run
   the new file and every `src/render/json*.test.ts` and `src/render/dot*.test.ts` green.
4. Mark item 147 in `plans/post-16.1-followups/README.md` (line 705)
   `**[DONE — issue #136: json0 node pos/width/height via write-back's formatting]**`,
   in item 146's style.
5. Gates 1-6 (README), journal, `.agent-notes/issue-136.md`, then the squash.

## Write-set

- `src/render/dot/write-back.ts` (one exported function; `attachNode` uses it)
- `src/render/json.ts` (fallback lines 518-523, the `printNum` import)
- `src/render/json0-node-attrs.test.ts` (new)
- `plans/issue-136-json0-node-numbers/harness/out/*` (regenerated; must not change)
- `plans/issue-136-json0-node-numbers/followup-anon-root-name.md` (issue number only)
- `plans/post-16.1-followups/README.md` (item 147 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README and overview checkboxes
- `.agent-notes/issue-136.md`

## Read-set

- `~/git/graphviz/plugin/core/gvrender_core_json.c:57-68`;
  `~/git/graphviz/lib/common/output.c:254-330`
- `src/render/json.ts:395-415,505-535,675-690`; `src/render/dot/write-back.ts:1-90`
- `src/render/dot/attrs.ts:30-46` (`nodePosRaw`); `src/render/dot/xdot-ops.ts:70-83,335-355`
- `src/render/json-dup-cluster.test.ts:1-40` (harness URL pattern)
- `.agent-notes/issue-129.md` (plugin dir; `.mts` for temp scripts)

## Interface contracts

The exported function takes a laid-out `Node` and returns the three strings exactly as
`attachNode` stores them; it is pure (no attribute writes). `attachNode`'s observable
writes are unchanged. No public API (`src/index.ts`) change.

## Acceptance criteria

- Given `harness/sizes.gv`, when rendered `-Tjson0` with dot, then every node's `width`
  and `height` equal native's (`0.75`, `0.5`, `0.34444`, `2.0866`).
- Given `harness/frac.gv`, when rendered json0 with dot, then `pos` equals native's
  (`133.15,90`, not `133.148,90`).
- Given `harness/dim3.gv` (`dimen=3`), when rendered json0 with neato, then `pos` has
  three coordinates equal to native's.
- Given any graph, when rendered with a format other than json0, then output is
  byte-identical to the base's.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from `git archive 3c371f02` in
`$TMPDIR/issue136-base` (symlink `node_modules`, `npm run parser:regen`,
`npm run build:js`) and the head bundle from the worktree. Copy each `dist/index.js` to
`$TMPDIR/issue136-{base,head}.mjs`, then:

```
BD_FORMATS=svg,xdot,json,plain,cmapx,json0 npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue136-base.mjs $TMPDIR/issue136-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue136-bytediff.json
```

`render()` accepts `json0` at runtime (checked at planning), even though `OutputFormat`
omits it. Expected: the five default formats are identical on every job, and json0 jobs
change wherever a node has a value that is not an integer or 5-digit. Judge each changed
json0 job with a small script under `$TMPDIR` (`.mts`):
- parse the base and head stdout parts (before `\n--stderr--\n`);
- they differ only in node objects' `pos`/`width`/`height`;
- stderr is identical.

Then the values must equal native: they are covered by gate 6's run on the same ids. Any
other change is a halt.

## Targeted survey

How chosen: the path is every json0 render with nodes (plus `-Tjson` of a hand-built
graph whose xdot re-render fails, which no text input reaches). The value-relevant
branches are the number format (any node), `odim >= 3`, and `y_invert`. Ids:

- the 49 smoke ids × dot (`/tmp/ghl`), and × the seven neato-plugin engines for the
  ids in [planning's](../README.md#objective) neato set (paths matching
  `neato|pack|fdp|b7|shapes`, 13 ids);
- `2556` (the corpus' only `dim=3` input) × neato and fdp;
- 10 `rankdir` ids (`tree-doc-dotguide-*`, the scan in the journal) × dot;
- `harness/{sizes,frac,dim3}.gv` and an inline `digraph{y_invert=true; a->b; b->c; a->c}`.

Run `npx tsx plans/issue-136-json0-node-numbers/harness/node-fields.mts <file> <engine>
<gvbindir>`, one process per row. Pass: on head, `diffs` is `{}` and `vsJson` is 0 on
every row native finishes, with `graphs-b56` excepted (AD-3: journal its counts, which
must equal planning's 33 or fewer). Also run the probe on base for the record. Journal
the ids, row counts and any rows native did not finish (`1581` and `1328` fail natively
under dot).

## Observability

N/A: output formatting only.

## Rollback

Reversible: revert the commit.
