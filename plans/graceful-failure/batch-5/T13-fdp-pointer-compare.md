<!-- SPDX-License-Identifier: EPL-2.0 -->
# T13: fdp output depends on heap addresses (node-pointer comparisons)

Follow [fork-finding-procedure.md](fork-finding-procedure.md). Slug:
`fdp-pointer-compare`.

## Recorded mechanism (verify; do not trust)

`docs/known-divergences.md`, "Native crashes and heap-address variation
(part 10)" and "Part 11 outcomes":

- `deriveGraph` and `genPorts` compare node **pointers**
  (`lib/fdpgen/layout.c:466,501,637` at 16.1.1).
- Over 12 native runs, the second render of `graphs-fdp` as `plain` fell
  into 2 classes, and `1581` as `dot` also fell into 2.
- Native rebuilt with those three comparisons on `ND_id` repeated 8 of 8
  times and was byte-equal to the port.

## Scope

This is nondeterminism, not a crash. The fix replaces the three pointer
comparisons with `ND_id` comparisons, exactly as the recorded experiment
did. The test renders the input N times (at least 8) and asserts identical
output. If the test cannot reproduce the variation reliably on the fork
build, journal that, and file the issue with the classes measured on
pristine, provided the strict-xfail test still fails before the fix. If it
does not fail, **do not file**, and record why.

## Read-set

- `docs/known-divergences.md`, the part 10 fdp bullet and the Part 11
  subgraph bullet
- C: `deriveGraph` and `genPorts`, by function

## Write-set

`plans/graceful-failure/upstream-drafts/fdp-pointer-compare.md`.
Fork: `fix/fdp-pointer-compare`.

## Observability and rollback

Observability: N/A (no new observable operations). Rollback: Reversible; delete the fork branch and close the fork issue. See the procedure.
