// SPDX-License-Identifier: EPL-2.0
// Issue #140 native control for the open cluster-label rows: one layout, two renders, no
// gvFreeLayout between them.
// usage: GVBINDIR=<plugin dir> hide-cluster <file> <engine> <fmt1> <fmt2>
//   gvLayout; gvRenderData <fmt1>; set style=invis on every top-level subgraph (agsafeset);
//   gvRenderData <fmt2>; gvFreeLayout. Prints each render after "== render N".
// Render 2 still runs emit_begin_cluster / emit_end_cluster for each cluster, and
// xdot_end_cluster agxsets `_draw_` always and `_ldraw_` whenever GD_label is set, so a
// labelled cluster loses render 1's `_ldraw_` (the buffer is empty: pen is PEN_NONE).
// The input must declare graph `style` before gvLayout. Build: see regen.sh.
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
static char *slurp(const char *p) {
  FILE *f = fopen(p, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *b = malloc((size_t)n + 1);
  fread(b, 1, (size_t)n, f);
  b[n] = 0;
  fclose(f);
  return b;
}
static int nrender;
static void show(GVC_t *gvc, Agraph_t *g, const char *fmt) {
  char *o = NULL;
  size_t l = 0;
  gvRenderData(gvc, g, fmt, &o, &l);
  printf("== render %d\n", ++nrender);
  fwrite(o, 1, l, stdout);
  fflush(stdout);
}
int main(int argc, char **argv) {
  if (argc < 5) { fputs("usage: hide-cluster <file> <engine> <fmt1> <fmt2>\n", stderr); return 2; }
  GVC_t *gvc = gvContext();
  Agraph_t *g = agmemread(slurp(argv[1]));
  if (!g || gvLayout(gvc, g, argv[2]) != 0) { puts("LAYOUTFAIL"); return 0; }
  show(gvc, g, argv[3]);
  for (Agraph_t *sg = agfstsubg(g); sg; sg = agnxtsubg(sg)) agsafeset(sg, "style", "invis", "");
  show(gvc, g, argv[4]);
  gvFreeLayout(gvc, g);
  return 0;
}
