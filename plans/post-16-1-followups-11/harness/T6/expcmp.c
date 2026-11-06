// SPDX-License-Identifier: EPL-2.0
// Prints t, -lambda*t, macOS exp(-lambda*t), eta_max*exp(...) for sgd's annealing schedule.
// usage: expcmp <eta_max %a> <lambda %a> <MaxIter>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
int main(int c, char **v){ volatile double em=strtod(v[1],0), lam=strtod(v[2],0); int n=atoi(v[3]);
 for(int t=0;t<n;t++){ volatile double a=-lam*t; double e=exp(a); printf("%d %a %a %a\n",t,a,e,em*e);} }
