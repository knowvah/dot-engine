# post-16.1 follow-ups part 7: unsigned → signed commit IDs

The mission committed unsigned (part-5 AD-1); the user re-signed the branch with
`git rebase -f main` before PR #117, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite
task IDs, plus a few unsigned IDs (e.g. the survey head `f74bd984`). This table
maps each to the signed commit on `main` (paired by subject; all 18 matched).
The review fix `cca8bfc5` was committed signed. PR #117 landed as merge commit
`f62e0c35`.

| Unsigned | Signed | Subject |
|---|---|---|
| `7b9b836e` | `69033cdd` | docs(mission): add post-16.1 follow-ups part 7 brief |
| `54b4777e` | `9ac36a07` | test(T0): add part-7 native probe fixtures |
| `7d8a1fcd` | `16fe79d4` | fix(T1): port cola layout prologue and fused right-multiply |
| `2a8908d3` | `2113e498` | fix(T4): port core_loadimage_svg rotation branch |
| `8d2b1cac` | `95273aa0` | fix(T2): key poly_init image branches on the bound usershape |
| `b05d79b9` | `b551a4a9` | feat(T7): port subset and circuit distance models |
| `4cf451f9` | `39b5d989` | fix(T3): cut point and edge fill names at the first colon |
| `424cc427` | `6e8052e0` | fix(T6): sniff image type and warn on missing loadimage plugin |
| `99919bf4` | `6d6526d5` | feat(T5): port quad_prog_vpsc constrained majorization |
| `0952c743` | `88f5f1d6` | fix(T9): honour imagepath in safefile warnings |
| `0d54e972` | `113ada70` | docs(mission): record part-7 batches 1 and 2 |
| `91fdb73b` | `8f8f04c4` | feat(T8): port stress_majorization_cola and ipsep options |
| `a869384d` | `05424962` | docs(mission): record part-7 batch 3 |
| `f74bd984` | `ea268781` | feat(T10): lay out constrained ipsep with stress_majorization_cola |
| `000f37b3` | `84db7082` | docs(T11): document ipsep constraints, image types and imagepath |
| `34939e65` | `1732c18d` | docs(mission): record part-7 batch 4 |
| `9c55a4b9` | `7ee684f8` | fix(T3): resolve edge fill names only for edges with a spline |
| `bc216176` | `c1a9374e` | chore(T12): close out post-16.1 follow-ups part 7 |
