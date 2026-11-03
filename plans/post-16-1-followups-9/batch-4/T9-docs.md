# T9: docs and locales

**Context:** part-5 AD-17: `documentation-engineer` writes docs and mirrors them into 23 locales with a refreshed `sourceHash`.
Read `.agent-notes/post-16-1-followups-5.md` for the `sourceHash` procedure.

**Task:**
1. `docs/known-divergences.md`: update the VPSC heap-address bullet from part 8 with T8's outcome: proven, or still unproven with
   the parked diagnosis. If T7 ported the sort, say tie order now matches libc++.
2. `docs-site/guide/errors.md`: add sfdp's `start` warning if the page lists comparable warnings, and remove any row T1–T7 made false.
3. Search `docs-site/guide/` for statements about `maxiter`, `epsilon`, `stresswt` or circo's `root` that T2 or T4 made false, and
   correct them. Do not add new sections for behaviour that simply matches native now.
   Also correct any statement T11, T13 or T14 made false about rendering one `Graph` twice, including the `render` lifecycle text in `README.md`.
   State the new behaviour plainly there: `g.attrs` changes after a `dot`, `xdot` or `json` render, any layout writes `bb`, a later layout reads those values, and a graph `_draw_` or
   `_background` is replayed, as native does (AD-12). A second `xdot` render therefore differs from the first, as it does natively. If a page claims rendering leaves a graph unchanged, correct it.
4. Mirror each changed page into the 23 locales, with `sourceHash` refreshed. Check the wording of each changed locale line against
   its source. Native-speaker review is not available; say so in the hand-back.

**Write-set:** `docs/known-divergences.md`, `docs-site/*/divergences.md`, `docs-site/guide/errors.md`, `docs-site/*/guide/errors.md`,
other `docs-site/**` pages step 3 names, `README.md` (the `render` lifecycle text only).
**Read-set:** journal rows for T1–T8 and T11–T14, `plans/post-16-1-followups-8/batch-3/` (T8's form).

**Acceptance criteria:**
- *Given* T1–T8, *when* the docs are reviewed, *then* every statement about changed behaviour is accurate.
- *Given* `npm run docs:i18n-status`, *when* run, *then* 0 stale × 23.
- *Given* `npx vitest run test/docs`, *when* run, *then* it passes.

**Commit:** `docs(T9): record part-9 behaviour and vpsc proof`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
