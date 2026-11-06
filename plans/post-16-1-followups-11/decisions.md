# Decisions: part 11

AD-1 to AD-7 were approved by the user during planning (2026-11-06, "approve all"). They are locked; a change
is stop 4.

## AD-1: the two crashes (128)
- **Context:** `harness/B3b/w4.gv` (part 10) throws `Maximum call stack size exceeded`, recursing from
  `splines-flat.ts:370` into `init.ts:243` and node init; `w5.gv` throws reading `.ll` of undefined at
  `edge-route-faithful.ts:289`, from the chain router. Native renders both (exit 0). Both repeat on `main` `1e55cf7f`.
- **Decision:** fix both faithfully. Each fix ships with a test pinning native's `-Tdot`.
- **Rejected:** none; a port crash on valid input has no accept option.

## AD-2: the long-string wrap (127, 135)
- **Context:** `write.c:_write_canonstr` breaks quoted strings at `Max_outputline` (128, or the graph's
  `linelength` ≥ 60 or 0, `write.c:670-677`) with a backslash-newline, only after a non-id char before an id char.
  The port already wraps `-Tdot` labels; a 40-sided polygon's `_draw_` wraps 3 times natively and 0 times in the
  port. `compareXdot` parses, so surveys cannot see it.
- **Decision:** route `_draw_`-family strings through the same canon-and-wrap path labels use, including `linelength`.
- **Rejected:** a second wrap implementation in the xdot writer, which C does not have.
- **Consequence:** `xdot` and `dot` bytes change on long-string lines, toward native. Stop 8's exception covers only
  those lines. The `src/xdot` parser reads the wrapped form back unchanged (test).

## AD-3: sgd 2-D drift (132)
- **Context:** 2-D `mode=sgd`, 58 nodes, max delta 1.59 on 133 of 256 `dot` lines; native repeats 8 of 8; predates
  part 10. Part 10 traced sfdp's drift to macOS `pow`'s last bit.
- **Decision:** trace native and port to the first differing value, 3 h budget. Libm at the origin closes 132 under
  PR 119 with the trace archived. Operation order or fusion is fixed, with a neato `mode=sgd` re-walk. Over budget:
  park with the evidence.
- **Rejected:** accepting it untraced.

## AD-4: native variance suspects (137)
- **Context:** subgraph then root, and root with no free then subgraph, on fdp and osage: 6 to 10 comparator diffs on
  `xdot` and `svg`. Part 10 T14 found fdp's second layouts follow heap addresses (`layout.c:466,501,637`);
  `harness/T14/noaddr.patch` orders by `ND_id` behind `GVTS_NOADDR=1`.
- **Decision:** run native with `noaddr.patch`, 8 runs per case. Native settles and the port matches: close with that
  evidence. The port still differs: diagnose and fix within T7's write-set.
- **Rejected:** matching one of native's varying answers.

## AD-5: later-layout and subgraph items (129, 136)
- **Decision:** the native harness decides (part-10 AD-8, AD-9). First renders byte-identical is a hard stop (stop 8).
  129 has 2 h, then parks. 136: C's `getObjId` (`emit.c`) numbers the graph by `AGSEQ`; the port's
  `svg-graph.ts:271` hardcodes `graph0`.

## AD-6: cleanups (126, 130, 131, 134, 138)
- **Decision:** one small task each, after the fixes. 131 strips C's trailing `\n` at the call site, as every other
  `agerr` site does (`src/common/agerr.ts` header), with a test. 134 is marked DONE (PR #128) in T0's brief commit.
  138 is `documentation-engineer`'s, with the 23 locale copies, and runs after batch 3 so it can record its outcomes.

## AD-7: release and process
- **Decision:** unsigned commits on `chore/post-16-1-followups-11`, the user re-signs, merge commit. No `feat`, so a
  patch release (likely v2.12.1).

## Carried decisions
- The C at `~/git/graphviz` (16.1.0) is the spec; diagnosis mode for every discrepancy.
- Part-5 AD-1: unsigned local commits, the user re-signs. Part-5 AD-3: fix faithfully or park with the full
  artifact. Part-5 AD-4 amendment: never unfuse the stress kernel. Part-5 AD-17: `documentation-engineer` writes
  docs and locales.
- Part-9 AD-11, AD-12: second layouts follow native's free cycle; a no-free layout appends its route; rendering
  writes attributes back. Part-10 T14: cluster-edge proxies are undone where `attach_attrs` undoes them.
- Part-10 AD-11: a file at or over 500 lines may not grow; split along C function boundaries into new files. At
  planning: `splines-flat.ts` 571, `json.ts` 733, `agwrite.ts` 506, `edge-route-chain.ts` 498.
- PR 119 (user decision): layouts that vary with `pow`, `hypot` or similar are accepted. A sensitive probe replays
  macOS's values in the test; runtime code does not change.
