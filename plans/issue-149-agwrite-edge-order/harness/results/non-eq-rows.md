# Issue #149: rows that changed and are not byte-equal to native

From gate 5 (the 49 smoke ids, 8 engines) and gate 6 (58 ids). Every row here has
`struct=yes` and `pureMove=yes` in [non-eq-classify.tsv](non-eq-classify.tsv): with attribute
values masked the head is byte-equal to native, and every head line is a base line. `lost` and
`changed` are 0 on every row: no (object, attribute) value differs between base and head, and
none that was native's on the base is lost. Counts are `compare.mjs`'s (`diff | grep -c '^<'`).

## Accepted-row changes (24 id:engine pairs)

| id:engine | `-Tdot` native lines missing, base → head | `-Txdot` | `-Tdot` fields eqBase/eqHead/lost/changed | `-Txdot` fields | registry |
|---|---|---|---|---|---|
| `1581:fdp` | 15 → 1 | 37 → 1 | 169/169/0/0 | 246/246/0/0 | within tolerance (`parity-fdp` pass; a cluster `bb` x of `1.5987e-14` for `0`) |
| `1767:sfdp` | 19 → 19 | 56 → 56 | 81/81/0/0 | 90/90/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-b56:circo` | 22 → 7 | 44 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-circo=pass` |
| `graphs-b56:dot` | 23 → 7 | 46 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity=conformant` |
| `graphs-b56:fdp` | 22 → 7 | 44 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-fdp=pass` |
| `graphs-b56:neato` | 22 → 7 | 44 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-neato=pass` |
| `graphs-b56:osage` | 22 → 7 | 44 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-osage=pass` |
| `graphs-b56:patchwork` | 20 → 7 | 20 → 7 | 165/165/0/0 | 197/197/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-patchwork=pass` |
| `graphs-b56:sfdp` | 31 → 24 | 62 → 49 | 166/166/0/0 | 182/182/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-b56:twopi` | 22 → 7 | 44 → 7 | 183/183/0/0 | 224/224/0/0 | accepted (plain and json registries: latin1 input, label widths); `parity-twopi=pass` |
| `graphs-b:sfdp` | 22 → 16 | 47 → 41 | 32/32/0/0 | 34/34/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-ctext:sfdp` | 11 → 10 | 33 → 30 | 50/50/0/0 | 60/60/0/0 | within tolerance (`parity-sfdp` pass, 0.5) |
| `graphs-fdp:fdp` | 2 → 1 | 3 → 1 | 58/58/0/0 | 83/83/0/0 | within tolerance (`parity-fdp` pass; a cluster `bb` x of `1.5987e-14` for `3.1974e-14`) |
| `graphs-flatedge:sfdp` | 16 → 9 | 36 → 26 | 36/36/0/0 | 46/46/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-grdshapes:sfdp` | 62 → 62 | 230 → 230 | 195/195/0/0 | 196/196/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-pack:sfdp` | 30 → 18 | 69 → 45 | 136/136/0/0 | 179/179/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-polypoly:osage` | 3 → 2 | 9 → 6 | 755/755/0/0 | 969/969/0/0 | accepted (engines registry, A9: osage pack-cell swap from a 1-ULP libm `cos`) |
| `graphs-style:sfdp` | 45 → 39 | 129 → 123 | 116/116/0/0 | 117/117/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `graphs-url:sfdp` | 29 → 16 | 58 → 45 | 84/84/0/0 | 96/96/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `linux.x86-pack_neato1:sfdp` | 42 → 41 | 105 → 103 | 114/114/0/0 | 122/122/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `linux.x86-pack_neato2:sfdp` | 42 → 41 | 105 → 103 | 114/114/0/0 | 122/122/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `nshare-pack_neato1:sfdp` | 42 → 41 | 105 → 103 | 114/114/0/0 | 122/122/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `nshare-pack_neato2:sfdp` | 42 → 41 | 105 → 103 | 114/114/0/0 | 122/122/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |
| `tree-doc-neato-inet:sfdp` | 61 → 61 | 146 → 146 | 182/182/0/0 | 183/183/0/0 | `drift-exonerated` (`attribution-sfdp.json`) |

## Toward-native changes (16 id:engine pairs)

| id:engine | `-Tdot` native lines missing, base → head | `-Txdot` | `-Tdot` fields eqBase/eqHead/lost/changed | `-Txdot` fields | registry |
|---|---|---|---|---|---|
| `2521:dot` | 22 → 21 | 58 → 57 | 63/63/0/0 | 68/68/0/0 | `parity=diverged` |
| `2521:sfdp` | 19 → 18 | 54 → 53 | 68/68/0/0 | 69/69/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:circo` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:dot` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | `parity=structural-match` |
| `2592:fdp` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:neato` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:osage` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:patchwork` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:sfdp` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2592:twopi` | 10 → 3 | 18 → 9 | 154/154/0/0 | 171/171/0/0 | not in the engine universe (the id is not conformant on dot) |
| `2643:twopi` | 2 → 2 | 5 → 4 | 19/19/0/0 | 29/29/0/0 | `parity-twopi=diverged(12)`, `attribution=not-cleared` |
| `graphs-in:dot` | 7 → 7 | 19 → 19 | 18/18/0/0 | 20/20/0/0 | `parity=structural-match` |
| `graphs-longflat:dot` | 7 → 5 | 17 → 15 | 19/19/0/0 | 22/22/0/0 | `parity=structural-match` |
| `graphs-shells:dot` | 54 → 52 | 143 → 141 | 243/243/0/0 | 272/272/0/0 | `parity=diverged` |
| `graphs-shells:sfdp` | 69 → 67 | 181 → 179 | 225/225/0/0 | 228/228/0/0 | not in the engine universe (the id is not conformant on dot) |
| `tree-graphs-directed-longflat:dot` | 7 → 5 | 17 → 15 | 19/19/0/0 | 22/22/0/0 | `parity=structural-match` |
