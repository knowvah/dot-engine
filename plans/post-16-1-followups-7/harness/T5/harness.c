/* Native oracle harness for T5: quad_prog_vpsc.c (graphviz 16.1.0).
 * Reads a case script on stdin, calls the oracle's own lib/neatogen functions
 * (linked from build/lib/neatogen/libneatogen.a with -flto=thin, as the dylib).
 *
 * Script:
 *   HDR n nclusters {size members...}* ntoplevel toplevel... edge_gap gapx gapy
 *       nv*(nsx nsy) hasGraph [nv*(nedges edges.. ewgts.. edists..)] hasMat [packed..]
 *   then ops until END:
 *   INIT diredges          -> "init <null|ok> nv nldv ndv gm m"
 *   CMV iters b[n] place[n] -> "cmv ret" + "place ..." (%.17g of float)
 *   GNC scale k tc c0[n] c1[n] -> "gnc m gm", "c l r gap" * m, "bb ..." per cluster
 *   DEL                    -> deleteCMajEnvVPSC
 *   RM c0[n] c1[n]         -> "rm" + "x ..." + "y ..."
 */
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <neatogen/defs.h>
#include <neatogen/digcola.h>
#include <vpsc/csolve_VPSC.h>
#include <neatogen/quad_prog_vpsc.h>

void dumpConstraint(Constraint *c);

static double rd(void) { double d; if (scanf("%lf", &d) != 1) { fprintf(stderr, "read\n"); exit(2); } return d; }
static int ri(void) { int d; if (scanf("%d", &d) != 1) { fprintf(stderr, "readi\n"); exit(2); } return d; }

