(function(root,factory){
 'use strict';
 const model=typeof module==='object'&&module.exports?require('./photo-ball-identity-model'):root.BilliardsBallIdentityModel;
 const api=factory(model);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BilliardsBallIdentity=api;
})(typeof window==='object'?window:globalThis,function(defaultModel){
 'use strict';
 const WIDTH=224,HEIGHT=224,PIXELS=WIDTH*HEIGHT,FEATURES=90,validatedModels=new WeakSet();
 const FAMILY_IDS=[0,1,2,3,4,5,6,7,8];

 function extract(imageData){
  if(!imageData||imageData.width!==WIDTH||imageData.height!==HEIGHT)throw new RangeError('Expected a 224×224 RGBA crop');
  const data=imageData.data;if(!data||data.length!==PIXELS*4)throw new TypeError('Expected 224×224 RGBA byte data');
  const hi=new Float64Array(PIXELS),sat=new Float64Array(PIXELS),hue=new Float64Array(PIXELS),rgb=new Float64Array(PIXELS*3);
  for(let p=0,p4=0;p<PIXELS;p++,p4+=4){
   const r8=Number(data[p4]),g8=Number(data[p4+1]),b8=Number(data[p4+2]);
   if(!Number.isFinite(r8)||!Number.isFinite(g8)||!Number.isFinite(b8)||r8<0||r8>255||g8<0||g8>255||b8<0||b8>255)throw new RangeError('RGBA color channels must be finite values from 0 to 255');
   const r=r8/255,g=g8/255,b=b8/255,v=Math.max(r,g,b),lo=Math.min(r,g,b),delta=v-lo,s=delta/Math.max(.001,v),base=p*3;
   rgb[base]=r;rgb[base+1]=g;rgb[base+2]=b;hi[p]=v;sat[p]=s;
   let h=0;
   if(delta>0&&r===v)h=((g-b)/delta)%6;
   if(delta>0&&g===v)h=(b-r)/delta+2;
   if(delta>0&&b===v)h=(r-g)/delta+4;
   h%=6;if(h<0)h+=6;h*=60;hue[p]=h;
  }
  const out=new Float64Array(FEATURES),xx=new Uint16Array(PIXELS),yy=new Uint16Array(PIXELS);
  for(let y=0,p=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++,p++){xx[p]=x;yy[p]=y;}
  let at=0;
  for(const [cx,cy,r] of [[.5,.42,.36],[.5,.5,.265]]){
   let n=0;
   for(let p=0;p<PIXELS;p++){const dx=(xx[p]+.5)/WIDTH-cx,dy=(yy[p]+.5)/HEIGHT-cy;if(dx*dx+dy*dy<r*r)n++;}
   const hueHist=new Float64Array(18),satHist=new Float64Array(8),valHist=new Float64Array(8);
   let weightTotal=0,white58=0,white35=0,color=0,dark=0,satSum=0,valSum=0,cr=0,cg=0,cb=0,colorN=0;
   for(let p=0;p<PIXELS;p++){
    const dx=(xx[p]+.5)/WIDTH-cx,dy=(yy[p]+.5)/HEIGHT-cy;if(dx*dx+dy*dy>=r*r)continue;
    const s=sat[p],v=hi[p],h=hue[p],base=p*3;
    let bin=Math.floor(h/20);if(bin<0)bin=0;if(bin>17)bin=17;
    if(s>.25&&v>.16){const w=s*(.3+.7*v);hueHist[bin]+=w;weightTotal+=w;const denom=Math.max(.01,rgb[base]+rgb[base+1]+rgb[base+2]);cr+=rgb[base]/denom;cg+=rgb[base+1]/denom;cb+=rgb[base+2]/denom;colorN++;}
    bin=Math.min(7,Math.max(0,Math.floor(s*8)));satHist[bin]++;
    bin=Math.min(7,Math.max(0,Math.floor(v*8)));valHist[bin]++;
    if(s<.22&&v>.58)white58++;if(s<.30&&v>.35)white35++;if(s>.29&&v>.18)color++;if(v<.23)dark++;
    satSum+=s;valSum+=v;
   }
   for(let i=0;i<18;i++)out[at++]=hueHist[i]/Math.max(1e-9,weightTotal);
   for(let i=0;i<8;i++)out[at++]=satHist[i]/n;
   for(let i=0;i<8;i++)out[at++]=valHist[i]/n;
   out[at++]=white58/n;out[at++]=white35/n;out[at++]=color/n;out[at++]=dark/n;out[at++]=satSum/n;out[at++]=valSum/n;
   out[at++]=colorN?cr/colorN:0;out[at++]=colorN?cg/colorN:0;out[at++]=colorN?cb/colorN:0;
  }
  for(let sy=0;sy<=1;sy++)for(let sx=0;sx<=1;sx++){
   let n=0,white=0;
   for(let p=0;p<PIXELS;p++){
    const dx=(xx[p]+.5)/WIDTH-.5,dy=(yy[p]+.5)/HEIGHT-.42;
    if(dx*dx+dy*dy>=.36*.36||((xx[p]>=112)!==Boolean(sx))||((yy[p]>=94)!==Boolean(sy)))continue;
    n++;if(sat[p]<.25&&hi[p]>.50)white++;
   }
   out[at++]=white/n;
  }
  return out;
 }

 function validateForest(forest,classCount){
  if(!forest||!Array.isArray(forest.classes)||forest.classes.length!==classCount||!Array.isArray(forest.trees)||!forest.trees.length)throw new TypeError('Invalid identity forest');
  for(const tree of forest.trees){
   const {children_left:left,children_right:right,feature,threshold,value}=tree||{};
   if(![left,right,feature,threshold,value].every(Array.isArray)||!left.length||left.length!==right.length||left.length!==feature.length||left.length!==threshold.length||left.length!==value.length)throw new TypeError('Invalid identity tree arrays');
   for(let node=0;node<left.length;node++){
    const l=left[node],r=right[node],leaf=l===-1&&r===-1;
    if(!leaf&&(!Number.isInteger(l)||!Number.isInteger(r)||l<0||r<0||l>=left.length||r>=left.length))throw new TypeError('Invalid child index in identity tree');
    if(!leaf&&(!Number.isInteger(feature[node])||feature[node]<0||feature[node]>=FEATURES||!Number.isFinite(threshold[node])))throw new TypeError('Invalid split in identity tree');
    let counts=value[node];while(Array.isArray(counts)&&counts.length===1&&Array.isArray(counts[0]))counts=counts[0];
    if(!Array.isArray(counts)||counts.length!==classCount||counts.some(v=>!Number.isFinite(v)||v<0))throw new TypeError('Invalid identity leaf values');
   }
  }
 }
 function validateModel(model){
  if(!model||typeof model!=='object'||model.schema!==1||model.featureVersion!=='body-hsv-90-v1'||!Number.isFinite(model.mixture)||model.mixture<0||model.mixture>1)throw new TypeError('Invalid ball identity model metadata');
  if(validatedModels.has(model))return;
  if(!Number.isInteger(model.trainingSamples)||model.trainingSamples<1)throw new TypeError('Invalid ball identity training sample count');
  validateForest(model.color,FAMILY_IDS.length);validateForest(model.stripe,2);validatedModels.add(model);
 }
 function forestPredict(features,forest){
  const classes=forest.classes,probabilities=new Float64Array(classes.length);
  for(const tree of forest.trees){
   let node=0,steps=0;
   while(tree.children_left[node]!==-1||tree.children_right[node]!==-1){
    if(++steps>tree.children_left.length)throw new Error('Invalid cyclic identity tree');
    const x=Math.fround(features[tree.feature[node]]);
    node=x<=tree.threshold[node]?tree.children_left[node]:tree.children_right[node];
   }
   let counts=tree.value[node];while(Array.isArray(counts)&&counts.length===1&&Array.isArray(counts[0]))counts=counts[0];
   let total=0;for(const count of counts)total+=count;
   if(total>0)for(let i=0;i<classes.length;i++)probabilities[i]+=counts[i]/total/forest.trees.length;
  }
  let best=0;for(let i=1;i<probabilities.length;i++)if(probabilities[i]>probabilities[best])best=i;
  return {classes:classes.slice(),probabilities:Array.from(probabilities),prediction:classes[best]};
 }
 function predict(features,model=defaultModel){
  validateModel(model);
  if(!features||features.length!==FEATURES)throw new TypeError('Expected exactly 90 ball identity features');
  for(const value of features)if(!Number.isFinite(Number(value)))throw new TypeError('Ball identity features must be finite');
  return {color:forestPredict(features,model.color),stripe:forestPredict(features,model.stripe)};
 }
 function calibrate(scores,imageData,ids,model=defaultModel){
  validateModel(model);
  if(!Array.isArray(scores)||scores.length!==16||!Array.isArray(ids)||ids.length!==16)throw new TypeError('Expected 16 neural scores and 16 ball ids');
  const idNumbers=ids.map(id=>{const n=Number(id);if(!Number.isInteger(n)||n<0||n>15)throw new TypeError('Ball ids must be integers from 0 to 15');return n;});
  if(new Set(idNumbers).size!==16)throw new TypeError('Ball ids must be unique');
  const neural=scores.map(score=>{const n=Number(score);if(!Number.isFinite(n)||n<0)throw new TypeError('Neural scores must be finite and nonnegative');return n;});
  const features=extract(imageData),sum=neural.reduce((a,b)=>a+b,0),zeros=new Array(16).fill(0);
  const modelVersion=model.version||model.featureVersion;
  if(sum===0)return {scores:zeros,visualScores:zeros.slice(),colorConfidence:0,patternConfidence:0,modelVersion};
  const inferred=predict(features,model),colorMap=new Map(inferred.color.classes.map((id,i)=>[Number(id),inferred.color.probabilities[i]]));
  const stripeMap=new Map(inferred.stripe.classes.map((id,i)=>[Number(id),inferred.stripe.probabilities[i]]));
  const stripeP=stripeMap.get(1),visualScores=idNumbers.map(id=>{
   const base=id>8?id-8:id,family=colorMap.get(base);if(family===undefined)throw new TypeError('Identity model is missing a required ball family class');
   if(id===0||id===8)return family;
   const p=stripeP===undefined?NaN:stripeP;
   if(!Number.isFinite(p))throw new TypeError('Identity model is missing a stripe class');
   return family*(id>=9?p:1-p);
  });
  const visualSum=visualScores.reduce((a,b)=>a+b,0);if(!(visualSum>0))throw new TypeError('Identity visual posterior is empty');
  for(let i=0;i<visualScores.length;i++)visualScores[i]/=visualSum;
  const normalized=neural.map(value=>value/sum),cueIndex=idNumbers.indexOf(0);
  let neuralWinner=0,secondNeural=0;
  for(let i=0;i<normalized.length;i++){
   if(normalized[i]>normalized[neuralWinner])neuralWinner=i;
  }
  for(let i=0;i<normalized.length;i++)if(i!==neuralWinner&&normalized[i]>secondNeural)secondNeural=normalized[i];
  // A strong neutral cue-ball read is a known domain-shift case: white center,
  // little body color, and low saturation should retain the learned neural vote.
  const protectCue=neuralWinner===cueIndex&&normalized[cueIndex]>=.55&&normalized[cueIndex]-secondNeural>=.25
   &&features[36]<.12&&features[34]>.40&&features[38]<.22;
  const mixed=normalized.map((value,i)=>(1-model.mixture)*value+model.mixture*visualScores[i]);
  const scoresOut=protectCue?normalized.slice():mixed;
  if(!protectCue){const mixedSum=scoresOut.reduce((a,b)=>a+b,0);for(let i=0;i<scoresOut.length;i++)scoresOut[i]/=mixedSum;}
  return {scores:scoresOut,visualScores,colorConfidence:Math.max(...inferred.color.probabilities),patternConfidence:Math.max(...inferred.stripe.probabilities),modelVersion};
 }
 return {extract,predict,calibrate};
});
