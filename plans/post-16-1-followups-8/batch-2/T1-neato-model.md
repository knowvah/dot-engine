# T1: port `neatoModel` (item 108, AD-9)

**Context:** `parseModel` (`src/layout/neato/index.ts:89-96`) maps the `model` string through
`MODEL_MAP` and returns `MODEL_SHORTPATH` silently for anything else. C
`neatoinit.c:neatoModel` (605-627):
- empty/unset → `MODEL_SHORTPATH`; `circuit`, `subset`, `shortpath` by `streq`
  (case-sensitive);
- `mds` → `MODEL_MDS` only if the edge attribute `len` is declared
  (`agattr_text(g, AGEDGE, "len", 0)`); otherwise
  `Warning: edges in graph <name> have no len attribute. Hence, the mds model` then
  `is inappropriate. Reverting to the shortest path model.` (AGPREV) and `MODEL_SHORTPATH`;
- anything else → `Warning: Unknown value <p> for attribute "model" in graph <name> - ignored`
  and `MODEL_SHORTPATH`.

`agnameof` of an anonymous graph is `%1` (T0 fixture `ipsep/model-mds.xdot.stderr`).

**Task:**
1. Tests first from the T0 fixtures `models/*mds-nolen*`, `*model-foo*`, `*model-Subset*`
   and `ipsep/model-mds`: stderr byte-equal, model value as C.
2. Port `neatoModel` into `parseModel` (keep the name; add `@see`), using the port's
   "attribute declared" test for `agattr_text` (find how other ports test a declared edge
   attribute, e.g. `graphHasLen`, and document whether it matches C's declaration
   semantics). Use the init.ts `MODEL_*` numbering (not stress.ts's).
3. Confirm with the native probe that the warning is printed once per `neato_layout` and
   where it falls among other layout warnings; call `parseModel` at that point only.
4. `ipsep-probes.test.ts`: restore the stderr comparison for `model-mds` (part 7 compared
   stdout only, follow-up 108).

**Write-set:** `src/layout/neato/index.ts` (parseModel only), its test file,
`src/layout/neato/ipsep-probes.test.ts`.
**Read-set:** `~/git/graphviz/lib/neatogen/neatoinit.c:600-630,1330-1440` (neato_layout call
site), `src/layout/neato/make-graph-data.ts:20-30`, the T0 fixtures.

**Interface output** (consumed by T6, T7): `parseModel(g: Graph): number` returning the
init.ts `MODEL_*` value, with mds-without-len already reverted to `MODEL_SHORTPATH`.

**Acceptance criteria:**
- *Given* `model=mds` and no edge `len`, *when* laid out, *then* stderr equals native and
  the layout equals `model=shortpath`'s.
- *Given* `model=foo` or `model=Subset`, *then* the `Unknown value` warning equals native.
- *Given* the 22 ipsep probes, *then* all pass, `model-mds` with stderr.
- *Given* the corpus, *when* bytediff runs, *then* output is identical (stop 8).

**Commit:** `fix(T1): port neatoModel warnings and mds fallback`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
