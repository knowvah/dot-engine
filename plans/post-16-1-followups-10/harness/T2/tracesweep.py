#!/usr/bin/env python3
# SPDX-License-Identifier: EPL-2.0
"""For each id: native instrumented trace vs port trace in a pow mode, report the first differing line."""
import json,os,subprocess,sys,tempfile,threading,queue
SC=os.environ['T2_SC']; WT=os.environ['T2_WT']
mode=sys.argv[1]; lst=sys.argv[2]; out=sys.argv[3]; par=int(sys.argv[4]); cap=int(sys.argv[5])
with open(WT+'/test/corpus/parity.json') as fp:
    paths={r['id']:r['path'] for r in json.load(fp)['results']}
with open(lst) as fl:
    ids=[l.strip() for l in fl if l.strip()]
done=set()
if os.path.exists(out):
    with open(out) as fo:
        done={json.loads(l)['id'] for l in fo if l.strip()}
q=queue.Queue()
for i in ids:
    if i not in done: q.put(i)
lock=threading.Lock()
home=os.path.expanduser('~')
import re
TR=re.compile(r'^(EMBED n |K |p |KP |CRK |step0 |step |iter |Fnorm |PROLONG n |A[ .]|x0\[|x\[|xp\[|xpre\[|xrot\[|xfinal\[)')
def first_diff(a,b):
    with open(a,errors='replace') as fa, open(b,errors='replace') as fb:
        last=None;n=0
        while True:
            x=fa.readline();
            while x and not TR.match(x): x=fa.readline()
            y=fb.readline()
            while y and not TR.match(y): y=fb.readline()
            n+=1
            if not x and not y: return dict(same=True,lines=n-1)
            if x!=y: return dict(same=False,line=n,native=x.strip(),port=y.strip(),marker=last)
            if x.startswith(('iter ','EMBED','PROLONG')): last=x.strip()
def work():
    while True:
        try: i=q.get_nowait()
        except queue.Empty: return
        p=os.path.join(home,'git/graphviz/tests',paths[i])
        with tempfile.TemporaryDirectory(dir=SC) as td:
            a=td+'/n.err'; b=td+'/p.err'; row=dict(id=i)
            env=dict(os.environ,GVTS_T2='1',GVBINDIR=SC+'/ghl')
            env.pop('GVTS_T2_DEEP',None)
            try:
                with open(a,'wb') as f: subprocess.run([home+'/git/graphviz/build/cmd/dot/dot','-Ksfdp','-Tplain',p],stdout=subprocess.DEVNULL,stderr=f,env=env,timeout=cap)
                env2=dict(os.environ,GVTS_T2='1',T2_POW=mode,T2_ADDON=SC+'/addon/libmpow.node'); env2.pop('GVTS_T2_DEEP',None)
                with open(b,'wb') as f: subprocess.run([sys.argv[6] if len(sys.argv)>6 else 'node','--import','tsx',SC+'/port/test/corpus/render-one-xdot.ts',p,'sfdp'],stdout=subprocess.DEVNULL,stderr=f,env=env2,timeout=cap,cwd=SC+'/port')
                row.update(first_diff(a,b))
            except subprocess.TimeoutExpired:
                row['timeout']=True
        with lock:
            with open(out,'a') as fo:
                fo.write(json.dumps(row)+'\n')
ts=[threading.Thread(target=work) for _ in range(par)]
[t.start() for t in ts]; [t.join() for t in ts]
