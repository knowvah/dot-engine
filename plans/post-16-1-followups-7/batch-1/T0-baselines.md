# T0: baselines and native probe fixtures

**Context:** the tools are already committed under `test/tools/`: `bytediff.ts`, `bd-job.ts`
and `probe.ts`. `$BASE` is this session's `<scratchpad>/followups7-baseline`. Part 6's
inputs may still be in `P6=/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/edcc3cf2-810f-490f-aefa-e726433d6970/scratchpad/followups6-baseline`:
`cases/94-*.gv` (the 7 ipsep probes) and `img/r.png` (40×20) and `img/t.png` (30×40). If
they are gone, rebuild them: the probe definitions are in the part-5 T15 and part-6 T0/T3
journal rows, and the PNGs come from a few lines of Python `zlib`/`struct`.

**Task:**
1. **Branch and brief commit**, as in the README's "First run only".
2. **Oracle preflight:**
   - `dot -V` must report 16.1.0.
   - Render a trivial graph with `/tmp/ghl` (dot) and with the full plugin dir (neato,
     fdp, sfdp, circo, twopi, osage, patchwork).
   - On failure, run `GVBINDIR=<dir> dot -c` and journal it.
3. **Gates on the branch base:** run the four README gates and record their counts.
4. **Base bundle:**
   - Run `npm run build:js`, copy `dist/index.js` to `$BASE/T0.mjs`, and record its commit
     in `$BASE/T0.sha`.
   - Self-check: bytediff T0 vs T0 over the 17 `&` files must give 0 diffs.
5. **Native fixtures** follow the repo's per-module `__fixtures__/` convention
   (`src/layout/neato/__fixtures__/hier/`): ipsep cases in
   `src/layout/neato/__fixtures__/ipsep/`, image and colour cases in
   `src/gvc/__fixtures__/p7/{images,colors}/`. Each case is a `<case>.gv`
   plus, per format, `<case>.<fmt>` and `<case>.<fmt>.stderr`. Run them from the fixture
   dir so relative image names resolve, using `GVBINDIR=<full plugin dir>`.
   - **`ipsep/`** (`-Kneato -Txdot`, plus `-v` stderr as `<case>.trace`):
     - the 7 unconstrained probes (`ipsep-tree`, `ipsep-grid`, `ipsep-k6`, `ipsep-rand`,
       `ipsep-rand-len`, `kd-ipsep`, `kd-ipsep-len`);
     - `diredgeconstraints=true` and `=hier` on a DAG;
     - `overlap=ipsep` and `overlap=vpsc` with mixed node sizes;
     - one graph with a top-level cluster;
     - edge `len` combined with `diredgeconstraints=true`;
     - `model=subset`, `model=circuit` and `model=mds` with constraints;
     - `levelsgap` and `sep` variants of the `hier` case;
     - `start=self` with no constraints and with `diredgeconstraints=true` (the cola
       driver takes no smart-init flag; T10 decides the `start.ts` guard from this);
     - the largest of these is ≥ 200 nodes (for T10's timing note).
   - **`images/`** (copy `r.png` and `t.png` in):
     - 97: `a[shape=custom]` (no shapefile); `a[shape=nosuch image="r.png"]`.
     - 100: `digraph{rotate=90;a[image="r.png"]}` -Tsvg.
     - 101: `a[image="r.png"]` for each of -Tsvg, -Txdot, -Tjson, -Tdot, -Tplain,
       -Tcmapx; also a non-image file with a `.png` name (bytes `hello`); also a GIF, a
       JPEG and an SVG header case. T0 builds the table "format × type → warning" from the
       stderr.
     - 102: `imagepath="d"` with `image="r.png"` (where `d/r.png` exists and where it does
       not); `imagepath` with an absolute name; `imagepath="d1:d2"`; `imagepath` with
       `shape=custom shapefile="x.ps"`; `graphs-val_val` copied from the corpus.
   - **`colors/`** (-Tsvg, -Txdot, -Tjson): 98 `a[shape=point fillcolor=":red"]`;
     99 `a->b[fillcolor=":red"]`, `a->b[color=blue fillcolor=":red"]` and
     `a->b[fillcolor="red:"]`.
6. **ipsep probe test:** `src/layout/neato/ipsep-probes.test.ts` runs every `ipsep/` case
   through the port and compares the xdot with native. The unconstrained set asserts byte
   equality; constrained cases record their max error and are `it.todo` until T10. Today
   it fails on the unconstrained set (pre-95), so it starts `describe.skip`, and T1
   un-skips it.
7. **Name T3's arrow-fill site:** trace where the port fills an edge arrowhead (the
   candidates are `src/gvc/device.ts:setEdgePen` and the `ArrowPaint` path in
   `src/render/svg-helpers.ts:441-468` and its xdot twin). Name it against
   `emit.c:emit_edge_graphics` 2415–2434. Journal the file and function; that becomes
   T3's write-set entry.
8. Commit `test(T0): add part-7 native probe fixtures` (fixtures and the skipped test).

**Write-set:** the brief commit (`plans/post-16-1-followups-7/**`, the header line in
`plans/post-16.1-followups/README.md`, `.claude/settings.autonomous.json`); `src/layout/neato/__fixtures__/ipsep/**`, `src/gvc/__fixtures__/p7/**`;
`src/layout/neato/ipsep-probes.test.ts`; the scratchpad.
**Read-set:** `plans/post-16-1-followups-6/batch-1/T0-baselines.md`, the headers of
`test/tools/*.ts`, the part-6 journal rows T0 and T3.

**Interface output:** `$BASE/T0.mjs`, `$BASE/T0.sha`, `src/layout/neato/__fixtures__/ipsep/**`, `src/gvc/__fixtures__/p7/**`, the
101 format table and the T3 site (both in the journal).

**Acceptance criteria:**
- *Given* the branch base, *when* the gates run, *then* all four are green and the oracle
  preflight passes for all 8 engines.
- *Given* bytediff T0 vs T0 over the `&` set, *then* there are 0 diffs.
- *Given* both fixture dirs, *then* every case above has its native output and
  stderr, and the 101 format table is in the journal.

**Observability:** N/A, no new observable operations. **Rollback:** reversible.
