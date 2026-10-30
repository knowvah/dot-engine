# T0: baselines and native references

**Context:** tools are committed under `test/tools/` (`bytediff.ts`, `bd-job.ts`,
`probe.ts`). `$BASE` = this session's `<scratchpad>/followups6-baseline`.

**Task:**
1. **Branch + brief commit** per the README's "First run only".
2. **Oracle preflight:** `dot -V` = 16.1.0; render a trivial graph with `/tmp/ghl` (dot)
   and with the full plugin dir (neato, fdp, sfdp, circo, twopi, osage, patchwork); on
   failure `GVBINDIR=<dir> dot -c` (rebuild a missing dir per the part-5 agent notes) and
   journal it.
3. **Gates on the branch base:** the four README gates green; record counts.
4. **Base bundle:** `npm run build:js`; copy `dist/index.js` to `$BASE/T0.mjs`; record its
   commit in `$BASE/T0.sha`. Self-check: bytediff T0 vs T0 over the 17 `&` files → 0 diffs.
5. **Test images:** in `$BASE/img/` write `r.png` (40×20 RGB) and `t.png` (30×40), small
   PNGs generated with a few lines of Python `zlib`/`struct` (no downloads).
6. **Native references** into `$BASE/native/` (stderr and output per case, run from
   `$BASE/img/` so relative names resolve):
   - 90: `digraph{a[image="nope.png"]}` -Tjson, -Tsvg, -Txdot; the same graph rendered
     with two `-T` flags in one run (`-Tsvg -Txdot`); `a[shape=custom shapefile="nope.ps"]`
     -Tjson; neato and osage -Tjson of the first case.
   - 91: `a[image="r.png"]` -Tsvg/-Txdot/-Tjson; `shape=box imagescale=true imagepos=tl`;
     each `imagepos` (tl tc tr ml mc mr bl bc br) with `imagescale` false/true/width/
     height/both on `t.png`; `style=filled fillcolor=yellow`; `peripheries=2`;
     `dpi=144`; `rotate=90`; an HTML `<IMG SRC="r.png"/>` cell with and without
     `SCALE`; `-Kneato` of the first case.
   - 92: node `style=filled fillcolor=":red"`; cluster `style=filled fillcolor=":red"`;
     cluster `bgcolor=":red"`; node `fillcolor="red:"`; `gradientangle=90` variant; each
     -Tsvg, -Txdot, -Tjson.
   - 94: the six ipsep probes from part 5 T15 (`$BASE` of part 5 if present, else rebuilt
     from the part-5 journal T15 rows) -Kneato -Txdot.
7. **Port references:** the same cases through `$BASE/T0.mjs` (with `setImageSizer`
   supplying 40×20 / 30×40 for the 91 cases), saved beside the native files as `*.port.*`.

**Write-set:** the brief commit (`plans/post-16-1-followups-6/**`,
`plans/post-16.1-followups/README.md` header line); scratchpad.
**Read-set:** `plans/post-16-1-followups-5/batch-1/T0-baselines.md`, `test/tools/*.ts`
headers.

**Interface output:** `$BASE/T0.mjs`, `$BASE/T0.sha`, `$BASE/img/*`, `$BASE/native/*`.

**Acceptance criteria:**
- *Given* the branch base, *when* the gates run, *then* all four are green and the oracle
  preflight passes for all 8 engines.
- *Given* bytediff T0 vs T0 over the `&` set, *then* 0 diffs, capped jobs listed.
- *Given* `$BASE/native/`, *then* every case above has native stderr and output and a port
  counterpart.

**Observability:** N/A — no new observable operations. **Rollback:** reversible.
