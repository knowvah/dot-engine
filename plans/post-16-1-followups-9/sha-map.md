# post-16.1 follow-ups part 9: unsigned → signed commit IDs

The mission committed unsigned (part-5 AD-1); the user re-signed the branch with
`git rebase -f main` before PR #121, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite task
IDs, plus one unsigned ID, `3a6fdb5f`, the commit under final verification. This table
maps each to the signed commit on `main` (paired by subject and position; all 26
matched, and the signed tree equals the unsigned one). PR #121 landed as merge commit `527a2f70`.

| Unsigned | Signed | Subject |
|---|---|---|
| `dfc06550` | `f6a8c9a2` | docs(mission): add post-16.1 follow-ups part 9 brief |
| `fb99ff32` | `2b388c78` | test(T0): add part-9 native probe fixtures |
| `f1eb676f` | `c2bef410` | refactor(T5): remove the unused global image sizer accessor |
| `91180571` | `db7a8697` | fix(T1): saturate toDistType as native arm64 does |
| `39449aa6` | `78f10c80` | fix(T3): warn on sfdp start modes other than random |
| `b6e5386b` | `95034e4e` | fix(T4): port circo root lookup per component and per node |
| `6d9ac07d` | `43733ef2` | fix(T2): copy root attributes into neato components |
| `eb660e8a` | `f1bfe66a` | docs(mission): record batch 2 and add plantuml-ts issues to scope |
| `2fa19b70` | `d07dc0d0` | fix(T6): name connected components as ccomps.c does |
| `80ed80cb` | `2927d07b` | fix(T7): sort sweep events as libc++ std::sort does |
| `fb9c8995` | `d6bb4b85` | docs(mission): record batch 3 and reserve follow-up 115 |
| `eab2e937` | `986a8a3d` | test(T12): pin plantuml-ts issue 36 against native |
| `f6ca7b25` | `dd79aa1c` | test(T8): prove dir1 n40 differs only by block address order |
| `1d748123` | `253f327f` | fix(T11): reset layout records after freeLayout as gvFreeLayout does |
| `3a7c3214` | `ac3ff015` | docs(mission): record T8, T11 and the open no-free question |
| `52aa5626` | `23fbbf04` | docs(mission): add T13 and T14 to close the gaps in issue 37 |
| `8842ab3f` | `2b5aa7cb` | fix(T13): append routes on a layout with no free as new_spline does |
| `2fd55b8d` | `43da2f4b` | docs(mission): record T13 and its write-set widening |
| `6696d298` | `83ded724` | fix(T14): write layout attributes back as attach_attrs does |
| `6e257d42` | `7f0bbee3` | docs(mission): record T14 and the stop 15 reading |
| `4b4b5ba7` | `3c9b38ca` | docs(T9): record part-9 behaviour and vpsc proof |
| `14959dbe` | `61741f07` | docs(mission): record batch 4 |
| `cbcecd2a` | `9472e939` | fix(T14): start the xdot replay from emit_background's state |
| `488d2048` | `c6181aaa` | docs(T9): record the freed-fill divergence in the replay |
| `3a6fdb5f` | `7bb9cd50` | docs(mission): record the T14 fix and ledger entry A13 |
| `2ab69cd5` | `714419ff` | chore(T10): close out post-16.1 follow-ups part 9 |
