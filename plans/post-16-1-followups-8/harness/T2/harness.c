/* T2 native harness (graphviz 16.1.0): the KK distance primitives.
 *
 * Includes neatoinit.c to reach its statics (makeGraphData, subset_model) and
 * links the oracle's own libneatogen.a for kkutils.c and circuit.c. A second
 * copy of circuit.c is compiled here with `matinv` macro-redirected, solely to
 * snapshot the Gm that solveCircuit hands to matinv (mode "gm").
 *
 * Modes, one JSON line on stdout:
 *   subset <file.gv>  makeGraphData rows, compute_new_weights, Dij, subset_model
 *   circuit <file.gv> circuit_model's rv and GD_dist before/after
 *   gm <file.gv>      the instrumented copy's rv and Gm after the diagonal
 *   raw < stdin       hand-built rows: n hasW, then per vertex
 *                     nedges edges... [ewgts...] (ewgts in one block, as C)
 *
 * circuit and gm read past Gm's row pointers when the last-created node has an
 * edge, so they usually exit 139 on such a graph: gen.py retries.
 */
#include "config.h"
#include <neatogen/neatoinit.c>

static double *savedGm;
static int savedN;

static int snapshotMatinv(double **A, double **Ainv, int n) {
  savedN = n + 1;
  savedGm = malloc((size_t)savedN * (size_t)savedN * sizeof(double));
  memcpy(savedGm, A[0], (size_t)savedN * (size_t)savedN * sizeof(double));
  return matinv(A, Ainv, n);
}

#define matinv snapshotMatinv
#define solveCircuit h_solveCircuit
#define circuit_model h_circuit_model
#include <neatogen/circuit.c>
#undef matinv
#undef solveCircuit
#undef circuit_model

static void pd(double v) { printf("%.17g", v); }

static Agraph_t *load(const char *path, int *nG) {
  FILE *fp = fopen(path, "r");
  if (!fp) exit(2);
  Agraph_t *g = agread(fp, NULL);
  fclose(fp);
  aginit(g, AGRAPH, "Agraphinfo_t", sizeof(Agraphinfo_t), true);
  aginit(g, AGNODE, "Agnodeinfo_t", sizeof(Agnodeinfo_t), true);
  aginit(g, AGEDGE, "Agedgeinfo_t", sizeof(Agedgeinfo_t), true);
  Ndim = 2;
  *nG = scan_graph_mode(g, MODE_KK); /* ND_id, ED_dist, GD_dist = Initial_dist */
  return g;
}

static void dumpRows(vtx_data *graph, int n) {
  printf("[");
  for (int i = 0; i < n; i++) {
    printf("%s{\"edges\":[", i ? "," : "");
    for (size_t e = 0; e < graph[i].nedges; e++)
      printf("%s%d", e ? "," : "", graph[i].edges[e]);
    printf("],\"ewgts\":");
    if (graph[i].ewgts == NULL) printf("null");
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

static void dumpIntMatrix(DistType **m, int n) {
  printf("[");
  for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++) printf("%s%d", i + j ? "," : "", m[i][j]);
  printf("]");
}

static void dumpFlat(const double *m, int n) {
  printf("[");
  for (int k = 0; k < n * n; k++) {
    printf("%s", k ? "," : "");
    pd(m[k]);
  }
  printf("]");
}

static void dumpDist(Agraph_t *g, int n) { dumpFlat(GD_dist(g)[0], n); }

/* The kkutils.c sequence on rows that are already built. */
static void dumpWeightsAndDij(vtx_data *gp, int n) {
  float *old = gp[0].ewgts;
  compute_new_weights(gp, n);
  printf(",\"weights\":");
  dumpRows(gp, n);
  restore_old_weights(gp, n, old);
  DistType **Dij = compute_apsp_artificial_weights(gp, n);
  printf(",\"dij\":");
  dumpIntMatrix(Dij, n);
  printf(",\"ewgts0Null\":%d,\"after\":", gp[0].ewgts == NULL);
  if (old) dumpRows(gp, n);
  else printf("null");
}

static void runSubset(const char *path) {
  int n, ne;
  Agraph_t *g = load(path, &n);
  vtx_data *gp = makeGraphData(g, n, &ne, MODE_KK, MODEL_SUBSET, NULL);
  printf("{\"n\":%d,\"rows\":", n);
  dumpRows(gp, n);
  dumpWeightsAndDij(gp, n);
  subset_model(g, n);
  printf(",\"gdDist\":");
  dumpDist(g, n);
  printf("}\n");
}

static void runCircuit(const char *path) {
  int n;
  Agraph_t *g = load(path, &n);
  double *before = malloc((size_t)n * (size_t)n * sizeof(double));
  memcpy(before, GD_dist(g)[0], (size_t)n * (size_t)n * sizeof(double));
  int rv = circuit_model(g, n);
  printf("{\"n\":%d,\"rv\":%d,\"before\":", n, rv);
  dumpFlat(before, n);
  printf(",\"after\":");
  dumpDist(g, n);
  printf("}\n");
}

static void runGm(const char *path) {
  int n;
  Agraph_t *g = load(path, &n);
  int rv = h_circuit_model(g, n);
  printf("{\"n\":%d,\"rv\":%d,\"gm\":", n, rv);
  dumpFlat(savedGm, savedN);
  printf("}\n");
}

static void runRaw(void) {
  int n, hasW;
  if (scanf("%d %d", &n, &hasW) != 2) exit(2);
  vtx_data *gp = calloc((size_t)n, sizeof(vtx_data));
  float *block = hasW ? calloc(4096, sizeof(float)) : NULL;
  for (int i = 0; i < n; i++) {
    if (scanf("%zu", &gp[i].nedges) != 1) exit(2);
    gp[i].edges = calloc(gp[i].nedges, sizeof(int));
    for (size_t e = 0; e < gp[i].nedges; e++)
      if (scanf("%d", &gp[i].edges[e]) != 1) exit(2);
    if (hasW) {
      gp[i].ewgts = block;
      block += gp[i].nedges;
      for (size_t e = 0; e < gp[i].nedges; e++)
        if (scanf("%f", &gp[i].ewgts[e]) != 1) exit(2);
    }
  }
  printf("{\"n\":%d,\"rows\":", n);
  dumpRows(gp, n);
  dumpWeightsAndDij(gp, n);
  printf("}\n");
}

int main(int argc, char **argv) {
  if (argc >= 2 && strcmp(argv[1], "raw") == 0) { runRaw(); return 0; }
  if (argc < 3) return 1;
  if (strcmp(argv[1], "subset") == 0) runSubset(argv[2]);
  else if (strcmp(argv[1], "circuit") == 0) runCircuit(argv[2]);
  else if (strcmp(argv[1], "gm") == 0) runGm(argv[2]);
  else return 1;
  return 0;
}
