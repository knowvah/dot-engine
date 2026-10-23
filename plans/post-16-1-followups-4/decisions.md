# Architecture decisions (locked 2026-10-23)

Approved by the user ("approve all recommendations"); AD-6 widened at Phase 5 ("looks
fine"). A task that needs to contradict one stops (stop condition 4). Part 3's AD-4
(`render-state.ts`) and AD-5 (`agerr.ts`) are existing architecture this mission builds on.

## AD-1: commits unsigned and local; user re-signs at the end
- **Context:** every commit is SSH-signed with a YubiKey (PIN + touch); an agent shell
  cannot answer it and a signing `git commit` hangs.
- **Decision:** `git -c commit.gpgsign=false commit`; never push, open a PR, sign or touch
  `main`. T29 hands the user `git rebase -f main` (repo-local `commit.gpgsign=true`
  re-signs every replayed commit).
- **Consequences:** one interruption at the end.

## AD-2: one branch, one PR, merge commit
- **Decision:** branch `chore/post-16-1-followups-4`, one commit per task, one PR merged as
  a merge commit (task SHAs survive). semantic-release reads every task commit: only T26 is
  `feat` (minor release); no `BREAKING CHANGE`.

## AD-3: diagnosis budget
- **Decision:** ~2 h per item/site, then park with mechanism / origin / causal chain /
  ruled out / next instrument, and continue.
- **Consequences:** a parked item is a valid outcome; an undiagnosed one is not.

## AD-4: FMA evidence bar (items 48–51)
- **Decision:** part 3's AD-6 unchanged: fuse only where the 16.1 disassembly (or a clang
  `-O2` harness of the same expression, confirmed against the disassembly) shows
  `fmadd`/`fmsub`/`fnmsub` for that exact expression. One commit per site; output changes
  only toward the oracle. Item 51's evidence comes from the GTS library the oracle links
  (`otool -L` on the neato_layout plugin).
- **Consequences:** a site with no fusion is recorded as such and left unchanged.

## AD-5: part-3 tools are committed under `test/tools/`
- **Context:** `bytediff`, `bd-job`, `probe` and the fuzz `classify` tool exist only in a
  previous session's `/tmp` scratchpad; items 65 and 66 change them.
- **Decision:** T0 copies them verbatim into `test/tools/`; T1 converts them to tsx scripts
  (run with `npx tsx`), adds unit tests for their pure parts, and makes the 65/66 fixes.
  If the scratch copies are gone, T0 rebuilds them from part 3's T0 spec and journal.
- **Consequences:** later missions start from committed tools.

## AD-6: `mode=hier` is ported file for file (item 43)
- **Decision:** one TS file per C file: `compute-hierarchy.ts` (`compute_hierarchy.c`),
  `quad-prog-solve.ts` (`quad_prog_solve.c`), `constrained-majorization.ts`
  (`constrained_majorization.c`), `opt-arrangement.ts` (`opt_arrangement.c`,
  `compute_y_coords`), `smart-ini-x.ts` (`smart_ini_x.c`, `IMDS_given_dim`), `kkutils.ts`
  (`kkutils.c`, `quicksort_place`/`quicksort_placef`), all under `src/layout/neato/`.
  Where the 30-NLOC hook forces a split, split at C's own phase boundaries, each helper
  `@see`-tagged (as `stress.ts`/`stress-kernel.ts`). No `complexity-ignore` entries. The
  `subset` and `circuit` models stay loud on the hier path (their C helpers are unported).
- **Bar:** `digraph{mode=hier;a->b->c->d->e->f;a->d;b->e;c->f}` and corpus 1554 (forced
  `layout=neato`, so it stays `engine-deferred` in the dot manifest) match native
  `-Kneato -Txdot` at 0.01; survey and walks 0 regressions.

## AD-7: per-graph HTML warning state resets per render (item 46)
- **Decision:** `missingImages` / `sizeWarned` (`src/common/htmltable.ts:231,320`) register
  with `registerRenderState`; each reset swaps in fresh `WeakSet`s.
- **Consequences:** both warnings print once per render, as one native run does.

## AD-8: `GvcContext.layout` resets render state on entry (item 47)
- **Decision:** `GvcContext.layout` (`src/gvc/context.ts:297`) calls `resetRenderState()`
  first; idempotent under `renderSvg`'s own reset. Caller-installed hooks are never reset.
  The doc comment states the contract.
- **Consequences:** low-level pipeline output is a pure function of its input; survey
  byte-identical.

## AD-9: diagnostic text and channel (items 54, 55, 57–61, 63)
- **Decision:** text is byte-for-byte native, oddities included (61's doubled
  `Warning: Warning:`), written through `agerr.ts`. Warnings go to `console.warn`, errors
  to `console.error`; tests that spy on `console.error` for a warning move to
  `console.warn` in the same task. `fprintf(stderr)` sites stay raw.

## AD-10: no `<stdin>: ` lexer prefix (item 56)
- **Context:** `lib/cgraph/scan.l:157` prefixes `InputFile` only when set; `agmemread`
  (the library entry the port mirrors) leaves it unset; the CLI reading stdin sets
  `<stdin>`. The port has no CLI.
- **Decision:** close 56 as documented: a known-divergences entry (+ 23 locales); the
  stderr probe normalizes the prefix. No new API.

## AD-11: missing images (item 60)
- **Decision:** when the caller's resolver/sizer returns no data, or none is installed,
  print native's lines: `Warning: <strerror> while opening <f>`
  (`lib/gvc/gvusershape.c:700`) and `No or improper image="…" for node "…"`
  (`lib/common/shapes.c:2044`); the HTML `<IMG>` path prints the Warning before its Error
  (`lib/common/htmltable.c:1092`). The strerror text is `No such file or directory`. No
  filesystem access is added.

## AD-12: lazy `attrs` on dot virtual nodes/edges (item 68)
- **Decision:** a virtual `Node`/`Edge` holds no attribute map until its first write;
  reads of an absent map see one shared read-only empty map. The task first enumerates
  every direct `attrs` writer reachable from a virtual object; more than ~10 → park.
- **Bar:** bytediff and survey identical, speed gate, bytes/pair measured (journal).

## AD-13: oracle nondeterminism in walks (item 69)
- **Decision:** when an id diverges, the walk runs the oracle 3 more times uncached; if the
  xdots differ the row's status is `oracle-nondeterministic`, recorded in the failure cache
  (`oracle-env.ts`). Gates and reports treat it as neither pass nor regression.

## AD-14: investigations and walk-data refresh (items 52, 53, 70, 71)
- **Decision:** 52 closes as documented-irreducible (native face order is GHashTable
  address order, nondeterministic; no code). 53 gets an AD-3 diagnosis. T29 runs one fresh
  walk per engine (7, after T3 and every output change) and commits the refreshed
  `parity-<engine>.jsonl` (71), then reruns `attribute-divergence.ts fdp` (70).
