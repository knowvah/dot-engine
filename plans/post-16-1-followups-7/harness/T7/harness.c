// T7 native harness: build vtx_data the way neatoinit.c:makeGraphData does for
// mode=ipsep (haveDir: ewgts = len or 1.0), or with ewgts == NULL ("nowgt"),
// then call the oracle's own circuitModel / compute_apsp_artificial_weights_packed
// / matinv from libneatogen.a and print JSON.
#include "config.h"
#include <cgraph/cgraph.h>
#include <neatogen/defs.h>
#include <neatogen/neato.h>
#include <neatogen/stress.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern float *circuitModel(vtx_data *graph, int nG);
extern int matinv(double **A, double **Ainv, int n);
extern double **new_array(int i, int j, double val);

typedef struct { Agrec_t h; int id; } idrec;

static int keepLen = 0;
static void pd(double v) { printf("%.17g", v); }

static void dumpRows(vtx_data *graph, int nv, int withW) {
  printf("[");
  for (int i = 0; i < nv; i++) {
    printf("%s{\"edges\":[", i ? "," : "");
    for (size_t e = 0; e < graph[i].nedges; e++)
      printf("%s%d", e ? "," : "", graph[i].edges[e]);
    printf("],\"ewgts\":");
    if (!withW || graph[i].ewgts == NULL) printf("null");
    else {
      printf("[");
      for (size_t e = 0; e < graph[i].nedges; e++) {
        printf("%s", e ? "," : "");
        pd(graph[i].ewgts[e]);
      }
      printf("]");
    }
    printf("}");
  }
  printf("]");
}

static vtx_data *build(Agraph_t *g, int *nvp, int weighted, int subset) {
  /* subset: makeGraphData ignores len (haveLen=false); keepLen overrides */
  int nv = agnnodes(g), ne = agnedges(g);
  aginit(g, AGNODE, "idrec", sizeof(idrec), 1);
  int i = 0;
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n))
    ((idrec *)aggetrec(n, "idrec", 0))->id = i++;
  Agsym_t *lenSym = (subset && !keepLen) ? NULL : agattr_text(g, AGEDGE, "len", 0);
  vtx_data *graph = calloc(nv, sizeof(vtx_data));
  int *edges = calloc(2 * ne + nv, sizeof(int));
  float *ewgts = weighted ? calloc(2 * ne + nv, sizeof(float)) : NULL;
  i = 0;
  for (Agnode_t *np = agfstnode(g); np; np = agnxtnode(g, np), i++) {
    graph[i].edges = edges++;
    graph[i].ewgts = weighted ? ewgts++ : NULL;
    size_t k = 1;
    for (Agedge_t *ep = agfstedge(g, np); ep; ep = agnxtedge(g, ep, np)) {
      if (aghead(ep) == agtail(ep)) continue;
      Agnode_t *vp = agtail(ep) == np ? aghead(ep) : agtail(ep);
      int vid = ((idrec *)aggetrec(vp, "idrec", 0))->id;
      double len = 1.0;
      if (lenSym) {
        char *s = agxget(ep, lenSym);
        if (s && *s) len = atof(s);
      }
      size_t seen = 0;
      for (size_t f = 1; f < k; f++) if (graph[i].edges[f] == vid) seen = f;
      if (seen) {
        if (weighted && lenSym) graph[i].ewgts[seen] = fmax(graph[i].ewgts[seen], len);
        continue;
      }
      *edges++ = vid;
      if (weighted) *ewgts++ = lenSym ? (float)len : 1.0f;
      k++;
    }
    graph[i].nedges = k;
    graph[i].edges[0] = i;
  }
  *nvp = nv;
  return graph;
}

static void runGraph(const char *path, const char *fn, int weighted) {
  FILE *fp = fopen(path, "r");
  Agraph_t *g = agread(fp, NULL);
  fclose(fp);
  int subset = strcmp(fn, "subset") == 0;
  int nv;
  vtx_data *graph = build(g, &nv, weighted, subset);
  printf("{\"rows\":");
  dumpRows(graph, nv, 1);
  float *Dij = subset ? compute_apsp_artificial_weights_packed(graph, nv)
                      : circuitModel(graph, nv);
  printf(",\"dij\":");
  if (!Dij) printf("null");
  else {
    printf("[");
    for (int k = 0; k < nv * (nv + 1) / 2; k++) { printf("%s", k ? "," : ""); pd(Dij[k]); }
    printf("]");
  }
  printf(",\"ewgts0Null\":%d", graph[0].ewgts == NULL);
  if (weighted) { printf(",\"after\":"); dumpRows(graph, nv, 1); }
  printf("}\n");
}

/* matinv on an n x n matrix read from stdin (row-major %lf) */
static void runMatinv(int n) {
  double **A = new_array(n, n, 0.0);
  double **Ainv = new_array(n, n, 0.0);
  for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
      if (scanf("%lf", &A[i][j]) != 1) exit(2);
  int rv = matinv(A, Ainv, n);
  printf("{\"rv\":%d,\"inv\":[", rv);
  for (int i = 0; i < n; i++) {
    printf("%s[", i ? "," : "");
    for (int j = 0; j < n; j++) { printf("%s", j ? "," : ""); pd(Ainv[i][j]); }
    printf("]");
  }
  printf("]}\n");
}

/* raw rows from stdin: n, then per vertex: nedges edges... ewgts... */
static void runRaw(const char *fn) {
  int nv;
  if (scanf("%d", &nv) != 1) exit(2);
  vtx_data *graph = calloc(nv, sizeof(vtx_data));
  for (int i = 0; i < nv; i++) {
    if (scanf("%zu", &graph[i].nedges) != 1) exit(2);
    graph[i].edges = calloc(graph[i].nedges, sizeof(int));
    graph[i].ewgts = calloc(graph[i].nedges, sizeof(float));
    for (size_t e = 0; e < graph[i].nedges; e++) if (scanf("%d", &graph[i].edges[e]) != 1) exit(2);
    for (size_t e = 0; e < graph[i].nedges; e++) if (scanf("%f", &graph[i].ewgts[e]) != 1) exit(2);
  }
  float *Dij = strcmp(fn, "subset") == 0 ? compute_apsp_artificial_weights_packed(graph, nv)
                                         : circuitModel(graph, nv);
  printf("{\"rows\":[]");
  printf(",\"dij\":");
  if (!Dij) printf("null");
  else {
    printf("[");
    for (int k = 0; k < nv * (nv + 1) / 2; k++) { printf("%s", k ? "," : ""); pd(Dij[k]); }
    printf("]");
  }
  printf(",\"ewgts0Null\":%d}\n", graph[0].ewgts == NULL);
}

int main(int argc, char **argv) {
  if (argc >= 3 && strcmp(argv[1], "matinv") == 0) { runMatinv(atoi(argv[2])); return 0; }
  if (argc >= 3 && strcmp(argv[1], "raw") == 0) { runRaw(argv[2]); return 0; }
  if (argc < 4) return 1;
  keepLen = strcmp(argv[3], "wl") == 0;
  runGraph(argv[1], argv[2], argv[3][0] == 'w');
  return 0;
}
