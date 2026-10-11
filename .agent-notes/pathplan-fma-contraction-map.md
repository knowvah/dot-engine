## Observation: exact FMA-contraction map of pathplan route.c / solvers.c in the arm64 oracle
- **Context**: T1 of plantuml-tracker-2. T5 (findMaxDev / bezier eval) and T7 (points2coeff / solve3)
  need to know which expressions the oracle's `libpathplan.4.dylib` fuses, and how. Source =
  `~/git/graphviz/lib/pathplan/{route,solvers}.c` (unchanged since 2026-04-04; HEAD 9d6e3abfd).
- **Finding**: clang (`-ffp-contract=on`, the Apple default) contracts per *source expression* in the
  FRONT END (emits `llvm.fmuladd`; the oracle `route.c.o` bitcode contains them). The rule, verified on
  every site below in asm and by bit-exact tests:
  - `X + Y` / `X - Y`: if the LEFT operand is a bare product (single use) it is fused and the RIGHT
    operand is the (already rounded) addend; else if the RIGHT operand is a product it is fused.
    So in `a*b + c*d` the FIRST product is fused and `c*d` is rounded first.
  - `X - c*d` (RHS product) -> `fmsub`: `fms(c,d,X)`; `a*b - Y` (LHS product) -> `fnmsub`: `fma(a,b,-Y)`.
  - Left-associative chains fuse per link: `a*b + c*d + e*f` = `fma(e,f, fma(a,b, c*d))`.
  - Sums of an fma result with a plain value (`c[0][0] += dot(..)`, `scoeff[0] += ...`) are a separate
    ROUNDED add: no contraction across function boundaries (inlined `dot`/`normv`/`B01`... keep the
    fmuladd they had in source; the inliner does not add new ones). Vectorised `fmla.2d` (SLP) are the
    same fma per lane.
  - Division/`sqrt`/call results are never fused (e.g. `pa.x + a*va.x/3.0`, `dist`, `tmp*tmp*tmp`).
  Notation: `fma(a,b,c)` = round(a*b+c) once; `fms(a,b,c)` = round(c-a*b) (src/common/fma.ts: `fms(a,b,c)=fma(-a,b,c)`).
  Operand order INSIDE a fused product is irrelevant (commutative); only WHICH product is fused matters.
  All other ops are plain IEEE double.
- **Impact**: T5/T7 must replace exactly the expressions in the table (and nothing else) with fma/fms.
- **Confidence**: High. Evidence below: 14/14 repro inputs bit-identical; negative controls differ.

### Map (cFile = lib/pathplan/ in ~/git/graphviz; function = source function; "(in)" = inlined into reallyroutespline/Proutespline)

