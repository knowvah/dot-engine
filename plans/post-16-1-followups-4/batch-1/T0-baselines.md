# T0: baselines, tooling import, native references

**Context:** part 3's tools (`bytediff.mjs`, `bd-job.mjs`, `probe.mjs`, `fuzz/`
incl. `classify.mjs`, `speed.sh`) live only in
`/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/35758146-f049-4b5c-ab8a-80fd9c0a7e55/scratchpad/followups3-baseline`
(`$OLD`), at risk from the nightly `/tmp` clean. `$BASE` = this session's
`<scratchpad>/followups4-baseline`.

**Task:**
1. **Branch + brief commit** per the README's "First run only".
2. **Oracle preflight:** `dot -V` = 16.1.0; render a trivial graph with `/tmp/ghl` (dot)
   and with the full plugin dir (neato, fdp, sfdp, circo, twopi, osage, patchwork); on
   failure `GVBINDIR=<dir> dot -c` and journal it.
3. **Gates on the branch base:** the four README gates green; record counts.
4. **Tools (AD-5):** copy `$OLD/{bytediff.mjs,bd-job.mjs,probe.mjs,speed.sh}` and
   `$OLD/fuzz/{classify.mjs,fuzz.mts,fuzzattr.mts,run.sh}` verbatim into `test/tools/`
   (paths inside them parametrised by env var or argument, not by `$OLD`); commit
   `chore(T0): import part-3 parity tools into test/tools`. If `$OLD` is gone, rebuild them
   from `plans/post-16-1-followups-3/batch-1/T0-baselines.md` steps 5–7 and journal it.
   Also copy `$OLD/disasm/` and `$OLD/fuzz/T0/` to `$BASE` if present.
5. **Base bundle:** `npm run build:js`; copy `dist/index.js` to `$BASE/T0.mjs`; record its
   commit in `$BASE/T0.sha`. Self-check: bytediff T0 vs T0 over the 17 `&` files → 0 diffs.
6. **Disassembly** (if `$OLD/disasm` is missing): `objdump -d --no-show-raw-insn` of the
   linked 16.1 images (libgvc, dot_layout, neato_layout, libpathplan, libcdt) and of the
   GTS library the neato plugin links (`/opt/homebrew/opt/gts/lib/libgts-0.7.5.dylib`, per `otool -L`) into `$BASE/disasm/`. Never rebuild
   `~/git/graphviz/build` (stop 10). List the functions T10–T13 need: `_arrowEndClip`,
   `_arrowStartClip`, `_bezier_clip`, `_sphere_ctx`/its inlined callers, `clip_and_install`,
   compound.c `arrowEndClipIdx`/`arrowStartClipIdx`, GTS `triangle.c` enclosing triangle.
7. **Native references** into `$BASE/native/`: `-Kneato -Tplain` and `-Txdot` of the
   item-43 probe graph and corpus 1554; stderr of one case per item 44, 54 (each of the 7
   messages), 55, 57, 58, 59 (xdot, cmapx, plain), 60 (`image=` and `<IMG>`), 61, 63.
8. **Speed** (load < 8): `speed.sh` method, dot + neato id lists from part 3 (`$OLD/speed-*.txt`),
   `$BASE/timings-T0.json` + one T0-vs-T0 noise pair; else journal "speed moved to T29".
9. **Bytes/pair (item 68):** heap bytes per class2 virtual node/edge pair on part 3 T13's
   probe (journal 2026-10-22 T13 rows): record the T0 number.

**Write-set:** the brief commit (`plans/post-16-1-followups-4/**`,
`plans/post-16.1-followups/README.md` status line); `test/tools/**` (verbatim copies);
scratchpad.
**Read-set:** `plans/post-16-1-followups-3/batch-1/T0-baselines.md`,
`plans/post-16-1-followups-3/decision-journal.md` (T0, T13 rows), `.agent-notes/post-16-1-followups-3.md`.

**Interface output:** `$BASE/T0.mjs`, `test/tools/*`, `$BASE/disasm/*.txt`,
`$BASE/native/*`, `$BASE/timings-T0.json`, `$BASE/noise.json`, bytes/pair (journal).

**Acceptance criteria:**
- *Given* the branch base, *when* the gates run, *then* all four are green and the oracle
  preflight passes for all 8 engines.
- *Given* bytediff T0 vs T0 over the `&` set, *then* 0 diffs, capped jobs listed.
- *Given* the item-43 probe, *then* `$BASE/native/hier-probe.plain` matches the journal's
  reference (`graph 1 2.524 2.5698`, node a 0.375 2.3198 … f 2.149 0.25).

**Observability:** N/A — no new observable operations. **Rollback:** reversible.
