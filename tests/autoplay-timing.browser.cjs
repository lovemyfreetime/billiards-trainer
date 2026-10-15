const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python',['-u','-m','http.server','8776','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',()=>{});
(async()=>{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')))});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:1365,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__audio=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__audio.push(a);return a}})});
 await p.goto('http://127.0.0.1:8776/index.html');await p.waitForFunction(()=>window.billiardsLessonPractice&&window.billiardsGetStartedTour);
 await p.click('#btg-pool-start');
 const host=p.locator('#bt-guide-pool-root'),select=host.locator('select.btg-lesson-select');
 async function finish(){await p.waitForFunction(()=>__audio.some(a=>a.dataset.topic===billiardsPoolGuide.getState().topicId&&!a.paused&&Number.isFinite(a.duration)));await p.evaluate(()=>{const a=__audio.find(a=>a.dataset.topic===billiardsPoolGuide.getState().topicId);a.currentTime=a.duration-.05});}
 for(const category of ['start','fundamentals']){
  await p.evaluate(c=>billiardsPoolGuide.openCategory(c),category);
  const ids=await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean));assert.ok(ids.length>1);
  await select.selectOption(ids[0]);
  if(await host.locator('[aria-label="Autoplay next lesson"]').getAttribute('aria-pressed')==='false')await host.locator('[aria-label="Autoplay next lesson"]').click();
  const state=category==='start'?'billiardsGetStartedTour':'billiardsLessonPractice';
  await finish();await p.waitForFunction(key=>window[key].getState().phase==='countdown',state);
  assert.equal(await p.evaluate(key=>window[key].getState().remaining,state),5);
  assert.equal(await p.locator('.btg-practice-next:visible [role="timer"]').textContent(),'5');const started=Date.now();
  await p.waitForFunction(id=>billiardsPoolGuide.getState().topicId!==id,ids[0],{timeout:7500});
  const elapsed=Date.now()-started;assert.ok(elapsed>=4400&&elapsed<7000,category+' advances after five seconds: '+elapsed);
  await select.selectOption(ids[0]);await finish();await p.waitForFunction(key=>window[key].getState().phase==='countdown',state);
  await p.locator('.btg-lesson-prompt').click();assert.equal(await p.evaluate(key=>window[key].getState().phase,state),'practice');
  await p.waitForTimeout(5500);assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().topicId),ids[0]);assert.equal(await p.locator('.btg-next-lesson:visible').count(),1);
 }
 assert.deepEqual(errors,[]);console.log('Guide and Get Started display five seconds, advance after five seconds, and cancel progression when tapped.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
