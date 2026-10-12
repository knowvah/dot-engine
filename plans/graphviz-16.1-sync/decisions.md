# Architecture decisions (locked — user approved all, 2026-10-12)

| AD | Decision |
|---|---|
| AD-1 | Oracle: keep 15.0.0-82 as worktree `~/git/graphviz-15` with its own build; switch `~/git/graphviz` to local branch `oracle/16.1.0` = tag 16.1.0 + one local GVTS commit; rebuild; regen `/tmp/ghl`. |
| AD-2 | Work list = commit classification (519) **and** a 15-vs-16 native corpus diff → `.agent-notes/gv16-triage.md`. |
| AD-3 | Mirror every behaviour change, exercised or not. Pure refactors are not mirrored unless a ported function's boundary changes. Stale `@see` line numbers are not chased. |
| AD-4 | Ratchet: re-capture goldens and baselines at 16.1; newly failing tests go on `test/golden/known-failing.json`, which may only shrink. Done = empty, or each survivor is an accepted divergence with a comparison page. |
| AD-5 | Re-check every accepted-divergence entry under 16.1: retire A4 entries whose oracle bug 16.1 fixed (they become port work), retire conformant ones, re-evidence survivors. |
| AD-6 | Ortho failure: mirror C — `orthoEdges` failure → `dot_splines_` non-zero → the port's existing layout-failure path. No new API; journal + PR record it as a consumer-visible behaviour change. |
| AD-7 | `optmacroname`: parse `node a = [...]`, warn `attribute macros not implemented`, apply the attributes (grammar.y `attrstmt` → `nomacros()`). Delete `routeFlatEdgeFaithful` and its test-only coverage after a reference check. |
| AD-8 | Final bits only after the ratchet is empty: all 35 `PARITY-*.md` regenerated from fresh walks; 23-locale `divergences.md` re-translation (translation-spec.md, `sourceHash`); ADR `docs/adr/0001-graphviz-16.1-oracle.md`. |
| AD-9 | Branch `feature/graphviz-16.1-sync` off `main` after PR #85 merges (else stacked on `fix/plantuml-tracker-issues-2`); merge-commit PR. |
| AD-10 | Oracle stays **headless** (core + dot_layout plugins → `estimate_textspan_size`). Pango was rejected: its text sizes depend on the machine's installed fonts and can't be reproduced in the browser port; real-font sizing belongs to the port's pluggable `TextMeasurer`, not the oracle. Homebrew (pango) is used only as a cross-check, run with a headless plugin dir. User question, 2026-10-12. |

## AD-1 — Oracle location

Both oracles must exist for AD-2's corpus diff and for 15→16 A/B checks while
porting. Switching `~/git/graphviz` in place keeps every harness default
(`DOT_BIN`, `CORPUS_ROOT`, `GVBINDIR`) correct, so no env var can silently pick
the wrong oracle. The `GVTS_POS_DUMP` instrumentation (uncommitted today in
`lib/fdpgen/layout.c`, `lib/label/xlabels.c`, `lib/neatogen/neatosplines.c`) is
env-gated stderr only; carry it as one local commit, never pushed. Rollback:
check out the 15.x commit again and rebuild, or point `DOT_BIN` at
`~/git/graphviz-15`.

## AD-4 — Ratchet mechanics

`known-failing.json` = `{ "goldens": string[], "ptIssue": string[] }`. A listed
test must fail (vitest `it.fails` semantics). If it passes, it goes red with
"remove from known-failing.json", so fixes shrink the list. An unlisted failure is
a normal red. The corpus survey needs no new mechanism: `rules-gate.ts` already
reports diverged-in-both as pre-existing and fails only on regressions vs the
16.1 baseline.

## AD-6 — Ortho failure

16.1 `dot_splines_` (dotsplines.c:255-264) returns `orthoEdges`' rc. The 15.x
function already returns rc for `make_flat_edge` failures, so the port already has
the channel. Verify T8's behaviour against native exit status and stdout on a
failing input. If native still writes an SVG, mirror that exactly, not a throw
(compare plantuml-ts issue 31: routing failure writes the SVG and exits 1).
