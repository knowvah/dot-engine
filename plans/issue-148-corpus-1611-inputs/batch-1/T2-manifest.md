# T2: re-enumerate the manifest from 16.1.1's tree

## Context

With T1 in, `npx tsx test/corpus/enumerate.ts` walks `~/git/graphviz-16.1.1/tests`
plus its sibling roots. Planning ran `buildManifest` on both trees: 971 → 1007,
no id removed or changed, 36 added (all `applicable` except `2841`,
`engine-deferred`, `layout=fdp`).

The 36: `2746 2756 2756_1 2758 2759 2759_1 2761 2761_1 2765 2765_1 2768 2768_1
2768_2 2769 2769_1 2769_2 2773 2773_1 2774 2774_1 2776 2776_1 2780 2781 2781_1
2783 2821_0 2821_1 2821_2 2841 2860 2860_1 2866 2870_0 2870_1 2870_2`.

The 7 changed inputs keep their ids (reference copies re-captured upstream after
`write_body`'s edge order changed, #149): `linux.i386-radius_dot`,
`linux.x86-radius_dot`, `linux.x86-shapes_dot`, `macosx-radius_dot`,
`nshare-radius_dot`, `nshare-shapes_dot`, `windows-radius_dot`.

`2368_1` and `2854_1`, which the issue names "where new", already exist at 16.1.0.

## Task (TDD)

1. Run `oraclePreflight` for `dot`, then render each of the 36 with native
   16.1.1 (`-Tsvg`, cwd = the tests dir, so `2821*.dot` find `2821.png`). Record
   exit codes in the journal.
2. **Red.** Add a test (in an existing corpus test file that reads the manifest,
   e.g. `engine-exclusions.test.ts`, or a new `corpus-manifest.test.ts`) that the
   committed manifest holds each of the 36 ids, and that each native-crash id is
   `quarantined` with reason `oracle-crash`.
3. **Green.** Add `MANUAL_QUARANTINE` entries (AD-5) for every id whose native
   16.1.1 run dies on a signal (planning: `2746`, `2761`, `2761_1`, exit 139),
   commented with the signal and the upstream `xfail`. Run `enumerate.ts`.
4. Diff the manifest: only the 36 added entries (stop 3 otherwise).
5. `test/corpus/README.md` "Current totals": the new root and the printed counts.

## Write-set

`test/corpus/enumerate.ts` (`MANUAL_QUARANTINE` only),
`test/corpus/corpus-manifest.json`, `test/corpus/README.md`, the test file from
step 2.

## Acceptance criteria

- Given the regenerated manifest, when diffed against the base, then it adds
  exactly the 36 ids and removes or changes none (apart from quarantine status on
  the native-crash ids among the 36).
- Given `2746`, `2761`, `2761_1`, when looked up in the manifest, then each is
  `quarantined` / `oracle-crash`, unless step 1 shows native no longer crashes
  (then `applicable`, and the journal says why).
- Given the regenerated manifest, when `npx vitest run test/corpus test/docs`
  runs, then it passes with no registry file changed.

## Quality bar

Commit `test(T2): add graphviz 16.1.1's new corpus inputs`.

**Observability:** N/A — no new observable operations.
**Rollback:** Reversible (revert the commit; the manifest returns to 971 ids).
