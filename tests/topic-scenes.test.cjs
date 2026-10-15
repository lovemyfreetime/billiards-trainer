const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),layout=require('../trainer-layout-files.js');
const manifest=JSON.parse(fs.readFileSync('guide/topic-scenes.json')),catalog=JSON.parse(fs.readFileSync('guide/learning-catalog.json')),seen=new Set();
assert.equal(manifest.count,141);
for(const [id,s]of Object.entries(manifest.topics)){
 const f=layout.parse(JSON.stringify(s.file));assert.deepEqual(JSON.parse(fs.readFileSync(s.setup.url)),s.file,id+' portable/inline match');
 const geo=s.file.history?.length>1?s.file.history[0]:f.layout;
 const key=JSON.stringify(geo.balls.map(b=>['id','x','y','marker','markerShape','markerWidthIn','markerHeightIn','markerAngle'].map(k=>b[k])));assert.ok(!seen.has(key),'Distinct actual geometry: '+id);seen.add(key);
 assert.equal(catalog.topics[id].setups[0].url,s.setup.url);assert.ok(s.objective&&s.variation);
 const physical=f.layout.balls.filter(b=>!b.marker);for(let i=0;i<physical.length;i++){const b=physical[i];assert.ok(b.x>=f.layout.ballR-1e-7&&b.x<=f.layout.tableL-f.layout.ballR+1e-7);assert.ok(b.y>=f.layout.ballR-1e-7&&b.y<=f.layout.tableW-f.layout.ballR+1e-7);for(const a of physical.slice(0,i))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=2*f.layout.ballR-1e-6,id+' separation');}
 if(id.startsWith('drill-'))assert.deepEqual(f.layout.balls,JSON.parse(fs.readFileSync('guide/layouts/'+id+'.billiards.json')).layout.balls,'Narrated coordinates retained: '+id);
}
const inventory=JSON.parse(fs.readFileSync('guide/GUIDE_MEDIA_INVENTORY.json')),queue=JSON.parse(fs.readFileSync('guide/NARRATION_REFINEMENT_QUEUE.json'));
assert.equal(inventory.topics.length,649);assert.equal(inventory.summary.mainWithAudio,136);assert.equal(queue.items.filter(x=>x.priority==='record').length,5);
for(const [file,entry]of Object.entries(inventory.files)){assert.equal(entry.exists,true);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),entry.sha256,'MP3 unchanged: '+file);}
assert.equal(new Set(inventory.topics.filter(x=>x.visible&&x.page==='Main').map(x=>x.geometryHash)).size,141);
for(const q of queue.items)assert.ok(q.ssml.includes('rate="+30%"')&&q.voice==='Speechify Chase (US)');
console.log('141 native, unique, bounded layouts; exact coordinate drills; 649-entry media inventory; 650 audio hashes; five missing Chase scripts passed.');
