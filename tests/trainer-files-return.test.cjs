const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),F=require('../trainer-layout-files');
const layout={name:'Student runout',tableL:2.54,tableW:1.27,ballR:.028575,balls:[{id:0,x:.5,y:.5},{id:15,x:1,y:.8}],freeAim:{x:1.5,y:.5}};
const full=F.create(layout,{speed:2.2,pocketedLog:[4],preview:{frames:Array(5).fill(1)},shot2:{preview:{frames:[1]}}},[{balls:layout.balls}]);
assert.equal(full.state.preview,null);assert.equal(full.state.shot2.preview,null);assert.deepEqual(F.parse(JSON.stringify(full)).layout.balls.map(b=>b.id),[0,15]);
const withoutCue={...layout,balls:layout.balls.slice(1)};assert.ok(F.parse(JSON.stringify(F.create(withoutCue))).layout.allowMissingCueBall);
for(const bad of [{...layout,balls:[...layout.balls,layout.balls[0]]},{...layout,tableL:0},{...layout,balls:[{id:99,x:1,y:1}]},{...layout,balls:[{id:1,x:'NaN',y:1}]}])assert.throws(()=>F.parse(JSON.stringify(bad)));
assert.throws(()=>F.parse('{"format":"other","layout":{}}'));
assert.equal(F.settings({speed:'broken',shot2:null},{speed:2,shot2:{x:1}}).speed,2);assert.deepEqual(F.settings({shot2:null},{shot2:{x:1}}).shot2,{x:1});
assert.equal(F.settings({mode:'kick'},{mode:null}).mode,'kick');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf('\n    function ',start+10));}
const S={tableL:2.54,tableW:1.27,ballR:.028575,balls:[{id:0,x:.5,y:.5}],pocketedLog:[15]},env={S,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),logicalPockets:()=>[{x:0,y:0},{x:1.27,y:0},{x:2.54,y:0},{x:0,y:1.27},{x:1.27,y:1.27},{x:2.54,y:1.27}],onPlayingSurface:q=>q.x>0&&q.y>0&&q.x<S.tableL&&q.y<S.tableW,manualPocketAt:q=>q.x<.1&&q.y<.1,toast(){},normalizeBallSet(){},updateUI(){},refreshPreview(){},saveState(){},syncProjector(){}};vm.createContext(env);
for(const fn of ['keepCueOnTable','returnPocketBall'])vm.runInContext(source(fn),env);
const safe=env.keepCueOnTable({x:0,y:0});assert.ok(safe.x>.06&&safe.y>.06);env.returnPocketBall(15,{x:0,y:0});assert.equal(S.balls.length,1);assert.equal(S.pocketedLog.length,1);
env.returnPocketBall(15,{x:1.1,y:.8});assert.equal(S.balls.length,2);assert.equal(S.balls[1].x,1.1);assert.equal(S.pocketedLog.length,0);env.returnPocketBall(15,{x:1.2,y:.8});assert.equal(S.balls.length,2);
assert.ok(html.includes('if (pocket && ball && ball.id>=1 && ball.id<=15)'));
assert.ok(!html.includes('<script src="./guide/explore-inspector-dev'));
console.log('Portable layout/session round trips; invalid imports rejected; cue corners stay on cloth; pocket returns preserve drop position and reject invalid/duplicate placements.');
