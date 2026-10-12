# T13 — Registries, known-divergences, CLAUDE.md, ADR

**Agent:** documentation-engineer. **Depends on:** T12. **Rollback:** Reversible.
**Observability:** N/A — updates the ledgers the dashboards read.

## Context

AD-5, AD-8. Under 16.1, A4 ("oracle in an acknowledged-broken state") entries
whose oracle bug 16.1 fixed become ordinary comparisons: retire them if the
survey shows them conformant, otherwise they belong to T12. Entries that are now
conformant are stale (`test/corpus/accepted-divergences.test.ts` guards this).
CLAUDE.md "Verification" names the oracle. The project has no ADR directory yet.

## Task

1. Every `test/corpus/accepted-divergences*.json` entry: check it against the
   latest fresh survey and walks. Retire conformant ones; give survivors their
   16.1 maxΔ, mechanism and evidence; add T12's accepted entries in final wording.
2. `docs/known-divergences.md`: update every class section to the 16.1 state
   (A4 especially). Mark a class whose members are all gone as CLOSED, following the A2/A3 precedent.
   **Code fences:** the translation lint requires each locale's fences to match
   English. Keep existing fences unless T15 re-translates the page in the same
   mission; T15 does, so fence changes are allowed. List them in the hand-back for T15.
3. CLAUDE.md "Verification": the oracle is graphviz 16.1.0 (`~/git/graphviz`,
   branch `oracle/16.1.0`), with the 15.x reference build at `~/git/graphviz-15`.
4. `docs/adr/0001-graphviz-16.1-oracle.md` (`docs/reference/architecture.md`
   format, or Context/Decision/Consequences if absent). Cover the re-pin, the
   headless-oracle choice (pango rejected: machine-dependent font metrics, not
   reproducible in a browser), the ratchet, the ortho-failure behaviour change
   (AD-6), and the rollback path.
5. Replace the branch shas `docs/known-divergences.md` cites (§A3/§A8) with their
   `main` shas. PR #85 was rebase-merged, so the plantuml-tracker-2 branch shas are not on `main` (the remote branch is deleted). Map: fdd6d03d→b18c06e1, 87de3eea→d3d7297f, 33a928d8→ea0a8849, 44aba8a3→cdf597bc, bdd614d5→87347711, 0e07be7b→0cc05181, ba8a5ee0→236adff2.
6. `npx vitest run test/corpus test/docs` green.

## Acceptance

- Given the final survey, then no registry entry lists a conformant id.
- Given `docs/known-divergences.md`, then every class matches the registries.
- Given CLAUDE.md, then the oracle line names 16.1.0 and the 15.x build path.
- Given the ADR, then it records the decision, the alternatives and the rollback.

## Write-set

`test/corpus/accepted-divergences*.json`, `test/corpus/accepted-divergences*.test.ts`
(pins on retired entries only), `docs/known-divergences.md`, `CLAUDE.md`,
`docs/adr/0001-graphviz-16.1-oracle.md`.

## Commit

`docs(divergences): re-baseline the ledgers on graphviz 16.1.0`
