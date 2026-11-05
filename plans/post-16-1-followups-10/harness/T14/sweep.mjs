// usage: node sweep.mjs <out.json>  Second render on fdp in dot and xdot, for corpus ids with an edge to a cluster:
// port vs native built with GVTS_NOADDR=1 (ND_id order at layout.c:466,501,637), and vs stock native over 8 runs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const DE=await import(new URL('./port.mjs',import.meta.url)); const {compareXdot}=await import(new URL('./cmp.mjs',import.meta.url));
console.warn=()=>{};console.error=()=>{};
const here=path.dirname(new URL(import.meta.url).pathname);
const m=JSON.parse(fs.readFileSync('/Users/scottseely/git/knowvah/dot-engine/test/corpus/corpus-manifest.json','utf8'));
const root=path.join(os.homedir(),'git/graphviz/tests');
const STOCK='/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all';
const NOADDR=path.join(here,'../tr/gv');
const rows=[];
const native=(file,fmt,env)=>{const r=spawnSync(path.join(here,'twice-native'),[file,'fdp',fmt,'print'],{env:{...process.env,...env},timeout:20000,maxBuffer:1<<28});return r.status===0?r.stdout.toString('latin1'):null;};
const split=(s)=>{const i=s.indexOf('== render 2\n');return [s.slice('== render 1\n'.length,i),s.slice(i+'== render 2\n'.length)]};
for(const e of m){const file=path.resolve(root,e.path);let src;try{if(fs.statSync(file).size>20000)continue;src=fs.readFileSync(file,'latin1');}catch{continue}
 if(!src.includes('cluster'))continue;
 let ce=0;try{const g=DE.parse(src);DE.render(g,'plain',{engine:'fdp'});ce=g.info.n_cluster_edges??0;}catch{continue}
 if(!ce)continue;
 for(const fmt of ['dot','xdot']){
  const row={id:e.id,fmt,ce};
  try{const g=DE.parse(src);const a=DE.render(g,fmt,{engine:'fdp'});const b=DE.render(g,fmt,{engine:'fdp'});
   const nn=native(file,fmt,{GVBINDIR:NOADDR,GVTS_NOADDR:'1'});
   if(nn===null){row.res='native-fail'}else{const [n1,n2]=split(nn);row.first=compareXdot(a,n1,0.01+1e-9).diffs.length;row.second=compareXdot(b,n2,0.01+1e-9).diffs.length;}
   const set=new Set();for(let i=0;i<8;i++){const s=native(file,fmt,{GVBINDIR:STOCK});if(s===null){set.add('fail');continue}set.add(split(s)[1]);}
   row.stockClasses=set.size;let best=Infinity;for(const s of set){if(s==='fail')continue;best=Math.min(best,compareXdot(b,s,0.01+1e-9).diffs.length)}row.bestStock=best;
  }catch(err){row.res='THROW '+String(err.message).slice(0,60)}
  rows.push(row);console.log(JSON.stringify(row));}
}
fs.writeFileSync(process.argv[2],JSON.stringify(rows,null,0)+'\n');
