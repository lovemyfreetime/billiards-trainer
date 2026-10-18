const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python3',['-u','-m','http.server','8887','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{await new Promise(r=>server.stdout.once('data',r));const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const viewport of [{width:412,height:915},{width:915,height:412},{width:1366,height:936}]){
 const p=await b.newPage({viewport,hasTouch:true,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/?zen=1','/play.html']){
  await p.goto('http://127.0.0.1:8887'+path,{waitUntil:'domcontentloaded'});
  const zen=path.includes('zen'),play=path==='/play.html';
  let root=p.locator(zen?'body>.experience-switcher':play?'#playDialog .experience-switcher':'#btZenLauncher');await root.waitFor();
  if(zen){const toggle=root.locator('.experience-toggle');await toggle.click();root=p.locator('.experience-menu:popover-open');await root.waitFor();assert.deepEqual(await root.locator('a').allTextContents(),['Trainer','Play']);}
  else {assert.deepEqual(await root.locator('a').evaluateAll(es=>es.map(e=>e.dataset.experience)),play?['zen','train']:['zen','play']);assert.equal(await root.locator('.experience-toggle').count(),0);}
  assert.equal(await root.locator('a').count(),2);
  assert(await root.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
  for(const link of await root.locator('a').all()){
   await link.scrollIntoViewIfNeeded();const r=await link.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);
   if(!zen)assert.deepEqual(await link.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,r:getComputedStyle(e).borderRadius})),{w:46,h:46,r:'12px'});
  }
  const destination=zen?'play':play?'train':'zen';await root.locator('[data-experience='+destination+']').click();await p.waitForURL(destination==='play'?'**/play.html':destination==='zen'?'**/?zen=1':'http://127.0.0.1:8887/');
  console.log('Experience navigation: '+path+' at '+viewport.width+'×'+viewport.height);
 }
 assert.deepEqual(errors,[]);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
