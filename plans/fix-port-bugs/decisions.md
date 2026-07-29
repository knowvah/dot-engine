<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architecture Decisions (pre-made, locked)

## D1 — DtBag.delete duplicate-identity mechanism: C-faithful splay walk

**Context.** `DtBag.delete()` by object identity misses non-root duplicates:
`findByIdentity` (src/cdt/bag.ts:39) does a non-splaying left-only spine walk,
but equal-key duplicates land in the RIGHT subtree. IMPORTANT correction to the
original bug framing: `bagInsert` (src/cdt/splay-core.ts:157-164) is FAITHFUL —
C's DT_INSERT found-branch (`~/git/graphviz/lib/cdt/dttree.c:223-231`) does
`root->right = link.left; link.left = root`, pushing the matched node onto the
right partition, exactly like the port. The divergence is delete().

**Decision.** Port C's delete path (dttree.c:67-79): splay-search the key to
root (`dtsearch` analog), then walk `next()` (which splays) while keys compare
equal, until `obj === target`; the match is then at/near root — unlink it
there. Do NOT keep the non-splaying findByIdentity mechanism.

**Consequences.** delete() now mutates tree structure on lookup exactly as C
does (mirror-the-mutation-contract rule). `findByIdentity`/`unlinkNode` may be
removed or reduced if no longer referenced. The wrong doc comment in
splay-core.ts ("new node is inserted immediately to the LEFT of the matching
node") must be corrected — comment-only change, no behavior edit to
splay-core.ts.

## D2 — record.ts attrBool: delegate to mapbool

**Context.** `attrBool` (src/common/record.ts:348) reimplements C `mapBool`
without the `gv_isdigit(*p)` guard (utils.c:336-338), so `attrBool('abc')`
returns true (`parseInt→NaN`, `NaN !== 0`) where C returns the default false.
A correct port already exists: `mapbool` in src/layout/dot/rank.ts:70.

**Decision.** `attrBool` delegates: `mapbool(nodeAttr(n, g, key))`, importing
from `../layout/dot/rank.js` — the same import pattern graph-init.ts already
uses. Delete the divergent local logic.

**Consequences.** One `mapBool` in C ↔ one `mapbool` in the port. Observable
change: `fixedsize="abc"` (any non-digit, non-bool string) now expands instead
of clamping.

## D3 — TH normalized to TR at the tokenizer

**Context.** C's lexer dispatches TH identically to TR — `T_row` on open,
`T_end_row` on close (`~/git/graphviz/lib/common/htmllex.c:614,669`). The port
instead treats `<TH>` as a TD-cell alias (htmltable-parse.ts:365) while the
cell-content close-matcher only recognizes `close TD` → infinite loop on any
label containing `<TH>`.

**Decision.** Normalize in src/common/htmltable-lex.ts token emission: an
open or close tag `TH` is emitted with tag `TR`. `TH` stays in KNOWN_TAGS
(still a recognized tag name). Remove the now-dead `t.tag === 'TH'` disjunct
in htmltable-parse.ts processRowToken.

**Consequences.** One normalization point, the exact structural analog of the
C lexer; close-tag handling falls out for free. htmltable-lex.ts joins the
write-set. Observable change: `<TH>` labels parse (as row boundaries) instead
of hanging.

## Operational decisions

- **Sweep cadence:** typecheck + vitest per task commit; ONE fresh
  (deleted-JSONL) full corpus sweep at mission end, 0 regressions, before
  merge. Rationale: only T2 (record fixedsize) and T3 (HTML labels) can
  plausibly touch corpus output, and any TH-bearing corpus case currently
  hangs so it cannot be in the passing set; T1 is stricter-only on invalid
  input; T4 has no production caller.
- **Rollback:** Reversible — revert the merge commit. semantic-release cuts a
  patch from `fix:` commits.
- **plans/ stays git-tracked** (project CLAUDE.md overrides the plan-mission
  skill's gitignore default).
