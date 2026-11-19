const assert=require('node:assert/strict');
const {formatBallFraction,formatOverlap}=require('../trainer-shot-budget.js');
// Canonical geometric references from Dr. Dave TP A.23, not 15/30/45 approximations.
for(const [fraction,angle] of [[1,0],[7/8,7.180756],[3/4,14.477512],[1/2,30],[1/4,48.590378],[1/8,61.044976],[1/16,69.635865],[1/32,75.638489]]){
 assert(Math.abs(Math.asin(1-fraction)*180/Math.PI-angle)<.000002,'Verified fraction/cut-angle reference '+fraction);
}
for(const [percent,text] of [[0,'0B'],[100,'1B'],[.01,'<⅛B'],[6.24,'<⅛B'],[6.25,'≈⅛B'],[12.5,'⅛B'],[25,'¼B'],[37.5,'⅜B'],[43.74,'≈⅜B'],[43.75,'≈½B'],[50,'½B'],[53.5,'≈½B'],[62.5,'⅝B'],[75,'¾B'],[87.5,'⅞B'],[93.75,'≈1B'],[99.99,'≈1B']])assert.equal(formatBallFraction(percent),text);
assert.equal(formatOverlap(53.5),'53.5%');assert.equal(formatOverlap(50),'50.0%');
for(const bad of [null,NaN,Infinity,-1,101])assert.equal(formatOverlap(bad),'—');
for(let i=1;i<8;i++)assert(!formatBallFraction(i*100/8).includes('≈'),'Every exact eighth is exact');
for(let p=.1;p<100;p+=.1){const text=formatBallFraction(p);assert(!/^0B$|^1B$/.test(text),'No false miss or full hit');}
console.log('Fractional aiming: canonical angles, nearest eighths, precise percent and thin/full boundaries passed.');
