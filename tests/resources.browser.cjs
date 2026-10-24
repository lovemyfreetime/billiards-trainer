const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn(process.execPath,[require('node:path').join(__dirname,'range-server.cjs'),'8797'],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,serviceWorkers:'block',hasTouch:viewport.width<500,isMobile:viewport.width<500}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__media=[];window.__opened=[];window.open=url=>{__opened.push(url);return {opener:null}};const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__media.push(a);return a}})});
  await page.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  await page.goto('http://127.0.0.1:8797/index.html?train=1');await page.waitForFunction(()=>window.billiardsLessonPractice&&window.billiardsGetStartedTour);
  async function controls(){if(await page.evaluate(()=>document.body.classList.contains('phone-focus')&&!document.body.classList.contains('phone-controls-open')))await page.locator('#phoneControls').click();}
  const host=page.locator('#bt-guide-pool-root');await controls();await page.click('#btg-pool-guide');
  const before=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
  await host.getByRole('button',{name:'Resources',exact:true}).click();
  const ids=await page.evaluate(()=>billiardsPoolAudioMap.curriculum.more.flatMap(g=>g.topics));assert.equal(ids.length,9);
  assert.deepEqual(await host.locator('.btg-resource-card').evaluateAll(es=>es.map(e=>e.dataset.resourceId)),ids);
  assert.deepEqual(await host.locator('.btg-resource-group>summary').allTextContents(),['Tor Lowry · Zero-X Billiards','Jasmin Ouschan · Billiards Explained']);
  const playing=id=>page.waitForFunction(id=>__media.some(a=>a.dataset.topic===id&&!a.paused&&a.currentTime>0),id);
  async function finish(id){await playing(id);await page.evaluate(id=>{const a=__media.find(a=>a.dataset.topic===id&&!a.paused);a.currentTime=a.duration-.05},id);await page.waitForFunction(id=>__media.some(a=>a.dataset.topic===id&&a.ended),id);}
  await finish('welcome-more');assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'welcome-more');
  for(const id of ids){await host.locator('[data-action="resource-listen-'+id+'"]').click();await finish(id);assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),id);assert.equal(await page.evaluate(()=>billiardsLessonPractice.getState().phase),'idle');}
  assert.deepEqual(await page.evaluate(()=>__opened),[],'Listening must never open a website');
  assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before,'Resource browsing must not change the practice table');
  assert.equal(await host.locator('[data-action="A"]').count(),0);assert.equal(await host.locator('[role=timer]:visible').count(),0);
  assert(await host.getByText('Previews are available offline.',{exact:false}).isVisible());
  const id='recommend-jasmin-technique';await host.locator('[data-action="resource-listen-'+id+'"]').click();await playing(id);
  await host.getByText('Read preview',{exact:true}).click();
  await host.locator('[data-action="resource-open-'+id+'-1"]').click();
  assert.deepEqual(await page.evaluate(()=>__opened),['https://www.youtube.com/playlist?list=PL8jlzslqlw23IBD-3aEHjGGSR4Y5dDVu0']);
  assert(await page.evaluate(()=>__media.filter(a=>a.dataset.topic).every(a=>a.paused)),'Stop app narration before video');
  assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),id);
  assert.notEqual(await host.locator('.btg-resource-transcript').getAttribute('open'),null,'Keep transcript open when narration pauses');
  const tor=host.locator('.btg-resource-group').filter({has:host.getByText('Tor Lowry · Zero-X Billiards',{exact:true})});
  await host.locator('.btg-resource-group>summary').first().click();assert.equal(await host.locator('.btg-resource-group').first().getAttribute('open'),null);
  await host.getByRole('button',{name:'Replay introduction',exact:true}).click();await playing('welcome-more');assert.equal(await host.locator('.btg-resource-group').first().getAttribute('open'),null,'Keep collapsed group while narration changes');await page.evaluate(()=>billiardsPoolGuide.pause());
  await host.getByRole('button',{name:'Fundamentals',exact:true}).click();assert.equal(await host.locator('[data-action="A"]').innerText(),'Auto On','Resource browsing preserves Guide Auto preference');
  await host.getByRole('button',{name:'Resources',exact:true}).click();assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),id,'Remember selected resource across categories');assert(await page.evaluate(()=>__media.filter(a=>a.dataset.topic).every(a=>a.paused)),'Do not replay welcome on return');
  await host.locator('.btg-resource-group>summary').first().click();await host.locator('[data-action="resource-practice-recommend-zero-x-center-ball"]').click();assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.lastLayoutName),'Zero-X: center-ball fundamentals');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
  assert.deepEqual(errors,[]);console.log(`${viewport.width}px: all ten real recordings, explicit Watch links, no automatic navigation/countdown, preserved table/Auto, independent groups and optional practice passed`);await ctx.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
