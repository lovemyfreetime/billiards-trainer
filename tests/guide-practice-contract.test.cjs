const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p)),pool=read('guide/pool-audio-map.json'),scenes=read('guide/topic-scenes.json').topics,cues=read('guide/narration-cues.json');
const ids=Object.values(pool.curriculum).flatMap(groups=>groups.flatMap(g=>g.topics));
const geometries=new Set();
for(const id of ids){
 const scene=scenes[id];assert(scene,`Missing practice scene: ${id}`);assert.equal(scene.id,id);
 const file=read(scene.setup.url);assert.deepEqual(file,scene.file,`Download and live scene differ: ${id}`);
 const geometry=JSON.stringify(scene.file.layout.balls.map(b=>[b.x.toFixed(6),b.y.toFixed(6),!!b.marker,b.markerShape||'',b.markerDiameterIn||0]).sort());
 assert(!geometries.has(geometry),`Reused physical arrangement: ${id}`);geometries.add(geometry);
}
const topics=new Map(pool.topics.map(t=>[t.id,t]));
for(const r of read('guide/recorded-audio.json').records)if(['Main','Shared'].includes(r.page))topics.set(r.topic.id,{...topics.get(r.topic.id),...r.topic});
for(const id of ids){
 const t=topics.get(id),files=Array.isArray(t.audio)?t.audio:[t.audio];
 for(const url of files){
  const path=url.split('?')[0],name=path.split('/').pop(),track=cues.tracks[name];assert(track,`Missing visual cue track: ${id}`);
  assert.equal(track.sha256,crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),`Cue timings belong to a different recording: ${name}`);
  assert(track.cues.length,`No visual references: ${id}`);
  for(const c of track.cues){assert(c.start>=0&&c.end>c.start&&c.end<=track.seconds+.1,`Invalid cue clock: ${name}`);assert(cues.bindings[c.target],`Unknown visual target: ${c.target}`);}
 }
}
assert.equal(read('guide/get-started-tour.json').transition.seconds,5);
assert.equal(read('guide/get-started-tour.json').transition.recordingStatus,'visual-only');
console.log(`${ids.length} selectable Guide lessons have distinct physical layouts and visual cues pinned to the current audio; silent practice wait is five seconds.`);
