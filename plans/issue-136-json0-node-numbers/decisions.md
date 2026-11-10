# Decisions: issue #136

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-10.
Nobody confirmed these. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: one function formats a node's layout triple, for write-back and json

- **Decision:** in `src/render/dot/write-back.ts`, export a pure function, e.g.
  `nodeLayoutAttrs(n: Node): { pos: string; height: string; width: string }`, returning
  `nodePosRaw(n)`, `gfmt5(info.ht / 72)` and `gfmt5((info.lw + info.rw) / 72)`, with
  `@see lib/common/output.c:296-309`. `attachNode` calls it and keeps its `set` order
  (pos, height, width). `buildNodeObject`'s fallback (`src/render/json.ts:518-523`)
  calls it and keeps its own order (pos, width, height), so json0's key order does not
  change. Drop `printNum` from `json.ts`'s import (no other use there; re-grep with
  `grep -na printNum src/render/json.ts`). `printNum` stays: xdot-ops still uses it.
- **Rejected:**
  - (a) Inline `gfmt5`/`nodePosRaw` calls in `json.ts`. That makes a second copy of
    output.c:296-309's formatting, and `json.ts` is over the 500-line hook limit.
  - (b) Run `attachAttrs` before `buildJson`, as C orders it, and drop the fallback for
    json0. That also adds graph/cluster `bb` and edge `pos` to json0, which is #184
    (open, `follow-up`, not `queue:ready`; the maintainer decides what joins the
    queue). It also reverses part 9 AD-12's attach-after-write design
    (`write-back.ts` header) for one renderer, and changes key order.
  - (c) Change `printNum`. It is the xdot draw-op format and is right where it is used.
- **Evidence:** the probe (README) shows every differing field on 60 smoke id×engine runs,
  except `graphs-b56`, equals the port's `-Tjson` value. That value comes from the xdot
  render's write-back, which is the same formatting. `nodePosRaw` already handles
  `odim >= 3` (`src/render/dot/attrs.ts:38-46`). `harness/dim3.gv` and `2556` (neato)
  print three coordinates natively and in the port's `-Tjson`.

### AD-2: what "byte-equal node fields" means

- **Decision:** the issue's done-condition covers the string values of each json0 node
  object's `pos`, `width` and `height` (the `printNum` fallback's three keys). It does
  not cover the whole json0 text. The port's json is a `JSON.stringify` tree, and the
  structural comparator is the json bar (`json.ts` header comment; #135 AD-4). Key order
  and the root `name` stay as they are.
- **Rejected:** byte-comparing the whole json0 output. No input is byte-equal today,
  because of key order, the root `name` (follow-up below) and the missing `bb`/edge
  `pos` (#184), and none of those is #136.
- **Evidence:** issue #136 names `.5`/`125.354` and "the `printNum` fallback for json0
  nodes"; the planning diff of `harness/sizes.gv` (port vs native json0) shows the other
  differences.

### AD-3: `graphs-b56` is excepted

- **Decision:** `graphs-b56`'s 33 differing dot fields (width 16, height 17, pos 17,
  label 7, rects 2) are not this issue. The gate-6 pass condition excludes them by id,
  and the journal records them.
- **Evidence:** on those nodes the port's `-Tjson` value differs from native the same way
  (e.g. `Torwaechter.width` native `1.4107`, port json `1.2487`). The label itself
  differs (`Torwï¿½chter` native, `Torw�chter` port). b56 is in the known non-ASCII label
  class: native `canon` prints freed memory for those labels
  (`plans/post-16.1-followups/README.md` item 124; `.agent-notes/gv16-triage.md:122`).
  `test/corpus/PARITY-JSON.md:211` already lists b56 json.
- **Rejected:** a follow-up issue. The class is known and documented.
- **Superseded at execution (2026-11-10):** the 33 fields were a probe artifact. The probe
  piped the Latin-1 file to native as a UTF-8-decoded string. With the file path as native's
  input `graphs-b56` x dot equals native on every node field, so no exception is used. See
  the journal's `probe fix` row.

### AD-4: native json0 refs in `harness/out/`, one new test file

- **Decision:** `harness/regen.sh` writes native `-Tjson0` stdout for `sizes.gv` and
  `frac.gv` (dot) and `dim3.gv` (neato, `dimen=3`). These were generated at planning,
  3 refs. New test `src/render/json0-node-attrs.test.ts` renders each fixture with
  `renderFormat(..., 'json0', engine)`. For every node object in the ref, it asserts
  the port's `pos`, `width` and `height` strings are `toBe` the ref's. Add one unit case
  for the exported function on a laid-out node, and one that the `-Tjson` and json0
  values agree on `frac.gv`.
- **Rejected:**
  - Hand-written expected values. The refs come from native.
  - Adding cases to `json.branch.test.ts`, which is 675 lines (the complexity hook skips
    tests, but it is already the json catch-all).
- **Evidence:** #135's `json-dup-cluster.test.ts` reads `plans/` harness refs the same
  way (`new URL('../../plans/...', import.meta.url)`).

## Follow-ups found at planning

The planner's `gh issue create` was refused by the session's permission classifier. T1
step 1 files the draft (queue rules: label `follow-up`, not `queue:ready`):

- [followup-anon-root-name.md](followup-anon-root-name.md): json/json0 print
  `"name": ""` for an anonymous root, where native prints `"%1"` (`agnameof`).

## Baseline

On `3c371f02`, 2026-11-10 during planning: `npm run typecheck` exit 0; `npm test` exit
0, 561 files, 13266 tests. There is no lint script; typecheck is the static gate.

## Rollback

Reversible: revert the one commit. Output changes only in json0 node `pos`, `width` and
`height` strings. A hand-built graph whose xdot re-render fails gets the same change
under `-Tjson`, which no text input reaches.
