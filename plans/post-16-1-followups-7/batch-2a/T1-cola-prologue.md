# T1: cola prologue plus fused right-multiply (item 95, AD-2)

**Context:** the port's cola path (`COLA_OPS`, `src/layout/neato/stress-kernel.ts:126-136`)
has two gaps:
- it skips `stress_majorization_cola`'s layout prologue
  (`constrained_majorization_ipsep.c:166-191`);
- it keeps the right-multiply unfused, although part-6 T3 showed from the disassembly that
  cola's copy is fused.

The patch `plans/post-16-1-followups-6/patches/item94-95-fused-plus-cola-prologue.patch`
fixes both, and part-6 T3 measured all 7 unconstrained probes as byte-identical to native
xdot with it applied. It applies cleanly to `main` (checked 2026-10-30).

**Task:**
1. `git apply` the patch. Read the result against `constrained_majorization_ipsep.c:166-191`:
   - `max` starts at 1;
   - `d_coords *= 10/max`;
   - `orthog1` runs per axis;
   - y is translated so that y[0] = 0;
   - all of it runs after `initLayout`, only when `cola === true`.
2. Remove `describe.skip` from `src/layout/neato/ipsep-probes.test.ts` (from T0) for the
   unconstrained set.
3. Keep the patch's pinning test (fused 1.1459170579910278 vs unfused 1.1459171772003174).

**Write-set:** `src/layout/neato/stress-kernel.ts`,
`src/layout/neato/stress-kernel.fused.test.ts`, `src/layout/neato/ipsep-probes.test.ts`
(un-skip only).
**Read-set:** the patch; `lib/neatogen/constrained_majorization_ipsep.c:100-200`; the
part-6 journal row T3.

**Interface output:** the prologue as `colaScaleLayout(n, dim, dCoords)`. T8 moves it into
`stress-cola.ts`, and T10 deletes the kD-kernel copy.

**Acceptance criteria:**
- *Given* the 7 unconstrained ipsep probes, *when* laid out with `-Kneato -Txdot`, *then*
  all 7 are byte-identical to native (stop 7 from here on).
- *Given* the corpus, *when* bytediff runs, *then* output is identical (no id sets
  `mode=ipsep`).
- *Given* the fused pinning test, *then* it reports the fused value.

**Commit:** `fix(T1): port cola layout prologue and fused right-multiply`.
**Observability:** N/A. **Rollback:** reversible.
