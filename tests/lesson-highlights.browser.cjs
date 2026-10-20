const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python',['-u','-m','http.server','8788','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1365,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__audio=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__audio.push(a);return a}})});
 if(!process.env.BILLIARDS_TEST_URL)await page.route('**/index.html?*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('const fps = 60;','const fps = 6000;')})});
 await page.goto(process.env.BILLIARDS_TEST_URL||'http://127.0.0.1:8788/index.html?train=1');
 await page.waitForFunction(()=>window.billiardsGetStartedTour);
 const host=page.locator('#bt-guide-pool-root'),select=host.locator('select'),glow=id=>page.locator('#'+id).evaluate(el=>el.classList.contains('btg-tour-attention'));
 const playing=()=>page.waitForFunction(()=>__audio.some(a=>a.dataset.topic&&!a.paused&&a.currentTime>0));
 const clear=()=>page.waitForFunction(()=>!document.querySelector('.btg-tour-attention'));
 const topics=await page.evaluate(()=>billiardsPoolAudioMap.topics.filter(t=>t.category==='start'&&!t.explorerOnly).map(t=>t.id));
 await page.click('#btg-pool-start');await playing();assert(await glow('animate'));
 for(let i=0;i<7;i++){
  await select.selectOption(topics[i]);await playing();
  const expected=await page.evaluate(i=>billiardsGetStartedTour.steps[i],i);
  for(const id of expected.targets)assert(await glow(id),`${expected.title}: ${id}`);
  assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.lastLayoutName),'Get Started — '+expected.title);
 }
 await select.selectOption(topics[2]);await playing();for(const id of ['speed','tableSpeed1','follow','bottomFollow1','sideSpin','bottomSide1','tipCanvas'])assert(await glow(id),id);
 await page.evaluate(()=>__audio.find(a=>!a.paused&&a.dataset.topic).dispatchEvent(new Event('waiting')));await clear();
 await page.evaluate(()=>__audio.find(a=>!a.paused&&a.dataset.topic).dispatchEvent(new Event('playing')));assert(await glow('speed'));
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#tableSpeed1').evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await page.locator('#tableSpeed1').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
 await host.locator('[data-action="Try the Shot"]').click();await clear();
 // Highlights must leave controls live and practice must preserve the selected layout.
 const before=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
 await page.locator('#tableSpeed1').fill('1.5');assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.speed),1.5);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before);
 await host.locator('[data-action="play-pause"]').click();await playing();assert(await glow('speed'));
 // Practice still executes real shots, transfers Shot 2, and restores genuine Undo history.
 await select.selectOption(topics[0]);await host.locator('[data-action="Try the Shot"]').click();
 const first=await page.evaluate(()=>billiardsTourBridge.capture());await page.click('#animate');await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy);assert((await page.evaluate(()=>billiardsTourBridge.snapshot())).pocketed.includes(1));await page.click('#resetLayoutQuick');assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture()),first);
 await select.selectOption(topics[4]);await host.locator('[data-action="Try the Shot"]').click();for(let i=0;i<2;i++){await page.click('#animate');await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy)}assert((await page.evaluate(()=>billiardsTourBridge.snapshot())).pocketed.includes(3));
 await select.selectOption(topics[6]);await host.locator('[data-action="Try the Shot"]').click();const missed=await page.evaluate(()=>billiardsTourBridge.capture());assert.equal(missed.undo.length,1);await page.click('#undoShot');assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),missed.undo[0].balls);
 await page.click('#btg-pool-start');await clear();
 // Guide lessons load their own native layout, not the prior Quick Start table.
 await page.click('#btg-pool-guide');await host.locator('.btg-categories button').filter({hasText:/^Drills$/}).click();
 const lesson=await page.evaluate(()=>billiardsPoolAudioMap.topics.find(t=>t.category==='drills'&&!t.explorerOnly&&t.setups?.length&&t.targets?.includes('speed')));
 assert(lesson);await select.selectOption(lesson.id);await playing();await page.waitForFunction(()=>!billiardsTourBridge.capture().state.lastLayoutName.startsWith('Get Started'));
 const nativeBalls=await page.evaluate(async url=>BilliardsLayoutFiles.parse(await(await fetch(url)).text()).layout.balls,lesson.setups[0].url);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),nativeBalls);
 assert(await glow('animate'));assert(await glow('speed'));assert.equal(await host.locator('[data-action="Balls"]').count(),1);
 await host.locator('[data-action="■"]').click();await clear();
 // Ignore a delayed Guide layout after switching back to Quick Start.
 let release;const gate=new Promise(r=>release=r);await page.route('**/guide/layouts/*.billiards.json',async route=>{await gate;await route.continue()});
 await select.selectOption(lesson.id);await page.click('#btg-pool-start');const current=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);release();await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),current);await page.unroute('**/guide/layouts/*.billiards.json');
 await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});await page.setViewportSize({width:390,height:844});
 await select.selectOption(topics[3]);await playing();assert.equal(await page.locator('#phoneActions [data-trainer-action="animate"]').evaluate(el=>el.classList.contains('btg-tour-attention')),true);assert(await page.locator('#phoneActions [data-trainer-action="animate"]').isVisible());
 await select.selectOption(topics[2]);await playing();assert(await glow('tableSpeed1'));assert(await page.locator('#tableSpeed1').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/billiards-lesson-highlights-phone.png',fullPage:true});
 await page.click('#btg-pool-start');await clear();await page.click('#btg-pool-explore');assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().exploring),true);await clear();assert.deepEqual(errors,[]);
 console.log('PASS: seven lesson layouts/targets, native playback, buffering/resume, reduced motion, live sliders, real shots/Shot 2/Undo, Guide layouts, stale-response guard, phone Shoot/sliders, close and Explorer cleanup.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