| cFile | line | function | source expr | fused form | notes |
|---|---|---|---|---|---|
| solvers.c | 41:27 | solve3 | `q = 2*b_over_3a*p - b_over_3a*c_over_a + d_over_a` | `q = d_over_a + fma(2*b3a, p, -(b3a*c_over_a))` | `p=b3a*b3a` rounded (plain mul, before p is reassigned); `2*b3a` exact; `b3a*c_over_a` rounded then negated (asm `fnmul`+`fmadd`); final `+d_over_a` is a separate rounded add (asm `fadd d_over_a, t`) |
| solvers.c | 43:18 | solve3 | `disc = q*q + 4*p*p*p` | `disc = fma(q, q, ((4*p)*p)*p)` | p here is the REASSIGNED `p = c_over_a/3 - p` (line 42, plain sub); `4*p*p*p` left-assoc rounded products (3 `fmul`) |
| solvers.c | 46:22 | solve3 | `r = .5*sqrt(-disc + q*q)` | `r = 0.5*Math.sqrt(fma(q, q, -disc))` | asm `fnmsub d,q,q,disc` (= q*q - disc). `theta = atan2(sqrt(-disc), -q)` uses plain `-disc` (separate `fneg`) |
| solvers.c | 80:34 | solve2 (in solve3) | `disc = b_over_2a*b_over_2a - c_over_a` | `disc = fma(b2a, b2a, -c_over_a)` | asm negates then divides (`-c/a`), identical value to `-(c/a)` |
| solvers.c | 85:28 | solve2 (in solve3) | `roots[1] = -2*b_over_2a - roots[0]` | `roots[1] = fma(-2, b2a, -roots[0])` | `fnmsub b2a,-2.0,roots[0]`; roots[0] = `-b2a + sqrt(disc)` plain (`sqrt-b2a`, commutative) |
| solvers.c | solve1, AEQ0, rest of solve3 | | | none | `roots[i] -= b_over_3a`, alpha/beta, cos/cbrt args: plain |
| route.c | 397:19 | points2coeff | `coeff[3] = v3 + 3*v1 - (v0 + 3*v2)` | `coeff[3] = fma(3,v1,v3) - fma(3,v2,v0)` | two fmuladd (RHS product fused in each `v + 3*w`), then plain `fsub` |
| route.c | 398:23,32 | points2coeff | `coeff[2] = 3*v0 + 3*v2 - 6*v1` | `coeff[2] = fma(-6, v1, fma(3, v0, 3*v2))` | `3*v2` rounded; `-6*v1` fused via fmsub-as-fmadd with constant -6.0 (asm `fmadd d3,v1,-6.0,t`) |
| route.c | 398:1 `coeff[1]=3*(v1-v0)`, `coeff[0]=v0` | points2coeff | | none | plain |
| route.c | 360:22,40 / 361:20 | splineintersectsline | `sv = scoeff[0] + tv*(scoeff[1] + tv*(scoeff[2] + tv*scoeff[3]))` | `sv = fma(tv, fma(tv, fma(tv, s3, s2), s1), s0)` | Horner, 3 fmas (branch using ycoeff[1] != 0 path) |
| route.c | 383:18,36 / 384:28 | splineintersectsline | same Horner (second site, `sv = ...; sv = (sv-xcoeff[0])/xcoeff[1]` branch) | `fma(tv, fma(tv, fma(tv, s3, s2), s1), s0)` | the `(sv - c)/d` after it is plain |
| route.c | 371:24,51 / 372:17,44 | splineintersectsline | `sps[k].y - rat*sps[k].x` (4 args of points2coeff) | `fms(rat, sps[k].x, sps[k].y)` = `sps[k].y - rat*sps[k].x` fused | asm `fmsub d,rat,x,y`; `rat = ycoeff[1]/xcoeff[1]` plain |
| route.c | 374:31 | splineintersectsline | `scoeff[0] += rat*xcoeff[0] - ycoeff[0]` | `scoeff[0] = scoeff[0] + fma(rat, xcoeff[0], -ycoeff[0])` | fnmsub then ROUNDED `fadd` into scoeff[0] |
| route.c | 301:27,43 / 302:17 | splineisinside | `ip.x = ta*sps[0].x + tb*sps[1].x + tc*sps[2].x + td*sps[3].x` | `fma(td,s3x, fma(tc,s2x, fma(ta,s0x, tb*s1x)))` | `tb*s1x` rounded, `ta*s0x` fused first |
| route.c | 303:27,43 / 304:17 | splineisinside | same for `ip.y` | `fma(td,s3y, fma(tc,s2y, fma(ta,s0y, tb*s1y)))` | |
| route.c | 305:10 / 306:3 | splineisinside | `DISTSQ(ip, lps[k])` = `(ip.x-l.x)*(ip.x-l.x)+(ip.y-l.y)*(ip.y-l.y)` (assumed macro shape) | `dx=ip.x-l.x; dy=ip.y-l.y; fma(dx, dx, dy*dy)` | `dy*dy` rounded; dx,dy plain subs. td/tc/tb/ta (lines 296-299) are plain mults |
| route.c | 137:22,38,54 | reallyroutespline | `p.x = B0(t)*p1.x + B1(t)*cp1.x + B2(t)*cp2.x + B3(t)*p2.x` | `fma(B3,p2.x, fma(B2,cp2.x, fma(B0,p1.x, B1*cp1.x)))` | **T5 site.** B0..B3 are plain (no fma inside). `B1*cp1.x` rounded first; `B0*p1.x` is the first FUSED product. Swapping (fuse B1*cp1 instead) is NOT equivalent: flips w9 and issue-32 |
| route.c | 138:22,38,54 | reallyroutespline | `p.y = ...` same | `fma(B3,p2.y, fma(B2,cp2.y, fma(B0,p1.y, B1*cp1.y)))` | |
| route.c | 181:31 | mkspline (in) | `det01 = c[0][0]*c[1][1] - c[1][0]*c[0][1]` | `fma(c00, c11, -(c10*c01))` | LHS product fused, RHS rounded (asm `fnmul`+`fmadd`) |
| route.c | 182:28 | mkspline (in) | `det0X = c[0][0]*x[1] - c[0][1]*x[0]` | `fma(c00, x1, -(c01*x0))` | |
| route.c | 183:28 | mkspline (in) | `detX1 = x[0]*c[1][1] - x[1]*c[0][1]` | `fma(x0, c11, -(x1*c01))` | |
| route.c | 459:24 | dot (in mkspline, inlined 5x) | `p1.x*p2.x + p1.y*p2.y` | `fma(p1.x, p2.x, p1.y*p2.y)` | `c[0][0] += dot(..)` etc: the `+=` is a separate rounded add |
| route.c | 413:19 | normv (in Proutespline x2, reallyroutespline x3) | `d = v.x*v.x + v.y*v.y` | `fma(v.x, v.x, v.y*v.y)` | `sqrt`, `/=` plain |
| route.c | 488:29 | B01 (in mkspline) | `tmp*tmp*(tmp + 3*t)` | `(tmp*tmp) * fma(3, t, tmp)` | the outer `*` is plain; `1.0-t` plain |
| route.c | 494:29 | B23 (in mkspline) | `t*t*(3*tmp + t)` | `(t*t) * fma(3, tmp, t)` | |
| route.c | all others | dist, dist_n, add, sub, scale, B0..B3, splinefits `sps[1].x = pa.x + a*va.x/3.0`, `cp1 = add(p1, scale(v1,1/3.0))`, `tnas[i].t = prev + dist(..)`, `d > maxd` | | none | no fmadd in asm at those lines (division between mul and add, or call results) |

