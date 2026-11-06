import random, sys
D=sys.argv[1]
r=random.Random(20261105)
def rand_edges(n, extra):
    es=[]
    for i in range(1,n):
        es.append((r.randrange(i),i))
    s=set(es)
    for _ in range(extra):
        a,b=r.randrange(n),r.randrange(n)
        if a!=b and (a,b) not in s and (b,a) not in s:
            s.add((a,b)); es.append((a,b))
    return es
idx=0
def emit(attrs, es, kw='graph', op='--', eattr=lambda e:''):
    global idx
    with open(f'{D}/s{idx:03d}.gv','w') as o:
        o.write(f'{kw} G {{\n')
        for a in attrs: o.write(f'  {a};\n')
        for e in es: o.write(f'  n{e[0]} {op} n{e[1]}{eattr(e)};\n')
        o.write('}\n')
    idx+=1
sizes=[2,3,4,5,6,7,8,9,10,12,15,16,17,20,24,25,31,32,33,39,40,41,42,47,48,49,50,51,52,64,65,80,96,99,100,101,104,120,128,150,200]
for n in sizes:
    es=rand_edges(n, n//2)
    emit(['mode=hier','edge [dir=none]'], es)
    emit(['mode=hier','edge [dir=none]','dim=3','dimen=3'], es)
    emit(['mode=hier','dim=3','dimen=3'], es)
    emit(['mode=hier','edge [dir=none]','model=subset'], es)
    emit(['mode=hier','edge [dir=none]','stresswt=1'], es)
for n in [5,9,17,33,41,60,90]:
    es=rand_edges(n,n)
    emit(['mode=hier','edge [dir=none]'], es, eattr=lambda e:f' [len={1+r.randrange(40)/10}]')
    emit(['mode=hier','dim=4','dimen=4'], es)
    emit(['mode=hier','dim=5','dimen=3','edge [dir=none]'], es)
    emit(['mode=hier','model=circuit','edge [dir=none]'], es)
    emit(['mode=hier','model=mds','edge [dir=none]'], es, eattr=lambda e:f' [len={1+r.randrange(40)/10}]')
    emit(['mode=hier','epsilon=0.01','edge [dir=none]'], es)
    emit(['mode=hier','maxiter=3','edge [dir=none]'], es)
    emit(['mode=hier','maxiter=0','edge [dir=none]'], es)
    emit(['mode=hier','levelsgap=0.5','dim=3','dimen=3'], es)
# trees, grids, stars, complete
emit(['mode=hier','edge [dir=none]'], [(i,j) for i in range(8) for j in range(i+1,8)])
emit(['mode=hier','edge [dir=none]','dim=3'], [(i,j) for i in range(8) for j in range(i+1,8)])
emit(['mode=hier','edge [dir=none]'], [(i,j) for i in range(9) for j in range(i+1,9)])
g=[]
for y in range(7):
    for x in range(7):
        if x<6: g.append((y*7+x,y*7+x+1))
        if y<6: g.append((y*7+x,y*7+x+7))
emit(['mode=hier','edge [dir=none]'], g)
emit(['mode=hier','edge [dir=none]','dim=3','dimen=3'], g)
emit(['mode=hier','dim=3','dimen=3'], g)
emit(['mode=hier','edge [dir=none]'], [(0,i) for i in range(1,60)])
emit(['mode=hier','edge [dir=none]'], [(i,i+1) for i in range(70)])
emit(['mode=hier','edge [dir=none]','dim=3','dimen=3'], [(i,i+1) for i in range(70)])
# zero-length bumps
emit(['mode=hier','edge [dir=none]'], [(0,1),(1,2),(2,3)], eattr=lambda e:' [len=0.5]')
emit(['mode=hier','edge [dir=none]'], [(0,1),(1,2),(2,3),(3,0)], eattr=lambda e:' [len=0.5]' if e[0]==0 else '')
# directed with tiny len: no hierarchy with a zero bfs bump
emit(['mode=hier'], [(0,1)], 'digraph','->', lambda e:' [len=0.001]')
emit(['mode=hier'], [(0,1),(1,2),(2,3)], 'digraph','->', lambda e:' [len=0.001]')
emit(['mode=hier','dim=3','dimen=3'], [(0,1),(1,2),(2,3)], 'digraph','->', lambda e:' [len=0.001]')
# pins keep components together
with open(f'{D}/s{idx:03d}.gv','w') as o:
    o.write('graph G { mode=hier; edge [dir=none]; n0 [pos="1,2!"]; n3 [pos="5,5!"]; n0--n1; n1--n2; n3--n4; n4--n5; }\n')
idx+=1
with open(f'{D}/s{idx:03d}.gv','w') as o:
    o.write('graph G { mode=hier; dim=3; dimen=3; n0 [pos="1,2!"]; n3 [pos="5,5!"]; n0--n1; n1--n2; n3--n4; n4--n5; }\n')
idx+=1
