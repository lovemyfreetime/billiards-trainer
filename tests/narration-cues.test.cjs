const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync('guide/narration-cues.json')),inventory=JSON.parse(fs.readFileSync('guide/GUIDE_MEDIA_INVENTORY.json'));
for(const t of inventory.topics.filter(t=>t.page==='Main'&&t.visible))for(const url of t.audio){const file=url.split('/').pop().split('?')[0];assert.ok(data.tracks[file],'Every selectable recording is inventoried: '+file);}
let count=0;
for(const [name,t] of Object.entries(data.tracks)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('guide/audio/'+name)).digest('hex'),t.sha256,'Cues match the published audio bytes: '+name);
 let end=0;for(const c of t.cues){assert.ok(data.bindings[c.target],c.target);assert.ok(c.start>=0&&c.start>=end&&c.end>c.start&&c.end<=t.seconds+.02,name+' ordered, bounded, non-overlapping cues');assert.ok(c.quote);end=c.end;count++;}
}
assert.ok(data.tracks['thirty-degree-rule-quick.mp3'].cues.some(c=>c.target==='rolling'));
assert.ok(data.tracks['practice-speed-control-quick.mp3'].cues.some(c=>c.target==='execute'));
assert.ok(data.tracks['practice-speed-control-quick.mp3'].cues.some(c=>c.target==='reset'));
const recent=JSON.parse(fs.readFileSync('guide/GUIDED_CUES_RECORDINGS.json'));for(const r of recent.items)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(r.audio)).digest('hex'),r.sha256);
console.log(`${Object.keys(data.tracks).length} audio-matched tracks, ${count} ordered cues, all selectable Main recordings and both new Chase exports passed.`);
