// Old (16.1.0, radians) vs new (16.1.1, quarter-pi int) invflip_angle, bitwise.
// Run: node plans/issue-153-compass-theta-quarter-pi/harness/theta-identity.mjs
const P=Math.PI;
const oldDir={e:0,se:-P*0.25,s:-P*0.5,sw:-P*0.75,w:P,ne:P*0.25,n:P*0.5,nw:P*0.75,c:0};
const newDir={e:0,se:-1,s:-2,sw:-3,w:4,ne:1,n:2,nw:3,c:0};
function oldRL(a){if(a===P)return -0.5*P;if(a===P*0.75)return -0.25*P;if(a===P*0.5)return 0;if(a===0)return P*0.5;if(a===P*-0.25)return P*0.75;if(a===P*-0.5)return P;return a;}
function oldF(a,rd){switch(rd){case 2:return -a;case 1:return a-P*0.5;case 3:return oldRL(a);default:return a;}}
function newF(a,rd){switch(rd){case 2:a=0-a;break;case 1:a-=2;break;case 3:if(a===4)a=-2;else if(a===3)a=-1;else if(a===2)a=0;else if(a===0)a=2;else if(a===-1)a=3;else if(a===-2)a=4;break;}return a*0.25*P;}
const hex=x=>Buffer.from(new Float64Array([x]).buffer).toString('hex');
for(const k of Object.keys(oldDir))for(const rd of [0,1,2,3]){const o=oldF(oldDir[k],rd),n=newF(newDir[k],rd);const same=Object.is(o,n);console.log(k,['TB','LR','BT','RL'][rd],same?'same':'DIFF',o,n,same?'':hex(o)+' '+hex(n));}
