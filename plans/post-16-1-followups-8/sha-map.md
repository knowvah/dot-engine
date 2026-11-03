# post-16.1 follow-ups part 8: unsigned → signed commit IDs

The mission committed unsigned (part-5 AD-1); the user re-signed the branch with
`git rebase -f main` before PR #119, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite task
IDs, plus a few unsigned IDs. This table maps each to the signed commit on
`main` (paired by subject; all 16 matched). The CI fix `004b4d1d` was committed
signed. PR #119 landed as merge commit `e65f14bc`.

| Unsigned | Signed | Subject |
|---|---|---|
| `e132afee` | `c8fb066d` | docs(mission): add post-16.1 follow-ups part 8 brief |
| `255f0a8a` | `6ee11515` | test(T0): add part-8 native probe fixtures |
| `19000c69` | `97e18ab1` | docs(mission): record part-8 batch 1 |
| `b6d0440b` | `ec728fae` | fix(T1): port neatoModel warnings and mds fallback |
| `ad95d2a2` | `c9291547` | fix(T4): warn on unrecognized image bytes at layout |
| `d2054ca2` | `339c1d79` | fix(T4): drop an unused import in poly-init |
| `c243f119` | `af0fec91` | refactor(T2): port kk subset weights and circuit_model |
| `d33f8b11` | `d111c930` | fix(T3): order vpsc sweep-line neighbours as the c++ sets do |
| `af4f25d6` | `73d29edb` | fix(T5): let safefile see the layout's own image hooks |
| `63b39190` | `75c7d382` | docs(mission): record part-8 batch 2 |
| `3c9714e7` | `376bf9cd` | feat(T6): lay out subset, circuit and mds models on major and hier |
| `c2f27626` | `98a8c8bf` | docs(mission): record part-8 t6 and the kk pack decision |
| `4b14e46a` | `323d44f8` | feat(T7): lay out subset and circuit models on kk |
| `977ac60d` | `0d02083d` | docs(T8): document neato models, vpsc tie order and image warnings |
| `08b495d0` | `1a7a34b5` | docs(mission): record part-8 batches 3 and 4 |
| `99fa7b61` | `ba7b10b8` | chore(T9): close out post-16.1 follow-ups part 8 |
