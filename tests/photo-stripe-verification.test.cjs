const assert=require('node:assert/strict'),{verifyStripe,stripeEvidence}=require('../photo-ball-identity');
const ids=Array.from({length:16},(_,i)=>i);
function crop(kind,color,angle=0){const data=new Uint8ClampedArray(224*224*4);for(let y=0;y<224;y++)for(let x=0;x<224;x++){
 const dx=x/224-.5,dy=y/224-.42,r=Math.hypot(dx,dy),v=dx*Math.sin(angle)+dy*Math.cos(angle);
 const white=kind==='stripe'?Math.abs(v)>.13:kind==='number'?r<.115:kind==='glare'?Math.hypot(dx+.1,dy+.15)<.065:kind==='cue';
 const c=r>.39?[240,240,240]:white?[244,244,240]:color,i=(y*224+x)*4;data.set([...c,255],i);
 }return {width:224,height:224,data};}
for(const [id,color]of [[1,[235,190,20]],[5,[230,90,20]],[6,[20,120,45]]]){
 const scores=Array(16).fill(.01);scores[id]=.65;scores[id+8]=.12;
 for(const angle of [0,.6,1.5,2.4]){const r=verifyStripe(scores,crop('stripe',color,angle),ids);assert(r.changed);assert(r.scores[id+8]>r.scores[id]);assert(Math.abs(r.scores[id]+r.scores[id+8]-.77)<1e-12);for(let i=0;i<16;i++)if(i!==id&&i!==id+8)assert.equal(r.scores[i],scores[i]);}
 for(const kind of ['solid','number','glare','cue']){const r=verifyStripe(scores,crop(kind,color),ids);assert.equal(r.changed,false,kind);assert.deepEqual(r.scores,scores);}
}
console.log('1/9, 5/13, 6/14 verified at four stripe angles; number circles, glare, white backgrounds, solids and cue protected; color-family mass preserved.');
