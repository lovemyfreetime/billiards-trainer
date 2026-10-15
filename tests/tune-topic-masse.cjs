/* Author massé starters from native free-flight paths, then verify the blocker escape. */
const {chromium}=require('playwright'),fs=require('node:fs'),cp=require('node:child_process');
const server=cp.spawn('python',['-u','-m','http.server','8773','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',()=>{});
(async()=>{await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{const p=await browser.newPage();await p.goto('http://127.0.0.1:8773');await p.waitForFunction(()=>window.billiardsPoolGuide);const scenes=Object.values(JSON.parse(fs.readFileSync('guide/topic-scenes.json')).topics).filter(s=>s.profile==='masse'),results=fs.existsSync('guide/topic-masse-scenes.json')?JSON.parse(fs.readFileSync('guide/topic-masse-scenes.json')):{};
for(let index=0;index<scenes.length;index++){
 const scene=scenes[index];if(results[scene.id]?.proof)continue;results[scene.id]=await p.evaluate(({scene,index})=>{
  const b=billiardsTourBridge;b.loadLesson(scene);const base=b.capture(),R=base.state.ballR,L=base.state.tableL,W=base.state.tableW,physical=scene.file.layout.balls.filter(b=>!b.marker&&b.id!==0),target=scene.file.lesson.target,blocker=physical.find(b=>b.id!==target).id;
  const orientations=[{x:.32,y:.55,a:-32,side:1},{x:2.18,y:.38,a:212,side:-1},{x:.4,y:.37,a:-15,side:1},{x:2.14,y:.85,a:148,side:1},{x:.3,y:.85,a:32,side:-1}];const o=orientations[index];
  const order=a=>a.slice(index%a.length).concat(a.slice(0,index%a.length));
  for(const elevation of order([55,60,50]))for(const speed of order([2.15,2.3,2.0,2.45]))for(const follow of order([-.9,-1,-.8]))for(const extra of [0,-12,12]){
   const q=JSON.parse(JSON.stringify(base)),angle=(o.a+extra)*Math.PI/180,cue={id:0,n:'CB',x:o.x,y:o.y,active:true},aim={x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)},controls={speed,follow,sideSpin:o.side*.7,cueElevationDeg:elevation,airbornePhysics:true,showPaths:true,showImpact:true};Object.assign(q.state,controls,{balls:[cue],freeAim:aim,shot2Enabled:false});b.restore(q);const free=b.predict();if(free.railEvents.length)continue;const path=free.paths[0];if(!path?.length)continue;
   let length=0;const cumulative=[0];for(let i=1;i<path.length;i++){length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);cumulative.push(length);}if(length<.7)continue;
   for(const fraction of order([.9,.98,.8])){
    const pi=cumulative.findIndex(d=>d>=length*fraction),end=path[pi];if(!end)continue;const before=path[Math.max(0,pi-2)],dx=end.x-before.x,dy=end.y-before.y,d=Math.hypot(dx,dy);if(!d)continue;const ob={id:target,n:String(target),x:end.x+dx/d*R,y:end.y+dy/d*R,active:true};if(ob.x<R+.1||ob.x>L-R-.1||ob.y<R+.1||ob.y>W-R-.1)continue;
    for(const f of order([.35,.45,.55,.65,.75])){
     const obstacle={id:blocker,n:String(blocker),x:cue.x+(ob.x-cue.x)*f,y:cue.y+(ob.y-cue.y)*f,active:true};if(Math.min(...path.slice(0,pi+1).map(v=>Math.hypot(v.x-obstacle.x,v.y-obstacle.y)))<R*2+.008)continue;
     q.state.balls=[cue,obstacle,ob];b.restore(q);const r=b.predict(),hit=r.firstBallContact;if(hit?.objId!==target||r.railEvents.length)continue;
     const prior=r.paths[0].filter(v=>v.t<=hit.t),vx=hit.cuePos.x-cue.x,vy=hit.cuePos.y-cue.y,straight=Math.hypot(vx,vy);const bow=Math.max(...prior.map(v=>Math.abs((v.x-cue.x)*vy-(v.y-cue.y)*vx)/straight));const clearance=Math.min(...prior.map(v=>Math.hypot(v.x-obstacle.x,v.y-obstacle.y)))-2*R;
     if(bow<.065||clearance<.006)continue;
     return {balls:[cue,obstacle,ob],aim,controls,target,blocker,proof:{bowMetres:bow,blockerClearanceMetres:clearance,railContacts:0,firstContact:target,contactSeconds:hit.t}};
    }
   }
  }
  return {error:'No native curved blocker escape found'};
 },{scene,index});
 console.log(scene.id,JSON.stringify(results[scene.id].proof||results[scene.id]));if(results[scene.id].error)throw Error(scene.id);fs.writeFileSync('guide/topic-masse-scenes.json',JSON.stringify(results,null,2)+'\n');
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
