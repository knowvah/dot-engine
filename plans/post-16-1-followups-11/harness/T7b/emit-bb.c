// SPDX-License-Identifier: EPL-2.0
// Prints spl->bb as lib/common/emit.c computes it (bezier_bb and init_splines_bb copied
// verbatim; they are static) with the library's own arrow_bb, for the fixtures of
// src/common/emit-bb.test.ts. Build and run: see regen.sh.
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <render.h>

static boxf bezier_bb(bezier bz)
{
    pointf p, p1, p2;
    boxf bb;

    assert(bz.size > 0);
    assert(bz.size % 3 == 1);
    bb.LL = bb.UR = bz.list[0];
    for (size_t i = 1; i < bz.size;) {
	/* take mid-point between two control points for bb calculation */
	p1=bz.list[i];
	i++;
	p2=bz.list[i];
	i++;
	p.x = ( p1.x + p2.x ) / 2;
	p.y = ( p1.y + p2.y ) / 2;
        expandbp(&bb, p);

	p=bz.list[i];
        expandbp(&bb, p);
	i++;
    }
    return bb;
}

static void init_splines_bb(splines *spl)
{
    bezier bz;
    boxf bb, b;

    assert(spl->size > 0);
    bz = spl->list[0];
    bb = bezier_bb(bz);
    for (size_t i = 0; i < spl->size; i++) {
        if (i > 0) {
            bz = spl->list[i];
            b = bezier_bb(bz);
            EXPANDBB(&bb, b);
        }
        if (bz.sflag) {
            b = arrow_bb(bz.sp, bz.list[0], 1);
            EXPANDBB(&bb, b);
        }
        if (bz.eflag) {
            b = arrow_bb(bz.ep, bz.list[bz.size - 1], 1);
            EXPANDBB(&bb, b);
        }
    }
    spl->bb = bb;
}

static void pbox(const char *name, boxf b)
{
    printf("%s %.17g %.17g %.17g %.17g\n", name, b.LL.x, b.LL.y, b.UR.x, b.UR.y);
}

int main(void)
{
    pbox("arrow_bb(p=(10,20),u=(13,24),1)", arrow_bb((pointf){10, 20}, (pointf){13, 24}, 1));
    pbox("arrow_bb(p=(5,5),u=(5,5),2)", arrow_bb((pointf){5, 5}, (pointf){5, 5}, 2));
    pbox("arrow_bb(p=(0,0),u=(-7,0.5),0.5)", arrow_bb((pointf){0, 0}, (pointf){-7, 0.5}, 0.5));
    pbox("arrow_bb(p=(nan,0),u=(1,1),1)", arrow_bb((pointf){NAN, 0}, (pointf){1, 1}, 1));
    pointf l1[] = {{0, 0}, {10, 40}, {30, -20}, {50, 10}};
    pointf l2[] = {{50, 10}, {60, 12}, {70, 30}, {80, 31}, {81, 33}, {90, 50}, {100, 60}};
    bezier bz[2] = {
        {.list = l1, .size = 4, .sflag = 1, .sp = {-3, -4}},
        {.list = l2, .size = 7, .eflag = 1, .ep = {104, 66}},
    };
    splines one = {.list = bz, .size = 1};
    init_splines_bb(&one);
    pbox("spl1", one.bb);
    splines two = {.list = bz, .size = 2};
    init_splines_bb(&two);
    pbox("spl2", two.bb);
    splines second = {.list = bz + 1, .size = 1};
    init_splines_bb(&second);
    pbox("spl3", second.bb);
    return 0;
}
