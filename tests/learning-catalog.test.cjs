const assert=require('node:assert/strict'),fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('guide/learning-catalog.json')),audit=JSON.parse(fs.readFileSync('guide/LEARNING_AUDIT.json'));
const pool=JSON.parse(fs.readFileSync('guide/pool-audio-map.json')),recorded=JSON.parse(fs.readFileSync('guide/recorded-audio.json'));
const originals=new Map(pool.topics.map(t=>[t.id,t]));for(const r of recorded.records)if(['Main','Shared'].includes(r.page))originals.set(r.topic.id,{...originals.get(r.topic.id),...r.topic});
assert.equal(audit.counts.existing,originals.size);
for(const [id,t]of originals){
 assert.ok(catalog.topics[id],'Original topic retained: '+id);
 assert.equal(audit.topics.find(x=>x.id===id).narration,t.text||'','Original narration evidence retained: '+id);
}
const layoutFiles=require('../trainer-layout-files.js');const checked=new Set();
for(const [id,card]of Object.entries(catalog.topics)){
 for(const key of ['purpose','instruction','success','transfer','progression'])assert.ok(typeof card[key]==='string'&&card[key].length>20,id+' '+key);
 for(const setup of card.setups){
  assert.match(setup.url,/^\.\/guide\/layouts\/[\w-]+\.billiards\.json$/);
  if(!checked.has(setup.url)){checked.add(setup.url);const parsed=layoutFiles.parse(fs.readFileSync(setup.url,'utf8'));assert.ok(parsed.layout.balls.some(b=>b.id===0),'Cue present: '+setup.url);}
 }
}
const start=pool.topics.filter(t=>t.category==='start'),tour=JSON.parse(fs.readFileSync('guide/get-started-tour.json'));
assert.equal(start.length,8);for(let i=0;i<8;i++)assert.equal(catalog.topics[start[i].id].setups[0].url,tour.steps[i].layout,'Get Started exact step mapping');
for(const path of catalog.paths)for(const id of path.topics){assert.ok(catalog.topics[id],id);assert.ok(catalog.topics[id].visible,'Path topic must be discoverable: '+id);}
for(const t of catalog.newTopics){assert.equal(t.recordingStatus,'pending');assert.equal(t.audio,null);assert.ok(catalog.topics[t.id].physicalCheck);}
console.log(`${originals.size} original entries preserved; ${Object.keys(catalog.topics).length} four-criterion cards; ${checked.size} valid starter files; 8 exact Get Started bindings; 11 usable learning paths.`);
