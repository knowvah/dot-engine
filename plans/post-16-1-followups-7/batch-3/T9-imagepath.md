# T9: `imagepath` and `safefile` (item 102, AD-6)

**Context:** with `imagepath` set and a relative `image=`, native
`gvusershape_file_access` (`gvusershape.c:683-705`) prints `Filename "<name>" is unsafe`
when `safefile` returns NULL. `safefile` (`utils.c:253-311`) behaves as follows:
- an empty name gives NULL;
- `SERVER_NAME` and `GV_FILE_PATH` take separate branches (not ported: no environment);
- otherwise the name is split into directories from `Gvimagepath`
  (`agget(g, "imagepath")`, falling back to `Gvfilepath`; `input.c:627-630`);
- an absolute name, or an empty directory list, returns the name itself;
- otherwise `findPath` returns the first readable `dir/name`.

The port skips `Gvimagepath` (`src/common/graph-init.ts:277`) and prints the
`No such file or directory while opening` line instead (`src/gvc/usershape.ts:59-65`).
`bind_shape` calls `safefile(agget(np, "shapefile"))` (`shapes.c:3976`); the port's
`bindShape` (after T2) treats it as a non-empty check.

**Task:**
1. Tests first, from `src/gvc/__fixtures__/p7/images/102-*` and `graphs-val_val`. stderr
   must equal native for each of:
   - a relative name with `imagepath`, file supplied by the host or not;
   - an absolute name;
   - `imagepath="d1:d2"`;
   - no `imagepath`;
   - the shapefile case.
2. `src/common/safefile.ts`: port `safefile` as AD-6's predicate. "Readable `dir/name`"
   becomes "the host supplies `name`" (sizer or resolver, the existing `imageIsSupplied`).
   Lookups stay keyed by the raw name. Port `mkDirlist`'s split on `PATHSEP` (`:`)
   verbatim. Document the unported env branches with `@see`.
3. `graph-init.ts`: set `Gvimagepath` at C's point (`input.c:627`) on the root graph's
   info, replacing the SKIPPED note.
4. `usershape.ts`: `gvusershape_file_access`'s null-`safefile` branch prints the `unsafe`
   text and returns; the other branches stay as they are. `shapes.ts:bindShape` calls
   `safefile` for `shapefile`.

**Write-set:** `src/common/graph-init.ts`, `src/common/safefile.ts` (new),
`src/common/shapes.ts`, `src/gvc/usershape.ts` (+ tests beside each).
**Read-set:** `lib/common/utils.c:220-311`, `lib/common/input.c:620-640`,
`lib/gvc/gvusershape.c:680-710`, `lib/common/shapes.c:3970-3990`, `src/gvc/usershape.ts`,
`src/gvc/image-type.ts` (T6).

**Interface output:** `safefile(name: string | undefined, g: Graph): string | null`.

**Acceptance criteria:**
- *Given* `imagepath="d"`, `image="x.png"` and nothing supplied, *when* laid out, *then*
  stderr has `Filename "x.png" is unsafe` where native prints it.
- *Given* an absolute name or no `imagepath`, *then* stderr and output are unchanged from
  T6's head.
- *Given* the corpus, *when* bytediff runs, *then* only ids with `imagepath` change, and
  each change matches native (`graphs-val_val`).

**Commit:** `fix(T9): honour imagepath in safefile warnings`.
**Observability:** N/A. **Rollback:** reversible.
