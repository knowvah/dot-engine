#include "config.h"
#include <cstdio>
#include <vector>
#include <vpsc/generate-constraints.h>
#include <vpsc/constraint.h>
#include <vpsc/variable.h>
using std::vector;
struct R { double a,b,c,d; };
static void run(const char *tag, vector<R> rs, int mode) {
  vector<Rectangle> v; for (auto &r : rs) v.emplace_back(r.a,r.b,r.c,r.d);
  vector<Variable*> vars; for (size_t i=0;i<rs.size();i++) vars.push_back(new Variable((int)i,0,1));
  Constraint **cs; int m = mode==2 ? generateYConstraints(v,vars.data(),cs) : generateXConstraints(v,vars.data(),cs,mode==1);
  printf("%s:",tag); for(int i=0;i<m;i++) printf(" [%d,%d,%g]",cs[i]->left->id,cs[i]->right->id,cs[i]->gap); puts("");
}
int main(){
  run("x left", {{2,8,0,101},{0,6,1,102},{4,12,2,50}},1);
  run("x right", {{0,8,0,60},{6,14,1,90},{3,11,2,95}},1);
  run("x tied", {{2,8,0,101},{1,9,1,102},{4,12,2,50}},1);
  run("y tie", {{0,10,0,2},{1,11,0,2},{2,12,0,2}},2);
  run("y tie rev", {{2,12,0,2},{1,11,0,2},{0,10,0,2}},2);
  run("x simple tie", {{0,2,2,12},{0,2,1,11},{0,2,0,10}},0);
}
