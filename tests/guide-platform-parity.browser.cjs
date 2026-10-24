const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn(process.execPath,[require('node:path').join(__dirname,'range-server.cjs'),'8795'],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const config of [{name:'Windows',viewport:{width:1365,height:900}},{name:'Android tablet',viewport:{width:1280,height:800},hasTouch:true,isMobile:true},{name:'Android phone',viewport:{width:390,height:844},hasTouch:true,isMobile:true}]){
  const {name,...options}=config,ctx=await browser.newContext({...options,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[],transitions=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('get-started-next-lesson'))transitions.push(r.url());});
  await p.addInitScript(()=>{window.__media=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__media.push(a);return a;}});});
  await p.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  await p.goto(process.env.BILLIARDS_TEST_URL||'http://127.0.0.1:8795/index.html?train=1');await p.waitForFunction(()=>window.billiardsLessonPractice&&window.billiardsGetStartedTour);
  async function table(){if(await p.evaluate(()=>document.body.classList.contains('phone-controls-open')))await p.locator('#phoneControls').click();}
  async function controls(){if(await p.evaluate(()=>document.body.classList.contains('phone-focus')&&!document.body.classList.contains('phone-controls-open')))await p.locator('#phoneControls').click();}
  const host=p.locator('#bt-guide-pool-root'),prompt=p.locator('.btg-lesson-prompt');
  async function finish(){await p.waitForFunction(()=>__media.some(a=>a.dataset.topic&&!a.paused&&a.currentTime>0));await p.evaluate(()=>{const a=__media.find(a=>a.dataset.topic&&!a.paused);a.currentTime=a.duration-.05;});}
  await controls();await p.click('#btg-pool-start');assert.equal(await host.locator('[data-action="A"]').textContent(),'Auto On');assert.equal(await host.locator('[data-action="Practice"]').count(),1);
  await finish();await p.waitForFunction(()=>billiardsGetStartedTour.getState().phase==='countdown');
  assert.equal(await p.evaluate(()=>billiardsGetStartedTour.transition.seconds),5);await prompt.waitFor({state:'visible'});
  const before=await p.evaluate(()=>billiardsTourBridge.capture().state.freeAim);
  await table();if(options.hasTouch)await prompt.tap();else await prompt.click();
  assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.freeAim),before,'Handoff must preserve aim');
  assert.equal(await p.evaluate(()=>billiardsGetStartedTour.getState().phase),'practice');await p.waitForTimeout(5200);assert.equal(await p.evaluate(()=>billiardsGetStartedTour.getState().index),0,'No stale timer after practice');
  await controls();await host.locator('[data-action="Practice"]').click();assert.match(await host.locator('.btg-learning-card').textContent(),/Purpose.*Instruction.*Success.*Transfer/s);
  await controls();await host.locator('[data-action="Practice"]').click(); // reopen practice consistently
  await controls();await host.locator('select').selectOption(await p.evaluate(()=>billiardsGetStartedTour.steps[1].topicId));await finish();await p.waitForFunction(()=>billiardsGetStartedTour.getState().phase==='countdown');
  await p.waitForFunction(()=>billiardsGetStartedTour.getState().index===2,{},{timeout:8000});
  assert.deepEqual(transitions,[],'No spoken transition file on any platform');
  await controls();await p.click('#btg-pool-guide');
  const ids=await p.evaluate(()=>billiardsPoolAudioMap.curriculum.fundamentals.flatMap(g=>g.topics));assert.equal(await host.locator('select option').count(),ids.length+1);assert.equal(await host.getByRole('slider',{name:'Guide skill level'}).count(),0);
  await controls();await host.locator('select').selectOption(ids[0]);await finish();await p.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');await prompt.waitFor({state:'visible'});await table();await prompt.click();
  assert.equal(await p.evaluate(()=>billiardsLessonPractice.getState().phase),'practice');await controls();await host.locator('[data-action="Practice"]').click();assert.match(await host.locator('.btg-learning-card').textContent(),/Success/);
  // A fresh lesson selection must cancel the earlier countdown and keep the latest layout.
  await controls();await host.locator('select').selectOption(ids[1]);await p.waitForFunction(()=>billiardsPoolGuide.getState().topicId===billiardsPoolAudioMap.curriculum.fundamentals.flatMap(g=>g.topics)[1]);
  assert.deepEqual(errors,[],name+' runtime errors');console.log(name+': Guide/Get Started controls, silent countdown, touch/mouse handoff, cancellation, Practice and complete curriculum passed');await ctx.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
