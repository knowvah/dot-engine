# T3: ipsep right-multiply from the disassembly (item 94, AD-6)

**Context:** `COLA_OPS` (`src/layout/neato/stress-kernel.ts:120-136`) runs
`stress_majorization_cola` (`mode=ipsep`) with the shared fused CG, the unfused square-add
(`constrained_majorization_ipsep.c:313-316`, two loops) and an **unfused** right-multiply,
because cola's inlined `right_mult_with_vector_ff` copy was never read. Part 5 found it in
`libgvplugin_neato_layout.dylib` (16.1.0, `-O3 -flto=thin`): `_stress_majorization_cola`
at 0x3904c, `fmul.4s`×4 / `fmla.4s`×4 blocks at 0x3b19c and 0x3b570
(`.agent-notes/post-16-1-followups-5.md:128-141`). The kD copy's shape is ported in
`rightMultWithVectorFFFused` (`conjgrad-mkernel.ts:37-54`): 16-wide rounded-product block,
fused remainder, fused scatter. No corpus id sets `mode=ipsep`; six probes sit 0.010 pt
from native either way.

**Task:**
1. Disassemble the linked dylib in the full plugin dir (`otool -tV` or `llvm-objdump -d`;
   LTO, so never the `.o` files). Read cola's inlined copy instruction by instruction and
   map it to the C loop: block width, which products are rounded (`fmul`) versus fused
   (`fmla`/`fmadd`), the remainder loop, the scatter into `result[j]`, the diagonal term.
   Compare with the kD copy in `_stress_majorization_kD_mkernel` (0x32868).
2. Verdict per AD-6, with the instruction listing as evidence in the hand-back:
   identical shape → `COLA_OPS.rightMult = rightMultWithVectorFFFused`; different shape →
   a cola variant beside it in `conjgrad-mkernel.ts`; unfused → keep it and update the
   `COLA_OPS` doc comment with the evidence.
3. Tests: a kernel unit test pinning the chosen form on a small packed matrix whose
   fused/unfused results differ; the six ipsep probes compared with native before and
   after (report max error per probe; no probe may move away from native).
4. Budget ~2 h (part-5 AD-3); park with the full artifact if unresolved.

**Write-set:** `src/layout/neato/stress-kernel.ts`, `src/layout/neato/conjgrad-mkernel.ts`
(only for a cola variant) (+ tests beside each).
**Read-set:** `lib/neatogen/constrained_majorization_ipsep.c:250-420`,
`lib/neatogen/matrix_ops.c:right_mult_with_vector_ff`, `conjgrad-mkernel.ts`,
`.agent-notes/post-16-1-followups-5.md`, `.agent-notes/post-16-1-followups-3.md` (LTO).

**Acceptance criteria:**
- *Given* the disassembly, *then* the hand-back lists the instructions of both inlined
  copies and states the verdict with the mapping to C.
- *Given* the six ipsep probes, *then* each probe's max error is equal or closer to native.
- *Given* the corpus, *then* bytediff is identical (no ipsep id).

**Observability:** N/A. **Rollback:** reversible.
