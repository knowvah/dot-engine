# SPDX-License-Identifier: EPL-2.0
import sys
def parse(fn):
    out=[];comp=-1;it=None;
    with open(fn) as fh:
        for l in fh:
            f=l.split()
            if not f: continue
            if f[0]=='EMBED': comp+=1;it=0
            elif f[0]=='iter': it=int(f[1])
            out.append((comp,it,f[0],f[-1]))
    return out
a=parse(sys.argv[1]);b=parse(sys.argv[2])
print(len(a),len(b))
seen=set();ms={}
for (c,i,t,v),(c2,i2,t2,v2) in zip(a,b):
    if v!=v2 and t not in('p',):
        if (c,t.split('[')[0]) not in seen:
            seen.add((c,t.split('[')[0]));print('first diff comp',c,'iter',i,t,v,v2)
    if t.startswith('x[') and v!=v2 and (c,i) not in ms:
        pass
    if t.startswith('x[') :
        d=abs(float.fromhex(v)-float.fromhex(v2)); k=(c,i); ms[k]=max(ms.get(k,0),d)
for k in sorted(ms):
    if k[1]%100==0 or k[1] in(305,306,331,332,350) : print(k,'max|dx|',ms[k])
# step comparison
print('last iters', [(c,i) for (c,i,t,v) in a if t=='step'][-1], [(c,i) for (c,i,t,v) in b if t=='step'][-1])
print('final', [ (t,v,v2) for (c,i,t,v),(c2,i2,t2,v2) in zip(a,b) if t.startswith('xfinal')][:8])
