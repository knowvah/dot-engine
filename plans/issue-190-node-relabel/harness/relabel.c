// SPDX-License-Identifier: EPL-2.0
// Native control for issue 190: no-free relayouts in one libgvc process.
// usage: GVBINDIR=<plugin dir> relabel-native <file> <engine> <format> <n> [<node> <attr> <value>]
//   Runs n cycles of gvLayout + gvRenderData on one graph with no gvFreeLayout between them,
//   printing each render after a "== render N" line. With <node> <attr> <value>, sets that
//   node attribute (agsafeset, default "") after render 1, so layouts 2..n see the new value.
//   Warnings go to stderr (agseterr is not called). With I190_RENDERS=<r> in the environment,
//   each layout is rendered r times (default 1), each after its own "== render N" line.
// Build: see build.sh beside this file.
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
static char *slurp(const char *p) {
  FILE *f = fopen(p, "rb"); if (!f) return NULL;
  fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  char *b = malloc((size_t)n + 1); fread(b, 1, (size_t)n, f); b[n] = 0; fclose(f); return b;
}
int main(int argc, char **argv) {
  if (argc != 5 && argc != 8) { fprintf(stderr, "usage: %s file engine format n [node attr value]\n", argv[0]); return 2; }
  char *src = slurp(argv[1]); if (!src) { perror(argv[1]); return 2; }
  GVC_t *gvc = gvContext();
  Agraph_t *g = agmemread(src);
  if (!g) { fprintf(stderr, "parse failed\n"); return 2; }
  int n = atoi(argv[4]);
  int renders = getenv("I190_RENDERS") ? atoi(getenv("I190_RENDERS")) : 1;
  int k = 0;
  for (int i = 1; i <= n; i++) {
    if (gvLayout(gvc, g, argv[2]) != 0) { fprintf(stderr, "layout %d failed\n", i); return 1; }
    for (int r = 0; r < renders; r++) {
      char *out = NULL; size_t len = 0;
      if (gvRenderData(gvc, g, argv[3], &out, &len) != 0) { fprintf(stderr, "render %d failed\n", ++k); return 1; }
      printf("== render %d\n", ++k); fwrite(out, 1, len, stdout); fflush(stdout);
      gvFreeRenderData(out);
    }
    if (i == 1 && argc == 8) {
      Agnode_t *nd = agnode(g, argv[5], 0);
      if (!nd) { fprintf(stderr, "no node %s\n", argv[5]); return 2; }
      agsafeset(nd, argv[6], argv[7], "");
    }
  }
  return 0;
}
