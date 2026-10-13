const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const files=require('../trainer-layout-files.js'),data=JSON.parse(fs.readFileSync('guide/practice-layouts.json'));
assert.equal(Object.keys(data.layouts).length,29);assert.equal(Object.keys(data.topics).length,85);
for(const [id,entry] of Object.entries(data.layouts)){
 const raw=JSON.parse(fs.readFileSync(entry.url)),p=files.parse(JSON.stringify(raw));assert.equal(p.kind,'layout');assert.ok(p.layout.balls.find(b=>b.id===0));
 const physical=p.layout.balls.filter(b=>!b.marker);for(const b of physical){assert.ok(b.x>=p.layout.ballR&&b.x<=p.layout.tableL-p.layout.ballR);assert.ok(b.y>=p.layout.ballR&&b.y<=p.layout.tableW-p.layout.ballR);}
 for(let i=0;i<physical.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(physical[i].x-physical[j].x,physical[i].y-physical[j].y)>=2*p.layout.ballR-1e-7,'No overlapping balls in '+id);
 const roundtrip=files.parse(JSON.stringify(files.create(p.layout)));assert.deepEqual(roundtrip.layout.balls,p.layout.balls);
}
const eight=JSON.parse(fs.readFileSync(data.layouts['rack-8ball'].url)).layout.balls;assert.equal(eight[5].id,8);assert.ok((eight.at(-5).id<=7)!==(eight.at(-1).id<=7),'8-ball rear corners contain one solid and one stripe');
const exact=JSON.parse(fs.readFileSync('guide/Practice-Drill-Layouts.json')).drills;
for(const d of exact){const p=files.parse(fs.readFileSync(data.layouts[d.id].url,'utf8'));for(const [name,xy] of Object.entries(d.balls)){const b=p.layout.balls.find(b=>b.id===(name==='Cue'?0:Number(name)));assert.ok(Math.abs(b.x/p.layout.tableL*8-xy[1])<1e-8&&Math.abs(b.y/p.layout.tableW*4-xy[0])<1e-8,'Narrated coordinates match '+d.id);}}
const pacing=JSON.parse(fs.readFileSync('guide/AUDIO_PACING.json'));assert.equal(pacing.files.length,10);for(const f of pacing.files)assert.ok(Math.abs(f.after_wpm-pacing.target_wpm)<1,'Pacing matches reference '+f.file);
console.log('29 native setup files, 85 mappings, exact drill coordinates, ball spacing, round-trips and ten pacing corrections passed.');
