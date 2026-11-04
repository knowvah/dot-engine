#!/bin/sh
# T7: builds two drivers into $1 with the oracle's own flags (flags.make of lib/vpsc).
#  native-pristine links the oracle's libvpsc.a as it is, so its constraints are the oracle's.
#  native-dump compiles a patched copy of generate-constraints.cpp (never ~/git/graphviz) that
#  prints the sorted events after each std::sort when T7_DUMP is set.
#  native-sort drives std::sort directly on a shared_ptr-holding struct.
set -e
OUT=$1
HERE=$(cd "$(dirname "$0")" && pwd)
G=/Users/scottseely/git/graphviz; B=$G/build
FLAGS="-O3 -DNDEBUG -std=gnu++17 -flto=thin -arch arm64 -fPIC -DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DORTHO -DSFDP"
INC="-I$B -I$G/lib/vpsc/.."
mkdir -p "$OUT"
sed -e '/^int generateXConstraints/i\
static void t7Dump(const char *pass, const vector<Event> \&ev) {\
	if (!getenv("T7_DUMP")) return;\
	printf("EVENTS %s:", pass);\
	for (const Event \&e : ev) printf(" %c%d", e.type == Open ? 0x6f : 0x63, e.v->v->id);\
	puts("");\
}
' -e 's/^\(.*\)std::sort(events.begin(), events.end(), compare_events);/&\n\1t7Dump("", events);/' \
  -e '1i\
#include <cstdio>\
#include <vpsc/variable.h>
' "$G/lib/vpsc/generate-constraints.cpp" > "$OUT/generate-constraints-dump.cpp"
test "$(grep -c 't7Dump("", events)' "$OUT/generate-constraints-dump.cpp")" = 2
c++ $FLAGS $INC -c "$HERE/native-unit.cpp" -o "$OUT/native-unit.o"
c++ $FLAGS $INC -c "$OUT/generate-constraints-dump.cpp" -o "$OUT/generate-constraints-dump.o"
c++ -O3 -flto=thin -arch arm64 "$OUT/native-unit.o" "$B/lib/vpsc/libvpsc.a" -o "$OUT/native-pristine"
c++ -O3 -flto=thin -arch arm64 "$OUT/native-unit.o" "$OUT/generate-constraints-dump.o" "$B/lib/vpsc/libvpsc.a" -o "$OUT/native-dump"
c++ $FLAGS -c "$HERE/native-sort.cpp" -o "$OUT/native-sort.o"
c++ -O3 -flto=thin -arch arm64 "$OUT/native-sort.o" -o "$OUT/native-sort"
