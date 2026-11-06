// usage: node firstdiff.mjs <literal substring filter on source> <engines,csv>: first renders, base bundle vs current, one process.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const A=await import(new URL('./base.mjs',import.meta.url)); const B=await import(new URL('./port.mjs',import.meta.url));
console.warn=()=>{};console.error=()=>{};
const m=JSON.parse(fs.readFileSync('/Users/scottseely/git/knowvah/dot-engine/test/corpus/corpus-manifest.json','utf8'));
const root=path.join(os.homedir(),'git/graphviz/tests');
const needle=process.argv[2]; const engines=process.argv[3].split(',');
let same=0,diff=[],n=0;const t0=Date.now();
const r=(D,src,f,e)=>{try{return D.render(D.parse(src),f,{engine:e})}catch(err){return 'THROW '+err.message}};
for(const e of m){const file=path.resolve(root,e.path);let src;try{if(fs.statSync(file).size>500)continue;src=fs.readFileSync(file,'latin1');}catch{continue}
 if(!src.includes(needle))continue;n++;
 for(const eng of engines)for(const f of ['svg','xdot','dot','plain','json']){ if(r(A,src,f,eng)===r(B,src,f,eng))same++;else diff.push([e.id,eng,f]); }
 if(Date.now()-t0>60000){console.log('TIME CAP after',n);break}
}
console.log({ids:n,same,diff});process.exit(0)
