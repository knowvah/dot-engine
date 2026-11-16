# SPDX-License-Identifier: EPL-2.0
# rankorder.py <base.plain> <head.plain> <native.plain>: for a row whose x
# positions cannot match native (1472, #207), compares the left-to-right node
# order of every rank (nodes grouped by y) with native's. Prints the rank count,
# the ranks whose order differs from native on base and on head, and the ranks
# that matched on the base but not on the head (must be empty).
import collections
import shlex
import sys


def ranks(path):
    r = collections.defaultdict(list)
    with open(path, encoding='latin1') as f:
        for line in f:
            if line.startswith('node '):
                t = shlex.split(line)
                r[t[3]].append((float(t[2]), t[1]))
    return {y: [n for _, n in sorted(v)] for y, v in r.items()}


b, h, n = (ranks(p) for p in sys.argv[1:4])
ys = sorted(set(b) | set(h) | set(n), key=float)
bad_b = [y for y in ys if b.get(y) != n.get(y)]
bad_h = [y for y in ys if h.get(y) != n.get(y)]
lost = [y for y in bad_h if y not in bad_b]
print(f'ranks {len(n)} base-differs {len(bad_b)} head-differs {len(bad_h)} newly-differs {lost}')