### Evidence

1. Flags. Oracle = `~/git/graphviz/build` CMake 4.4 Release: `cc -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC -Wall ...`
   (`CMAKE_C_FLAGS=` empty, `CMAKE_C_FLAGS_RELEASE=-O3 -DNDEBUG`; link line in
   `build/lib/pathplan/CMakeFiles/pathplan.dir/link.txt`). No `-ffp-contract` given -> Apple default `on`.
   Scratch builds used the same flags (copy at scratchpad `t1/gv`, `mk.sh`), plus `-g -S` for line maps.
2. Compiler drift (reconciled, not a STOP): the oracle objects were built by Apple clang 21.0.0
   **clang-2100.1.1.101** (string in `route.c.o` bitcode; macOS SDK 26.5); the local `cc` is clang-2100.3.34.2.
   Consequence: the `-S` text/scheduling and SLP vectorisation of non-fused code differ slightly from the
   dylib (my LTO rebuild: 5884 vs 5852 objdump lines), but:
   - `solve3` and `Proutespline`: fp/branch opcode sequences IDENTICAL to the oracle dylib
     (`fmul fdiv fdiv fdiv fmul fadd fmadd fadd fdiv ... fnmsub` etc.).
   - `reallyroutespline`: IDENTICAL multiset of fp ops and calls (45 `fmadd`, 14 `fmla.2d`, 4 `fmsub`,
     1 `fnmsub`, 7 `bl _hypot`, 3 `fsqrt`; `solve3` called 3x); order differs (scheduling only).
   - Non-LTO `-S` build: same counts (Proutespline 2 `fmadd`; reallyroutespline 45/14/4/1; solve3 3 `fmadd` + 2 `fnmsub`).
   - Frontend `llvm.fmuladd` count: oracle `route.c.o` bitcode 52 (post early-inline) / `solvers.c.o` 5;
     frontend IR of the copy 36 / 5 distinct source sites (the table).
   Fused-instruction count by function in the dylib: Proutespline 2, reallyroutespline 45+14 vec, solve3 5.
   (Other functions with fma, outside this task: Pshortestpath 5, triangulate 22, isdiagonal 23, ptVis 25,
   visibility 12, intersect 4, finddqsplit 2, area2/ccw/wind/dist2/in_poly 1 each.)
3. Asm excerpts (`cc -O3 ... -g -S`, `.loc` = route.c/solvers.c line:col):
   ```
   solvers.c:41:27   fnmul d4,c_over_a,b3a        ; -(b3a*c_over_a) rounded
                     fmadd d1,(2*b3a),p,d4        ; fused (2b)*p + t
   solvers.c:41:50   fadd  d1,d_over_a,d1         ; separate rounded +d_over_a
   solvers.c:43:18   fmadd d12,q,q,d0             ; d0 = ((4p)p)p rounded
   solvers.c:46:22   fnmsub d2,q,q,disc           ; q*q - disc
   route.c:137:30    fmul  d5,B1,cp1.x            ; rounded product
   route.c:137:22    fmadd d3,B0,p1.x,d5          ; B0*p1.x fused
   route.c:137:38    fmadd d3,B2,cp2.x,d3
   route.c:137:54    fmadd d3,B3,p2.x,d3
   route.c:459:31    fmul  d20,p1.y,p2.y ; 459:24 fmadd d19,p1.x,p2.x,d20
   route.c:181:31    fnmul d0,c10,c01 ; fmadd d0,c00,c11,d0
   route.c:371:24    fmsub d1,rat,sps.x,sps.y
   route.c:374:31    fnmsub d0,rat,xcoeff0,ycoeff0 ; 374:12 fadd d0,scoeff0,d0
   ```
