// SPDX-License-Identifier: EPL-2.0
// Dumps native values of the C the smart initial layout calls, for the unit tests
// (closest.test.ts, embed-graph.test.ts, pca.test.ts, matrix-ops-dense.test.ts).
// Build against the oracle's static libraries with the link line of
// plans/post-16-1-followups-8/harness/T2/build.sh; run with no arguments and write
// stdout to smart-units.json. Every rand() draw counts: srand(1) starts each case
// and `next` is the first draw after it.
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <neatogen/closest.h>
#include <neatogen/defs.h>
#include <neatogen/embed_graph.h>
#include <neatogen/kkutils.h>
#include <neatogen/matrix_ops.h>
#include <neatogen/pca.h>

static void dv(const char *k, const double *v, int n) {
  printf("\"%s\":[", k);
  for (int i = 0; i < n; i++) printf("%s%.17g", i ? "," : "", v[i]);
  printf("]");
}
static void dm(const char *k, double **m, int r, int c) {
  printf("\"%s\":[", k);
  for (int i = 0; i < r; i++) {
    printf("%s[", i ? "," : "");
    for (int j = 0; j < c; j++) printf("%s%.17g", j ? "," : "", m[i][j]);
    printf("]");
  }
  printf("]");
}
static void dfm(const char *k, float **m, int r, int c) {
  printf("\"%s\":[", k);
  for (int i = 0; i < r; i++) {
    printf("%s[", i ? "," : "");
    for (int j = 0; j < c; j++) printf("%s%.17g", j ? "," : "", (double)m[i][j]);
    printf("]");
  }
  printf("]");
}
static void dim(const char *k, int **m, int r, int c) {
  printf("\"%s\":[", k);
  for (int i = 0; i < r; i++) {
    printf("%s[", i ? "," : "");
    for (int j = 0; j < c; j++) printf("%s%d", j ? "," : "", m[i][j]);
    printf("]");
  }
  printf("]");
}
static void dg(const char *k, vtx_data *g, int n) {
  printf("\"%s\":[", k);
  for (int i = 0; i < n; i++) {
    printf("%s{\"edges\":[", i ? "," : "");
    for (size_t j = 0; j < g[i].nedges; j++) printf("%s%d", j ? "," : "", g[i].edges[j]);
    printf("],\"ewgts\":[");
    for (size_t j = 0; j < g[i].nedges; j++) printf("%s%.17g", j ? "," : "", (double)g[i].ewgts[j]);
    printf("]}");
  }
  printf("]");
}

/* 7 nodes: path 0-1-2-3-4-5 plus 1-6 and 2-6. Same in the tests. */
static int ADJ[7][4] = {{1,-1},{0,2,6,-1},{1,3,6,-1},{2,4,-1},{3,5,-1},{4,-1},{1,2,-1}};
static vtx_data *graph7(int weighted) {
  vtx_data *g = calloc(7, sizeof(vtx_data));
  for (int i = 0; i < 7; i++) {
    int d = 0;
    while (ADJ[i][d] >= 0) d++;
    g[i].nedges = (size_t)d + 1;
    g[i].edges = calloc((size_t)d + 1, sizeof(int));
    g[i].edges[0] = i;
    for (int j = 0; j < d; j++) g[i].edges[j + 1] = ADJ[i][j];
  }
  if (weighted) {
    size_t total = 0;
    for (int i = 0; i < 7; i++) total += g[i].nedges;
    float *w = calloc(total, sizeof(float));
    for (int i = 0; i < 7; i++) {
      g[i].ewgts = w;
      for (size_t j = 1; j < g[i].nedges; j++) w[j] = 1;
      w += g[i].nedges;
    }
  }
  return g;
}

/* The input values all cases share. The tests compute the same fill. */
static double val(int i, int j) { return ((i * 37 + j * 91 + 11) % 101) / 7.0 - 6.3; }

static void cases_closest(void) {
  /* distinct places */
  double p1[8] = {3.5, 0.25, 9.75, 1.5, 6.125, 2.0, 12.5, 7.0};
  /* ties: equal places and equal gaps draw from rand() */
  double p2[9] = {0, 1, 1, 2, 3, 3, 3, 5, 7};
  vtx_data *g;
  srand(1);
  closest_pairs2graph(p1, 8, 32, &g);
  printf("\"closestDistinct\":{"); dg("graph", g, 8); printf(",\"next\":%d},\n", rand());
  srand(1);
  closest_pairs2graph(p2, 9, 36, &g);
  printf("\"closestTies\":{"); dg("graph", g, 9); printf(",\"next\":%d},\n", rand());
  srand(1);
  closest_pairs2graph(p2, 9, 3, &g);
  printf("\"closestFew\":{"); dg("graph", g, 9); printf(",\"next\":%d},\n", rand());
}

