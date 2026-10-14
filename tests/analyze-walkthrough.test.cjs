const assert=require('node:assert/strict'),{createMachine,steps}=require('../guide/analyze-walkthrough.js');
const s={imageReady:false,imageVersion:0,loadedTableFile:null,cornersValid:false,busy:false,analysisRevision:0,reviewReady:false};
const m=createMachine();m.start(s);assert.equal(m.state().id,'choose');m.next(s);assert.equal(m.state().id,'choose','Next cannot bypass missing image');
m.request(s);assert.equal(m.state().id,'picker');m.update(s);assert.equal(m.state().id,'picker');s.imageVersion=1;m.update(s);assert.equal(m.state().id,'picker','version change alone is not loaded');s.imageReady=true;m.update(s);assert.equal(m.state().id,'find');m.next(s);assert.equal(m.state().id,'find','must mark a usable outline');m.update(s,'find');assert.equal(m.state().id,'corners');m.next(s);assert.equal(m.state().id,'corners');s.cornersValid=true;m.update(s);assert.equal(m.state().id,'orientation');
m.back(s);m.update(s);assert.equal(m.state().id,'corners','Back stays available for reviewing completed corners');m.next(s);assert.equal(m.state().id,'orientation');m.next(s);assert.equal(m.state().id,'rack');m.update(s);assert.equal(m.state().id,'rack','rack Auto needs explicit confirmation');m.next(s);assert.equal(m.state().id,'analyze');m.update(s);m.next(s);assert.equal(m.state().id,'analyze','analysis completion cannot be inferred from button click');s.busy=true;s.analysisRevision=1;m.update(s);assert.equal(m.state().id,'analyze');s.busy=false;m.update(s);assert.equal(m.state().id,'review');m.next(s);assert.equal(m.state().id,'review','review needs valid identities');s.reviewReady=true;m.next(s);assert.equal(m.state().id,'save');m.next(s);assert.equal(m.state().id,'apply');m.next(s);assert.equal(m.state().id,'apply');m.update(s,'applied');assert.equal(m.state().id,'complete');assert.equal(m.state().active,false);
// New images restart the pending load; table files skip image calibration.
m.start(s);m.next(s);assert.equal(m.state().id,'find');s.imageVersion++;s.imageReady=false;m.update(s);assert.equal(m.state().id,'picker');s.imageReady=true;m.update(s);assert.equal(m.state().id,'find');s.loadedTableFile={name:'Saved drill'};m.update(s);assert.equal(m.state().id,'review');
m.next(s);m.next(s);s.reviewReady=false;m.update(s);assert.equal(m.state().id,'review','changed identities invalidate Apply step');m.stop();m.update(s,'applied');assert.equal(m.state().id,'review','stopped walkthrough ignores later actions');
assert.equal(new Set(steps.map(s=>s.id)).size,11);console.log('Walkthrough transitions passed: real load, valid corners, explicit choices, analysis completion, review, save skip and successful Apply.');
const {instructionFor}=require('../guide/analyze-walkthrough');
assert.equal(instructionFor({imageError:'failed'},'picker',steps[1]).id,'image-error');
assert.equal(instructionFor({analysisError:'failed'},'analyze',steps[6]).id,'analysis-error');
assert.equal(instructionFor({detectionCount:0},'review',steps[7]).id,'no-balls');
assert.equal(instructionFor({detectionCount:1},'review',steps[7]).recovery,false);
m.start(s);m.recover('corners',s);m.update(s);assert.equal(m.state().id,'corners');
m.recover('retry',s);m.update(s);assert.equal(m.state().id,'analyze');
m.recover('image',s);assert.equal(m.state().id,'picker');
console.log('Recovery states wait for genuine load/analysis and keep corner adjustment available.');
