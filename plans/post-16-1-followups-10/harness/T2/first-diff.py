#!/usr/bin/env python3
# SPDX-License-Identifier: EPL-2.0
"""First-difference report between two trace streams."""
import sys
a=[l.rstrip('\n') for l in open(sys.argv[1])]
b=[l.rstrip('\n') for l in open(sys.argv[2])]
a=[l for l in a if not l.startswith('Warning')]
b=[l for l in b if not l.startswith('Warning')]
for i,(x,y) in enumerate(zip(a,b)):
    if x!=y:
        print(f'first diff line {i+1}\n  native {x}\n  port   {y}')
        ctx=max(0,i-4)
        for k in range(ctx,i): print('  ctx',a[k], '|', b[k])
        # find last marker lines
        for k in range(i,-1,-1):
            if a[k].startswith(('iter ','EMBED','PROLONG')): print('  marker',a[k]); break
        break
else:
    print('identical over',min(len(a),len(b)),'lines; lens',len(a),len(b))