int main(void) {
  char op[16];
  if (scanf("%15s", op) != 1 || strcmp(op, "HDR")) return 2;
  int n = ri();
  ipsep_options opt;
  memset(&opt, 0, sizeof opt);
  size_t nc = (size_t)ri();
  opt.clusters.nclusters = nc;
  if (nc > 0) {
    opt.clusters.clustersizes = calloc(nc, sizeof(size_t));
    opt.clusters.clusters = calloc(nc, sizeof(size_t *));
    opt.clusters.bb = calloc(nc, sizeof(boxf));
    for (size_t i = 0; i < nc; i++) {
      size_t s = (size_t)ri();
      opt.clusters.clustersizes[i] = s;
      opt.clusters.nvars += s;
      opt.clusters.clusters[i] = calloc(s, sizeof(size_t));
      for (size_t j = 0; j < s; j++) opt.clusters.clusters[i][j] = (size_t)ri();
    }
  }
  size_t nt = (size_t)ri();
  opt.clusters.ntoplevel = nt;
  opt.clusters.toplevel = calloc(nt + 1, sizeof(size_t));
  for (size_t i = 0; i < nt; i++) opt.clusters.toplevel[i] = (size_t)ri();
  opt.edge_gap = rd();
  opt.gap.x = rd();
  opt.gap.y = rd();
  int nv = n - 2 * (int)nc;
  opt.nsize = calloc((size_t)n, sizeof(pointf));
  for (int i = 0; i < nv; i++) { opt.nsize[i].x = rd(); opt.nsize[i].y = rd(); }
  vtx_data *graph = NULL;
  if (ri()) {
    graph = calloc((size_t)nv, sizeof(vtx_data));
    /* one ewgts block for all nodes, as makeGraphData: compute_y_coords
     * restores per-node pointers by walking graph[0].ewgts */
    float *ew = calloc(100000, sizeof(float));
    for (int i = 0; i < nv; i++) {
      size_t ne = (size_t)ri();
      graph[i].nedges = ne;
      graph[i].edges = calloc(ne, sizeof(int));
      graph[i].ewgts = ew;
      ew += ne;
      graph[i].edists = calloc(ne, sizeof(int8_t));
      for (size_t j = 0; j < ne; j++) graph[i].edges[j] = ri();
      for (size_t j = 0; j < ne; j++) graph[i].ewgts[j] = (float)rd();
      for (size_t j = 0; j < ne; j++) graph[i].edists[j] = (int8_t)ri();
    }
  }
  float *packed = NULL;
  if (ri()) {
    size_t len = (size_t)n * (size_t)(n + 1) / 2;
    packed = calloc(len, sizeof(float));
    for (size_t k = 0; k < len; k++) packed[k] = (float)rd();
  }
  CMajEnvVPSC *e = NULL;
  float *c[2] = { calloc((size_t)n, sizeof(float)), calloc((size_t)n, sizeof(float)) };
  float *b = calloc((size_t)n, sizeof(float));
  float *place = calloc((size_t)n, sizeof(float));
  while (scanf("%15s", op) == 1) {
    if (!strcmp(op, "END")) break;
    if (!strcmp(op, "SRAND")) {
      srand((unsigned)ri());
      printf("srand\n");
    } else if (!strcmp(op, "INIT")) {
      int dir = ri();
      e = initCMajVPSC(n, packed, graph, &opt, dir);
      if (e == NULL) { printf("init null\n"); continue; }
      printf("init ok %zu %zu %zu %zu %zu\n", e->nv, e->nldv, e->ndv, e->gm, e->m);
    } else if (!strcmp(op, "CMV")) {
      int it = ri();
      for (int i = 0; i < n; i++) b[i] = (float)rd();
      for (int i = 0; i < n; i++) place[i] = (float)rd();
      int ret = constrained_majorization_vpsc(e, b, place, it);
      printf("cmv %d\nplace", ret);
      for (int i = 0; i < n; i++) printf(" %.17g", (double)place[i]);
      printf("\n");
    } else if (!strcmp(op, "CMVK")) {
      int it = ri();
      for (int i = 0; i < n; i++) b[i] = (float)rd();
      int ret = constrained_majorization_vpsc(e, b, place, it);
      printf("cmv %d\nplace", ret);
      for (int i = 0; i < n; i++) printf(" %.17g", (double)place[i]);
      printf("\n");
    } else if (!strcmp(op, "GNC") || !strcmp(op, "GNCK")) {
      int keep = !strcmp(op, "GNCK");
      float scale = (float)rd();
      int k = ri();
      int tc = ri();
      for (int i = 0; i < n; i++) c[0][i] = (float)rd();
      for (int i = 0; i < n; i++) c[1][i] = keep ? place[i] : (float)rd();
      generateNonoverlapConstraints(e, scale, c, k, tc != 0, &opt);
      printf("gnc %zu %zu\n", e->m, e->gm);
      for (size_t i = 0; i < e->m; i++) dumpConstraint(e->cs[i]);
      for (size_t i = 0; i < nc; i++)
        printf("bb %.17g %.17g %.17g %.17g\n", opt.clusters.bb[i].LL.x, opt.clusters.bb[i].LL.y,
               opt.clusters.bb[i].UR.x, opt.clusters.bb[i].UR.y);
    } else if (!strcmp(op, "SAT")) {
      size_t nn = e->nv + e->nldv;
      for (size_t i = 0; i < nn; i++) setVariableDesiredPos(e->vs[i], (float)rd());
      satisfyVPSC(e->vpsc);
      printf("sat");
      for (size_t i = 0; i < nn; i++) printf(" %.17g", getVariablePos(e->vs[i]));
      printf("\n");
    } else if (!strcmp(op, "DEL")) {
      deleteCMajEnvVPSC(e);
      e = NULL;
      printf("del\n");
    } else if (!strcmp(op, "RM")) {
      for (int a = 0; a < 2; a++) for (int i = 0; i < n; i++) c[a][i] = (float)rd();
      removeoverlaps(n, c, &opt);
      printf("rm\nx");
      for (int i = 0; i < n; i++) printf(" %.17g", (double)c[0][i]);
      printf("\ny");
      for (int i = 0; i < n; i++) printf(" %.17g", (double)c[1][i]);
      printf("\n");
    } else {
      fprintf(stderr, "bad op %s\n", op);
      return 2;
    }
    fflush(stdout);
  }
  return 0;
}
