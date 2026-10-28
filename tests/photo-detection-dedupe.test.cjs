const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const ctx={S:{tableL:10,tableW:5,ballR:.03}};vm.createContext(ctx);
for(const name of ['pvDetectionStrength','pvSamePhysicalBall','pvMergeDuplicateEvidence','pvNmsCandidates']){
 const at=html.indexOf('    function '+name+'('),tail=html.slice(at),end=tail.slice(10).search(/\n    (?:async )?function /);
 vm.runInContext(end<0?tail:tail.slice(0,end+10),ctx);
}

// Distinct rotation views of the same ball have IoU below .42, but their centers
// still fall inside the physical-ball duplicate radius. They must not spend the
// 24-candidate quota before a weaker, separate ball is considered.
const repeated=Array.from({length:24},(_,i)=>{
 const cx=100,cy=100,half=10*Math.pow(1.6,i);
 return {x1:cx-half,y1:cy-half,x2:cx+half,y2:cy+half,nx:cx/1000000,ny:cy/1000000,detConfidence:.99-i*.001,confidence:0,detScores:[i/24]};
});
const distinct={x1:500000,y1:500000,x2:500020,y2:500020,nx:.51,ny:.51,detConfidence:.50,confidence:0,detScores:[.5]};
const result=ctx.pvNmsCandidates([...repeated,distinct],.42,24,.80);
assert.equal(result.items.length,2,'quota retains two distinct physical balls');
assert.equal(result.merged,23,'all surviving rotation duplicates merge into their physical ball');
assert(result.items.includes(distinct),'lower-ranked distinct ball survives duplicate crowding');
assert.equal(result.items[0].duplicateViews,23,'duplicate evidence count remains available');

// The old NMS-only cap reproduces the failure: 24 repeated views consume every slot.
const capped=ctx.pvNmsCandidates([...repeated,distinct],.42,24,null);
assert.equal(capped.items.length,24);
assert(!capped.items.includes(distinct),'control confirms the synthetic case exercises the former cap failure');

// A physical duplicate that survives IoU NMS must still suppress later boxes.
// Keep its raw box in the NMS history even though its evidence merges into another.
const anchor={x1:0,y1:0,x2:20,y2:20,nx:.01,ny:.01,detConfidence:.9,confidence:0};
const duplicate={x1:-11,y1:-20,x2:49,y2:40,nx:.019,ny:.01,detConfidence:.8,confidence:0};
const overlapsDuplicate={x1:10,y1:-20,x2:70,y2:40,nx:.04,ny:.01,detConfidence:.7,confidence:0};
const ordering=ctx.pvNmsCandidates([anchor,duplicate,overlapsDuplicate],.42,24,.80);
assert.equal(ordering.items.length,1,'a merged-away raw box continues to suppress later IoU overlaps');
assert.equal(ordering.merged,1);
console.log('Physical duplicate collapse happens before the 24-distinct-ball NMS quota; lower-ranked unique candidate survives.');
