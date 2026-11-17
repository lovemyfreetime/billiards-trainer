const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/player-cue';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8840']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile]of [[1600,1000,false],[844,390,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(18000);page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))),state=()=>page.evaluate(()=>billiardsTourBridge.capture().state),model=()=>page.evaluate(()=>Billiards3D.cueModel()),camera=()=>page.evaluate(()=>Billiards3D.camera());
 const menu=async open=>{if(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'))!==open)await page.locator('#phoneControls').click();await settle();};
 async function view(){if(!await page.locator('#workspace-picker').evaluate(e=>e.open))await page.locator('#workspace-picker>summary').click();if(!await page.locator('#workspace-view').evaluate(e=>e.open))await page.locator('#workspace-view>summary').click();}
 async function preset(id){await view();await page.locator('#'+id).click();await settle();}
 try{
 await page.goto('http://127.0.0.1:8840/?train=1');await page.waitForFunction(()=>window.BilliardsCue3D&&window.billiardsMenuReady&&window.billiardsTrainingBall);
 await page.evaluate(()=>billiardsTourBridge.apply({id:'player-cue',title:'Player eye view',balls:[[0,.30,.5],[1,.62,.46]],target:1,pocket:[1,0],speed:.45,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
 await preset('playerViewButton');await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.cueModel()?.referenceReady);assert((await model()).visible);assert.equal((await model()).length,58*.0254);assert.equal((await model()).elevation,3);
 const initial=await page.evaluate(()=>billiardsTourBridge.capture()),prediction=await page.evaluate(()=>billiardsTourBridge.predict({paths:true}));
 const low=await camera();assert(low.playerView&&low.playerViewLock);await page.screenshot({path:dir+'/'+name+'-low.png'});
 await preset('playerViewRaised');const raised=await camera();assert(raised.elevation>low.elevation&&raised.playerEyeHeight>.25);assert.equal((await model()).elevation,3,'View height does not change cue elevation');await page.screenshot({path:dir+'/'+name+'-raised.png'});
 await view();await page.locator('#playerEyeHeight').evaluate(e=>{e.value='21';e.dispatchEvent(new Event('input',{bubbles:true}));});await settle();assert.equal((await camera()).playerEyeHeight,.21);await page.locator('#workspace-picker>summary').click();
 for(const [elevation,side,follow]of [[3,0,0],[18,.4,-.3],[55,-.3,.4]]){
  await page.evaluate(({elevation,side,follow})=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{airbornePhysics:elevation!==3,cueElevationDeg:elevation,sideSpin:side,follow});billiardsTourBridge.restore(s);},{elevation,side,follow});await settle();
  const hit=await page.evaluate(()=>{const m=Billiards3D.cueModel(),tip=Billiards3D.contactMarkers().find(t=>t.id===0),s=billiardsTourBridge.capture().state;return {m,expected:tip.normal.map((v,i)=>tip.center[i]+v*s.ballR+(i===0?s.tableL/2:i===2?s.tableW/2:0))};});assert.equal(hit.m.elevation,elevation);assert(hit.expected.every((v,i)=>Math.abs(v-hit.m.contact[i])<1e-8),'Real cue matches the red tip-contact marker at each spin/elevation');
 }
 await page.evaluate(s=>billiardsTourBridge.restore(s),initial);await settle();
 for(const finish of ['blackSilver','carbon','wood']){
  await menu(true);if(!await page.locator('#optionsSection').evaluate(e=>e.classList.contains('open')))await page.locator('#optionsSection>.sectionToggle').click();if(!await page.locator('#menu-featureCueOptions').evaluate(e=>e.open))await page.locator('#menu-featureCueOptions>summary').click();await page.locator('#trainerCueFinish').selectOption(finish);await settle();assert.equal((await model()).finish,finish);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),prediction,'Cue finish never changes physics');await menu(false);
  await page.evaluate(()=>Billiards3D.restoreCamera({azimuth:.45,elevation:.55,radius:2.6,target:{x:0,y:0,z:0}}));await settle();await page.screenshot({path:dir+'/'+name+'-'+finish+'.png'});
 }
 await preset('playerViewLow');const before=await camera();
 await page.evaluate(()=>{window.__strokeCaught=false;const observe=()=>{const m=Billiards3D.cueModel();if(m?.phase==='backstroke'&&m.gap>.035){window.removeEventListener('billiards:3d-render',observe);billiardsPlayback.pause();window.__strokeCaught=true;}};window.addEventListener('billiards:3d-render',observe);});
 await page.locator('#phoneActions>[data-trainer-action=animate]').click();
 await page.waitForFunction(()=>window.__strokeCaught);await settle();
 assert.equal(await page.evaluate(()=>billiardsPlayback.state().time),0,'Balls wait for the cue strike');const pulled=await model();assert(pulled.gap>.035);const heldCamera=await camera();assert.deepEqual(heldCamera.target,before.target,'Head remains still during the stroke');await page.screenshot({path:dir+'/'+name+'-backstroke.png'});
 await settle();assert.equal((await model()).gap,pulled.gap,'Pause holds the cue stroke');await page.evaluate(()=>{window.__followCaught=false;const observe=()=>{if(billiardsPlayback.state().time>.04){window.removeEventListener('billiards:3d-render',observe);billiardsPlayback.pause();window.__followCaught=true;}};window.addEventListener('billiards:3d-render',observe);billiardsPlayback.pause();});
 await page.waitForFunction(()=>window.__followCaught);await settle();assert.equal((await model()).phase,'follow-through');await page.screenshot({path:dir+'/'+name+'-follow-through.png'});
 await page.evaluate(()=>billiardsPlayback.pause());await page.waitForFunction(()=>!billiardsPlayback.state().running,{},{timeout:45000});await settle();assert((await camera()).playerView&& (await camera()).playerViewLock,'Locked Player View remains available for the next ball');assert.equal((await camera()).playerEyeHeight,.12);assert.equal((await model()).phase,'address');
 const next=await page.evaluate(()=>{const s=billiardsTourBridge.capture();s.state.freeAim={x:s.state.balls.find(b=>b.id===0).x+.4,y:.2};billiardsTourBridge.restore(s);return s.state.freeAim;});await settle();assert((await camera()).playerView);assert((await model()).visible);
 // Exercise the real fixed-frame recording timeline without codec or download dependencies.
 await page.evaluate(s=>{billiardsTourBridge.restore(s);window.__recordedCueFrames=[];window.__originalBegin=BilliardsShotRecorder.begin;BilliardsShotRecorder.begin=()=>({ready:()=>true,frame(){Billiards3D.renderSnapshot();__recordedCueFrames.push({time:billiardsPlayback.state().time,model:Billiards3D.cueModel()});},finish(){window.__recordedCueDone=true;BilliardsShotRecorder.begin=window.__originalBegin;},cancel(){BilliardsShotRecorder.begin=window.__originalBegin;}});},initial);
 await page.locator('#phoneActions>[data-trainer-action=animate]').click();await page.waitForFunction(()=>window.__recordedCueFrames?.some(f=>f.time>.08),{},{timeout:120000});
 const frames=await page.evaluate(()=>__recordedCueFrames);assert(frames.some(f=>f.time===0&&f.model.gap>.05),'Fixed-frame recordings include the backstroke before ball motion');assert(frames.some(f=>f.time>0&&f.model.phase==='follow-through'),'Fixed-frame recordings include strike/follow-through');fs.writeFileSync(dir+'/'+name+'-recorded-stroke.json',JSON.stringify(frames.map(f=>({time:f.time,phase:f.model.phase,gap:f.model.gap})),null,2));
 assert.deepEqual(errors,[]);console.log(name+': three full-size finishes, exact spin/elevation contact, Low/Raised/custom Player View, backstroke/strike pause, stationary head, rack lock and recorded-frame timing passed');
 }catch(e){console.error('Failure state',await page.evaluate(()=>({model:Billiards3D.cueModel(),camera:Billiards3D.camera(),playback:billiardsPlayback.state(),errors:window.__errors})));await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
