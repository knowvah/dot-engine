#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Speed gate: bash speed.sh <bundleA> <bundleB> <tag> <outdir>
# Times dot + neato speed ids for both bundles (alternating, so load drifts hit both),
# writes timings-<tag>-{A,B}.json and prints per-engine p50 of B/A ratios.
D=$(cd "$(dirname "$0")" && pwd); A=$1; B=$2; T=$3; O=${4:?outdir}; mkdir -p "$O"
uptime
for e in dot neato; do
  node --stack-size=65500 "$D/timing.mjs" "$A" $e "$D/speed-$e.txt" "$O/t-$T-A-$e.json" 2>/dev/null
  node --stack-size=65500 "$D/timing.mjs" "$B" $e "$D/speed-$e.txt" "$O/t-$T-B-$e.json" 2>/dev/null
done
uptime
node -e '
const [d,t]=process.argv.slice(1);const fs=require("fs");const res={};
for(const s of ["A","B"]){res[s]={};for(const e of ["dot","neato"])for(const [k,v] of Object.entries(JSON.parse(fs.readFileSync(`${d}/t-${t}-${s}-${e}.json`))))res[s][`${e}:${k}`]=v;fs.writeFileSync(`${d}/timings-${t}-${s}.json`,JSON.stringify(res[s],null,1));}
for(const e of ["dot","neato"]){const r=Object.keys(res.A).filter(k=>k.startsWith(e+":")).map(k=>res.B[k]/res.A[k]).sort((a,b)=>a-b);console.log(e,"p50 B/A",r[Math.floor(r.length/2)].toFixed(3),"min",r[0].toFixed(3),"max",r[r.length-1].toFixed(3));}
' "$O" "$T"
