// SPDX-License-Identifier: EPL-2.0
// Replays poly_gencode's ellipse x for corpus 2781 node 00 (x = 1, lw+rw = 7.2e25,
// width 54 pt) with and without fma contraction, in exact BigInt arithmetic.
// Run: node fma-ellipse.mjs. Expect: mid nofma 0, mid fma 2147483648 (native).
// exact fma(a,b,c) for doubles via BigInt rationals (all finite, c small)
function dec(v){const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,v);const hi=b.getUint32(0),lo=b.getUint32(4);const ex=(hi>>>20)&0x7ff;let m=(BigInt(hi&0xfffff)<<32n)|BigInt(lo);let e;if(ex===0)e=-1074;else{m|=1n<<52n;e=ex-1075;}const s=(hi>>>31)?-1n:1n;return [s*m,e];}
function toNum(m,e){ // m*2^e rounded to nearest even double
  if(m===0n) return 0; const neg=m<0n; if(neg)m=-m;
  let bl=m.toString(2).length; let sh=bl-53; if(sh>0){const half=1n<<BigInt(sh-1);const r=m&((1n<<BigInt(sh))-1n);m>>=BigInt(sh);if(r>half||(r===half&&(m&1n)))m+=1n;e+=sh;}
  const v=Number(m)*2**e; return neg?-v:v;}
function fma(a,b,c){const [ma,ea]=dec(a),[mb,eb]=dec(b),[mc,ec]=dec(c);let m=ma*mb,e=ea+eb;let mm=mc,ee=ec;const E=Math.min(e,ee);m<<=BigInt(e-E);mm<<=BigInt(ee-E);return toNum(m+mm,E);}
const lwrw=7.2e25, xs=lwrw/54, x=1;
for (const P of [-27,27]) console.log(P, 'nofma', P*xs+x, 'fma', fma(P,xs,x));
const a=-27*xs+x,b=27*xs+x; console.log('mid nofma',(a+b)/2,'mid fma',(fma(-27,xs,x)+fma(27,xs,x))/2);
