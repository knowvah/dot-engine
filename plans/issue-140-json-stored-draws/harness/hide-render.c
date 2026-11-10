// SPDX-License-Identifier: EPL-2.0
// Issue #140 native control: one layout, two renders, no gvFreeLayout between them.
// usage: GVBINDIR=<plugin dir> hide-render <file> <engine> <fmt1> <fmt2>
//   gvLayout; gvRenderData <fmt1>; set style=invis and color=red on every node and edge
//   (agsafeset); gvRenderData <fmt2>; gvFreeLayout. Prints each render after "== render N".
// Render 2 draws none of them (emit_node / emit_edge return on "invis"), so every draw
// string it prints is the one render 1 stored; color=red would show in a fresh draw.
// The input must declare node and edge `style` (N_style/E_style exist only if declared
// before gvLayout). Build: see regen.sh.
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
  if (argc < 5) { fputs("usage: hide-render <file> <engine> <fmt1> <fmt2>\n", stderr); return 2; }
  GVC_t *gvc = gvContext();
  Agraph_t *g = agmemread(slurp(argv[1]));
  if (!g || gvLayout(gvc, g, argv[2]) != 0) { puts("LAYOUTFAIL"); return 0; }
  show(gvc, g, argv[3]);
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n)) {
    agsafeset(n, "style", "invis", "");
    agsafeset(n, "color", "red", "");
    for (Agedge_t *e = agfstout(g, n); e; e = agnxtout(g, e)) {
      agsafeset(e, "style", "invis", "");
      agsafeset(e, "color", "red", "");
    }
  }
  show(gvc, g, argv[4]);
  gvFreeLayout(gvc, g);
  return 0;
}
