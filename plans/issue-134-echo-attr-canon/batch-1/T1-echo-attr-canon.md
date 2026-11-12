# T1: echoed attribute values go through agstrcanon

## Context

agwrite prints each attribute as `name=` + `_write_canonstr(value, chk=true)`
(`lib/cgraph/write.c:290-292` graph dicts, `:502-504` node/edge values), i.e.
`agstrcanon`: html values as `<...>`, plain values through `_agstrcanon`, which quotes
only when needed and inserts backslash-newline at `Max_outputline` (`write.c:170-190`;
128, or the root's `linelength`, set in `agwrite` `:670-677` and restored `:692`).

The port: `graphInputParts`, `objInputParts`, `computedPart`, `dictParts` all call
`agstrcanon` (`src/render/map.ts:177`). `echoAttr` (`src/render/dot/attrs.ts:359-363`)
and `echoGraphAttr` (`:393-398`) do not: they print `key="` + `agcanonEscape(v)` + `"`.
They serve values the layout did not recompute, so the input's own value is written
back: `bb` of a subgraph (`agwrite.ts:143`), edge `pos` when unrouted (`:421`), node
`xlp` without an xlabel (`:442`), node `rects` when not a record (`:455`), edge
`lp`/`xlp`/`head_lp`/`tail_lp` without the label (`:494-503`), and cluster/graph
`lp`/`lwidth`/`lheight` when the label gate fails (`attrs.ts:412-420`).

`withLinelength` (`src/render/dot/agwrite-linelength.ts:50-58`) already wraps the whole
write, so `agstrcanon` sees the right `Max_outputline`.

## Task (TDD)

1. **Native refs:** build the patchwork plugin dir (README, Oracle). Preflight both dirs
   (`oraclePreflight(dot, '/tmp/ghl', 'dot')`, `oraclePreflight(dot, <dir>,
   'patchwork')`). Run
   `GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<dir> bash plans/issue-134-echo-attr-canon/harness/regen.sh`,
   then `git diff --exit-code plans/issue-134-echo-attr-canon/harness/out` (stop
   condition 3 otherwise). Journal the result.
2. **Red:** create `src/render/dot/echo-attr-wrap.test.ts` (SPDX header, `@see` lines,
   module-level `HARNESS_134` URL constant, `read`/`renderRef(name, engine, fmt)`
   helpers as in `long-string-wrap.test.ts`). Cases:
   - `labels`, `labels-ll` × {dot, xdot}, engine dot: output equals `out/<name>.dot.<fmt>`
     (regression pin; passes before the fix).
   - `echo`, `echo-ll` × {dot, xdot}, engine dot: equals `out/<name>.dot.<fmt>`.
   - `echo` × {dot, xdot}, engine patchwork: equals `out/echo.patchwork.<fmt>` (covers
     edge `pos`, echoed only by an engine that does not route).
   - Unit cases on the helpers: `echoAttr(new Map([['lwidth','1.5']]), 'lwidth')` is
     `['lwidth=1.5']`; a 300-byte `pos` value contains `\\\n`; an html value
     (`HTML_STRING_MARK + 'x'`, `src/common/html-string.ts:12`) prints `key=<x>`; `echoGraphAttr` with an empty local
     and absent inherited value still prints `key=""`.
   Run the file; the six echo cases and the quote/wrap unit cases must fail.
3. **Green (AD-1):** both helpers return `[key + '=' + agstrcanon(v)]`; update their doc
   comments. Run the file green; run `attrs.branch.test.ts` and
   `dot-write-ports-eager.test.ts`.
4. **AD-2:** re-run `grep -rn "agcanonEscape\|isEscapeSeq" src test`; if only the
   expected hits remain, delete both functions from `xdot-ops.ts`, their `describe`
   blocks, import names and header-comment mentions from `xdot-ops.branch.test.ts`, the
   `agcanonEscape` import from `attrs.ts`, and fix the comment at `src/render/dot.ts:304`
   (`...survive as-is through agstrcanonText on serialize (drawAttr)`).
5. Mark item 145 in `plans/post-16.1-followups/README.md` (line ~700)
   `**[DONE — issue #134: echoAttr/echoGraphAttr use agstrcanon; labels already wrapped]**`,
   in item 142's style.
6. Gates 1-6 (README), journal, `.agent-notes/issue-134.md`, then the squash.

## Write-set

- `src/render/dot/attrs.ts` (`echoAttr`, `echoGraphAttr`, their docs, the import line)
- `src/render/dot/xdot-ops.ts` (delete `isEscapeSeq`, `agcanonEscape`)
- `src/render/dot/xdot-ops.branch.test.ts` (their cases, import, header comment)
- `src/render/dot.ts` (the comment at line 304 only)
- `src/render/dot/echo-attr-wrap.test.ts` (new)
- `plans/issue-134-echo-attr-canon/harness/out/*` (regenerated; must not change)
- `plans/post-16.1-followups/README.md` (item 145 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README/overview checkboxes
- `.agent-notes/issue-134.md`

## Read-set

- `src/render/dot/attrs.ts:280-420`; `src/render/dot/agwrite.ts:40-90,135-150,410-505`
- `src/render/map.ts:140-245` (`agstrcanon`, `agstrcanonText`)
- `src/render/dot/agwrite-linelength.ts`; `src/render/dot/xdot-ops.ts:380-425`
- `src/render/dot/long-string-wrap.test.ts` (test shape to mirror)
- `src/render/dot/attrs.branch.test.ts:60-90`; `src/render/dot-write-ports-eager.test.ts:50-62`
- `~/git/graphviz/lib/cgraph/write.c:120-260,280-295,480-510,660-695`
- `git show 45df4e28` (part 11 T3's precedent)

## Interface contracts

`echoAttr(attrs, key): string[]` and `echoGraphAttr(g, key): string[]` keep their
signatures and skip rules; only the text of a returned part changes. `agcanonEscape` and
`isEscapeSeq` are removed from `xdot-ops.ts`'s exports (no importer outside its own
branch test; confirm with the grep in step 4). No public API (`src/index.ts`) change.

## Acceptance criteria

- Given `harness/echo.gv`, when laid out with dot and written as dot or xdot, then the
  output equals native's ref (long values wrapped at 128, `lwidth=1.5`, `lheight=2`).
- Given `harness/echo-ll.gv` (`linelength=70`), when written, then it equals native's
  ref (wrapped at 70).
- Given `harness/echo.gv` under patchwork, when written as dot or xdot, then the echoed
  edge `pos` and the rest equal native's ref.
- Given `harness/labels.gv` / `labels-ll.gv`, when written, then output still equals
  native (unchanged by the fix).
- Given `src` and `test`, when grepping `agcanonEscape|isEscapeSeq`, then nothing matches.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from `git archive a0eb4de3` in
`$TMPDIR/issue134-base` (`node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`) and the head bundle from the worktree; copy each `dist/index.js` to
`$TMPDIR/issue134-{base,head}.mjs`, then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue134-base.mjs $TMPDIR/issue134-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue134-bytediff.json
```

Expected: identical on nearly every job (smoke inputs are rarely re-fed layouts). Any
changed job must equal native (the bytediff report names it; render it with the oracle
and compare); otherwise halt.

## Targeted survey

How to choose: the code path is a value echoed from the input, so only inputs that
carry `bb`, `lp`, `lwidth`, `lheight`, `rects`, `xlp`, `pos`, `head_lp` or `tail_lp`
can change. Take the corpus manifest entries (`test/corpus/corpus-manifest.json`,
status `applicable`) whose file contains any of `lwidth=`, `lheight=`, `rects=`, `xlp=`,
`head_lp=`, `tail_lp=` (36 files at planning: `*/b36.gv`, `*/rankdir_dot*.gv`,
`*/record*.gv`, `*/arrows_dot.gv`, `*/ports_dot.gv`, `share|windows/{alf,b491,b786,
hashtable,newarrows,structs,tree,triedds}.gv`, ...), plus the ids named in the
maintainer's comment on #134 (`linux.i386-b36`, `share-b51`, `windows-crazy`, the
`*rankdir_dot*` set). Render each with engines dot and patchwork, formats dot and xdot,
with base, head and native. Pass: every row where head differs from base has head equal
to native, or equal to native modulo a difference also on base (name it); no row where
base equals native and head does not. Journal the ids, how chosen, and counts.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
