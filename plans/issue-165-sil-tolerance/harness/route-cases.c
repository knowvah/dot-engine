// SPDX-License-Identifier: EPL-2.0
// Proutespline on the issue-165 cases, linked against a graphviz build's
// libpathplan. Prints every output point with %.17g.
#include <pathplan/pathplan.h>
#include <stdio.h>

typedef struct { const char *name; double dx, dy; } kase;

static void run(const char *name, Pedge_t *bar, size_t nb, Ppoint_t *rt, int nr,
                Pvector_t ev0, Pvector_t ev1) {
  Ppolyline_t in = {rt, (size_t)nr}, out;
  Pvector_t evs[2] = {ev0, ev1};
  int rc = Proutespline(bar, nb, in, evs, &out);
  printf("%s rc=%d n=%zu", name, rc, out.pn);
  for (size_t i = 0; i < out.pn; i++)
    printf(" %.17g,%.17g", out.ps[i].x, out.ps[i].y);
  printf("\n");
}

int main(void) {
  // A: route bulges up across a (near-)vertical barrier at x=5, y 1..100.
  double ds[] = {0, 1e-15, 1e-12, 1e-9, 5e-8, 9e-8, 2e-7, -5e-8, -1e-15, 3e-16, 1e-14, 1e-13};
  for (int k = 0; k < 12; k++) {
    Pedge_t bar[1] = {{{5, 1}, {5 + ds[k], 100}}};
    Ppoint_t rt[2] = {{0, 0}, {10, 0}};
    char nm[64];
    snprintf(nm, sizeof nm, "A[dx=%g]", ds[k]);
    run(nm, bar, 1, rt, 2, (Pvector_t){0, 1}, (Pvector_t){0, -1});
  }
  // B: near-point barrier (dx, dy both tiny) on the bulge's path.
  for (int k = 0; k < 12; k++) {
    Pedge_t bar[1] = {{{5, 2}, {5 + ds[k], 2 + ds[k]}}};
    Ppoint_t rt[2] = {{0, 0}, {10, 0}};
    char nm[64];
    snprintf(nm, sizeof nm, "B[d=%g]", ds[k]);
    run(nm, bar, 1, rt, 2, (Pvector_t){0, 1}, (Pvector_t){0, -1});
  }
  // C: tall near-vertical barrier at x=5, y -100..-1 (below the route) and the
  // bulge goes down: ev0=(0,-1), ev1=(0,1).
  for (int k = 0; k < 12; k++) {
    Pedge_t bar[1] = {{{5, -100}, {5 + ds[k], -1}}};
    Ppoint_t rt[2] = {{0, 0}, {10, 0}};
    char nm[64];
    snprintf(nm, sizeof nm, "C[dx=%g]", ds[k]);
    run(nm, bar, 1, rt, 2, (Pvector_t){0, -1}, (Pvector_t){0, 1});
  }
  // D: a corridor polygon whose right wall is near-vertical (3-point route).
  for (int k = 0; k < 12; k++) {
    Ppoint_t ps[4] = {{-1, -1}, {11 + ds[k], -1}, {11, 30}, {-1, 30}};
    Ppoly_t poly = {ps, 4}, *polys[1] = {&poly};
    Pedge_t *bar; int nb;
    Ppolybarriers(polys, 1, &bar, &nb);
    Ppoint_t rt[3] = {{0, 0}, {10, 20}, {0, 25}};
    char nm[64];
    snprintf(nm, sizeof nm, "D[dx=%g]", ds[k]);
    run(nm, bar, (size_t)nb, rt, 3, (Pvector_t){1, 0}, (Pvector_t){-1, 0});
  }
  return 0;
}
