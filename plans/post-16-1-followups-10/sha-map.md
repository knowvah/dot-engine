# post-16.1 follow-ups part 10: unsigned → signed commit IDs

The mission committed unsigned (part-5 AD-1); the user re-signed the branch with
`git rebase -f main` before PR #125, which gave every commit a new ID. The
mission journal, `plans/decision-journal.md` and the follow-ups README cite task
IDs only; no unsigned ID appears in them. This table maps each mission commit
to the signed commit on `main` (paired by subject and position; all 24 matched,
and the signed tree equals the unsigned one). Two review fixes followed on the
branch, `18bce74d` and `281fc0ff`, signed from the start. PR #125 landed as
merge commit `3a31c999`.

| Unsigned | Signed | Subject |
|---|---|---|
| `c994ff5a` | `c69aee9d` | docs(mission): add post-16.1 follow-ups part 10 brief |
| `38b01c5d` | `8e335dab` | test(T0): add part-10 native probe fixtures |
| `5e2081fe` | `3b7e3360` | test(T4): add golden inputs for init_xdot's replay |
| `d16c2489` | `528bca6f` | docs(T5): trace native's per-process variance on graphs-b56 |
| `08ad112a` | `e94d2115` | test(T2): archive the sfdp drift trace |
| `80235981` | `55aa8fa3` | fix(T9): allocate a node's edge lists unconditionally as C does |
| `ee40295f` | `67b0d85f` | fix(T10): reset the abomination shift when a dot layout starts |
| `ea873425` | `73179304` | fix(T11): append the fitter fallback's route and match aux weights |
| `2b847606` | `e092b4e6` | feat(T1): read dim and dimen, and print n coordinates, in neato |
| `a511dc69` | `73905ac3` | fix(T12): copy no-free arrows on the flat aux route as c does |
| `388cbb13` | `b4553bd1` | fix(T4): keep pen state across xdot style ops as c does |
| `090ab591` | `3723a4ad` | feat(T8): keep every coordinate through overlap removal |
| `9618e3e4` | `0b642562` | fix(T3): reuse a user's _cc_N subgraph in ccomps as agsubg does |
| `ccd77ca0` | `d153ad9a` | feat(T6): lay out kk in ndim dimensions |
| `92d97523` | `1425649e` | docs(mission): record part-10 batches 2 and 3b |
| `854149c9` | `e43fb31c` | feat(T13): lay out sfdp in ndim dimensions |
| `64945f4c` | `ed00f2ad` | feat(T7): lay out stress, hier, ipsep and sgd under dim |
| `8a0bc36c` | `b30e4cad` | docs(mission): record part-10 batch 3a |
| `112f3133` | `8fdf3e71` | fix(T14): undo cluster edges at the next layout as attach_attrs does |
| `05bccd88` | `703c0330` | fix(T15): pin the layout reset's edge cases against native |
| `49061388` | `5d1e168f` | docs(mission): record part-10 t14 and t15 |
| `d8642b23` | `277c4c35` | docs(T16): document dim and the sfdp drift outcome |
| `b32646a9` | `21f5f9ae` | docs(mission): record part-10 t16 |
| `0b49dc72` | `3c64b65b` | chore(T17): close out post-16.1 follow-ups part 10 |
