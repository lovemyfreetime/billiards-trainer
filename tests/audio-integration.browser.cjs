const {chromium}=require('playwright'),assert=require('node:assert/strict');
const server=require('node:child_process').spawn('python',['-u','-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)))});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
 const context=await browser.newContext();const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__playedAudio=[];const NativeAudio=window.Audio;window.Audio=new Proxy(NativeAudio,{construct(target,args){const audio=new target(...args);window.__playedAudio.push(audio);return audio}})});
 await page.goto('http://127.0.0.1:8765',{waitUntil:'domcontentloaded'});
 if(!await page.evaluate(()=>!!navigator.serviceWorker.controller))await page.waitForNavigation({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.billiardsPoolGuide&&window.billiardsAnalyzeGuide);
 const result=await page.evaluate(async()=>{
  const records=(await BilliardsRecordedAudio.load()).records;
  const maps=[billiardsPoolAudioMap,billiardsAnalyzeAudioMap];
  const missing=records.filter(r=>!maps.some(m=>m.topics.some(t=>t.id===r.topic.id&&t.audio===r.topic.audio)));
  const invalid=[];for(const m of maps)for(const t of m.topics){for(const audio of typeof t.audio==='string'?[t.audio]:t.audio||[]){if(typeof audio!=='string')invalid.push(t.id)}}
  return {count:records.length,missing:missing.map(r=>r.topic.id),invalid,
   ai:document.querySelector('#photoAiModeBtn').dataset.guideTopic,
   setup:document.querySelector('.photoSetupGroup .photoToolHeading').dataset.guideTopic,
   image:document.querySelector('.photoToolGroup:first-child .photoToolHeading').dataset.guideTopic,
   run:document.querySelector('#startFullRack').dataset.guideTopic};
 });
 assert.equal(result.count,360);assert.deepEqual(result.missing,[]);assert.deepEqual(result.invalid,[]);
 assert.equal(result.ai,'analyze-ai-detector-mode-and-readiness');assert.equal(result.setup,'analyze-table-setup-heading');assert.equal(result.image,'analyze-image-camera-heading');assert.equal(result.run,'main-start-full-rack');
 await page.click('#btg-pool-guide');
 await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:/^Drills$/}).click();
 const groups=await page.locator('#bt-guide-pool-root optgroup').evaluateAll(nodes=>nodes.map(n=>n.label));
 for(const g of ['Cue Ball Control','Positional Patterns','Rail Navigation','Kicking Systems'])assert.ok(groups.includes(g),g);
 await page.locator('#bt-guide-pool-root select').selectOption('drill-stop-shot');
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^Read$/}).click();

 assert.ok((await page.locator('#bt-guide-pool-root .btg-expanded').innerText()).includes('one ball width behind'));
 await page.locator('#bt-guide-pool-root button[title="Play / Pause"]').click();
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.src.includes('drill-stop-shot.mp3')&&!a.paused&&a.currentTime>0));
 await page.locator('#bt-guide-pool-root button[title="Stop"]').click();
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.ok((await page.locator('#bt-guide-pool-root .btg-expanded').innerText()).includes('Orientation'));
 await page.screenshot({path:'../audio-drill-menu-preview.png',fullPage:false});
 await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:/^More Resources$/}).click();
 assert.equal(await page.locator('#bt-guide-pool-root select option[value^="recommend-zero-x-"]').count(),5);
 await page.locator('#bt-guide-pool-root select').selectOption('recommend-zero-x-overview');
 if(await page.evaluate(()=>billiardsPoolGuide.getState().expanded!=='more'))await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.ok(await page.locator('#bt-guide-pool-root .btg-resource-links a').count());
 await page.click('#analyzePhotoBtn');
 await page.waitForSelector('#photoAnalyzerModal.open');
 await page.click('#btg-analyze-start');
 await page.waitForFunction(()=>billiardsAnalyzeGuide.getState().category==='start');
 assert.ok((await page.locator('#bt-guide-root select').inputValue()).startsWith('analyze-start-'));
 await page.click('#btg-analyze-explore');
 await page.locator('#photoChooseImage').click();
 assert.equal(await page.evaluate(()=>billiardsAnalyzeGuide.getState().topicId),'analyze-choose-table-image');
 const clips=await page.evaluate(async()=>{
  const data=await BilliardsRecordedAudio.load();let failed=[];
  for(let i=0;i<data.records.length;i+=12){await Promise.all(data.records.slice(i,i+12).map(async r=>{const res=await fetch(r.topic.audio);if(!res.ok||(await res.arrayBuffer()).byteLength<100)failed.push(r.topic.id)}))}
  return failed;
 });assert.deepEqual(clips,[]);
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.billiardsPoolGuide&&window.billiardsAnalyzeGuide);
 const offline=await page.evaluate(async()=>{const res=await fetch('./guide/audio/drill-two-rail-kick.mp3');return res.ok&&(await res.arrayBuffer()).byteLength>100});assert.ok(offline);
 await page.screenshot({path:'../audio-integration-preview.png',fullPage:false});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({records:result.count,drillGroups:groups,allAudioFetches:'360 successful',offlineReload:'passed',mp3Playback:'decoded and advancing',dedicatedMappings:result,browserErrors:errors}));
 await browser.close();server.kill();
})().catch(e=>{console.error(e);server.kill();process.exit(1)});
