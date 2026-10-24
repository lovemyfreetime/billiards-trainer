const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
const server=cp.spawn(process.execPath,[require('node:path').join(__dirname,'range-server.cjs'),'8796'],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__media=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__media.push(a);return a}})});
  await page.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  await page.goto('http://127.0.0.1:8796/index.html?train=1');await page.waitForFunction(()=>window.billiardsLessonPractice&&window.billiardsGetStartedTour);
  const result=await page.evaluate(()=>{
   const errors=[],seen=new Set();let count=0;
   for(const [category,groups] of Object.entries(billiardsPoolAudioMap.curriculum)){
    if(category==='more')continue;
    billiardsPoolGuide.openCategory(category);billiardsPoolGuide.pause();
    for(const id of groups.flatMap(g=>g.topics)){
     billiardsPoolGuide.selectTopic(id);const topic=billiardsPoolAudioMap.topics.find(t=>t.id===id),state=billiardsTourBridge.capture().state,layout=topic.scene?.file.layout;
     if(!layout){errors.push('Missing scene '+id);continue;}
     if(state.lastLayoutName!==layout.name)errors.push('Wrong loaded lesson '+id);
     for(const b of layout.balls){const live=state.balls.find(x=>x.id===b.id);if(!live||Math.abs(live.x/state.tableL-b.x/layout.tableL)>1e-7||Math.abs(live.y/state.tableW-b.y/layout.tableW)>1e-7)errors.push('Wrong live ball '+id+'/'+b.id);}
     if(state.balls.length!==layout.balls.length)errors.push('Extra live balls '+id);
     const geometry=JSON.stringify(state.balls.map(b=>[b.x.toFixed(6),b.y.toFixed(6),!!b.marker,b.markerShape||'',b.markerDiameterIn||0]).sort());if(seen.has(geometry))errors.push('Reused live geometry '+id);seen.add(geometry);count++;
    }
   }
   return {errors,count,unique:seen.size};
  });assert.deepEqual(result.errors,[]);assert.equal(result.count,136);assert.equal(result.unique,136);
  async function table(){if(await page.evaluate(()=>document.body.classList.contains('phone-controls-open')))await page.locator('#phoneControls').click();}
  async function controls(){if(await page.evaluate(()=>document.body.classList.contains('phone-focus')&&!document.body.classList.contains('phone-controls-open')))await page.locator('#phoneControls').click();}
  const host=page.locator('#bt-guide-pool-root');
  await controls();await page.click('#btg-pool-guide');await page.evaluate(()=>{if(!billiardsPoolGuide.getState().enabled)billiardsPoolGuide.openGuide();billiardsPoolGuide.openCategory('fundamentals')});
  await controls();await host.locator('select').selectOption('aiming-line-quick');
  const playing=id=>page.waitForFunction(id=>__media.some(a=>a.dataset.topic===id&&!a.paused&&a.currentTime>0),id);
  await playing('aiming-line-quick');await page.evaluate(()=>{const a=__media.find(a=>a.dataset.topic==='aiming-line-quick');a.currentTime=a.duration-.05});
  await page.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');const started=Date.now();
  assert.equal(await host.locator('[role=timer][aria-label*="Tap the table"]').textContent(),'5');
  await page.waitForTimeout(3500);assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'aiming-line-quick');
  await page.waitForFunction(()=>billiardsPoolGuide.getState().topicId!=='aiming-line-quick');assert(Date.now()-started>=4500,'Practice wait ended early');
  await controls();await host.locator('select').selectOption('aiming-line-quick');await playing('aiming-line-quick');
  await page.evaluate(()=>{const a=__media.find(a=>a.dataset.topic==='aiming-line-quick');a.currentTime=a.duration-.05});await page.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');
  const before=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);await table();await page.locator('.btg-lesson-prompt').click();
  assert.equal(await page.evaluate(()=>billiardsLessonPractice.getState().phase),'practice');await page.waitForTimeout(5500);
  assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'aiming-line-quick');assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before);
  await controls();await host.locator('select').selectOption('hide-cue-ball-guides-quick');await playing('hide-cue-ball-guides-quick');
  assert.equal(await page.evaluate(()=>billiardsTourBridge.snapshot().shot2Enabled),true,'The visibility lesson must prepare Shot 2');
  await controls();
  await page.locator('#toggleCueVisuals2Btn').click();assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.showCueVisuals2),false);
  assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.showCueVisuals1),true,'Hide Shot 2 independently');
  if(viewport.width<500)await page.locator('#phoneControls').click();
  await page.evaluate(()=>billiardsPoolGuide.openCategory(billiardsPoolAudioMap.topics.find(t=>t.id==='shot-speed-controls-quick').category));
  await controls();await host.locator('select').selectOption('shot-speed-controls-quick');await playing('shot-speed-controls-quick');
  const track=JSON.parse(fs.readFileSync('guide/narration-cues.json')).tracks['shot-speed-controls-quick.mp3'],cue=track.cues.find(c=>c.target==='speed');assert(cue);
  const original=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
  await page.evaluate(t=>{const a=__media.find(a=>a.dataset.topic==='shot-speed-controls-quick');a.currentTime=t;a.dispatchEvent(new Event('timeupdate'))},(cue.start+cue.end)/2);
  await page.locator('.btg-cue-layer[data-target="speed"] .btg-cue-box').waitFor({state:'visible'});
  assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),original,'Highlights must not change the practice layout');
  await controls();await host.locator('[data-action="play-pause"]').click();await page.waitForFunction(()=>!document.querySelector('.btg-cue-ring'));
  if(viewport.width<500){
   await page.evaluate(()=>billiardsPoolGuide.openCategory('physics'));await controls();await host.locator('select').selectOption('table-geometry-calibration-quick');await table();await playing('table-geometry-calibration-quick');
   const track=JSON.parse(fs.readFileSync('guide/narration-cues.json')).tracks['table-geometry-calibration-quick.mp3'],cue=track.cues.find(c=>c.target==='geometry-settings');assert(cue);
   await page.evaluate(t=>{const a=__media.find(a=>a.dataset.topic==='table-geometry-calibration-quick');a.currentTime=t;a.dispatchEvent(new Event('timeupdate'))},(cue.start+cue.end)/2);
   await page.locator('.btg-cue-layer[data-target="geometry-settings"] .btg-cue-box').waitFor({state:'visible'});assert(await page.locator('body').evaluate(b=>b.classList.contains('phone-controls-open')));
   await page.evaluate(()=>{const a=__media.find(a=>a.dataset.topic==='table-geometry-calibration-quick');a.currentTime=a.duration-.05});await page.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');
   assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('phone-controls-open')),false,'Show the table again for the practice wait');assert(await page.locator('.btg-lesson-prompt').isVisible());
  }
  assert.deepEqual(errors,[]);console.log(`${viewport.width}px: all 136 instructional layouts, distinct geometry, five-second wait, practice cancellation and current-audio control cue passed.`);await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