static void cases_embed(void) {
  int **c;
  vtx_data *g = graph7(0);
  srand(1);
  embed_graph(g, 7, 7, &c, 0);
  printf("\"embedPlain\":{"); dim("coords", c, 7, 7);
  center_coordinate(c, 7, 7);
  printf(","); dim("centered", c, 7, 7); printf(",\"next\":%d},\n", rand());
  g = graph7(1);
  srand(1);
  embed_graph(g, 7, 5, &c, 1);
  printf("\"embedReweight\":{"); dim("coords", c, 5, 7);
  printf(",\"restored\":[");
  for (size_t j = 0; j < g[1].nedges; j++) printf("%s%.17g", j ? "," : "", (double)g[1].ewgts[j]);
  printf("],\"next\":%d},\n", rand());
}

static void cases_pca(void) {
  int **c;
  vtx_data *g = graph7(0);
  srand(1);
  embed_graph(g, 7, 7, &c, 0);
  center_coordinate(c, 7, 7);
  double *nc[7];
  for (int i = 0; i < 7; i++) nc[i] = calloc(7, sizeof(double));
  PCA_alloc(c, 7, 7, nc, 7);
  printf("\"pca\":{"); dm("coords", nc, 7, 7); printf(",\"next\":%d},\n", rand());
  double dir[7] = {0};
  bool ok = iterativePCA_1D(nc, 7, 7, dir);
  printf("\"ipca\":{"); dv("direction", dir, 7); printf(",\"ok\":%s,\"next\":%d},\n", ok ? "true" : "false", rand());
}

static void cases_power(void) {
  enum { N = 9 };
  double *m[N], *e[N];
  for (int i = 0; i < N; i++) { m[i] = calloc(N, sizeof(double)); e[i] = calloc(N, sizeof(double)); }
  for (int i = 0; i < N; i++) for (int j = 0; j <= i; j++) m[i][j] = m[j][i] = val(i, j);
  srand(1);
  bool ok = power_iteration(m, N, 3, e);
  printf("\"powerSym\":{"); dm("eigs", e, 3, N); printf(",\"ok\":%s,\"next\":%d},\n", ok ? "true" : "false", rand());
  /* neigs above n clamps, and the rank-1 matrix reaches the null space */
  for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) m[i][j] = (i + 1.0) * (j + 1.0);
  srand(1);
  ok = power_iteration(m, N, 20, e);
  printf("\"powerRank1\":{"); dm("eigs", e, N, N); printf(",\"ok\":%s,\"next\":%d},\n", ok ? "true" : "false", rand());
  /* the zero matrix: null space at the first eigenvector */
  for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) m[i][j] = 0;
  srand(1);
  ok = power_iteration(m, N, 2, e);
  printf("\"powerZero\":{"); dm("eigs", e, 2, N); printf(",\"ok\":%s,\"next\":%d},\n", ok ? "true" : "false", rand());
  /* a rotation never settles: out of iterations */
  double *r[2], *er[2];
  for (int i = 0; i < 2; i++) { r[i] = calloc(2, sizeof(double)); er[i] = calloc(2, sizeof(double)); }
  r[0][1] = 1; r[1][0] = -1;
  srand(1);
  ok = power_iteration(r, 2, 1, er);
  printf("\"powerRotation\":{"); dm("eigs", er, 1, 2); printf(",\"ok\":%s,\"next\":%d},\n", ok ? "true" : "false", rand());
}

static void cases_mult(void) {
  enum { R = 9, C = 11, S = 10 };
  double *a[R];
  float *b[C];
  for (int i = 0; i < R; i++) {
    a[i] = calloc(C, sizeof(double));
    for (int j = 0; j < C; j++) a[i][j] = val(i, j);
  }
  for (int i = 0; i < C; i++) {
    b[i] = calloc(S, sizeof(float));
    for (int j = 0; j < S; j++) b[i][j] = (float)val(i + 7, j + 2);
  }
  float **cf; double **cd; float **cs;
  mult_dense_mat(a, b, R, C, S, &cf);
  mult_dense_mat_d(a, b, R, C, S, &cd);
  printf("\"multDense\":{"); dfm("c", cf, R, S); printf(","); dm("d", cd, R, S); printf("},\n");
  vtx_data *g = graph7(1);
  double *t[3];
  for (int i = 0; i < 3; i++) { t[i] = calloc(7, sizeof(double)); for (int j = 0; j < 7; j++) t[i][j] = val(i, j + 2); }
  for (size_t j = 1; j < g[1].nedges; j++) g[1].ewgts[j] = 1.1f * (float)j;
  mult_sparse_dense_mat_transpose(g, t, 7, 3, &cs);
  printf("\"multSparse\":{"); dfm("c", cs, 7, 3); printf("},\n");
  /* right_mult_with_vector_d is not dumped: this call site compiles a scalar
   * copy, unlike the 8-wide copies inlined in the library. */
  double *vt = calloc(R, sizeof(double)), *rt = calloc(C, sizeof(double));
  for (int i = 0; i < R; i++) vt[i] = val(i + 2, 4);
  right_mult_with_vector_transpose(a, C, R, vt, rt);
  printf("\"rightT\":{"); dv("r", rt, C); printf("}\n");
}

int main(void) {
  printf("{\n");
  cases_closest();
  cases_embed();
  cases_pca();
  cases_power();
  cases_mult();
  printf("}\n");
  return 0;
}
