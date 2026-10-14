const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../photo-calibration.js');
const landscape=[{x:100,y:100},{x:900,y:100},{x:900,y:450},{x:100,y:450}];
const portrait=[{x:100,y:100},{x:450,y:100},{x:450,y:900},{x:100,y:900}];
assert.deepEqual(C.orderDetectedCorners(landscape),landscape);
assert.deepEqual(C.orderDetectedCorners(portrait),[portrait[1],portrait[2],portrait[3],portrait[0]]);
for(const quad of [landscape,portrait]){
 const ordered=C.orderDetectedCorners(quad),fit=C.fit(C.anchors(C.region('full',8)),ordered);assert.ok(fit);
 const head=C.apply(fit.H,{x:0,y:.5}),foot=C.apply(fit.H,{x:1,y:.5});
 assert.ok(Math.hypot(head.x-foot.x,head.y-foot.y)>700,'Head-to-foot follows the long dimension');
 assert.ok(C.validQuad(ordered));
}
const html=fs.readFileSync('index.html','utf8');const ids=['photoChooseImage','photoFindCorners','photoResetCorners','photoFineTune','photoAutoRailsBtn'];for(let i=1;i<ids.length;i++)assert.ok(html.indexOf('id="'+ids[i]+'"')>html.indexOf('id="'+ids[i-1]+'"'));
assert.ok(!html.includes('>Auto Corners<')&&!html.includes('>Fine-Tune Corner<'));
assert.ok(html.includes('Custom Table Layouts')&&html.includes('Corner Sensing'));
const records=JSON.parse(fs.readFileSync('guide/recorded-audio.json')).records;const walkthrough=records.find(r=>r.topic.id==='analyze-corner-setup-walkthrough').topic;
assert.ok(walkthrough.text.includes('portrait and landscape')&&walkthrough.text.includes('first two points follow a long rail'));
assert.ok(records.find(r=>r.topic.id==='analyze-find-add-corners').targets.includes('#photoFindCorners'));
console.log('Portrait/landscape corner order, long-axis mapping, requested button order and matching narration verified.');
