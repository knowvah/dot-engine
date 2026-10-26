# post-16.1 follow-ups part 4: unsigned → signed commit IDs

The mission committed unsigned (AD-1); the user re-signed the branch with
`git rebase -f main` before PR #107, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite
the unsigned IDs. This table maps each to the signed commit on `main`
(paired by subject; all 36 matched). PR #107 landed as merge commit
`c3a81f76`; `c6902881` (CI fix, test only) was signed from the start.

| Unsigned | Signed | Subject |
|---|---|---|
| `9cbb4e7c` | `f6cf3b0c` | docs(mission): add post-16.1 follow-ups part 4 brief |
| `48a65e34` | `0025f2d9` | chore(T0): import part-3 parity tools into test/tools |
| `94c2fe92` | `cceed5cb` | test(T2): restate module-globals allowlist reasons |
| `45e4e3f4` | `e10437fa` | fix(T8): reset render state on gvccontext layout entry |
| `45f7410c` | `c6b0935d` | fix(T7): reset html warning dedupe state per render |
| `86149921` | `9bee892d` | docs(T9): document cdt face order and stdin prefix divergences |
| `b41ba126` | `86c27c70` | test(T3): mark oracle-nondeterministic walk rows |
| `dd93015d` | `90747b6a` | fix(T5): add native agerr prefixes and warn channel |
| `e31d930d` | `68c0096c` | fix(T6): print parsesegs total-size warning with caller context |
| `24eeb0e3` | `981f00f6` | fix(T4): treat raw control chars in html text as invalid tokens |
| `249f5521` | `7a29df6d` | chore(T1): port parity tools to tsx with unit tests |
| `0efcd2f8` | `25d70cae` | docs(mission): journal batches 1-2 and follow-ups 72-76 |
| `23d90b2a` | `7536cbfe` | fix(T12): port arrowStartClip in C's reversed absolute form |
| `e2a452ed` | `eeef152d` | fix(T13): port gts enclosing-triangle constant and fused expressions |
| `4859d2b8` | `a85b001a` | fix(T14): draw style=striped clusters via stripedBox |
| `5870acec` | `9e6ac917` | fix(T19): warn when layers are unsupported by the output device |
| `b710c97b` | `eb8b5df1` | fix(T20): double the font-fallback warning prefix as native does |
| `f7906282` | `a67a85f0` | fix(T11): port arrowEndClip back-up into clipToNodes |
| `91bc71eb` | `3e916437` | fix(T11): use fused DIST in compound arrow clip tests |
| `b5b83f96` | `d1215d50` | refactor(T15): port compute_hierarchy, opt_arrangement and kkutils sorts |
| `af7ae7a0` | `ce527968` | refactor(T16): port quad_prog_solve for mode=hier |
| `c62c0cc1` | `78f601a7` | perf(T21): share one empty attrs map across dot virtual nodes and edges |
| `c1906ec0` | `fb386118` | fix(T18): warn on unsupported styles as gvrender_set_style does |
| `0a2c2054` | `bbaf499a` | fix(T10): use fused DIST in splines-clip arrow clips |
| `b84270c1` | `2451840f` | fix(T24): report transparent pen and stripe colors under a colorscheme |
| `3e4aa4f6` | `69c957b7` | fix(T25): port findStopColor for html bgcolor gradients over parseSegs |
| `b6631ba2` | `1f06bcbc` | fix(T23): print native's missing-image warnings |
| `544a8ddd` | `3079aa7c` | refactor(T17): port smart_ini_x imds_given_dim |
| `4ea7d5a0` | `30043ed0` | refactor(T22): port stress_majorization_with_hierarchy |
| `81987220` | `412d8107` | refactor(T27): share one html line builder between sizing and pos |
| `0455ee31` | `7d0f0c50` | fix(T22b): port dijkstra_f with C's indexed heap and FLT_MAX |
| `b11a7e2c` | `30306add` | feat(T26): lay out neato mode=hier with constrained majorization |
| `86327e8c` | `f75da905` | docs(T26b): drop mode=hier from the always-unsupported tables |
| `d42aafd1` | `23a0cfc7` | fix(T28): use host libm cos/sin for the ellipse obstacle 8-gon |
| `f3510694` | `8e690f74` | docs(mission): journal batches 3-6 and follow-ups 77-87 |
| `66b8679a` | `5c3e84d5` | chore(T29): close out post-16.1 follow-ups part 4 |
