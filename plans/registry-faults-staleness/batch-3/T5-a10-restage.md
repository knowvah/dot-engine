# T5 — A10 into the registries, re-stage, regenerate

## Context

A10 (`docs/known-divergences.md:1109`): `2784` on circo/twopi/neato/fdp/sfdp
throws `Map maximum size exceeded` (faithful pack int arithmetic needs ~2.0e9
cells; V8 `Map` caps at 2^24). After batch 2 the registries can say so
(AD-1), the engine dashboards join it at report time (T3), and the json/map
walkers mark it `accepted` at walk time (T4). Committed rows today:
`parity-{circo,twopi,neato,fdp,sfdp}.jsonl` → `port-error` (err as above);
`json-parity-circo.jsonl` → `port-error`; `map-parity-{circo,twopi,neato,fdp,sfdp}.jsonl`
→ `port-error`. json on neato/fdp/sfdp/twopi and every plain walk are
`oracle-error` (no acceptance needed); osage/patchwork/dot pass.

## Task

1. **Registries** — add exactly 11 entries:
   - `accepted-divergences-engines.json`: under each of circo, twopi, neato,
     fdp, sfdp, key `"2784"`: `{ "class": "A10", "verdict": "port-error",
     "errIncludes": "Map maximum size exceeded", "bound": "<one line: native
     2,011,656,764 cells / 482 s / 67 GB RSS; V8 Map cap 2^24>", "ref":
     "known-divergences.md#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines" }`
     (the slug the locale pages pin with `{#…}`; T6 keeps the heading text).
   - `accepted-divergences-json.json`: `{ id: "2784", engine: "circo", verdict,
     errIncludes, opClass: "port-error", delta: "—", rationale: "A10: …" }`.
   - `accepted-divergences-map.json`: the same shape for circo, twopi, neato,
     fdp, sfdp.
   Update each registry's `comment` field to mention the fault shape (one
   sentence). Run `npx vitest run test/corpus/registry-staleness.test.ts
   test/corpus/accepted-divergences-engines.test.ts` — green before re-walking
   (a `port-error` row already satisfies a `port-error` entry).
2. **Oracle cache precheck (STOP 5 on any miss).** Use the GVBINDIR the 16.1
   walks used (cache signatures include the path):
   `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
   If the dir is missing, recreate it with symlinks to
   `~/git/graphviz/build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*.dylib`
   (all three names per plugin) and run `GVBINDIR=<dir> ~/git/graphviz/build/cmd/dot/dot -c`.
   Before each walk, confirm the cache dir it prints contains `2784.json`
   (json) or `2784.cmapx` + `2784.imap` (map). Known: json circo cache is
   `$TMPDIR/dot-corpus-json-oracle/circo/f35e5fd87997/`.
3. **Re-walk only 2784.** For each of the six JSONL files, delete the
   `"id":"2784"` row (python3), then resume the walk into the same file:
   `GVBINDIR=<dir> npx tsx test/corpus/json-walk.ts circo --survey test/corpus/json-parity-circo.jsonl`
   and `GVBINDIR=<dir> npx tsx test/corpus/map-walk.ts <engine> test/corpus/map-parity-<engine>.jsonl`
   (confirm the exact CLI from each file's header before running; the walk
   resumes, rendering only the deleted id). Each must rewrite its summary
   `.json`. Verify with a per-id diff that **only** the 2784 row changed
   (`port-error` → `accepted`, `errMsg` kept) — anything else is STOP 6.
4. **Regenerate dashboards**: `npx tsx test/corpus/parity-report.ts`, then
   `npx tsx test/corpus/json-dashboard.ts` and `map-dashboard.ts`. Inspect
   `git diff --stat test/corpus`: allowed changes are 2784/A10 rows and counts,
   and the 1879/1435 roster lines retired in T2. Revert anything else and
   STOP 6 if it is not explained.

## Write-set

- `test/corpus/accepted-divergences-{engines,json,map}.json`
- `test/corpus/json-parity-circo.{json,jsonl}`
- `test/corpus/map-parity-{circo,twopi,neato,fdp,sfdp}.{json,jsonl}`
- Regenerated `test/corpus/PARITY*.md` pages touched by the above

## Read-set

- `docs/known-divergences.md:1109-1132` (A10 text, for `bound`/`rationale`)
- Existing entry examples: `accepted-divergences-engines.json:1-30`,
  first two `divergences` of `accepted-divergences-json.json`
- `test/corpus/json-walk.ts:1-60`, `test/corpus/map-walk.ts:1-60` (CLI, cache)
- `.agent-notes/t14-roster-additions.md` (2784 background)
- `../decisions.md#ad-1`, `#ad-3`, `#ad-4`

## Acceptance criteria

- Given the 11 A10 entries, when the staleness and registry tests run, then
  they pass (before and after the re-walk).
- Given the six re-walks, then each 2784 row reads `accepted` with `errMsg`
  `Map maximum size exceeded`, and no other row in any JSONL changed.
- Given `parity-report.ts` re-run, then `PARITY-{circo,twopi,neato,fdp,sfdp}.md`
  list 2784 in the accepted table (class A10) and not in the faults table, and
  `PARITY.md` moves 5 from port-faults to accepted on those engine tracks.
- Given the json/map detail pages and `PARITY.md` format rows, then circo json
  and the five map tracks count 2784 as accepted.
- `git diff main -- src` is empty.

## Quality bar

All gates green (`npm run typecheck`, `npx vitest run test/corpus test/docs`,
`bash test/golden/gates.sh`); no native render started (cache hits only).

## Observability

N/A — the regenerated dashboards are the observable output.

## Rollback

Reversible — revert the commit (re-walked rows return to their prior text).

## Commit

`docs(corpus): accept A10 port-errors in the walk registries`
(body: the 11 entries, the six re-walked rows, cache-hit evidence).
