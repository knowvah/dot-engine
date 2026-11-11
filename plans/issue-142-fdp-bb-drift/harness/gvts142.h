/* issue #142 trace helper: env-gated %a traces, one value per token. */
#ifndef GVTS142_H
#define GVTS142_H
#include <stdio.h>
#include <stdlib.h>
static FILE *gvts142_fp(void) {
    static FILE *fp;
    static int init;
    if (!init) {
	const char *p = getenv("GVTS_TRACE142");
	init = 1;
	if (p) fp = fopen(p, "a");
    }
    return fp;
}
#define TR142(...) do { FILE *f_ = gvts142_fp(); \
    if (f_) { fprintf(f_, __VA_ARGS__); fflush(f_); } } while (0)
#define TR142_ON() (gvts142_fp() != NULL)
/* One line per libm call: "libm <fn> <args> = <result>"; port-trace.ts can inject these. */
#define TR142_LIBM1(fn, x, r) TR142("libm " fn " %a = %a\n", (double)(x), (double)(r))
#define TR142_LIBM2(fn, a, b, r) TR142("libm " fn " %a %a = %a\n", (double)(a), (double)(b), (double)(r))
#endif
