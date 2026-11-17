# SPDX-License-Identifier: EPL-2.0
# Compare two sil outputs: names and root counts exactly, roots to 1e-15
# (solve3's acos/cos/cbrt are libm; V8 and Apple libm differ in the last bit).
import sys
a = [l.split() for l in open(sys.argv[1])]
b = [l.split() for l in open(sys.argv[2])]
bad = 0
for x, y in zip(a, b):
    ok = x[:2] == y[:2] and len(x) == len(y) and all(
        abs(float(p) - float(q)) <= 1e-15 for p, q in zip(x[2:], y[2:]))
    if not ok:
        bad += 1
        print('DIFF', ' '.join(x), '|', ' '.join(y))
if len(a) != len(b):
    bad += 1
    print('DIFF line counts', len(a), len(b))
print('EQUAL' if bad == 0 else f'{bad} differ')
sys.exit(1 if bad else 0)
