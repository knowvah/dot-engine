// SPDX-License-Identifier: EPL-2.0
import {readFileSync} from 'node:fs';
// Run from the worktree root: npx tsx <this file> <pow.bin from powgen>
import { armPow } from '../../../../src/common/arm-pow.js';
const b=readFileSync(process.argv[2]!); const a=new Float64Array(b.buffer,b.byteOffset,b.length/8);
const st:Record<string,{n:number,arm:number,math:number,armEqMath:number}>={};
for(let i=0;i<a.length;i+=3){const x=a[i]!,y=a[i+1]!,r=a[i+2]!;const s=st[y]??={n:0,arm:0,math:0,armEqMath:0};s.n++; const am=armPow(x,y), m=Math.pow(x,y); if(am!==r)s.arm++; if(m!==r)s.math++; if(am===m)s.armEqMath++;}
console.log(process.version,JSON.stringify(st));
