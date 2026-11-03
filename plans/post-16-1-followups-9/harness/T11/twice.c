// SPDX-License-Identifier: EPL-2.0
// Native control for issue 37: layout, render, gvFreeLayout twice on one graph.
// usage: GVBINDIR=<full plugin dir> twice-native <file> <engine> <format>; prints SAME or DIFF.
// Copy this file and twice-matrix.mjs to a scratch dir, because the runner writes its job file beside
// itself, then build there, with G=~/git/graphviz and B=$G/build:
//   clang -O1 -o twice-native twice.c -I$G/lib/gvc -I$G/lib/cgraph -I$G/lib/common -I$G/lib/pathplan \
//     -I$G/lib/cdt -I$G/lib -I$B -I$B/lib/common -I$B/lib/gvc -L$B/lib/gvc -L$B/lib/cgraph -L$B/lib/cdt \
//     -lgvc -lcgraph -lcdt -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt \
//     -Wl,-rpath,$B/lib/pathplan -Wl,-rpath,$B/lib/xdot
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static char *slurp(const char *p) { FILE *f = fopen(p, "rb"); if (!f) return NULL; fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET); char *b = malloc((size_t)n + 1); fread(b, 1, (size_t)n, f); b[n] = 0; fclose(f); return b; }
int main(int argc, char **argv) {
  const char *file = argv[1], *engine = argv[2], *fmt = argv[3];
  agseterr(AGMAX);
  GVC_t *gvc = gvContext();
  char *src = slurp(file);
  Agraph_t *g = agmemread(src);
  if (!g) { puts("NOPARSE"); return 0; }
  char *a = NULL, *b = NULL; size_t la = 0, lb = 0;
  if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL1"); return 0; }
  gvRenderData(gvc, g, fmt, &a, &la);
  gvFreeLayout(gvc, g);
  if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL2"); return 0; }
  gvRenderData(gvc, g, fmt, &b, &lb);
  gvFreeLayout(gvc, g);
  puts(la == lb && memcmp(a, b, la) == 0 ? "SAME" : "DIFF");
  return 0;
}
