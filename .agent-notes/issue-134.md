# issue-134 mission — observations (2026-11-10)

## Observation: the issue's label premise already held; the gap was the echoed keys
- **Context**: #134 says long cluster and graph labels skip `agstrcanon` in `echoAttr`/`echoGraphAttr`.
- **Finding**: `label` never reaches those helpers (`graphInputParts` -> `agstrcanon`); long graph
  and cluster labels equal native on the base, default and `linelength=70`, dot and xdot, on all
  eight engines. The helpers serve only values the layout did not recompute: subgraph `bb`,
  graph/cluster `lp`/`lwidth`/`lheight`, node `rects`/`xlp`, edge `pos`/`lp`/`xlp`/`head_lp`/`tail_lp`.
  Those were printed `key="..."` by hand: never wrapped, always quoted, and an html-flagged value
  leaked the port's marker byte (`xlp="\u0001i"` where native prints `xlp=<i>`).
- **Impact**: when an issue names a mechanism and a guessed symptom, test the symptom first; here the
  mechanism was real and the symptom was on other keys.
- **Confidence**: High (native refs in `plans/issue-134-echo-attr-canon/harness/out`)

## Observation: in the corpus only patchwork reaches a changed echo
- **Context**: choosing gate 6 ids with a marker bundle (the #130 technique): a `console.error` in
  both helpers saying whether `key="v"` differs from `key=agstrcanon(v)`, run on the 370 applicable
  ids whose text holds one of the nine keys (three inputs over 400 kB left out), `-Kdot` and
  `-Kpatchwork`, `-Tdot`; 740 jobs, about 80 s.
- **Finding**: 327 jobs reach a helper (28 dot, 299 patchwork), 51 (all patchwork) with a changed
  part: a long edge `pos` on 48 ids and a long `rects` on the three `b36` copies. Under dot the
  corpus reaches only graph-level `bb` and `lp` echoes, none changed. The survey (78 ids x dot,
  patchwork x dot, xdot against native) changed 102 rows, the 51 patchwork ids in both formats,
  every one by backslash-newline wraps alone and every one now equal to native. No corpus input
  echoes `lwidth`/`lheight`, an html value, a keyword or a bare numeral; those branches are
  covered only by the harness fixtures (`echo.gv`, `odd.gv`).
- **Impact**: a corpus survey of this path means patchwork on re-fed layouts; dot rows cannot
  change. The brief's attribute grep (36 ids) held 11 of the 51.
- **Confidence**: High

## Observation: `_agstrcanon` does not break at the 128th byte
- **Context**: a hand-written expectation for a 300-byte `pos` (`"10,20 "` x 50) was wrong.
- **Finding**: once `cnt >= Max_outputline`, C breaks only after a non-id, non-backslash byte whose
  successor is an id byte (`write.c:170-190`); otherwise it defers to the next such place. Byte 128
  here is a digit, so the break lands after the following comma: lines of 129, 129 and 42 bytes.
- **Impact**: take wrap expectations from native output, not from arithmetic on the limit.
- **Confidence**: High (native `-Kpatchwork -Tdot` on the same value)

## Observation: the patchwork plugin dir recipe from issue-129 also serves the other six engines
- **Context**: native refs for patchwork, then probes on neato, fdp, sfdp, twopi, circo, osage.
- **Finding**: a `$TMPDIR` dir with `core`, `dot_layout` and `neato_layout` symlinks plus `dot -c`
  passes `oraclePreflight` for all eight engines (the neato plugin carries the other seven).
- **Impact**: one dir is enough for an all-engine probe against 16.1.0.
- **Confidence**: High
