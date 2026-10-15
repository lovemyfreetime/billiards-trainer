const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const server=cp.spawn('python',['-u','-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
// The offline installation requests hundreds of existing MP3s. Drain server
// logs so an unread pipe cannot stall its request threads.
server.stderr.on('data',()=>{});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',()=>reject(Error('Test server failed to start')));});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}}),page=await context.newPage(),errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1:8765'))failures.push(r.url()+': '+r.status());});
 await page.goto('http://127.0.0.1:8765/index.html');await page.waitForFunction(()=>window.billiardsPoolGuide&&window.billiardsGetStartedTour);
 const host=page.locator('#bt-guide-pool-root');
 await page.click('#btg-pool-start');await page.waitForFunction(()=>billiardsGetStartedTour.getState().active);await page.locator('[data-action="Try the Shot"]').click();
 const catalog=JSON.parse(fs.readFileSync('guide/learning-catalog.json')),starts=Object.entries(catalog.topics).filter(([id,t])=>t.category==='start');
 assert.deepEqual(await host.locator('select.btg-lesson-select option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean)),starts.map(x=>x[0]),'Get Started keeps its original numbered order');
 for(const [id,card]of starts){
  await host.locator('select.btg-lesson-select').selectOption(id);await page.evaluate(()=>billiardsGetStartedTour.hold());
  await host.locator('[data-action="Practice"]').click();await assertContract();
  const before=await page.evaluate(()=>billiardsTourBridge.capture());
  await host.locator('.btg-setup-actions button').first().click();
  const after=await page.evaluate(()=>billiardsTourBridge.capture());
  assert.deepEqual(after.state.balls,before.state.balls,'Exact same Get Started layout restored: '+id);
  assert.equal(after.undo.length,before.undo.length,'Undo lesson history preserved');
 }
 async function assertContract(){for(const text of ['Purpose','Instruction','Success','Transfer'])assert.equal(await host.locator('.btg-learning-card dt').filter({hasText:new RegExp('^'+text+'$')}).count(),1);}
 for(const [category,id]of [['fundamentals','fundamentals-stable-bridge'],['fundamentals','thirty-degree-rule-quick'],['physics','compass-tool-intro-quick'],['drills','drill-stop-shot'],['exercises','safety-play-quick']]){
  await page.evaluate(category=>billiardsPoolGuide.openCategory(category),category);
  await host.locator('select.btg-lesson-select').selectOption(id);await page.evaluate(()=>billiardsPoolGuide.pause());
  await host.locator('[data-action="Practice"]').click();await assertContract();
  if(id==='fundamentals-stable-bridge')assert.equal(await host.locator('[data-action="play-pause"]').isDisabled(),true,'New written-only lesson does not borrow an unrelated MP3');
  await host.locator('.btg-setup-actions button').first().click();
  const card=catalog.topics[id],raw=JSON.parse(fs.readFileSync(card.setups[0].url));
  await page.waitForFunction(name=>billiardsTourBridge.capture().state.lastLayoutName===name,raw.name);
  const actual=await page.evaluate(()=>billiardsTourBridge.capture().state);
  for(const ball of raw.layout.balls){const b=actual.balls.find(b=>b.id===ball.id);assert.ok(b,'Loaded ball/marker present');assert.ok(Math.abs(b.x-ball.x)<1e-8&&Math.abs(b.y-ball.y)<1e-8,`Loaded exact centers ${id}/${ball.id}: ${b.x},${b.y} vs ${ball.x},${ball.y}`);}
 }
 await page.screenshot({path:'/tmp/learning-guide-desktop.png'});
 const sheet=await context.newPage();sheet.on('pageerror',e=>errors.push(e.message));
 const urls=[...new Set(Object.values(catalog.topics).flatMap(t=>t.setups.map(s=>s.url)))];
 const fetched=await sheet.goto('http://127.0.0.1:8765/guide/practice.html?topic=first-session-undo');assert.equal(fetched.status(),200);
 await sheet.waitForSelector('svg');assert.match(await sheet.locator('h2').innerText(),/Undo/);assert.equal(await sheet.locator('svg circle').count()>6,true);
 const row=await sheet.locator('table').first().locator('tbody tr').first().innerText();
 const undo=JSON.parse(fs.readFileSync('guide/layouts/get-started-07.billiards.json')).history[0];const cue=undo.balls.find(b=>b.id===0);assert.ok(row.includes((cue.x/undo.tableL*8).toFixed(3)),'Undo sheet uses original pre-shot centers');
 for(const id of starts.map(x=>x[0]).concat(['drill-wagon-wheel','drill-stop-shot','fundamentals-stable-bridge'])){
  await sheet.goto('http://127.0.0.1:8765/guide/practice.html?topic='+id);await sheet.waitForSelector('svg');assert.equal(await sheet.locator('#sheet dl dt').count(),5);assert.equal(await sheet.locator('.score tbody tr').count(),5);
 }
 const status=await sheet.evaluate(async urls=>Promise.all(urls.map(async url=>{const r=await fetch(new URL(url,new URL('../',location.href)));return [r.url,r.status];})),urls);assert.ok(status.every(x=>x[1]===200));
 await sheet.setViewportSize({width:390,height:844});await sheet.screenshot({path:'/tmp/learning-sheet-phone.png',fullPage:true});assert.ok(await sheet.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Physical sheet fits phone');
 await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>billiardsPoolGuide.openCategory('drills'));await host.locator('select.btg-lesson-select').selectOption('drill-stop-shot');await page.evaluate(()=>billiardsPoolGuide.pause());await host.locator('[data-action="Practice"]').click();await host.locator('.btg-setup-actions button').first().click();await page.waitForFunction(name=>billiardsTourBridge.capture().state.lastLayoutName===name,catalog.topics['drill-stop-shot'].title);await page.screenshot({path:'/tmp/learning-guide-phone.png'});const bounds=await host.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391,'Guide fits phone');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('8 Get Started lesson/card/reset flows, physical fundamentals, promoted strategy/tools, all current layout URLs, pre-shot Undo sheet, desktop/phone layout, and clean console passed.');
 const offline=await browser.newContext({viewport:{width:1100,height:850}}),op=await offline.newPage();
 await op.goto('http://127.0.0.1:8765/index.html');
 await op.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:120000});
 await offline.setOffline(true);
 await op.goto('http://127.0.0.1:8765/guide/practice.html?topic=drill-stop-shot');
 await op.waitForSelector('svg');assert.equal(await op.locator('h2').innerText(),catalog.topics['drill-stop-shot'].title);assert.equal(await op.locator('#sheet dl dt').count(),5);
 await op.selectOption('#path','1');await op.waitForFunction(()=>document.querySelector('h2')?.textContent==='A repeatable pre-shot routine');await op.waitForSelector('svg');
 await op.goto('http://127.0.0.1:8765/guide/audio-review.html');await op.waitForSelector('#topic option',{state:'attached'});assert.equal(await op.locator('#topic option').count(),34);await op.selectOption('#topic','drill-wagon-wheel');assert.match(await op.locator('#status').innerText(),/slower/);assert.equal(await op.locator('#audio audio').count(),1);
 await op.goto('http://127.0.0.1:8765/index.html');await op.waitForFunction(()=>window.billiardsLessonPractice);await op.evaluate(()=>{billiardsPoolGuide.openCategory('exercises');billiardsPoolGuide.selectTopic('practice-one-rail-kick')});assert.equal(await op.evaluate(()=>billiardsTourBridge.capture().state.lastLayoutName),catalog.topics['practice-one-rail-kick'].title);
 console.log('Installed service-worker cache serves deep-linked practice sheets, cards, diagrams, and physical fundamentals with the network offline.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