4. Controlled rebuilds of libpathplan only, loaded into the REAL oracle `dot` via
   `DYLD_LIBRARY_PATH=<dir containing libpathplan.4.dylib>` (plugins reference `@rpath/libpathplan.4.dylib`;
   works), `GVBINDIR=/tmp/ghl`, `-Tdot` full-output `cmp` against the oracle for all 14 `test/golden/inputs/pt-issue-*.dot`:
   | variant | result |
   |---|---|
   | current-compiler rebuild, default contraction | 14/14 byte-identical (toolchain drift harmless) |
   | `-ffp-contract=off` (whole lib) | DIFF on 23-w5, 23-w12, 23-w20; same on w9, w30, 27-35 incl. 32 |
   | `#pragma clang fp contract(off)` only in `reallyroutespline` body (= the 137/138 bezier eval) | DIFF on w5, w12, w20 (same set as whole-lib off) |
   | same pragma only in solve3, solve2, points2coeff, splineintersectsline, splineisinside, mkspline, B01, B23, dot, normv (one each) | 14/14 identical (none of these matter for the pt-issue repros) |
   | source 137/138 replaced with explicit `__builtin_fma(B3,p2,__builtin_fma(B2,cp2,__builtin_fma(B0,p1,B1*cp1)))` (the table form) | **14/14 identical** |
   | same but the OTHER product fused: `fma(B3,p2,fma(B2,cp2,fma(B1,cp1,B0*p1)))` | DIFF on **23-w9 and 32** |
   Reading: 23-w5/12/20 flip when the eval is strict; w9 and 32 are sensitive to WHICH product is fused first.
   Issue 32 does not change under fully strict eval but does under the swapped order -> use the exact table order.
5. Standalone harness (`scratchpad/t1/h/h.c`, 3M random inputs incl. near-degenerate magnitudes 1e-4..1e7): compiler-contracted
   source form == the explicit-`fma` form above, 0 mismatches, for points2coeff (12M coeffs), B01, B23, dot, `x*x+y*y`,
   Horner, DISTSQ, 4-term ip, `y-rat*x`, `rat*x-y`, `a*b-c*d`, 4-term bezier; and the ORACLE dylib's exported `solve3`
   (incl. the solve2/solve1 fall-through paths) == an explicit-fma `solve3` with the table's forms: 0 / 3,000,000 mismatches;
   negative control (same code with plain `a*b+c`, contraction off): 510,552 / 3,000,000 mismatches.

### hypot verdict
`dist`/`dist_n` call libm `hypot` (not inlined sqrt): oracle `reallyroutespline` has 7 `bl` to the `_hypot` stub
(0x6708 = `_hypot` in the indirect-symbol table); no `fsqrt` is used for distances (the 3 `fsqrt` in reallyroutespline and
2 in Proutespline are `normv`). `dist` has no fma; Apple libm `hypot` is still the dylib import (not emulated by contraction).

### Unresolved / unmapped
None. Every fused instruction in `Proutespline`, `reallyroutespline` (with mkspline/splinefits/splineisinside/
splineintersectsline/points2coeff/dot/normv/B01/B23/solve2 inlined) and `solve3` maps to one table row.
Sites not discriminable on the pt-issue repros (operand order established by asm + the C-vs-explicit harness, not by a dot
repro): everything except 137/138. DISTSQ macro expansion at 305/306 was inferred from the asm (`fsub fsub fmul fmadd`), not
read from its macro definition.

### Reproduce
`scratchpad/t1/{mk.sh,run.sh,bisect.py,map.py,sym.py,fmaloc.py,h/h.c}`; build a variant dir with `mk.sh <srcdir>/pathplan <outdir> [cflags]`.

## Observation: tool quirks hit while mapping
- **Context**: disassembling / grepping the oracle dylib.
- **Finding**: `otool -tV libpathplan.4.dylib` grew to ~29 GB RSS and never finished (killed); `objdump -d --no-show-raw-insn`
  (llvm-objdump) disassembles it in under a second. The shell `grep` in this harness is `ugrep -I` and silently skips
  files it deems binary (e.g. clang `-S` output with a stray 0xf0 byte): use `command grep -a` and `LC_ALL=C` for awk.
  Apple `cc -x ir -S -emit-llvm <obj>.o` dumps the oracle's pre-link bitcode (shows `llvm.fmuladd` calls).
- **Impact**: spares the next person the otool hang; the bitcode route proves what the frontend contracted independent of backend scheduling.
- **Confidence**: High

## Observation: oracle objects built with an older clang than the local `cc`
- **Context**: step-4 cross-check of `-S` vs dylib.
- **Finding**: dylib built with clang-2100.1.1.101 / SDK 26.5; local cc is clang-2100.3.34.2 / SDK 27. Scheduling and SLP
  differ, fused-op multiset and every bit of output on the 14 pt-issue repros are identical. Rebuilding from this tree is safe for
  FMA questions, but byte-compare of disassembly is not.
- **Impact**: do not treat an asm diff against the dylib as an FMA discrepancy; compare op multisets / outputs.
- **Confidence**: High
