# Batch 1

Three tasks, in sequence. Each needs the one before it: T2's fixtures are red
only once T1 lands, and T3 gates the result. The orchestrator runs all three
itself: they are small, and they share the session's `$TMPDIR/i149` bundles.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Red probe tests, then 16.1.1's `write_body` + `write_edges` | orchestrator | see [T1](T1-write-body.md#write-set) | none | [x] |
| T2 | `recapture.sh apply` (47 fixtures), hackflag order, provenance lines | orchestrator | see [T2](T2-fixtures.md#write-set) | T1 | [x] |
| T3 | Gates 1-6, journal, squash | orchestrator | see [T3](T3-gates-squash.md#write-set) | T2 | [x] |

T1's output interface, which T2 and T3 consume:

- `$TMPDIR/i149/base.mjs`: the base bundle, built from `git archive <base>` or
  the base checkout before T1's edit (`npm run build:js`, copy `dist/index.js`).
- `$TMPDIR/i149/head.mjs`: the head bundle after T1.
- A journal row `T1` with the red test list: exactly the 47 assertions in 10
  files that AD-3 and AD-4 name, plus the new probe tests now green. If the red
  set differs from AD-3's list, that is stop condition 2.

Specs: [T1-write-body.md](T1-write-body.md), [T2-fixtures.md](T2-fixtures.md),
[T3-gates-squash.md](T3-gates-squash.md).
