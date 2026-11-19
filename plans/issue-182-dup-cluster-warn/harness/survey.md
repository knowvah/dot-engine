# Planning-time sweep: where native prints fillMap's warning

Run 2026-11-17 against graphviz 16.1.1 (`~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611` for dot, `/tmp/ghl1611-all` for fdp), base `722e372a`.

**Inputs.** Every corpus manifest entry whose text matches `cluster`
(`grep -liE cluster`, 309 files) under fdp, and the 17 of those that also
match `compound` under dot. [sweep-one.sh](sweep-one.sh) counts
`Two clusters named` lines in native stderr (`timeout 30`).

| id | engine | warnings | note |
|---|---|---|---|
| `1436` | fdp | 5 | named `cluster` five times over |
| `1902` | fdp | 1 | named |
| `graphs-b7` | fdp | 1 | `cluster_1` twice |
| `2475_2` | fdp | 804 | 805 anonymous `cluster=true` subgraphs: every one after the first warns (AD-2) |
| `2475_1` | fdp | 5710 | 5711 anonymous `cluster=true` subgraphs; native does not finish in 300 s, so it is out of every comparison (AD-4) |

No dot compound input warns. The 308-file fdp list (2475_1 removed) is
[survey-fdp.txt](survey-fdp.txt); the dot list is
[survey-dot-compound.txt](survey-dot-compound.txt). Both are paths relative to
`~/git/graphviz-16.1.1/tests`.

**Prototype check** ([prototype.diff](prototype.diff), built and compared, then
reverted). For `1436`, `1902`, `graphs-b7` and `2475_2` under fdp, head stderr
equals native and head stdout equals base. On the base, stderr differs from
native on all four.

**Native nondeterminism found on the way.**

- Native fdp segfaults on some runs of a duplicate-cluster input: 6 of 30 on
  `probes/dup.gv`, 4 of 30 on `probes/dupc.gv`, 0 of 30 on `packc2.gv` and
  `edgec.gv`, and every run of `dup3c.gv`. The warnings come first, so stderr
  is complete either way. Stdout is empty on a crashed run.
- Native fdp stdout on `2475_2` differs between runs: four runs gave four
  md5s. `1436` gave the same md5 three times. Only stderr matters to this
  mission, so this is recorded and not chased.
