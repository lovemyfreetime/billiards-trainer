'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const knowledge=require('../companion-dev/app-knowledge.cjs');
const coaching=require('../companion-dev/coaching.cjs');
const position=require('../companion-dev/position-play.cjs');
test('every coaching request has bounded decision guidance and retrieval access without evaluation answers',()=>{
 assert(coaching.includes(position.instruction));
 assert.match(position.instruction,/trainer.app_help/);
 assert(position.instruction.length<4000);
 const rubric=require('./fixtures/position-play-review.json');
 for(const c of rubric)assert(!coaching.includes(c.prompt),'Held-out prompt leaked into runtime');
});
test('source-specific exceptions are retrievable while ordinary control help remains available',()=>{
 for(const [query,id]of [['low-not-draw','low-not-draw'],['last pocket','last-pocket-rule'],['reverse spin','reverse-control'],['delayed-problem','delayed-problem'],['key-not-nearest','key-not-nearest'],['rail-first-hanger','rail-first-hanger']]){
  const result=knowledge.help(query).find(x=>x.id==='position-coaching-'+id);
  assert(result,'Missing relevant card: '+query);assert.equal(result.actionable,false);assert.equal(result.category,'position-coaching');assert(result.sourcePages.length);assert.match(result.text,/Exceptions:/);
 }
 assert(knowledge.help('cue elevation').some(x=>x.id==='cue-elevation-control-quick'));
 assert(knowledge.help('marker rotation').some(x=>x.id==='marker-rotation-quick'));
});
test('page audit is complete and source attributions distinguish safeguards and diagram inference',()=>{
 const audit=require('../docs/position-play-page-review.json');
 assert.equal(audit.entries.length,377);assert.deepEqual(audit.entries.map(x=>x.page),Array.from({length:377},(_,i)=>i+1));
 const ids=new Set(position.principles.map(x=>x.id));assert.equal(ids.size,position.principles.length);
 for(const p of position.principles){assert(p.apply&&p.exceptions&&p.check);if(p.group==='Application safeguards')assert.equal(p.sourcePages.length,0);else assert(p.sourcePages.length);for(const n of p.sourcePages)assert(n>=1&&n<=377);}
 for(const row of audit.entries)for(const id of row.principles)assert(ids.has(id));
 assert.equal(audit.entries.filter(x=>x.kind==='pattern explanation').length,183);
 assert.equal(position.principles.find(x=>x.id==='dual-ball-control').origin,'diagram-supported inference');
});
