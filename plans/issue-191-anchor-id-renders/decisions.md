# Decisions: issue #191

Unattended planning run; every decision below was auto-confirmed. Evidence:
[harness/survey.md](harness/survey.md). Base `70bd5faf`.

## AD-1: drop the per-render reset in `device.ts`; keep the registered reset

**Context.** C's `anchorId` is never reset in a process. The port resets it
at every public entry and every `GvcContext.layout` (registered, AD-4/AD-8),
and again at the start of every `render` (`src/gvc/device.ts:507`). The
issue asks: keep, or drop the `device.ts` reset and leave the per-layout one.

**Decision.** Drop `resetHtmlAnchorIds()` at `device.ts:507` and its import
(`:35`). `resetHtmlAnchorIds` stays exported and registered. Renders after
one layout on one context then continue the count as native does.

**Why this is supported.** CLAUDE.md: the C is the specification and, in
doubt, keep the C behaviour. The reset predates AD-4 and duplicates it for
every public entry, so it changes only same-context renders, where it
diverges from native on 20 of 20 probe jobs; without it 16 of 20 agree and
the 4 left are AD-8's across-layout case. No corpus output changes (smoke
1960/1960, reach 360/360 identical). Precedent: #188's "keep or remove"
question was settled the same way by an unattended plan with evidence.

**Rejected.**

- (A) Keep the reset ("each render is its own process"). AD-4 says one
  *public render call* is one process; `renderWithContext` twice is the
  port of two `gvRender` calls in one process (`dot -Tcmapx -Tsvg`), and
  native continues the count there. Keeping it keeps a divergence no ruling
  asks for.
- (B) Also stop the per-layout reset, to match native across no-free
  relayouts. That removes `anchorSeq` from the registry, so a public render
  would depend on earlier renders: AD-4 and AD-8 forbid it. The row stays
  verdict N for that case.
- (C) Carry the count on `GvcContext` instead of a module static. C's
  counter is process-global, not per-context; a field the C lacks breaks
  the YAGNI rule, and between layout resets the static behaves the same.

**Consequences.** Low-level callers that render one layout several times get
native's ids. `json` (whose port runs an inner xdot render) agrees with
native too (`l,json,svg` gives `_4 _5` in both).

## AD-2: tests

**Decision.** New `src/gvc/anchor-id-renders.test.ts`, written before the
`src/` change (red on base for the same-layout cases):

- `l,svg,svg`: `a_node1_0 a_node1_1`, then `a_node1_2 a_node1_3`.
- `l,cmapx,svg`, `l,xdot,svg`: the svg has `a_node1_2 a_node1_3`.
- `l,json,svg`: the svg has `a_node1_4 a_node1_5`.
- `anchor-mixed`, `l,svg,svg`: the second svg's ids equal native's.
- `l,svg,l,svg`: both svgs have `a_node1_0 a_node1_1`, the AD-8 case, with
  a comment that native gives `_2 _3` and why the port keeps restarting.
- Public `render(dot, 'svg')` twice: `_0 _1` both times (AD-4).

Expected ids come from `harness/native/` (carried 16.1.1, captured
2026-11-21); the test header says so. Assert the id lists, not whole files.

## AD-3: comments and the process-statics row

**Decision.** `htmltable-emit-rules.ts:179` and `:214` say the counter is
reset by the registered reset (each public entry and each layout), not per
render. `docs/process-statics.md` row `anchorSeq`: drop "The port also
restarts it per render (`gvc/device.ts:507`): issue #191"; say renders on
one layout continue the count as native does (#191), and only a new layout
restarts it. Verdict stays N.

## Baseline

Planning base `70bd5faf`: `npm run typecheck` exit 0; `npm test` 609 files,
15196 passed. With the prototype: 609 files, 15196 passed, no test edited.

## Rollback

Reversible: revert the one squashed commit. No data, API shape or format
changes; only ids on a second same-layout render.

## Auto-confirmed (unattended)

- Phase 3 took AD-1 (drop), rejecting (A), (B), (C) as above; evidence in
  harness/survey.md.
- Phases 2, 4, 5, 6 as written in the README and T1.
