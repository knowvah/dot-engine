// SPDX-License-Identifier: EPL-2.0
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
/* writes x,y,pow(x,y) triples as raw doubles; seeded deterministic xorshift */
static unsigned long long s=88172645463325252ULL;
static double rnd(void){ s^=s<<13; s^=s>>7; s^=s<<17; return (s>>11)*(1.0/9007199254740992.0);} 
int main(int c,char**v){ double ys[]={2.0,2.8,1.5,3.0,0.5}; int n=atoi(v[1]);
 for(int k=0;k<5;k++) for(int i=0;i<n;i++){ double x=0.01+rnd()*20; volatile double vx=x,vy=ys[k]; double r=pow(vx,vy); fwrite(&x,8,1,stdout); fwrite(&ys[k],8,1,stdout); fwrite(&r,8,1,stdout);} return 0;}
