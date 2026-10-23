# T9: CDT face vertex order vs GTS (item 29d, AD-6)

**Context:** part 2's T13 found that `src/layout/neato/cdt-surface.ts` orders a face's
vertices differently from GTS (`lib/neatogen` triangulation via GTS, or graphviz's
in-tree CDT: confirm which 16.1 links), so `triCenter` sums in a different order and rounds
differently (≤ 6e-14). No observable symptom is known.

**Task:**
1. Diagnose: dump one face's vertex order natively (instrumented copy of the 16.1 build in
   the scratchpad, stop 10) and in the port for the same input (2168_3, or a small neato
   `splines=true` graph). State where the orders first differ (origin file:line).
2. Port the C order at that origin. If the order comes from a GTS internal the port
   cannot reproduce without rewriting the structure, park per AD-3 with the evidence.

**Write-set:** `src/layout/neato/cdt-surface.ts` (+ test).
**Read-set:** `cdt-surface.ts` in full; the C triangulation source that 16.1 actually
links (`lib/neatogen/multispline.c` `mkTriGraph` callers, `lib/cdt`? check), part 2's T13
journal row.

**Acceptance criteria:**
- *Given* the dump, *then* the first differing face is named with native and port orders.
- *Given* the fix, *then* `triCenter` for that face is bit-identical to native.
- *Given* byte-identity over neato/sfdp multispline ids, *then* identical or toward native.

**Observability:** N/A. **Rollback:** reversible.
