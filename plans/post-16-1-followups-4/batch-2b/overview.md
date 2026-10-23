# Batch 2b: diagnostics, HTML warning state, layout reset

Parallel worktrees after T0 (stderr gate: T1's probe once landed, else T0's `probe.mjs`).
Write-sets are disjoint from each other and from 2a. Only T4 can change SVG output (a
label with a raw control character is dropped); the rest change stderr only, so the batch
survey runs only if bytediff shows output changes. Consumers: T5 → T23, T26 (`poly-init.ts`,
`start.ts`); T6 → T25; T7 → T23, T27.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T4](T4-expat-nonxml.md) | Item 44: raw control char in HTML text is an invalid token | typescript-pro | `src/common/htmltable-lex-expat.ts` | T0 | [ ] |
| [T5](T5-agerr-prefix-channel.md) | Items 54, 55: agerr prefixes and console channel | typescript-pro | 7 prefix sites, 6 channel sites, spying tests | T0 | [ ] |
| [T6](T6-parsesegs-warning.md) | Item 57: `Total size > 1` color-spec warning | typescript-pro | `src/common/multicolor.ts`, its callers (incl. `gvc/device-cluster.ts`) | T0 | [ ] |
| [T7](T7-html-warning-state.md) | Item 46: HTML warnings once per render | typescript-pro | `src/common/htmltable.ts` | T0 | [ ] |
| [T8](T8-layout-reset.md) | Item 47: `GvcContext.layout` resets render state | typescript-pro | `src/gvc/context.ts` | T0 | [ ] |
