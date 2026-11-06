// usage: mid <file> <engine> <fmt>: one cycle in <fmt>, then agwrite of the graph native holds, and per
// subgraph its node and edge lists with AGSEQ and AGID, and the second cycle's plain.
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
static char *slurp(const char *p) { FILE *f = fopen(p, "rb"); if (!f) return NULL; fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET); char *b = malloc((size_t)n + 1); fread(b, 1, (size_t)n, f); b[n] = 0; fclose(f); return b; }
static void dump(Agraph_t *g, int d) {
  printf("%*sgraph %s seq=%lu\n", d, "", agnameof(g), (unsigned long)AGSEQ(g));
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n)) {
    printf("%*s node %s seq=%lu id=%llu\n", d, "", agnameof(n), (unsigned long)AGSEQ(n), (unsigned long long)AGID(n));
    for (Agedge_t *e = agfstout(g, n); e; e = agnxtout(g, e))
      printf("%*s  edge %s--%s seq=%lu id=%llu\n", d, "", agnameof(agtail(e)), agnameof(aghead(e)), (unsigned long)AGSEQ(e), (unsigned long long)AGID(e));
  }
  for (Agraph_t *s = agfstsubg(g); s; s = agnxtsubg(s)) dump(s, d + 2);
}
int main(int argc, char **argv) {
  GVC_t *gvc = gvContext();
  Agraph_t *g = agmemread(slurp(argv[1]));
  char *o; size_t l;
  puts("--before"); dump(g, 0);
  gvLayout(gvc, g, argv[2]); gvRenderData(gvc, g, argv[3], &o, &l); gvFreeLayout(gvc, g);
  puts("--after"); dump(g, 0);
  puts("--agwrite"); agwrite(g, stdout);
  return 0;
}
