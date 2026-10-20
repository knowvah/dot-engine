# Architecture decisions (locked 2026-10-20)

Approved by the user ("approve all recommendations"). A task that needs to contradict one
stops (stop condition 4).

## AD-1: commits unsigned and local; user re-signs at the end
- **Context:** every dot-engine commit is SSH-signed with a YubiKey that needs a PIN plus a
  touch; an agent shell cannot answer the PIN, and a signing `git commit` hangs.
- **Decision:** commit with `git -c commit.gpgsign=false`; never push or open a PR. T14 hands
  the user the re-sign command.
- **Consequences:** one interruption at the end instead of one per task.

## AD-2: one branch, one PR, merge commit
- **Context:** the run cannot push before the re-sign, so per-item PRs would queue anyway.
- **Decision:** branch `chore/post-16-1-followups-2`, one commit per task, one PR merged as a
  merge commit (task SHAs survive for the journal).
- **Consequences:** a single review of ~14 commits.

## AD-3: diagnosis budget
- **Context:** items 17, 18 and each item-20 site may not resolve quickly.
- **Decision:** ~2 h per item/site, then park with mechanism / origin / causal chain / ruled
  out / next instrument, and continue the mission.
- **Consequences:** a parked item is a valid outcome; an undiagnosed one is not.

## AD-4: item 23 keeps the `ParseError` contract
- **Context:** `ParseError.message` and `.expected` are public; no test or doc pins the Peggy
  text, but external callers may.
- **Decision:** leave both unchanged; print C's `aagerror` line through `console.error`, the
  port's channel for C diagnostics. No `<file>: ` prefix (the port has no file name; native
  omits it for stdin). Port a scan.l-style token scanner (beside
  `src/parser/number-scan.ts`) so `near '<tok>'` carries flex's whole token.
- **Consequences:** stderr parity without an API change.

## AD-5: item 22 oracle preflight and persistent cache
- **Context:** an overnight `/tmp` clean deleted `config8` and emptied the oracle caches; the
  survey's `dot -V` check passed and the gate was vacuous (946 oracle-errors).
- **Decision:**
  - Cache root `$XDG_CACHE_HOME/dot-engine/oracle/<kind>/<sig>` (default `~/.cache`).
    `ORACLE_CACHE` / `ENGINE_ORACLE_CACHE` still override.
  - One-time copy of the existing `$TMPDIR/dot-corpus-*` caches (executor step, journaled).
  - Preflight renders a trivial graph with each run's plugin dir and fails with the exact
    `GVBINDIR=<dir> <dot> -c` command. No silent regeneration (it would hide an oracle change).
  - Amend ADR-0001.
- **Consequences:** a broken oracle stops the run instead of producing a vacuous pass.

## AD-6: item 20 consolidates the `Bezier` copies
- **Context:** C has one `utils.c:Bezier` (fused `fma(a, 1-t, t*b)` per T13's libgvc 16.1
  disassembly); the port has ~10 copies.
- **Decision:** every copy that mirrors `utils.c:Bezier` calls one shared fused `bezier()`
  (new `src/common/bezier.ts`, C signature). Copies of other C functions are checked against
  that function's own disassembly. An output change is accepted only toward the oracle.
- **Consequences:** fewer copies; software `fma` in hot loops, so a speed gate (stop 7).

## AD-7: HTML items port C semantics exactly
- **Context:** C ignores an illegal attribute value; the port may interpret it. Fonttable
  labels currently fail.
- **Decision:** port C's behaviour even where SVG changes. Any task with an SVG change needs
  the survey and its engine walks with 0 regressions. Native-matching warnings are added to
  golden "logs nothing" allow-lists (`test/golden/pt-issue-29.test.ts:49`).
- **Consequences:** possible SVG changes in batch 2, always toward native.
