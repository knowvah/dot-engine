# Architecture decisions (locked; user-approved 2026-11-12, "approve all recommendations")

| ID | Decision | Why | Rejected |
|---|---|---|---|
| AD-1 | Corpus inputs stay 16.1.0's (`~/git/graphviz/tests`, the walkers' default `CORPUS_ROOT`). | One variable at a time: 16.1.1 also modifies 7 inputs (`radius_dot.gv`, `shapes_dot.gv` copies) and adds 48. | Switch the corpus root now (two variables). Moving it is #148. |
| AD-2 | `gen-headless-gvbindir.sh` also builds `/tmp/ghl1611-all` (adds `neato_layout`); non-dot walks and `gen-xdot-refs.ts` default to `ORACLE_GVBINDIR_ALL`. | ADR-0002 decision 1 names the dir; nothing builds it; the 16.1.0 equivalent lived in a lost scratchpad. | Pass `GVBINDIR` by hand per run. |
| AD-3 | Registries are committed as measured. Each 16.1.1-caused failure is listed on its issue (#149–#165) and in a "pending 16.1.1 ports" section of `docs/known-divergences.md`. | Reversible; each port mission reads its target ids from its issue. | Entries in `accepted-divergences-*` (wrongly permanent); a new pending registry the gate reads. |
| AD-4 | Port-unchanged proof: head bundle sha256 == main's. Each changed id: native 16.1.0 vs 16.1.1 diff, grouped by the C function that changed, assigned to a filed issue, else a new `upstream-16.1.1` issue with the diff. No "port regression" category. | `src/` is untouched, so only native changed. | Bisecting graphviz builds per id (cost); calling unexplained changes port regressions. |
| AD-5 | `src/**/__fixtures__` (10 `regen.sh`, ~375 files stamped 16.1.0) stay as they are; each port issue re-captures what it touches. Noted in ADR-0002. | They pin the unchanged port's behaviour and still pass. | Re-capture all now (would fail tests for changes not yet ported). |
| AD-6 | Regenerate `test/golden/refs-xdot` with `gen-xdot-refs.ts`; add `test/golden/gen-svg-refs.ts` (mirrors it) and regenerate `refs/*.svg`; 16.1.1-caused golden failures go in `known-failing.json` with their issue. | A re-baseline needs reproducible refs; `refs/*.svg` has no generator. | Leave `refs/*.svg` at 16.1.0. |
| AD-7 | The queue driver's `GVBINDIR` default, `.claude/settings.json`'s dot path and `queue-policy.md` change only after this branch merges (hand-off step). | The driver runs from the main checkout; pointing it at 16.1.1 before main carries the 16.1.1 baseline breaks queue runs. | Change them now. |
| AD-8 | Durable worktree `~/git/knowvah/dot-engine-1611` (done 2026-11-12). | A reboot wiped the scratchpad on 2026-11-11. | Session scratchpad. |
| AD-9 | Types `test`/`chore`/`docs` (no release); unsigned local commits with the `Co-Authored-By` trailer; the user re-signs; the PR merges as a merge commit. | Repo conventions; `~/.claude/rules/commits.md` now requires attribution. | `feat`/`fix` types. |
| AD-4a | Amends AD-4 (user-approved 2026-11-13). Classification gains a category **"port commit on main"**: a changed verdict whose native 16.1.0 and 16.1.1 outputs are identical, explained by a named `src/` commit on main that landed after the old registry was written. A regression in this category gets a GitHub issue. Stop 5 still fires for a change with neither a native diff nor an explaining main commit. | The 16.1.0 registries are 91–108 `src/` commits behind main (`parity.json` last written at `b2c10dea`); T9a found `1581` (`ad667824`) and `2475_1` (`4d8c4e0a`). | Re-baseline every walk on 16.1.0 with main's port first (doubles batch 2a); stop the mission. |

## Carried constraints

- ADR-0001 decisions 2–5 (headless plugin dirs, caches, preflight) carry over unchanged.
- 16.1.0 oracle stays until this mission lands (ADR-0002 decision 4); T9 uses it.
- Rollback: ADR-0002's rollback section. Classification: **Reversible**.
