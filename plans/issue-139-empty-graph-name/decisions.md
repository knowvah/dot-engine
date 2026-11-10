# Decisions: issue #139

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. Nobody confirmed these; each names the rejected options and the evidence
so the maintainer can audit it.

### AD-1: the root header reads `g.anonymous`, not `g.name.length`

- **Decision:** in `writeHdr` (`src/render/dot/agwrite.ts:158`) the root's name part is
  `g.anonymous ? '' : xdotId(g.name) + ' '`. `xdotId('')` is `""` (`xdot-ops.ts:318-323`).
- **Rejected:** (a) a special case for `''` only: `Graph.anonymous` already records what
  cgraph's id map records, and the parser sets it (`builder.ts:478`). (b) Storing the
  root as `%1` in `g.name`: every writer and `graph.name` reader would change, and
  `graph.ts:47-55` documents why the port keeps `''`.
- **Evidence:** `write.c:338-355`: `hasName` is false only for a NULL name or one starting
  with `%`; then `write_canonstr(name)` and `sep = " "`. Native prints `digraph "" {` and
  `strict graph "" {` (`harness/out/root-empty.dot`, `strict-empty.dot`). Trial edit:
  both equal native.

### AD-2: a subgraph is anonymous only when its name starts with `%`

- **Decision:** `isAnonymous` (`agwrite.ts:96-99`) returns
  `g.name.charCodeAt(0) === 0x25`. The parser names every nameless subgraph `%N`
  (`builder.ts:294`), and internal subgraphs are named (`_new_rank`, `xxx`, component
  names). So `''` reaches the writer only from `subgraph ""` or `addSubgraph('')`, and
  both are named in C. This fixes the header (`subgraph "" {`) and
  `irrelevantSubgraph`: an empty `subgraph "" {}` is written, not inlined.
- **Rejected:** keeping `''` anonymous for subgraphs only: C's `write_hdr` and
  `irrelevant_subgraph` (`write.c`, `name && name[0] != LOCALNAMEPREFIX`) make no
  root/subgraph distinction.
- **Evidence:** `harness/out/sub-empty.dot` (`subgraph "" {` holding `a`, then a bare
  `{` for the anonymous one); `harness/out/sub-empty-bare.dot` (native writes
  `subgraph "" {` / `}` with no content). Trial edit: both equal native.

### AD-3: only a nameless root consumes anonymous id 1

- **Decision:** `builder.ts:483` becomes `if (ast.id == null) processor.advanceAnonId();`
  and its comment says why `''` is excluded.
- **Rejected:** none viable. The line's own comment says "an unnamed root", and `!ast.id`
  is true for `''` too, the JS-falsy trap.
- **Evidence:** `agopen("")` goes through `agmapnametoid` → `idmap(str="")`, a named
  mapping that leaves `ctr` alone (`id.c`). Native json for
  `digraph "" { subgraph { a } … }` names the subgraph `%1`, and the port `%3`
  (`harness/out/anonsub-empty.json`). Trial edit: equal.

### AD-4: `createGraph()` with no `name` is anonymous

- **Decision:** `createGraph` passes `anonymous = opts?.name === undefined` to `Graph`
  (`agopen(NULL)`). An explicit `name: ''` stays named (`agopen("")`). Update the JSDoc on
  `createGraph` and on `CreateGraphOptions.name`.
- **Rejected:** (a) leave it: after AD-1, every unnamed builder graph would print
  `digraph "" {`, a visible change for every API caller who omits `name`. (b) Make the
  writer print `""` only for parsed graphs: that is a port-only rule with no C
  counterpart.
- **Consequence (accepted):** an unnamed builder graph's cmapx/imap `<map id/name>` and
  neato message names become `%1` (via `agNameOf`). This is what native prints for
  `digraph {` and what `parse('digraph {}')` already gives in the port. When #185 lands,
  its json root `name` becomes `%1` too. No signature changes, no test pins the old cmapx
  value (`grep -rn 'createGraph()' src test` at planning: no cmapx/imap assertion).
  Reversible.
- **Evidence:** `graph.c:agopen` and `id.c:agmapnametoid` treat a NULL name as
  anonymous. `src/api/builder.ts:343` is the only API constructor of a root.

### AD-5: native refs live in `harness/out/`, made by `harness/regen.sh`

- **Decision:** six fixtures × {dot, xdot, json, cmapx} = 24 refs, generated at planning
  with the 16.1.0 oracle (`/tmp/ghl`, preflight passed). The executor re-runs `regen.sh`
  after preflight and requires `git diff --exit-code harness/out` (stop condition 3).
  `root-anon.gv` is the control: it already equals native in dot, xdot and cmapx and must
  stay so. Its json root `name` is the known #185 gap, so the test does not assert it.
- **Rejected:** hand-written expected strings. Refs must come from native.

## Baseline

On `c0a8aeb6`, 2026-11-10 during planning: see the Phase 8 row in
[decision-journal.md](decision-journal.md). No lint script exists; typecheck is the
static gate.

## Rollback

Reversible: revert the one commit. Output changes only for inputs with an explicit
`""` root or subgraph name (four corpus ids: `1864`, `1896`, `2621`, `2734`), for
anonymous subgraph names under such a root (json), and for the cmapx/imap/message name
of an unnamed `createGraph()` graph (AD-4).
