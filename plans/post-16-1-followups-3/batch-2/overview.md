# Batch 2: per-render state, MaxIter, HTML invalid token, 2168_3 close

Parallel worktrees after T0. Write-sets are disjoint. T1's interface is consumed by T10
and T11 (batch 4). Survey for this batch only if byte-identity shows output changes
(T1 and T2 can move coordinates).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-render-state.md) | Item 42 + AD-4: find carried state, reset per render | debugger → typescript-pro | `src/common/render-state.ts` (new), statics owners, render entry points | T0 | [ ] |
| [T2](T2-maxiter.md) | Item 25: `MaxIter` per layout mode | typescript-pro | `src/layout/neato/init.ts` | T0 | [ ] |
| [T3](T3-html-invalid-token.md) | Item 40: expat invalid-token errors in HTML text | typescript-pro | `src/common/htmltable-lex-expat.ts`, `htmltable-lex.ts` | T0 | [ ] |
| [T4](T4-close-2168-3.md) | Item 30: document 2168_3 as irreducible | technical-writer | `docs/known-divergences.md`, `docs-site/*/divergences.md` | T0 | [ ] |
