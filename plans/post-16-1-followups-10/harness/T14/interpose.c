// DYLD_INSERT_LIBRARIES shim: logs the C rand streams' calls to stderr, so a process-global difference
// between two layouts in one process can be counted.
#include <stdio.h>
#include <stdlib.h>
static int my_rand(void){int r=rand();fprintf(stderr,"rand -> %d\n",r);return r;}
static void my_srand(unsigned s){fprintf(stderr,"srand(%u)\n",s);srand(s);}
static double my_drand48(void){double r=drand48();fprintf(stderr,"drand48 -> %.17g\n",r);return r;}
static void my_srand48(long s){fprintf(stderr,"srand48(%ld)\n",s);srand48(s);}
__attribute__((used,section("__DATA,__interpose"))) static struct{const void*a;const void*b;} I[]={{my_rand,rand},{my_srand,srand},{my_drand48,drand48},{my_srand48,srand48}};
