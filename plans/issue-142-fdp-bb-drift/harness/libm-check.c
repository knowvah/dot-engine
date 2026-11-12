// SPDX-License-Identifier: EPL-2.0
// Issue #142: prints the platform libm's atan2/cos/sin on traced inputs as %a.
// Build with -O0 so nothing is folded at compile time:
//   cc -O0 -o libm-check libm-check.c && ./libm-check atan2 <dy> <dx>
//   ./libm-check cos <x> | ./libm-check sin <x>      (arguments are hex floats)
// The V8 side: node -e 'console.log(Math.atan2(<dy>, <dx>))' with the same doubles
// (harness/libm-check.mjs parses the hex floats and prints %a).
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc < 3) {
	fprintf(stderr, "usage: libm-check atan2 <dy> <dx> | cos <x> | sin <x>\n");
	return 2;
    }
    volatile double a = strtod(argv[2], NULL);
    volatile double b = argc > 3 ? strtod(argv[3], NULL) : 0.0;
    double r;
    if (!strcmp(argv[1], "atan2")) r = atan2(a, b);
    else if (!strcmp(argv[1], "cos")) r = cos(a);
    else if (!strcmp(argv[1], "sin")) r = sin(a);
    else return 2;
    printf("%a\n", r);
    return 0;
}
