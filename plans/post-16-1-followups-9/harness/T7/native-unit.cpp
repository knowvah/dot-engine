// T7: tie-heavy inputs for generateXConstraints/generateYConstraints, extending part 8's
// plans/post-16-1-followups-8/harness/T3/native-unit.cpp. Against native-dump each CASE line is
// followed by an EVENTS line (the sorted events before the sweep); both builds print the CONS line.
#include "config.h"
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>
#include <vpsc/generate-constraints.h>
#include <vpsc/constraint.h>
#include <vpsc/variable.h>
using std::vector;
struct R { double a, b, c, d; };

// The layouts: `row` ties every event of the X pass, `col` every event of the Y pass, `same` both,
// `grid` makes groups of ties, `touch` ties a Close with the next Open in Y, `overlap` does so with
// an offset, and `point` has zero extents, where compare_events is not a strict weak order.
static vector<R> layout(const char *kind, int n) {
  vector<R> rs;
  const int side = (int)ceil(sqrt((double)n));
  for (int i = 0; i < n; i++) {
    const double d = i;
    if (!strcmp(kind, "row")) rs.push_back({d * 10, d * 10 + 8, 0, 4});
    else if (!strcmp(kind, "col")) rs.push_back({0, 8, d * 10, d * 10 + 4});
    else if (!strcmp(kind, "same")) rs.push_back({0, 8, 0, 4});
    else if (!strcmp(kind, "grid")) rs.push_back({(i % side) * 10.0, (i % side) * 10.0 + 8, (i / side) * 10.0, (i / side) * 10.0 + 8});
    else if (!strcmp(kind, "touch")) rs.push_back({d * 8, d * 8 + 8, 0, 4});
    else if (!strcmp(kind, "overlap")) rs.push_back({d * 4, d * 4 + 8, 0, 4});
    else rs.push_back({d * 10, d * 10, 0, 0}); // point
  }
  return rs;
}

static void run(const char *kind, int n, int mode) {
  printf("CASE %s %d %d\n", kind, n, mode);
  vector<Rectangle> v;
  for (const R &r : layout(kind, n)) v.emplace_back(r.a, r.b, r.c, r.d);
  vector<Variable *> vars;
  for (int i = 0; i < n; i++) vars.push_back(new Variable(i, 0, 1));
  Constraint **cs;
  const int m = mode == 2 ? generateYConstraints(v, vars.data(), cs)
                          : generateXConstraints(v, vars.data(), cs, mode == 1);
  printf("CONS:");
  for (int i = 0; i < m; i++) printf(" %d,%d,%g", cs[i]->left->id, cs[i]->right->id, cs[i]->gap);
  puts("");
}

int main() {
  const char *kinds[] = {"row", "col", "same", "grid", "touch", "overlap", "point"};
  const int sizes[] = {5, 10, 24, 25, 40, 128, 200, 1000};
  for (const char *k : kinds)
    for (int n : sizes)
      for (int mode : {1, 0, 2}) run(k, n, mode);
  return 0;
}
