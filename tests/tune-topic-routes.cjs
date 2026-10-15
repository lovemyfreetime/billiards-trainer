// Reproducible tuning for authored routes against the native cushion model.
const {chromium}=require('playwright'),fs=require('node:fs'),cp=require('node:child_process');
const server=cp.spawn('python',['-u','-m','http.server','8766','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',()=>{});
(async()=>{await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{const page=await browser.newPage();await page.goto('http://127.0.0.1:8766');await page.waitForFunction(()=>window.billiardsLessonPractice);const scenes=JSON.parse(fs.readFileSync('guide/topic-scenes.json')).topics,results={};
for(const s of Object.values(scenes).filter(s=>s.railContacts?.length)){
 results[s.id]=await page.evaluate(s=>{const b=billiardsTourBridge;b.loadLesson(s);const balls=s.file.layout.balls,cb=balls.find(b=>b.id===0),ob=balls.find(b=>b.id===s.file.lesson.target),bank=s.profile==='bank',n=s.railContacts.length,L=s.file.layout.tableL,W=s.file.layout.tableW,R=s.file.layout.ballR;
 const origin=bank?ob:cb,base=Math.atan2(s.railContacts[0].y-origin.y,s.railContacts[0].x-origin.x),goal=bank?{x:s.setup.pocket[0]*L,y:s.setup.pocket[1]*W}:ob;
 let best=null;
 function test(angle,speed){let a=base+angle*Math.PI/180,v={x:Math.cos(a),y:Math.sin(a)},aim=bank?{x:ob.x-2*R*v.x,y:ob.y-2*R*v.y}:{x:cb.x+v.x,y:cb.y+v.y},cue=bank?{x:aim.x-.32*v.x,y:aim.y-.32*v.y}:null;
 if(cue&&(cue.x<R||cue.x>L-R||cue.y<R||cue.y>W-R))return;
 const p=b.predict({aim,speed,cue}),moving=bank?ob.id:0,events=(p.railEvents||[]).filter(e=>e.id===moving),cutoff=events[n-1]?.t;
 const before=events.filter(e=>!p.firstBallContact||e.t<=p.firstBallContact.t).length;
 let d=5;if(cutoff!==undefined){const pts=p.paths[moving].filter(q=>q.t>=cutoff);d=Math.min(5,...pts.map(q=>Math.hypot(q.x-goal.x,q.y-goal.y)));}
 const success=bank?p.pocketed.includes(ob.id)&&events.length>=n:p.firstBallContact?.objId===ob.id&&before>=n;
 let score=success?-10+(events.length-n)*.1+speed*.001:d+Math.max(0,n-events.length)*2;
 if(!bank&&p.firstBallContact&&before<n)score+=3;
 if(!best||score<best.score)best={score,angle,speed,aim,...(cue?{cue}:{}),success,rails:events.map(e=>({rail:e.rail,x:e.x,y:e.y,t:e.t})),target:ob.id,first:p.firstBallContact?.objId,pocketed:p.pocketed};
 }
 for(let a=-10;a<=10;a+=1)for(const v of [2.6,3.6,4.6,5.6])test(a,v);
 let c={...best};for(let a=c.angle-1;a<=c.angle+1;a+=.1)for(const v of [c.speed-.4,c.speed,c.speed+.4])test(a,v);
 return {...best,sourceCue:{x:cb.x,y:cb.y},sourceAim:s.file.layout.freeAim};},s);console.log(s.id,JSON.stringify({success:results[s.id].success,angle:results[s.id].angle,speed:results[s.id].speed,first:results[s.id].first,rails:results[s.id].rails.length}));fs.writeFileSync('guide/topic-route-controls.json',JSON.stringify(results,null,2)+'\n');}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
