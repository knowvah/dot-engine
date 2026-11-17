// SPDX-License-Identifier: EPL-2.0
// Native update_bb_bz on one cubic, from bb (0,0)-(0,0) unless given.
// Build: cc -O2 native-bb.c -L ~/git/graphviz-16.1.1/build/lib/gvc -lgvc \
//   -Wl,-rpath,$HOME/git/graphviz-16.1.1/build/lib/gvc -o $TMPDIR/nbb
// Run: $TMPDIR/nbb x0 y0 x1 y1 x2 y2 x3 y3 [llx lly urx ury]; prints %.17g bb.
#include <stdio.h>
#include <stdlib.h>
typedef struct { double x, y; } pointf;
typedef struct { pointf LL, UR; } boxf;
void update_bb_bz(boxf *bb, const pointf *cp);
int main(int argc, char **argv) {
  // args: x0 y0 x1 y1 x2 y2 x3 y3 [llx lly urx ury]
  pointf cp[4];
  for (int i = 0; i < 4; i++) { cp[i].x = strtod(argv[1+2*i], 0); cp[i].y = strtod(argv[2+2*i], 0); }
  boxf bb = {{0,0},{0,0}};
  if (argc > 9) { bb.LL.x = strtod(argv[9],0); bb.LL.y = strtod(argv[10],0); bb.UR.x = strtod(argv[11],0); bb.UR.y = strtod(argv[12],0); }
  update_bb_bz(&bb, cp);
  printf("%.17g %.17g %.17g %.17g\n", bb.LL.x, bb.LL.y, bb.UR.x, bb.UR.y);
  return 0;
}
