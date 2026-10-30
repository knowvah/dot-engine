// Reads C++ Constraint fields for the C harness.
#include "config.h"
#include <cstdio>
#include <vpsc/constraint.h>
#include <vpsc/variable.h>

extern "C" void dumpConstraint(Constraint *c) {
  std::printf("c %d %d %.17g\n", c->left->id, c->right->id, c->gap);
}
