# T0: baselines and native references

**Context:** part 4's tools are committed under `test/tools/` (`bytediff.ts`, `bd-job.ts`,
`probe.ts`, `speed.sh`, `timing.ts`, `fuzz/`). `$BASE` = this session's
`<scratchpad>/followups5-baseline`.

**Task:**
1. **Branch + brief commit** per the README's "First run only".
2. **Oracle preflight:** `dot -V` = 16.1.0; render a trivial graph with `/tmp/ghl` (dot)
   and with the full plugin dir (neato, fdp, sfdp, circo, twopi, osage, patchwork); on
   failure `GVBINDIR=<dir> dot -c` and journal it.
3. **Gates on the branch base:** the four README gates green; record counts.
4. **Base bundle:** `npm run build:js`; copy `dist/index.js` to `$BASE/T0.mjs`; record its
   commit in `$BASE/T0.sha`. Self-check: bytediff T0 vs T0 over the 17 `&` files → 0 diffs.
5. **Native references** into `$BASE/native/` (stderr and output per item):
   72 `digraph{a[label=<<TABLE><TR><TD><IMG SRC="nope.png"/></TD></TR></TABLE>>]}` rendered
   twice natively (one run each) · 73 `graph{a--b[len=x]}` and `len=-2` under
   `-Kneato`, `mode=major`, `mode=KK`, `-Kfdp` (`-Txdot`) · 74 `graph{mode=bogus;a}` -Kneato
   · 75 `digraph{a[style=filled fillcolor="red;0.6:blue;0.6"]}` · 76 `<TD BGCOLOR="&#xFFFE;">`,
   `&#xFFFF;`, `&#xD800;` in a cell, plus the same in content · 77
   `digraph{subgraph cluster_a{style=filled fillcolor="red;0.7:blue;0.6:green";a}}` and a
   three-colour version · 78 `digraph{layers="a:b";a}` -Tjson · 79 `layers="a:b:c"` with
   `layerselect="b"`, `"b,c"`, `"zz"`, on -Tsvg and -Txdot, cmapx · 80 `style="dashed , bogus"`,
   `"a(b(c))"`, `"a)"`, 65 tokens, a 2-bezier edge with bad colour + bad style ·
   81 `subgraph cluster_a{colorscheme=blues9 fontcolor=3 label=L; a}` -Tsvg and a tapered
   edge -Tsvg · 82 `<TABLE BGCOLOR="red;0.7:blue;0.6">`, `"red;x:blue"`, `":red"` ·
   83 `a[image="x.png"]` with a real 40×30 png in cwd (`-Tsvg`, `-Tplain`) and `<IMG>` of it ·
   85 `graph{stresswt=3;a--b}` -Kneato and the kD probe
   `graph{a--b--c--d--a;a--c;b--d;e--a}` -Kneato -Txdot · 87 `digraph{a->b}` -Kpatchwork
   -Tsvg (stderr) · 89 the two cluster repros in AD-6, one per key (9 keys × 2).
6. **Speed** (load < 8): `speed.sh` method, dot + neato id lists (`test/tools/speed-*.txt`),
   `$BASE/timings-T0.json` + one T0-vs-T0 noise pair; else journal "speed moved to T17".

**Write-set:** the brief commit (`plans/post-16-1-followups-5/**`,
`plans/post-16.1-followups/README.md` header line); scratchpad.
**Read-set:** `plans/post-16-1-followups-4/batch-1/T0-baselines.md`,
`plans/post-16-1-followups-4/decision-journal.md` (T0 row), `test/tools/*.ts` headers.

**Interface output:** `$BASE/T0.mjs`, `$BASE/T0.sha`, `$BASE/native/*`,
`$BASE/timings-T0.json`, `$BASE/noise.json`.

**Acceptance criteria:**
- *Given* the branch base, *when* the gates run, *then* all four are green and the oracle
  preflight passes for all 8 engines.
- *Given* bytediff T0 vs T0 over the `&` set, *then* 0 diffs, capped jobs listed.
- *Given* `$BASE/native/`, *then* every item above has its stderr and output files.

**Observability:** N/A — no new observable operations. **Rollback:** reversible.
