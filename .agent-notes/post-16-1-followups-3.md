# post-16.1 follow-ups part 3 (2026-10-22): observations

## Observation: 16.1 oracle is an LTO build — disassemble linked images only
- **Context**: T0/T6-T8 reading clang's fma contraction.
- **Finding**: `lib/{common,dotgen,neatogen}` `.o`/`.a` files are LLVM bitcode; machine code exists only in `libgvc.*.dylib` (lib/common), `libgvplugin_dot_layout` (dotgen), `libgvplugin_neato_layout` (neatogen, fdpgen, sfdpgen), `libpathplan`, `libcdt`. `objdump -d --no-show-raw-insn` works; `otool -tV` stalled. LTO inlines small functions (`ptToLine2` into `_update_bb_bz`/`_approx_bezier`, `approxLen` into `_splitBSpline` as `fmla.2d`): search callers. A vectorised body's operand order can be read from the scalar tail loop.
- **Impact**: fusion questions are answerable without a rebuild; read the scalar tail when the vector form is ambiguous.
- **Confidence**: High

## Observation: bit-exact native vectors from a clang harness
- **Context**: T7/T8 unit tests.
- **Finding**: copying the C expression into a scratch file compiled with `clang -O2` (default `-ffp-contract=on`) and printing `%.17g` reproduces the oracle's fused results; random full-precision inputs differ fused-vs-plain about once per 1e5 (round-valued inputs never do — products are exact).
- **Impact**: pin fusion ports with such vectors; the corpus rarely shows these last-bit changes (T6/T7/T8: 0 diffs).
- **Confidence**: High

## Observation: native static functions callable from a harness
- **Context**: T9 CDT replay oracle.
- **Finding**: plugin-static (`t` in nm) functions such as `mkSurface` link from `~/git/graphviz/build/lib/neatogen/libneatogen.a` into a stdin C harness with `-L/opt/homebrew/opt/gts/lib -lgts -L/opt/homebrew/opt/glib/lib -lglib-2.0 -Lbuild/lib/cgraph -lcgraph` (read-only use of the build tree). lldb SB-Python on the native binary (`BreakpointCreateByName`, StepOut, read struct memory) dumps `mkSurface` and `size_html_txt` results without an instrumented build.
- **Impact**: a native replay oracle for a single C function, no rebuild, no stop-10 risk.
- **Confidence**: High

## Observation: GTS face vertex order and nondeterminism
- **Context**: T9.
- **Finding**: 16.1 neato links GTS 0.7.6 (`HAVE_GTS`). `gts_triangle_vertices` returns (vertex only on e1, shared e1/e2 vertex, vertex only on e2): a face's order depends only on the edge order given to `gts_face_new`. GTS CDT is nondeterministic on degenerate input (points on edges, cocircular grids): `closest_face` iterates a pointer-keyed GHashTable — 22 distinct native outputs in 60 runs, even with ASLR off and `MallocNanoZone=0`. Native face ids are hash order; compare faces by vertex set.
- **Impact**: run native several times before calling a CDT residual a port bug.
- **Confidence**: High

## Observation: item 42's history dependence was one emit_once set
- **Context**: T1.
- **Finding**: all 13 pooled diffs of item 39 were `warnedFontNames` (C `emit_once`) suppressing a later render's font-fallback warning; layout output was never history-dependent (520 jobs × 3 orders). `random.ts`'s drand48 state started at 0x330E, not the libc unseeded X0 0x1234ABCD330E its comment claimed (harmless: every consumer seeds first). Per-graph-object state (HTML size/image warnings) still survives `freeLayout` (follow-up 46).
- **Impact**: module statics holding C process state must register with `src/common/render-state.ts`; `test/architecture/module-globals.fitness.test.ts` rejects a new module-level `let` — use a `const` object or `Set` cleared by a registered reset.
- **Confidence**: High

## Observation: native stderr details the port must copy
- **Context**: T5, T10, T11.
- **Finding**: `default_usererrf` escapes 0x00-0x1F (except `\t\n\v\f\r`) and 0x7F as `\ooo`, bytes ≥ 0x80 raw. C format strings that already start with `Warning: ` print `Warning: Warning: …` (width fallback, font fallback). The oracle has no text-layout plugin, so every measurement goes through `estimate_character_width_canonical`. Unknown-colour warnings are ordered by emit order: edge fill before pen, record pen before fill, poly/point fill first, HTML table COLOR before BGCOLOR, cluster fill before pen; svg has a known-colors list, so under a root colorscheme only non-svg renderers warn `transparent`. `sscanf("#%2x%2x%2x%2x") >= 3` makes `#12345` valid.
- **Impact**: stderr parity needs native's order and doubled prefixes, per renderer.
- **Confidence**: High

## Observation: 1864 dot needs ~6.6 GB even in C
- **Context**: T13.
- **Finding**: after rank, Σ(|Δrank|−1) = 6,251,413 virtual node/edge pairs; native 16.1.0 holds 6.35 GiB RSS in mincross (>7 min, its oracle-error timeout); the port spends 2,490 B/pair vs C's ≈1,056 (empty `attrs` Maps, separate Port objects, boxed numbers) and hits V8's heap limit in `Builtins_MapConstructor` (bytediff showed it as SIGABRT). Heap snapshots > 512 MB load with `python3 json.load`, not node `readFileSync`.
- **Impact**: 1864 is not fixable faithfully; follow-up 68 is the general memory win.
- **Confidence**: High

## Observation: verification tooling limits found this mission
- **Context**: T0, T3, T12, every bytediff run.
- **Finding**: bytediff must keep the head of stderr (V8 prints the OOM line first, then a long backtrace). `probe.mjs` compares only text content and ellipse `cx`, so it reports position bugs (item 35: y and ry off) as SAME — use a full-SVG diff. Fuzz `classify.mjs` files native's duplicate-`baseline-shift` output (nested sup/sub, invalid XML) under class 35. At load 100-160 bytediff runs ~40-100 jobs per 10 min and heavy ids cap at 120 s; `render-state.test.ts`-style module-reload tests exceed vitest's 5 s default.
- **Impact**: plan byte-identity by reach plus a closed-form argument when load is high; rerun capped ids with a longer cap.
- **Confidence**: High

## Observation: locale ledger edits need an agent with Edit
- **Context**: T14, carrying a `known-divergences.md` change into the 23 `docs-site/<locale>/divergences.md` pages.
- **Finding**: the `technical-writer` agent has Read/Write/Glob/Grep/WebFetch but no Edit; on ~1,100-line locale pages it correctly refuses whole-file rewrites and changes nothing. `documentation-engineer` has Edit. The four passages to touch are found by grepping `241_0`, `2556`, `f66ac638`, `2095`; ja/ko/zh wrap paragraphs as single long lines. `sourceHash` is `node scripts/i18n-hash.mjs docs/known-divergences.md`.
- **Impact**: dispatch locale passage edits to documentation-engineer.
- **Confidence**: High
