# T15: fused stress kernel (AD-4, item 85)

**Context:** `src/layout/neato/stress-kernel.ts` runs the unfused `conjugateGradientMkernel`
/ `rightMultWithVectorFF` on the production neato kD path (~1 ulp per step vs the
oracle); `cgStep:142` returns true where `conjgrad.c` breaks on `p_Ap == 0`;
`stress-kernel.ts:45` `OPT_SMART_INIT = 1` vs C `0x4` (`stress.h:30`; `stress.ts:39` has
`0x4`); `neatoinit.c:959` `checkExp` (`stresswt`: warning `stresswt attribute value must be
1 or 2 - ignoring`, default 2) is unported, so `init.ts:387` hard-codes `OPT_EXP_FLAG`.
Part 4 built `conjgrad-mkernel.ts` (`conjugateGradientMkernelFused`,
`rightMultWithVectorFFFused`) from the 16.1 disassembly for the hier driver.

**Task:** (1) `stressMajorizationKDMkernel` calls the fused kernels; delete the unfused
duplicates if nothing else uses them (grep first). (2) `cgStep` breaks the loop on
`p_Ap == 0` as C does. (3) One `OPT_SMART_INIT = 0x4` from `stress.ts`. (4) Port
`checkExp` into `init.ts`; `opts = checkExp(g) | (init === INIT_SELF ? OPT_SMART_INIT : 0)`
as `neatoinit.c:1090` composes it. (5) `fma` comes from `common/fma.js` (T3). (6) Bytediff
every neato/fdp/sfdp id the kD path reaches: each change explained as a move toward native
(xdot diff vs oracle shrinks); a drift the wrong way gets an AD-3 diagnosis (`debugger`).
(7) Speed gate (load < 8) on the neato list.

**Write-set:** `src/layout/neato/stress-kernel.ts`, `conjgrad-mkernel.ts`, `init.ts`,
`stress.ts` (+ tests).
**Read-set:** `lib/neatogen/conjgrad.c`, `lib/neatogen/stress.c:782-900,1060-1085`,
`lib/neatogen/neatoinit.c:955-970,1085-1105`; `.agent-notes/post-16-1-followups-4.md`
(fused reductions per call site); part-4 journal T22/T26 rows; T10's `init.ts` edits.

**Acceptance criteria:**
- *Given* the kD probe graph, *then* `-Txdot` moves toward native (per-coordinate diff
  does not grow for any node).
- *Given* `stresswt=3`, *then* the native warning; *given* `p_Ap == 0`, *then* the CG loop
  breaks and returns 0.
- *Given* the neato, fdp and sfdp walks, *then* no pass→worse; speed p50 ≤ 1.05×.

**Observability:** N/A. **Rollback:** reversible.
