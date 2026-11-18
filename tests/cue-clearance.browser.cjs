const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const out='test-results/cue-clearance';fs.mkdirSync(out,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8842']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile]of [[1600,1000,false],[844,390,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block'});await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const setup=async(x,y,follow=0,elevation=3)=>page.evaluate(({x,y,follow,elevation})=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{tableL:2.54,tableW:1.27,shot2Enabled:false,activeShot:1,speed:.8,follow,sideSpin:0,cueElevationDeg:elevation,airbornePhysics:false,showCueStick:true,showPaths:true,freeAim:{x,y:y+.8},balls:[{id:0,n:'CB',x,y,active:true}]});billiardsTourBridge.restore(s);return billiardsCueSetup.state().cue;},{x,y,follow,elevation});
 try{
 await page.goto('http://127.0.0.1:8842/?train=1');await page.waitForFunction(()=>window.billiardsCueSetup&&window.billiardsMenuReady);
 const middle=await setup(.65,.635);assert.equal(middle.elevation,3);assert(!middle.blocked);
 const prediction=await page.evaluate(()=>billiardsTourBridge.predict({paths:true}));
 await page.evaluate(()=>billiardsCueSetup.set({style:'long',hold:3}));assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),prediction,'Presentation preferences do not change an unchanged impact');await page.evaluate(()=>billiardsCueSetup.set({style:'auto',hold:2}));
 const rail=await setup(.65,.08);assert(rail.elevation>3&&!rail.blocked);const railPrediction=await page.evaluate(()=>billiardsTourBridge.predict({paths:true}));assert.equal(railPrediction.cueImpact.elevation,rail.elevation);assert.deepEqual(railPrediction.cueImpact.contact,[rail.x-rail.R*rail.dy*rail.sideR+rail.R*rail.dx*rail.rear,rail.z+rail.R*rail.height,rail.y+rail.R*(rail.dy*rail.rear+rail.dx*rail.sideR)]);assert.equal(await page.locator('#cueElevation').isDisabled(),false);assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.airbornePhysics),false,'No Jump/Massé selection required');
 const originalContact=await page.evaluate(()=>{const s=billiardsTourBridge.capture().state,a=s.cueElevationDeg*Math.PI/180,b=s.balls[0];return [b.x,b.y-s.ballR*Math.cos(a),s.ballR+s.ballR*Math.sin(a)];});assert(Math.abs(originalContact[0]-rail.x)<1e-12);assert(Math.abs(originalContact[1]-(rail.y+rail.R*rail.rear))<1e-12);
 await page.evaluate(()=>Billiards3D.enable());await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.cueModel()?.referenceReady);await page.evaluate(()=>Billiards3D.playerView({height:.12,locked:true}));await settle();
 const before=await page.evaluate(()=>({pose:Billiards3D.cueModel(),camera:Billiards3D.camera(),tips:Billiards3D.contactMarkers()}));assert.equal(before.pose.elevation,rail.elevation);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),railPrediction,'2D and 3D views use identical effective impact physics');const mark=before.tips.find(t=>t.id===0);assert(mark.normal.every((v,i)=>Math.abs(mark.center[i]+v*rail.R+(i===0?1.27:i===2?.635:0)-before.pose.contact[i])<1e-8));await page.screenshot({path:out+'/'+name+'-rail.png'});
 const stable=await page.evaluate(async()=>{const n=BilliardsCueClearance.diagnostics().solves;for(let i=0;i<12;i++)Billiards3D.refresh();return {before:n,after:BilliardsCueClearance.diagnostics().solves};});assert.equal(stable.after,stable.before,'Camera redraw never recomputes clearance');
 const pocket=await setup(1.27,.08);assert(pocket.elevation<rail.elevation);await settle();await page.screenshot({path:out+'/'+name+'-pocket.png'});
 const drawAtRail=await setup(.65,.04,-1);
 assert(!drawAtRail.blocked && drawAtRail.contactLimited && drawAtRail.elevation>3);
 await settle();
 assert.equal(await page.locator('#elevNumber').inputValue(),drawAtRail.elevation.toFixed(1));
 assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.airbornePhysics),false);
 const preferred=await page.evaluate(()=>{
  const speed=document.getElementById('speed');speed.value=1.1;speed.dispatchEvent(new Event('input',{bubbles:true}));
  return billiardsTourBridge.capture().state.cueElevationDeg;
 });
 assert.equal(preferred,3,'Editing speed keeps the automatic angle free to fall again');
 await settle();
 const rendered=await page.evaluate(()=>Billiards3D.cueModel());
 assert(rendered.visible);
 const railDrawImpact=await page.evaluate(()=>billiardsTourBridge.predict().cueImpact);
 assert.deepEqual(rendered.contact,railDrawImpact.contact);
 await page.locator('#phoneActions>[data-trainer-action=animate]').evaluate(e=>e.click());
 assert(await page.evaluate(()=>billiardsPlayback.state().running));
 await page.evaluate(()=>billiardsPlayback.stop());
 const full=page.locator('#table3DFullView'),cueToggle=page.locator('#table3DCueView');
 await full.click();await settle();assert.equal(await page.evaluate(()=>Billiards3D.camera().playerView),false);
 let fitted;
 for(const [heading,side] of [[1.27,1],[2.1,-1]]){
  await page.evaluate(a=>Billiards3D.restoreCamera({...Billiards3D.camera(),azimuth:a}),heading);
  await full.click();await settle();
  fitted=await page.evaluate(()=>Billiards3D.camera());
  assert.equal(fitted.azimuth,side===1?0:Math.PI);
  const bounds=await page.evaluate(()=>{
   const {tableL:L,tableW:W}=billiardsTourBridge.capture().state,rail=BilliardsTableConstruction.railWidth;
   const r=document.getElementById('table3DCanvas').getBoundingClientRect();
   const points=[-rail,L+rail].flatMap(x=>[-rail,W+rail].map(y=>Billiards3D.project({x,y},.044)));
   return {points:points.map(p=>[(p.x-r.left)/r.width,(p.y-r.top)/r.height])};
  });
  const points=bounds.points;
  assert(points.every(([x,y])=>x>=0&&x<=1&&y>=0&&y<=1),'All outer rail corners visible');
  assert(Math.abs(points[0][1]-points[2][1])<1e-6 && (points[2][0]-points[0][0])*side>0,'Horizontal long rail with the expected head and foot order');
  await full.click();await settle();assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),fitted);
  await page.screenshot({path:out+'/'+name+'-full-'+(side===1?'head-left':'head-right')+'.png'});
 }
 await cueToggle.click();await settle();assert.equal(await cueToggle.getAttribute('aria-pressed'),'true');
 assert(await page.evaluate(()=>Billiards3D.camera().playerViewLock));
 await page.locator('#playerViewRaised').evaluate(el=>el.click());await settle();
 assert.equal(await page.evaluate(()=>Billiards3D.camera().playerEyeHeight),.28);
 await page.locator('#playerViewLow').evaluate(el=>el.click());await settle();
 await cueToggle.click();await settle();const returned=await page.evaluate(()=>Billiards3D.camera());
 assert(!returned.playerView && returned.azimuth===fitted.azimuth && returned.radius===fitted.radius);
 await cueToggle.click();await settle();
 await setup(.65,.635);await settle();const camera=await page.evaluate(()=>Billiards3D.camera());
 await page.evaluate(()=>{window.__finishCaught=false;const observe=()=>{const m=Billiards3D.cueModel();if(m?.phase==='finish'&&billiardsPlayback.state().visualTime>.25){window.removeEventListener('billiards:3d-render',observe);billiardsPlayback.pause();window.__finishCaught=true;}};window.addEventListener('billiards:3d-render',observe);});await page.locator('#phoneActions>[data-trainer-action=animate]').click();await page.waitForFunction(()=>window.__finishCaught);await settle();
 const held=await page.evaluate(()=>({p:Billiards3D.cueModel(),c:Billiards3D.camera(),clock:billiardsPlayback.state()}));assert(held.p.visible);assert.equal(held.p.phase,'finish');assert.equal(held.clock.stroke.finishHold,2);assert.deepEqual(held.c.target,camera.target,'Player head stays down');await page.screenshot({path:out+'/'+name+'-finish.png'});await page.evaluate(()=>billiardsPlayback.stop());
 // Real draw simulation, followed by a swept-path withdrawal plan.
 const draw=await page.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{speed:1.6,follow:-.85,sideSpin:0,cueElevationDeg:3,airbornePhysics:false,freeAim:{x:1.5,y:.635},balls:[{id:0,n:'CB',x:.65,y:.635,active:true},{id:1,n:'1',x:.75,y:.635,active:true}]});billiardsTourBridge.restore(s);return billiardsCueSetup.state().cue;});assert(!draw.blocked);
 await page.evaluate(()=>{document.getElementById('animate').click();billiardsPlayback.pause();});await settle();const returning=await page.evaluate(()=>billiardsPlayback.state().stroke);if(!returning.returnClearance)console.log('Draw path evidence',await page.evaluate(()=>billiardsTourBridge.predict({paths:true})));assert(returning.returnClearance,'Actual fast close draw path retracts held cue');assert(returning.hideAt<returning.conflictAt);await page.evaluate(()=>billiardsPlayback.stop());
 // Fixed 30 fps recording clock must include the hold without extending physics.
 await setup(.65,.635);await page.evaluate(()=>{window.__record=[];const begin=BilliardsShotRecorder.begin;BilliardsShotRecorder.begin=()=>({ready:()=>true,frame(){Billiards3D.renderSnapshot();const s=billiardsPlayback.state();__record.push({visual:s.visualTime,ball:s.time,phase:Billiards3D.cueModel()?.phase});if(s.visualTime>.45)billiardsPlayback.pause();},finish(){BilliardsShotRecorder.begin=begin;},cancel(){BilliardsShotRecorder.begin=begin;}});});await page.locator('#phoneActions>[data-trainer-action=animate]').click();await page.waitForFunction(()=>window.__record.some(f=>f.visual>.4));const recorded=await page.evaluate(()=>__record);assert(recorded.some(f=>f.visual<0&&f.ball===0));assert(recorded.some(f=>f.phase==='finish'));fs.writeFileSync(out+'/'+name+'-evidence.json',JSON.stringify({rail,pocket,drawAtRail,stable,returning,recorded},null,2));assert.deepEqual(errors,[]);console.log(name+': auto rail/pocket clearance, fixed tip marker, normal elevation access, blocked target, cached camera, held finish, real draw withdrawal and fixed recording frames passed');
 }catch(e){console.error('Failure state',await page.evaluate(()=>({cue:window.billiardsCueSetup?.state(),playback:window.billiardsPlayback?.state()})));await page.screenshot({path:out+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
