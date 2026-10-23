# Batch 3c: render-time warnings

Parallel worktrees after batch 2 (alongside 3a, 3b). T18 and T19 first confirm where the
port implements their C function (stop 1 if it is outside the expected write-set); the
three write-sets are disjoint from 3a/3b. Stderr-only except T19's one-layer rule.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T18](T18-unsupported-style.md) | Item 58: `gvrender_set_style: unsupported style` | typescript-pro | port of `gvrender_set_style` | T5 | [ ] |
| [T19](T19-layers-warning.md) | Item 59: `layers not supported in <fmt> output` | typescript-pro | port of `emit.c:firstlayer` | T5 | [ ] |
| [T20](T20-font-fallback-prefix.md) | Item 61: doubled `Warning: Warning:` | typescript-pro | `src/common/textmeasure-lookup.ts` | T5 | [ ] |
