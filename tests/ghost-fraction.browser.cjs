const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/ghost-fraction';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8834']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile]of [[2048,1280,false],[1366,768,false],[844,390,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 const capture=()=>page.evaluate(()=>billiardsTourBridge.capture());
 const predict=()=>page.evaluate(()=>billiardsTourBridge.predict({paths:true}));
 const guides=()=>page.evaluate(()=>Billiards3D.ghostGuides());
 const restore=async patch=>{await page.evaluate(p=>{const s=billiardsTourBridge.capture();Object.assign(s.state,p);billiardsTourBridge.restore(s);},patch);await settle();};
 const flag=async(id,value)=>{await page.evaluate(({id,value})=>{const e=document.getElementById(id);e.checked=value;e.dispatchEvent(new Event('change',{bubbles:true}));},{id,value});await settle();};
 const tray=async()=>{if(await page.locator('body').evaluate(e=>e.classList.contains('phone-tray-hidden')))await page.locator('#phoneTrayToggle').click();await settle();};
 async function alignment(label){await tray();const g=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect(),b7=rect(document.querySelector('#workspaceBalls [data-ball-id="7"]')),b8=rect(document.querySelector('#workspaceBalls [data-ball-id="8"]')),tip=rect(document.querySelector('#phoneActions .activeSpin .phoneTipControl:not([hidden])')),balls=document.querySelector('#workspaceBalls');return{mid:(b7.x+b7.width/2+b8.x+b8.width/2)/2,tip:tip.x+tip.width/2,range:balls.scrollWidth-balls.clientWidth,scroll:balls.scrollLeft,rect:rect(balls).toJSON()};});assert(Math.abs(g.mid-g.tip)<1.5,label+' 7/8 midpoint aligns with cue-tip badge: '+JSON.stringify(g));console.log(name+' '+label+' alignment '+JSON.stringify(g));}
 try{
 await page.goto('http://127.0.0.1:8834/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
 const labels=await page.locator('#featureCueOptions .check label').allTextContents();assert.deepEqual(labels.slice(1,4),['Ghost Ball + physical overlap band','Full Ghost Ball','Resting Cue Ball']);
 assert.equal((await capture()).state.showFullGhostBall,false);assert.equal((await capture()).state.showRestingCueBall,false);
 await page.evaluate(()=>{billiardsTourBridge.apply({id:'ghost',title:'Ghost check',balls:[[0,.22,.4],[1,.52,.4]],target:1,pocket:[1,1],speed:1.3,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27});const draw=BilliardsShotBudget.drawContacts;BilliardsShotBudget.drawContacts=(ctx,cards)=>{window.__contactCards=cards;draw(ctx,cards);};});
 const saved=await capture(),R=saved.state.ballR,d=.3*saved.state.tableL,heading=Math.asin(R/d),cb=saved.state.balls.find(b=>b.id===0);
 await restore({freeAim:{x:cb.x+Math.cos(heading),y:cb.y+Math.sin(heading)}});
 await page.waitForFunction(()=>window.__contactCards?.some(c=>c.type==='overlap'));
 const baseline=await predict(),overlap=baseline.firstBallContact.overlap;
 assert(Math.abs(overlap-50)<.01,'Physical half-ball fixture');
 assert(await page.evaluate(()=>{
  const overlap=billiardsTourBridge.predict().firstBallContact.overlap;
  return __contactCards.some(c=>c.rows[0]?.text==='Overlap '+BilliardsShotBudget.formatOverlap(overlap)&&
   c.rows[1]?.text==='Ball hit '+BilliardsShotBudget.formatBallFraction(overlap));
 }),'Ball hit appears directly below Overlap in the cloth badge');
 await alignment('2d closed');await page.locator('#phoneControls').click();await settle();await alignment('2d drawer');
 await page.locator('#optionsSection>.sectionToggle').click();await page.locator('#menu-featureCueOptions>summary').click();
 await page.locator('#showFullGhostBall').check();await page.locator('#showRestingCueBall').check();
 assert.deepEqual(await predict(),baseline,'Both visual toggles leave shot paths and contacts identical');
 await page.locator('#phoneControls').click();await page.screenshot({path:dir+'/'+name+'-2d-fraction.png'});
 await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.renderedBalls().length>1);await settle();
 const expected=await predict(),rest=expected.finalBalls.find(b=>b.id===0),all=await guides();assert.equal(all.length,2);
 const hit=all.find(g=>g.kind==='contact'),resting=all.find(g=>g.kind==='rest');
 for(const [g,p]of [[hit,expected.firstBallContact.cuePos],[resting,rest]]){assert(Math.hypot(g.x-p.x,g.y-p.y)<1e-9);assert.equal(g.radius,R);assert(g.opacity>.1&&g.opacity<.2);assert(g.coreOpacity>.7&&g.coreOpacity<.9);assert.equal(g.coreColor,0xffffff);assert.equal(g.depthWrite,false);assert.deepEqual(g.coreVertical,[0,0,0,1]);}
 assert.deepEqual((await capture()).state.balls,saved.state.balls,'Ghosts never enter the physical ball set');
 await flag('showImpact',false);await flag('showPaths',false);assert.equal((await guides()).length,2,'New guides are independent of old ghost and trajectories');
 await flag('showFullGhostBall',false);assert.deepEqual((await guides()).map(g=>g.kind),['rest']);await flag('showFullGhostBall',true);await flag('showRestingCueBall',false);assert.deepEqual((await guides()).map(g=>g.kind),['contact']);
 await page.evaluate(()=>{const g=Billiards3D.ghostGuides()[0],s=billiardsTourBridge.capture().state;Billiards3D.restoreCamera({azimuth:-Math.PI/2,elevation:8*Math.PI/180,radius:.85,target:{x:g.x-s.tableL/2,y:s.ballR,z:g.y-s.tableW/2}});});await settle();
 await flag('showFullGhostBall',false);await page.screenshot({path:dir+'/'+name+'-low-off.png'});await flag('showFullGhostBall',true);await page.screenshot({path:dir+'/'+name+'-low-contact.png'});
 await flag('showRestingCueBall',true);
 await page.evaluate(()=>{const g=Billiards3D.ghostGuides().find(g=>g.kind==='rest'),s=billiardsTourBridge.capture().state;Billiards3D.restoreCamera({azimuth:.75,elevation:12*Math.PI/180,radius:.55,target:{x:g.x-s.tableL/2,y:s.ballR,z:g.y-s.tableW/2}});});await settle();await page.screenshot({path:dir+'/'+name+'-low-rest.png'});
 for(const azimuth of [0,Math.PI/2,Math.PI,Math.PI*1.5]){await page.evaluate(a=>Billiards3D.restoreCamera({...Billiards3D.camera(),azimuth:a}),azimuth);await settle();assert((await guides()).every(g=>JSON.stringify(g.coreVertical)==='[0,0,0,1]'),'Core stays world vertical through orbit');}
 await alignment('3d closed');await page.locator('#phoneControls').click();await settle();await alignment('3d drawer');await page.locator('#phoneControls').click();
 // A smaller visible viewport starts at the true midpoint and can still reach both ends.
 await page.evaluate(()=>{const e=document.querySelector('#workspaceBalls');e.scrollLeft=0;});await settle();
 if(await page.locator('.workspaceTrayScroll').last().isVisible()){await page.locator('.workspaceTrayScroll').last().click();await page.waitForFunction(()=>document.querySelector('#workspaceBalls').scrollLeft>0);}
 await restore({showCueVisuals1:false});assert.equal((await guides()).length,0);await restore({showCueVisuals1:true});
 // Scratch/miss fixture: no object hit and a pocketed cue ball cannot leave ghosts.
 await restore({balls:[{id:0,n:'CB',x:.6,y:.6,active:true}],freeAim:{x:0,y:0},speed:2,follow:0,sideSpin:0});
 const scratch=await predict();assert.equal(scratch.firstBallContact,null);assert.equal(scratch.finalBalls.find(b=>b.id===0).active,false);assert.equal((await guides()).length,0);
 await page.evaluate(s=>billiardsTourBridge.restore(s),saved);await restore({showFullGhostBall:true,showRestingCueBall:true});
 if(width===1366){
  const s=(await capture()).state,obj=s.balls.find(b=>b.id===1),x=.45,y=.75,dist=Math.hypot(obj.x-x,obj.y-y);
  await restore({shot2Enabled:true,shot2Initialized:true,activeShot:2,shot2:{...s.shot2,x,y,autoFollow:false,freeAim:{x:obj.x,y:obj.y},speed:1.1,follow:0,sideSpin:0,cueElevationDeg:0}});
  const second=await guides(),contact=second.find(g=>g.kind==='contact');assert(second.length&&second.every(g=>g.shot===2),'Active Shot 2 uses its own preview: '+JSON.stringify(second));
  assert(Math.hypot(contact.x-(obj.x-(obj.x-x)/dist*2*R),contact.y-(obj.y-(obj.y-y)/dist*2*R))<.00001,'Shot 2 ghost follows its physical contact position');
  await restore({shot2CueBallOnly:true});assert.equal((await guides()).length,0,'Cue-ball-only hides Shot 2 guides');
  await restore({activeShot:1,shot2Enabled:false,shot2CueBallOnly:false});assert((await guides()).every(g=>g.shot===1));
  await page.locator('#phoneActions>[data-trainer-action=animate]').click();await page.waitForFunction(()=>billiardsPlayback.state().running);await settle();assert.equal((await guides()).length,0,'Prediction ghosts disappear during the moving shot');
 }
 await page.reload();await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);assert.equal((await capture()).state.showFullGhostBall,true);assert.equal((await capture()).state.showRestingCueBall,true);
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/'+name+'-geometry.json',JSON.stringify({overlap,expected,all},null,2));console.log(name+': fraction overlay, unchanged prediction, independent ghosts, exact contact/rest placement, faint material, low views, orbit, scratch, persistence and tray alignment passed');
 }catch(e){await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
