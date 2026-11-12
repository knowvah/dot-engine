# T1: print names through `agstrcanon`

**Context.** `xdotId` (`src/render/dot/xdot-ops.ts:318`) reimplements canonicalization with
two regexes. C prints these names through `agstrcanon`. Decisions:
[AD-1, AD-2, AD-3](../decisions.md).

**Write-set:** see [overview](overview.md). `src/render/dot/agwrite.ts` must not change: it
is over the 500-line write limit, and no change is needed there.

**Read-set:** `lib/cgraph/write.c:113-259,318-358,515-531`; `lib/cgraph/refstr.c:401-415`;
`lib/cgraph/scan.l:233`; `lib/cgraph/id.c:43-66`; `src/render/map.ts:168-262`;
`src/render/dot/xdot-ops.ts:295-330`; `src/parser/builder.ts:472-480`;
`src/render/dot/echo-attr-wrap.test.ts` (test shape).

## Steps

1. Commit this brief. Preflight the oracle (`oraclePreflight`, `/tmp/ghl`, engine dot). Run
   `GVBINDIR=/tmp/ghl bash plans/issue-167-name-canon/harness/regen.sh`, then
   `git diff --exit-code plans/issue-167-name-canon/harness/out`. A difference is stop
   condition 3.
2. **Red.** Add `src/render/dot/name-canon.test.ts`: for each of `names`, `names-ll`,
   `names-ll0`, `odd`, `root-keyword`, `root-html`, `root-nonascii` and each of `dot`,
   `xdot`, parse the fixture on a fresh context, lay out with `dot`, render, and `toBe` the
   ref. Read fixtures and refs as `'utf8'`, not `'latin1'`. Expect 12 of 14 to fail
   (`names-ll0` passes on the base). Add to `src/render/dot/xdot-ops.test.ts`: `node` and
   `Graph` quoted, `é` bare, `a\"b` not re-escaped, `-.` bare, an html-marked name printed
   `<x>`, an html-marked name ending in `\` not padded. Add to `src/parser/parser.test.ts`:
   the root of `digraph <h g> {}` is named `h g`, and a node `<n>` and a subgraph `<s>`
   keep the marker. Journal the red count.
3. **Green, AD-1 and AD-3.** In `xdot-ops.ts`, import `agstrcanon` from `'../map.js'` and
   `isHtmlValue` from `'../../common/html-string.js'`:

   ```ts
   export function xdotId(s: string): string {
     if (isHtmlValue(s)) return agstrcanon(s);
     const oddTrailingRun = /\\*$/.exec(s)![0].length % 2 === 1;
     return agstrcanon(oddTrailingRun ? `${s}\\` : s);
   }
   ```

   Rewrite its doc comment: `@see lib/cgraph/write.c:write_nodename`, `:write_hdr`,
   `:write_canonstr`. Keep the paragraph on the one deliberate divergence.
4. **Green, AD-2.** In `builder.ts:478`, build the root from `ast.id` with the marker
   stripped, using `isHtmlValue` and `htmlValueContent`. Comment with the mechanism and
   `@see lib/cgraph/scan.l:233`, `lib/cgraph/id.c:52`. Keep the anonymity argument as
   `ast.id == null`.
5. Mark item 159 DONE in `plans/post-16.1-followups/README.md`.
6. File the two issues in [follow-ups.md](../follow-ups.md) after checking they do not
   already exist.
7. Run the gates, journal them, then squash ([README](../README.md#branch-and-commits)).

## Gate 5: smoke bytediff

Build `npm run build:js` at the base (from `git archive 022695a2` in `$TMPDIR`) and at the
head, and copy each `dist/index.js` to `$TMPDIR`. Run
`npx tsx test/tools/bytediff.ts <base>.mjs <head>.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt <out>.json`.

**Expected:** only `graphs-russian` changes, in `dot` and `xdot` output, because its 11
non-ascii names stop being quoted. On the `dot` engine those outputs equalled native at
planning. Other engines were not checked: compare each changed row with native, and list
any covered by the accepted-row exception in the report under "accepted-row changes".

## Gate 6: targeted survey

**How the ids were chosen:** a scan at planning parsed all 950 applicable corpus files
(3 parse errors) and compared old and new `xdotId` on every node and graph name. Seven ids
change: `1367`, `1472`, `1724`, `2064`, `2193`, `graphs-russian`,
`tree-graphs-directed-russian`.

Render each with engine `dot` on `-Tdot` and `-Txdot` and compare with native, reading the
input as `test/tools/bd-job.ts` does (UTF-8, else latin1). Also run `2193` on all eight
engines, the issue's own evidence: `/tmp/ghl` has only `dot`, so build a 16.1.0 dir per
`.agent-notes/issue-129.md`.

Expected, from the trial on the `dot` engine:

| Id | Expected |
|---|---|
| `1367`, `1724`, `2193`, `graphs-russian`, `tree-graphs-directed-russian` | byte-equal to native |
| `1472` | not byte-equal, on base and head alike: bb width 5340.2 vs native 5335.2 (invalid UTF-8 input; survey verdict `oracle-error`). Confirm the head's diff against native is smaller than the base's and that only name lines changed. This row counts as a pre-existing difference, not a head regression. |
| `2064` | not run at planning: a 280 s limit expired. Survey verdict `oracle-error` (`oracle exit null`). Cap each render at 600 s in the background. If native does not finish, journal it and rely on the 13,719 html names that the scan flagged, plus the `odd` fixture. |

## Acceptance criteria

- Given the `names` fixture, when rendered `-Tdot` and `-Txdot`, then the output is
  byte-equal to native, wrapped at 128 bytes.
- Given `linelength=70` and `linelength=0`, when rendered, then the output is byte-equal to
  native.
- Given `odd`, `root-keyword`, `root-html` and `root-nonascii`, when rendered, then the
  output is byte-equal to native and contains no U+0001.
- Given a programmatic non-html name ending in one backslash, when printed, then the
  closing quote is not escaped.

**Observability:** N/A, no new observable operations.

**Rollback:** Reversible; revert the commit.

**Interface contracts:** `xdotId(s: string): string` keeps its signature. A root `Graph`'s
`name` never starts with `HTML_STRING_MARK`.
