const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const port=process.env.LESSON_PROBE_PORT||'8793';
const server=cp.spawn(process.execPath,[path.join(__dirname,'range-server.cjs'),port],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)))});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript({path:path.join(__dirname,'webview-assets/lesson-sequence.js')});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?train=1`);await page.waitForFunction(()=>window.billiardsGetStartedTour);
  async function run(options,timeout){
   await page.evaluate(options=>void runLessonSequence(options),options);
   await page.waitForFunction(()=>['passed','failed'].includes(window.__lessonSequence.status),null,{timeout});
   const result=await page.evaluate(()=>window.__lessonSequence);assert.equal(result.status,'passed',JSON.stringify(result));console.log(JSON.stringify(result));return result;
  }
  if(process.env.LESSON_PROBE_MODE==='all')await run({},300000);
  else{
   for(const category of ['fundamentals','physics','drills','exercises','more'])await run({category},300000);
   assert.equal(await page.evaluate(()=>__lessonSequence.guide),146);
   const result=await run({quickStartOnly:true},180000);assert.equal(result.quickStart,8);
   assert.deepEqual(result.categories,{fundamentals:28,physics:50,drills:33,exercises:29,more:6});
  }
  assert.deepEqual(errors,[]);
  // A missing narration must still fail promptly, with the affected phase and topic.
  const failurePage=await context.newPage();await failurePage.route('**/guide/audio/welcome-more.mp3*',route=>route.abort());
  await failurePage.goto(`http://127.0.0.1:${port}/index.html?train=1`);await failurePage.waitForFunction(()=>window.billiardsGetStartedTour);
  await failurePage.evaluate(()=>void runLessonSequence({category:'more'}));
  await failurePage.waitForFunction(()=>__lessonSequence.status==='failed',null,{timeout:25000});
  const failed=await failurePage.evaluate(()=>__lessonSequence);assert.equal(failed.phase,'guide/more');assert.equal(failed.progress,'welcome-more');assert.match(failed.error,/Missing narration welcome-more/);
  console.log('PASS: complete native probe coverage and missing-media failure detection; production countdowns and assertions preserved.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
