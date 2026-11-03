// T8: compares each native output with the ordered build's, step by step: CMV iterations and the
// largest position difference. usage: node variants.mjs <runs/pristine> <part-8 T0 runs> <ordered .out>
import fs from 'node:fs';
const [dir, t0, ordered] = process.argv.slice(2);
const parse = (f) => { const l = fs.readFileSync(f, 'utf8').trim().split('\n'); const c=[]; l.forEach((x,i)=>{ if(x.startsWith('cmv ')) c.push({ret:+x.split(' ')[1], place:l[i+1].split(' ').slice(1).map(Number)}); }); return c; };
const o = parse(ordered);
const report = (tag, f) => { const c = parse(f); const line = c.map((s,k)=>{ let m=0; s.place.forEach((v,i)=>{m=Math.max(m,Math.abs(v-o[k].place[i]));}); return `cmv${k}: ret ${s.ret} vs ${o[k].ret} maxdiff ${m.toPrecision(3)}`; }).join(' | '); console.log(tag, line); };
const s = JSON.parse(fs.readFileSync(dir+'/summary.json','utf8'));
for (const [h, v] of Object.entries(s.distinct)) report(h+' x'+v.count, `${dir}/${h}.out`);
for (let k=1;k<=8;k++) report('T0 run'+k, `${t0}/dir1-n40.run${k}.out`);
