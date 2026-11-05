// SPDX-License-Identifier: EPL-2.0
// Native control for T15 (follow-up 123): a subgraph laid out after its root was freed.
// usage: GVBINDIR=<full plugin dir> subg-after-free <file> <engine> <fmt> <subgraph> [mode]
//   no mode:  layout root, render root in <fmt>, free root, then layout, render and free the subgraph.
//   nofree:   as above with no free of the root.
//   subonly:  layout, render and free the subgraph only; the root is never laid out.
//   norender: layout and free the root, with no render, then the subgraph.
//   twice:    the default, then layout and render the subgraph once more.
//   root:     the default, then layout and render the root once more.
//   subnofree: the default with no free of the subgraph, then layout and render the root.
// Prints each render after a "== render N" line.
// Build: clang -O1 -o subg-after-free subg-after-free.c -I$G/lib/gvc -I$G/lib/cgraph -I$G/lib/common -I$G/lib/pathplan \
//   -I$G/lib/cdt -I$G/lib -I$B -I$B/lib/common -I$B/lib/gvc -L$B/lib/gvc -L$B/lib/cgraph -L$B/lib/cdt \
//   -lgvc -lcgraph -lcdt -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt \
//   -Wl,-rpath,$B/lib/pathplan -Wl,-rpath,$B/lib/xdot     (G=~/git/graphviz, B=$G/build)
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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
  const char *file = argv[1], *engine = argv[2], *fmt = argv[3], *subname = argv[4];
  const char *mode = argc > 5 ? argv[5] : "";
  agseterr(AGMAX);
  GVC_t *gvc = gvContext();
  Agraph_t *g = agmemread(slurp(file));
  Agraph_t *s = agsubg(g, (char *)subname, 0);
  if (!s) { puts("NOSUBG"); return 0; }
  if (strcmp(mode, "subonly") != 0) {
    if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL root"); return 0; }
    if (strcmp(mode, "norender") != 0) show(gvc, g, fmt);
    if (strcmp(mode, "nofree") != 0) gvFreeLayout(gvc, g);
  }
  if (gvLayout(gvc, s, engine) != 0) { puts("LAYOUTFAIL sub"); return 0; }
  show(gvc, s, fmt);
  if (strcmp(mode, "subnofree") == 0) {
    if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL root3"); return 0; }
    show(gvc, g, fmt);
    gvFreeLayout(gvc, g);
    return 0;
  }
  gvFreeLayout(gvc, s);
  if (strcmp(mode, "twice") == 0) {
    if (gvLayout(gvc, s, engine) != 0) { puts("LAYOUTFAIL sub2"); return 0; }
    show(gvc, s, fmt);
    gvFreeLayout(gvc, s);
  }
  if (strcmp(mode, "root") == 0) {
    if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL root2"); return 0; }
    show(gvc, g, fmt);
    gvFreeLayout(gvc, g);
  }
  return 0;
}
