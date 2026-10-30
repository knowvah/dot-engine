# post-16.1 follow-ups part 6: unsigned → signed commit IDs

The mission committed unsigned (AD-1); the user re-signed the branch with
`git rebase -f main` before PR #115, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite
the unsigned IDs. This table maps each to the signed commit on `main`
(paired by subject; all 8 matched). PR #115 landed as merge commit
`b0031d62`.

| Unsigned | Signed | Subject |
|---|---|---|
| `10907596` | `2c58230a` | docs(mission): add post-16.1 follow-ups part 6 brief |
| `a68c8a58` | `d4009fe2` | fix(T1): warn on missing image/shapefile once per layout |
| `2e5fd35c` | `d9a4234c` | fix(T2): fill empty first colour name opaque black with warning |
| `e0b7db7e` | `d2dd5e05` | docs(mission): close part-6 batches 1-2 (T0-T3 journal, T3 parked) |
| `7c4384ba` | `621b3b1e` | fix(T4): draw node and html images via gvrender_usershape |
| `284a3fa1` | `e6ef2f01` | docs(mission): close part-6 batch 3 (T4 journal, write-set widening) |
| `46d89c52` | `600b14d1` | docs(T5): document node image= sizing and drawing, sizer units |
| `ee9572f8` | `f495a018` | chore(T6): close out post-16.1 follow-ups part 6 |
