// SPDX-License-Identifier: EPL-2.0
// splineintersectsline (static in route.c) on direct cases: the route.c of the
// build under test is #included. Prints rootn and roots with %.17g.
#include ROUTE_C
#include <stdio.h>

static void sil(const char *name, Ppoint_t s0, Ppoint_t s1, Ppoint_t s2,
                Ppoint_t s3, Ppoint_t l0, Ppoint_t l1) {
  Ppoint_t sps[4] = {s0, s1, s2, s3}, lps[2] = {l0, l1};
  double roots[4] = {0};
  int n = splineintersectsline(sps, lps, roots);
  printf("%s n=%d", name, n);
  for (int i = 0; i < n && i < 4; i++) printf(" %.17g", roots[i]);
  printf("\n");
}

int main(void) {
  // P: point barrier on a straight spline along y = k*x (root-equality site).
  double ks[] = {1.7, 2, 0.3, 3.1, 1.1};
  for (int i = 0; i < 5; i++) {
    double k = ks[i];
    char nm[64];
    snprintf(nm, sizeof nm, "P[k=%g]", k);
    Ppoint_t b = {3, 3 * k};
    sil(nm, (Ppoint_t){0, 0}, (Ppoint_t){2, 2 * k}, (Ppoint_t){7, 7 * k},
        (Ppoint_t){10, 10 * k}, b, b);
  }
  // Q: near-vertical and near-point barriers (coefficient sites).
  double ds[] = {0, 1e-15, -1e-15, 1e-9, 9e-8, 2e-7};
  for (int i = 0; i < 6; i++) {
    char nm[64];
    snprintf(nm, sizeof nm, "Qv[dx=%g]", ds[i]);
    sil(nm, (Ppoint_t){0, 0}, (Ppoint_t){0, 4}, (Ppoint_t){10, 4},
        (Ppoint_t){10, 0}, (Ppoint_t){5, 1}, (Ppoint_t){5 + ds[i], 100});
    snprintf(nm, sizeof nm, "Qp[d=%g]", ds[i]);
    sil(nm, (Ppoint_t){0, 0}, (Ppoint_t){0, 4}, (Ppoint_t){10, 4},
        (Ppoint_t){10, 0}, (Ppoint_t){5, 3}, (Ppoint_t){5 + ds[i], 3 + ds[i]});
  }
  return 0;
}
