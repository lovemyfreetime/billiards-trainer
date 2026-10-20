const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python3',['-u','-m','http.server','8887','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{await new Promise(r=>server.stdout.once('data',r));const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const viewport of [{width:412,height:915},{width:915,height:412},{width:1366,height:936}]){
 const p=await b.newPage({viewport,hasTouch:true,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/?train=1','/?zen=1','/play.html']){
  await p.goto('http://127.0.0.1:8887'+path,{waitUntil:'domcontentloaded'});
  const zen=path.includes('zen'),play=path==='/play.html';
  const toggle=p.locator(zen?'#zenModeBtn':play?'#playDialog .experience-toggle':'#btZenLauncher .experience-toggle');await toggle.waitFor();
  assert.equal(await toggle.evaluate(e=>getComputedStyle(e).borderRadius),'50%');
  if(!zen){assert.equal(await toggle.locator('img').count(),1);assert((await toggle.locator('img').getAttribute('src')).includes(play?'play-experience':'trainer-original-execute'));}
  await toggle.click();const root=p.locator(zen?'#zenModeMenu.zen-popover-open':'.experience-menu:popover-open');await root.waitFor();
  const links=root.locator(zen?'button':'a');assert.equal(await links.count(),3);
  assert.deepEqual(await links.evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))),zen?['Open Trainer','Open Play','Open Home']:play?['Open Zen','Open Trainer','Open Home']:['Open Zen','Open Play','Open Home']);
  assert(await root.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));
  await toggle.click();await root.waitFor({state:'hidden'});assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();await root.waitFor();
  const destination=zen?'Play':play?'Trainer':'Zen';await root.getByRole(zen?'button':'link',{name:'Open '+destination,exact:true}).click();await p.waitForURL(destination==='Play'?'**/play.html':destination==='Zen'?'**/?zen=1':'http://127.0.0.1:8887/?train=1');
  console.log('Experience navigation: '+path+' at '+viewport.width+'×'+viewport.height);
 }
 assert.deepEqual(errors,[]);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
