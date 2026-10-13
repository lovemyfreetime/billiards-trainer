const {chromium}=require('playwright'),assert=require('node:assert/strict');
const server=require('node:child_process').spawn('python',['-u','-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)))});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
 const context=await browser.newContext();
 await context.route('https://www.youtube.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Verified resource navigation test</title>'}));const page=await context.newPage();const errors=[];page.setDefaultNavigationTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__openedResources=[];const nativeOpen=window.open.bind(window);window.open=(url,...args)=>{window.__openedResources.push(url);return nativeOpen(url,...args)};window.__spokenText=[];window.speechSynthesis.speak=utterance=>window.__spokenText.push(utterance.text);window.__playedAudio=[];const NativeAudio=window.Audio;window.Audio=new Proxy(NativeAudio,{construct(target,args){const audio=new target(...args);window.__playedAudio.push(audio);return audio}})});
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
 assert.equal(result.count,366);assert.deepEqual(result.missing,[]);assert.deepEqual(result.invalid,[]);
 assert.equal(result.ai,'analyze-ai-detector-mode-and-readiness');assert.equal(result.setup,'analyze-table-setup-heading');assert.equal(result.image,'analyze-image-camera-heading');assert.equal(result.run,'main-start-full-rack');
 await page.click('#btg-pool-start');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().autoplay),true);
 await page.click('#btg-pool-guide');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().autoplay),false);
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'welcome-guide');
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='welcome-guide'&&!a.paused&&a.currentTime>0));
 await page.locator('#bt-guide-pool-root button[title="Play / Pause"]').click();
 const pausedAt=await page.evaluate(()=>window.__playedAudio.find(a=>a.dataset.topic==='welcome-guide').currentTime);
 assert.equal(await page.evaluate(()=>window.__playedAudio.find(a=>a.dataset.topic==='welcome-guide').paused),true);
 await page.locator('#bt-guide-pool-root button[title="Play / Pause"]').click();
 await page.waitForFunction(time=>window.__playedAudio.some(a=>a.dataset.topic==='welcome-guide'&&!a.paused&&a.currentTime>time),pausedAt);
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^Read$/}).click();
 const welcomeText=await page.locator('#bt-guide-pool-root .btg-expanded').innerText();
 for(const word of ['Play and Pause','Auto','Read','More','Fundamentals','Physics and Tools','Drills','Exercises','Resources'])assert.ok(welcomeText.includes(word));
 await page.locator('#bt-guide-pool-root button[title="Autoplay next lesson"]').click();
 await page.evaluate(()=>{const a=window.__playedAudio.find(a=>a.dataset.topic==='welcome-guide');a.currentTime=a.duration-.1});
 await page.waitForFunction(()=>billiardsPoolGuide.getState().topicId!=='welcome-guide');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId===billiardsPoolAudioMap.topics.find(t=>!t.categoryWelcome&&!t.explorerOnly&&t.category==='fundamentals'&&(t.level||0)===0).id),true,'Auto begins category lessons after welcome');
 await page.click('#btg-pool-guide');await page.click('#btg-pool-guide');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'welcome-guide');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().autoplay),false);
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='welcome-guide'&&!a.paused&&a.currentTime>0&&a.currentTime<2));

 const welcomes=[['Fundamentals','fundamentals'],['Physics & Tools','physics'],['Drills','drills'],['Exercises','exercises'],['Resources','more']];
 for(const [label,id] of welcomes){
  await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).click();
  assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'welcome-'+id);
  assert.equal(await page.locator('#bt-guide-pool-root select').inputValue(),'');
  assert.equal(await page.locator('#bt-guide-pool-root select option[value^="welcome-"]').count(),0);
  await page.waitForFunction(id=>window.__playedAudio.some(a=>a.src.includes('welcome-'+id+'.mp3')&&!a.paused&&a.currentTime>0),id);
 }
 assert.equal(await page.evaluate(()=>window.__openedResources.length),0,'Welcomes never open a resource');
 await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:/^Drills$/}).click();
 const groups=await page.locator('#bt-guide-pool-root optgroup').evaluateAll(nodes=>nodes.map(n=>n.label));
 for(const g of ['Cue Ball Control','Positional Patterns','Rail Navigation','Kicking Systems'])assert.ok(groups.includes(g),g);
 await page.locator('#bt-guide-pool-root select').selectOption('drill-stop-shot');
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^Read$/}).click();

 assert.ok((await page.locator('#bt-guide-pool-root .btg-expanded').innerText()).includes('one ball width behind'));
 // Menu selection starts playback even when automatic playlist advance is off.
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().autoplay),false);
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.src.includes('drill-stop-shot.mp3')&&!a.paused&&a.currentTime>0));
 await page.locator('#bt-guide-pool-root button[title="Stop"]').click();
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.ok((await page.locator('#bt-guide-pool-root .btg-expanded').innerText()).includes('Orientation'));
 await page.screenshot({path:'../audio-drill-menu-preview.png',fullPage:false});
 await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:/^Resources$/}).click();
 assert.equal(await page.locator('#bt-guide-pool-root select option[value^="recommend-zero-x-"]').count(),5);
 async function finishResource(id,destination){
  const before=await page.evaluate(()=>window.__openedResources.length);
  await page.locator('#bt-guide-pool-root select').selectOption(id);
  await page.waitForFunction(id=>window.__playedAudio.some(a=>a.dataset.topic===id&&!a.paused&&a.currentTime>0),id);
  const time=await page.evaluate(id=>window.__playedAudio.find(a=>a.dataset.topic===id).currentTime,id);
  assert.ok(time<2,'New selection starts at the beginning');
  assert.equal(await page.evaluate(()=>window.__openedResources.length),before,'No website before narration ends');
  // Seek close to the end, then let real playback emit ended.
  const popupPromise=context.waitForEvent('page');
  await page.evaluate(id=>{const a=window.__playedAudio.find(a=>a.dataset.topic===id);a.currentTime=a.duration-.2},id);
  const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  assert.ok(popup.url().includes(destination));await popup.close();
  assert.equal(await page.evaluate(id=>window.__playedAudio.find(a=>a.dataset.topic===id).ended,id),true);
 }
 // Stop cancels the delayed navigation; replaying after Stop does not navigate.
 await page.locator('#bt-guide-pool-root select').selectOption('recommend-zero-x-overview');
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='recommend-zero-x-overview'&&!a.paused&&a.currentTime>0));
 await page.locator('#bt-guide-pool-root button[title="Stop"]').click();
 await page.locator('#bt-guide-pool-root button[title="Play / Pause"]').click();
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='recommend-zero-x-overview'&&!a.paused&&a.currentTime>0));
 await page.evaluate(()=>{const a=window.__playedAudio.find(a=>a.dataset.topic==='recommend-zero-x-overview');a.currentTime=a.duration-.2});
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='recommend-zero-x-overview'&&a.ended));
 assert.equal(await page.evaluate(()=>window.__openedResources.length),0,'Stop cancels website opening');
 await finishResource('recommend-zero-x-overview','UCYuUos0iwnvdBL8URuNvrNA');
 if(await page.evaluate(()=>billiardsPoolGuide.getState().expanded!=='more'))await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.equal(await page.locator('#bt-guide-pool-root .btg-resource-links a').count(),2);
 assert.equal(await page.locator('#bt-guide-pool-root .btg-expanded p, #bt-guide-pool-root .btg-expanded strong').count(),0,'Resource More contains links only');
 for(const [id,video] of [['recommend-zero-x-center-ball','5_mC1ZePXpA'],['recommend-zero-x-position-play','Cya-0vjQ_7Y'],['recommend-zero-x-eight-ball-patterns','V0dAZInUiTE'],['recommend-zero-x-defense-recovery','UcTAFFQOHm0']]){
  await finishResource(id,'v='+video);
  assert.ok((await page.locator('#bt-guide-pool-root .btg-resource-links a').first().getAttribute('href')).includes('v='+video));
 }
 assert.equal(await page.locator('#bt-guide-pool-root .btg-categories button').filter({hasText:/^Controls$/}).count(),0);
 await page.click('#btg-pool-explore');
 const rackSection=page.locator('#panel .section').filter({has:page.locator('#fullRackSelect')});
 if(!await page.locator('#fullRackSelect').isVisible())await rackSection.locator('.sectionToggle').click();
 await page.locator('#fullRackSelect').click();
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.src.includes('main-pick-and-play-full-racks.mp3')&&!a.paused&&a.currentTime>0));
 assert.equal(await page.evaluate(()=>window.__spokenText.length),0);
 const expected={showAngleLockControl:'main-show-cue-target-lock-control',showImpact:'main-show-impact-cue-ball-and-overlap',showTipBadge:'main-show-cue-tip-contact-badge',showPaths:'main-show-trajectory-preview',showGrid:'main-show-diamond-connected-grid',showDiamonds:'main-show-rail-diamonds',showTable:'main-show-table-and-balls',showScoreBoard:'main-show-player-controls',showBankKickNumbers:'main-show-bank-and-kick-rail-numbers'};
 const features=page.locator('#panel .section').filter({hasText:'FEATURES & OPTIONS'});
 if(!await page.locator('#showAngleLockControl').isVisible())await features.locator('.sectionToggle').click();
 assert.equal(await features.locator('input').count(),Object.keys(expected).length);
 for(const [id,topic] of Object.entries(expected)){
  const input=page.locator('#'+id),label=page.locator('label[for="'+id+'"]');
  assert.equal(await input.getAttribute('data-guide-topic'),topic);
  assert.equal(await label.getAttribute('data-guide-topic'),topic);
  const before=await input.isChecked();
  for(const target of [input,label]){
   await target.click();assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),topic);
   await page.waitForFunction(id=>window.__playedAudio.some(a=>a.src.includes(id+'.mp3')&&!a.paused&&a.currentTime>0),topic);
   assert.equal(await input.isChecked(),before,'Explorer must not toggle '+id);
  }
 }
 const playback=await page.evaluate(()=>({active:window.__playedAudio.filter(a=>!a.paused).length,volumes:window.__playedAudio.map(a=>a.volume)}));assert.equal(playback.active,1);assert.ok(playback.volumes.every(v=>v===.8));
 await page.click('#btg-pool-explore');
 await page.click('#analyzePhotoBtn');
 await page.waitForSelector('#photoAnalyzerModal.open');
 await page.click('#btg-analyze-start');
 await page.waitForFunction(()=>billiardsAnalyzeGuide.getState().category==='start');
 assert.ok((await page.locator('#bt-guide-root select').inputValue()).startsWith('analyze-start-'));
 assert.equal(await page.evaluate(()=>billiardsAnalyzeGuide.getState().autoplay),true);
 await page.locator('#bt-guide-root select').selectOption('analyze-start-inspect');
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.src.includes('analyze-photo-wheel-zoom.mp3')&&!a.paused&&a.currentTime>0));
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
 assert.equal(await page.evaluate(()=>window.__spokenText.length),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({records:result.count,drillGroups:groups,allAudioFetches:'366 successful',welcomes:'Guide intro autoplays on open/reopen, Play/Pause and Read work, Auto advances into selected category; 5 category MP3s play',resourcePopups:'5 verified destinations open only after real audio ended; Stop cancels navigation',offlineReload:'passed',mp3Playback:'decoded and advancing',dedicatedMappings:result,browserErrors:errors,featuresAndOptions:'9 controls and 9 labels play their dedicated MP3 without mutation',controlsTab:'removed',zeroXLinks:2}));
 await browser.close();server.kill();
})().catch(e=>{console.error(e);server.kill();process.exit(1)});
