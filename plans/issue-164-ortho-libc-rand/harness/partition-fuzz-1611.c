// SPDX-License-Identifier: EPL-2.0
// i164 fuzz: see build-c.sh.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <ortho/partition.h>
#include <util/random.h>
#include <util/list.h>
// fuzz: single/double degenerate cells; report inputs giving 0 rects with no stderr
int main(int argc, char **argv) {
  unsigned s = argc > 1 ? atoi(argv[1]) : 7; int want = argc > 2 ? atoi(argv[2]) : 0;
  for (int it = 0; it < 20000; it++) {
    int n = 1 + (rand_r(&s) % 2); cell c[2]; memset(c, 0, sizeof c);
    for (int i = 0; i < n; i++) {
      double x = (rand_r(&s) % 5) * 10, y = (rand_r(&s) % 5) * 10;
      double w = (rand_r(&s) % 3) * 10, h = (rand_r(&s) % 3) * 10;
      c[i].bb.LL.x = x; c[i].bb.LL.y = y; c[i].bb.UR.x = x + w; c[i].bb.UR.y = y + h;
    }
    double lx = c[0].bb.LL.x, ly = c[0].bb.LL.y, ux = c[0].bb.UR.x, uy = c[0].bb.UR.y;
    for (int i = 1; i < n; i++) { if (c[i].bb.LL.x < lx) lx = c[i].bb.LL.x; if (c[i].bb.LL.y < ly) ly = c[i].bb.LL.y; if (c[i].bb.UR.x > ux) ux = c[i].bb.UR.x; if (c[i].bb.UR.y > uy) uy = c[i].bb.UR.y; }
    boxf bb = {{lx - 36, ly - 36}, {ux + 36, uy + 36}};
    // detect stderr output via a pipe
    int fds[2]; pipe(fds); int save = dup(2); dup2(fds[1], 2);
    srand(1); boxes_t r = partition(c, n, bb);
    fflush(stderr); dup2(save, 2); close(fds[1]);
    char buf[256]; ssize_t got = read(fds[0], buf, sizeof buf); close(fds[0]); close(save);
    if (LIST_SIZE(&r) == (size_t)want && got <= 0) {
      printf("n=%d", n);
      for (int i = 0; i < n; i++) printf(" cell(%g,%g,%g,%g)", c[i].bb.LL.x, c[i].bb.LL.y, c[i].bb.UR.x, c[i].bb.UR.y);
      printf(" bb(%g,%g,%g,%g)\n", bb.LL.x, bb.LL.y, bb.UR.x, bb.UR.y);
    }
  }
}
