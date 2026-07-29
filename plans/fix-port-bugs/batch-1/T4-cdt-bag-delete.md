<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — DtBag.delete finds non-root duplicates (C-faithful splay walk)

## Context

dot-engine is a faithful TypeScript port of Graphviz; the C source at
`~/git/graphviz` is the canonical spec. Tests use vitest; strict TS. TDD:
convert the existing `it.todo` into a real red test FIRST, verify red, then
fix src. This bug is latent — no production caller — but faithfulness rules
apply in full.

## The bug (locked analysis — if the fix turns out to differ, STOP)

**Framing correction (verified against C, supersedes the older comment in the
test file):** `bagInsert` (src/cdt/splay-core.ts:157-164) is FAITHFUL. C's
DT_INSERT found-branch (`~/git/graphviz/lib/cdt/dttree.c:223-231`) does
`root->left = NULL; root->right = link.left; link.left = root;` — the matched
node is pushed onto the RIGHT partition and ends up in the new node's right
subtree, exactly what the port does. The actual divergence is `delete()`:

- C (dttree.c:67-79, the DT_OBAG DELETE/DETACH pre-pass): `dtsearch(dt,obj)`
  splays an equal-key node to root, then `dtnext` (also splaying) walks the
  equal-key group until pointer identity `o == obj` matches; the match is then
  at root and is unlinked there.
- Port (src/cdt/bag.ts:39-56 findByIdentity): non-splaying LEFT-only spine
  walk from the splayed root — but duplicates thread RIGHT, so a duplicate
  inserted after its match is unreachable and `delete()` returns false.

`src/cdt/bag.branch.test.ts:131` ("pins the actual (buggy) behavior") asserts
the bug: `delete(origTen)` → false, size stays 4.

## Task

1. In src/cdt/bag.branch.test.ts, replace the `it.todo` at :126 with a real
   test asserting the FIXED behavior, and INVERT the buggy-behavior-pinning
   test at :131 (`delete(origTen)` → `true`, size 3, remaining tags
   `['dupTen','five','three']`; retitle it — it no longer pins a bug). Confirm
   red (the new/inverted assertions fail against current src).
2. Fix per decision D1 ([../decisions.md](../decisions.md#d1--dtbagdelete-duplicate-identity-mechanism-c-faithful-splay-walk)):
   delete() mirrors dttree.c:67-79 — splay-search the key to root, then use
   the (splaying) next-walk over the equal-key group until `obj === target`,
   then unlink at root. Reuse the existing splay/next machinery in bag.ts.
   Remove `findByIdentity`/`unlinkNode` if nothing references them afterward
   (grep first — "looks unused" is not "is unused").
3. Comment-only edit in src/cdt/splay-core.ts: correct the module doc comment
   claiming the new node is inserted "immediately to the LEFT of the matching
   node" (C threads the match to the RIGHT — cite dttree.c:223-231). Also
   update the now-outdated BUG comment block above the tests you touched.
4. Confirm green; run the full quality bar.

## Write-set

- src/cdt/bag.ts
- src/cdt/bag.branch.test.ts
- src/cdt/splay-core.ts (comment only — no behavior change)

## Read-set

- src/cdt/bag.ts (whole file — it is small: DtBag, findByIdentity, unlinkNode,
  first/next iteration)
- src/cdt/splay-core.ts:110-200 (bagInsert + splay)
- src/cdt/bag.branch.test.ts:95-170 (the todo, the :131 pinning test, the
  identity-not-found test)
- ~/git/graphviz/lib/cdt/dttree.c:55-100 (OBAG delete pre-pass) and :211-247
  (found-branch DT_INSERT/DT_DELETE)

## Acceptance criteria

- Given keys 5, 10, 3 inserted then a duplicate id-10 object, when
  `delete(origTen)` is called immediately (no intervening walk), then it
  returns `true`, `size()` is 3, and remaining tags (sorted) are
  `['dupTen','five','three']`.
- Given an object whose key exists but whose identity is not in the bag
  (existing test at :157), then `delete` still returns false.
- Given the primitive-duplicate tests (:99-105) and iteration-order tests,
  then they still pass.
- delete() performs a splaying search + group walk (C mechanism), not a
  non-splaying spine scan.
- splay-core.ts diff is comments only (verify: `git diff` shows no code lines).

## Observability requirements

N/A — no new observable operations.

## Rollback notes

Reversible — pure code change, revert the commit. No production caller.

## Quality bar

`npm run typecheck` exit 0; `npm test` exit 0 (full suite);
`git diff --name-only` within the write-set only.

## Boundaries

- Never edit files outside the write-set.
- Never change bagInsert's behavior — it is verified faithful.
- Do not write decision-journal.md — return your journal-entry text in your
  final report instead.

## Commit

One commit: `fix(cdt): DtBag.delete splay-walks duplicates per dttree.c (T4)`
Body: why (C deletes via splaying dtsearch+dtnext identity walk; port's
left-only spine scan missed right-threaded duplicates; bagInsert verified
faithful against dttree.c:223-231).
