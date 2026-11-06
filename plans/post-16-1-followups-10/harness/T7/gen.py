import sys
F=sys.argv[1]
BODY=['a -- b','b -- c','c -- d','d -- e','e -- a','a -- c','e -- f']
def w(name, attrs, edges, kw='graph'):
    with open(f'{F}/{name}.gv','w') as o:
        o.write(f'{kw} G {{\n')
        for a in attrs: o.write(f'  {a};\n')
        for e in edges: o.write(f'  {e};\n')
        o.write('}\n')
H=['mode=hier']; D3=['dim=3','dimen=3','mode=hier']; D4=['dim=4','dimen=4','mode=hier']
PINS=['a [pos="0,0!"]','b [pos="2,0!"]','c [pos="0,3!"]','d [pos="4,4!"]','e [pos="1,5!"]']
# no directed edge: only a graph without edges (dir=none edges are reversed by acyclic)
w('hier-noedge-dim2', H, PINS)
w('hier-noedge-dim3', D3, PINS)
w('hier-noedge-dim4', D4, PINS)
w('hier-noedge-big', H, [f'v{i} [pos="{i%7},{i//7}!"]' for i in range(45)])
w('hier-dirnone-dim2', H+['edge [dir=none]'], BODY)
w('hier-dirnone-dim3', D3+['edge [dir=none]'], BODY)
# no hierarchy: every edge length is too short for compute_hierarchy's abs_tol
TINY=['a -> b [len=0.001]','b -> c [len=0.001]','c -> d [len=0.001]','a -> d [len=0.001]']
w('hier-nohier-dim2', H, TINY, 'digraph')
w('hier-nohier-dim3', D3, TINY, 'digraph')
# dim > 2 always seeds through the (dim-1)-D subspace layout
w('hier-dim4', D4, BODY)
w('hier-subset-dim3', D3+['model=subset'], BODY)
w('hier-stresswt1-dim3', D3+['stresswt=1'], BODY)
w('hier-stresswt1-dim4', D4+['stresswt=1'], BODY)
w('hier-circuit-dim3', D3+['model=circuit'], BODY)
w('hier-len-dim3', D3, ['a -- b [len=2]','b -- c [len=3.5]','c -- d','d -- e [len=1.5]','e -- a','a -- c','e -- f [len=4]'])
w('hier-two-dim3', D3, ['a -- b'])
w('hier-two-dim4', D4, ['a -- b'])
w('hier-ring-dim3', D3, [f'n{i} -- n{(i+1)%12}' for i in range(12)])
w('hier-star-dim3', D3, [f'hub -- s{i}' for i in range(9)])
w('hier-pack-dim3', D3+['pack=true'], ['a -- b','b -- c','c -- a','d -- e','e -- f','f -- g','g -- d','h -- i','i -- j'])
def bigg(N):
    out=[]
    for i in range(1,N):
        out.append(f'v{(i-1)//2} -- v{i}')
    for i in range(0,N,3):
        j=(i*11+5)%N
        if j!=i: out.append(f'v{i} -- v{j}')
    return out
# non-pivot nodes (n > 40) and a 50-D subspace (n > 50); 100 embedding pivots (n > 100)
w('hier-big-dim3', D3, bigg(60))
w('hier-big-dim4', D4, bigg(60))
w('hier-big-subset-dim3', D3+['model=subset'], bigg(60))
w('hier-big110-dim3', D3, bigg(110))
