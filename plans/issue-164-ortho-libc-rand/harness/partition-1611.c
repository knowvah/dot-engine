// SPDX-License-Identifier: EPL-2.0
// i164: 16.1.1 partition() and gv_permutation on fresh rand() streams. Per
// case: the two orderings gv_permutation gives from srand(1), then partition()
// from srand(1) again with the next rand() after it, and its rectangle set
// sorted by (LL.x, LL.y, UR.x, UR.y). Build with build-c.sh.
// The "emptyrects" case is undefined behaviour in native (heap-buffer-overflow
// write in make_new_monotone_poly, partition.c:249): one box varies by run.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ortho/partition.h>
#include <util/random.h>
#include <util/list.h>

static cell mk(double a, double b, double c, double d) {
  cell x; memset(&x, 0, sizeof x);
  x.bb.LL.x = a; x.bb.LL.y = b; x.bb.UR.x = c; x.bb.UR.y = d; return x;
}
static int cmpb(const void *p, const void *q) {
  const boxf *a = p, *b = q;
  double k1[4] = {a->LL.x, a->LL.y, a->UR.x, a->UR.y}, k2[4] = {b->LL.x, b->LL.y, b->UR.x, b->UR.y};
  for (int i = 0; i < 4; i++) { if (k1[i] < k2[i]) return -1; if (k1[i] > k2[i]) return 1; }
  return 0;
}
static void run(const char *name, cell *cs, size_t n, boxf bb) {
  size_t nsegs = 4 * (n + 1);
  srand(1);
  for (int pass = 0; pass < 2; pass++) {
    size_t *p = gv_permutation(nsegs);
    printf("%s %s:", name, pass ? "vperm" : "hperm");
    for (size_t i = 0; i < nsegs; i++) printf(" %zu", p[i] + 1);
    printf("\n"); free(p);
  }
  fflush(stdout);
  srand(1);
  boxes_t r = partition(cs, n, bb);
  fflush(stderr);
  size_t k = LIST_SIZE(&r);
  printf("%s rects=%zu null=%d next-rand=%d\n", name, k, LIST_IS_EMPTY(&r), rand());
  boxf *v = malloc(sizeof(boxf) * (k ? k : 1));
  for (size_t i = 0; i < k; i++) v[i] = LIST_GET(&r, i);
  qsort(v, k, sizeof(boxf), cmpb);
  for (size_t i = 0; i < k; i++) printf("  box(%.17g, %.17g, %.17g, %.17g)\n", v[i].LL.x, v[i].LL.y, v[i].UR.x, v[i].UR.y);
  fflush(stdout);
}
#define BB(a,b,c,d) ((boxf){{a,b},{c,d}})
int main(void) {
  { cell c[] = {mk(-27,72,27,108), mk(-27,0,27,36)}; run("f2pair", c, 2, BB(-63,-36,63,144)); }
  { cell c[] = {mk(-27,144,27,180), mk(-27,72,27,108), mk(-27,0,27,36)}; run("f3chain", c, 3, BB(-63,-36,63,216)); }
  { cell c[] = {mk(-27,72,27,108), mk(-63,0,-9,36), mk(9,0,63,36)}; run("f3branch", c, 3, BB(-99,-36,99,144)); }
  { double Y = 1080000000000000000.0; double X[] = {0,72,144,216,288,360}; cell c[6];
    for (int i = 0; i < 6; i++) c[i] = i == 3 ? mk(X[i]-27, 0, X[i]+27, 2*Y) : mk(X[i]-27, Y, X[i]+27, Y);
    run("c2784", c, 6, BB(-63,-36,423,2*Y)); }
  { cell c[] = {mk(0,10,0,10)}; run("point", c, 1, BB(-36,-26,36,46)); }
  { cell c[] = {mk(0,0,0,30), mk(0,0,10,10)}; run("vertonly", c, 2, BB(-36,-36,46,66)); }
  { cell c[] = {mk(10,20,10,30)}; run("emptyrects", c, 1, BB(-26,-16,46,66)); }
  { cell c[] = {mk(0,0,10,10)}; run("wellformed", c, 1, BB(-36,-36,46,46)); }
  { cell c[] = {mk(10,40,20,60), mk(40,0,40,10)}; run("silentA", c, 2, BB(-26,-36,76,96)); }
  { cell c[] = {mk(0,30,10,40), mk(10,20,10,40)}; run("silentB", c, 2, BB(-36,-16,46,76)); }
  return 0;
}
