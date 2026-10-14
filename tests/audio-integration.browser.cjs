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
 assert.equal(result.count,385);assert.deepEqual(result.missing,[]);assert.deepEqual(result.invalid,[]);
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
 assert.equal(await page.locator('#bt-guide-pool-root .btg-setup-actions button').count(),1,'Read contains starting-layout shortcut');
 await page.evaluate(()=>{const original=JSON.parse(localStorage.getItem('billiardTrainerState'));window.beforeControls={speed:original.speed,follow:original.follow,muRoll:original.muRoll};});
 await page.locator('#bt-guide-pool-root .btg-setup-actions button').click();
 const expectedLayout=await page.evaluate(async()=>{const r=await fetch('./guide/layouts/drill-stop-shot.billiards.json');return (await r.json()).layout});
 const table=await page.evaluate(()=>JSON.parse(localStorage.getItem('billiardTrainerState')));
 const beforeControls=await page.evaluate(()=>beforeControls);for(const key of Object.keys(beforeControls))assert.equal(table[key],beforeControls[key],'Practice reset preserves '+key);
 for(const b of expectedLayout.balls){const actual=table.balls.find(x=>x.id===b.id);assert.ok(actual);assert.ok(Math.abs(actual.x-b.x)<1e-8&&Math.abs(actual.y-b.y)<1e-8);}
 assert.ok(await page.locator('#bt-guide-pool-root button').filter({hasText:/^Balls$/}).count());
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.equal(await page.locator('#bt-guide-pool-root .btg-setup-actions button').count(),1,'More contains starting-layout shortcut');
 await page.locator('#bt-guide-pool-root .btg-setup-actions button').click();

 assert.ok((await page.locator('#bt-guide-pool-root .btg-expanded').innerText()).includes('Orientation'));
 await page.screenshot({path:'../audio-drill-menu-preview.png',fullPage:false});
 await page.locator('#bt-guide-pool-root select').selectOption('practice-target-landing');
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^Read$/}).click();
 assert.ok((await page.locator('#bt-guide-pool-root .btg-resource-links a').first().getAttribute('href')).includes('-WdC_7MN0qI'),'Read links directly to Dr Dave');
 await page.locator('#bt-guide-pool-root button').filter({hasText:/^More$/}).click();
 assert.ok((await page.locator('#bt-guide-pool-root .btg-resource-links a').first().getAttribute('href')).includes('-WdC_7MN0qI'),'More links directly to Dr Dave');
 await page.locator('#bt-guide-pool-root button[title="Autoplay next lesson"]').click();
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.topic==='practice-target-landing'&&!a.paused&&a.currentTime>0));
 await page.evaluate(()=>{window.picker=document.querySelector('#bt-guide-pool-root select');window.detail=document.querySelector('#bt-guide-pool-root .btg-expanded');picker.focus();window.browsedValue=picker.value;});
 // Use a natural end: old VBR MP3 tail seeking can wait for nonexistent padding.
 await page.waitForFunction(()=>billiardsPoolGuide.getState().topicId==='practice-rock-around-clock',{},{timeout:45000});
 assert.equal(await page.evaluate(()=>document.querySelector('#bt-guide-pool-root select')===picker&&picker.isConnected&&picker.value===browsedValue&&document.activeElement===picker),true,'Auto leaves native picker and browsing value untouched');
 assert.equal(await page.evaluate(()=>document.querySelector('#bt-guide-pool-root .btg-expanded')===detail),true,'Reading area stays mounted');
 assert.ok((await page.locator('#bt-guide-pool-root .btg-current-lesson').innerText()).includes('Rock Around the Clock'),'Current title updates independently');
 await page.locator('#bt-guide-pool-root select').selectOption('drill-stop-shot');
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().topicId),'drill-stop-shot','Browsed selection still works');
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
 assert.equal(await page.locator('#bt-guide-pool-root .btg-expanded > p, #bt-guide-pool-root .btg-expanded > strong').count(),0,'Resource More has no unrelated practice text');
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
 const cornerOrder=await page.locator('.photoAnalyzerToolbar button').evaluateAll(nodes=>nodes.filter(n=>['photoChooseImage','photoFindCorners','photoResetCorners','photoFineTune','photoAutoRailsBtn'].includes(n.id)).map(n=>[n.id,n.textContent]));
 assert.deepEqual(cornerOrder,[['photoChooseImage','Choose Image'],['photoFindCorners','Find / Add Corners'],['photoResetCorners','Reset Corners'],['photoFineTune','Custom Table Layouts'],['photoAutoRailsBtn','Corner Sensing']]);
 for(const [width,height] of [[500,1000],[1000,500]]){
  const data=await page.evaluate(({width,height})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#171717';ctx.fillRect(0,0,width,height);ctx.fillStyle='#187b56';ctx.fillRect(70,70,width-140,height-140);return c.toDataURL('image/png').split(',')[1]},{width,height});
  await page.locator('#photoFileInput').setInputFiles({name:'table-'+width+'x'+height+'.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  await page.waitForFunction(({width,height})=>{const c=document.querySelector('#photoAnalyzerCanvas');return !document.querySelector('#photoArchiveSave').disabled&&Math.abs(c.width/c.height-width/height)<.01},{width,height}).catch(async e=>{console.log(await page.evaluate(()=>({status:document.querySelector('#photoAnalyzerStatus').textContent,state:billiardsAnalyzeGuide.getState(),canvas:[photoAnalyzerCanvas.width,photoAnalyzerCanvas.height]})),errors);throw e});
  await page.click('#photoFindCorners');assert.equal(await page.locator('#photoCalibrationPanel').isVisible(),true);
  assert.ok((await page.locator('#photoAnalyzerStatus').innerText()).includes('first two points follow one long rail'));
  await page.click('#photoAutoRailsBtn');await page.waitForFunction(()=>!document.querySelector('#photoAnalyzeNow').disabled);
  assert.ok((await page.locator('#photoAnalyzerStatus').innerText()).includes('Corner Sensing estimated'));
  assert.match(await page.locator('#photoFootSpotHint').textContent(),/Foot spot check: no clear rack dot found/);
  const expectedBox=height>width?'0 0 236 416':'0 0 416 236';assert.equal(await page.locator('#photoCalibrationDiagram').getAttribute('viewBox'),expectedBox);
  await page.locator('#photoOrientation').selectOption(height>width?'top':'left');
  await page.click('#photoFlipEnds');assert.equal(await page.locator('#photoOrientation').inputValue(),height>width?'bottom':'right');
  await page.click('#photoFlipEnds');assert.equal(await page.locator('#photoOrientation').inputValue(),height>width?'top':'left');
  if((await page.locator('#photoAiModeBtn').innerText())!=='AI: OFF')await page.click('#photoAiModeBtn'); // Hybrid blank-cloth analysis.
  await page.click('#photoAnalyzeNow');assert.equal(await page.locator('#photoCalibrationPanel').isVisible(),false);
  assert.equal(await page.locator('#photoFineTune').getAttribute('aria-expanded'),'false');
  await page.waitForFunction(()=>!document.querySelector('#photoAnalyzeNow').disabled);
  await page.click('#photoFineTune');assert.equal(await page.locator('#photoCalibrationPanel').isVisible(),true);

  await page.click('#photoAddMissed');assert.equal(await page.locator('#photoAddMissed').innerText(),'Place One Ball');
  const box=await page.locator('#photoAnalyzerCanvas').boundingBox();await page.locator('#photoAnalyzerCanvas').click({position:{x:box.width/2,y:box.height/2}});
  assert.equal(await page.locator('#photoAddMissed').innerText(),'Add Missed Ball');
  const count=await page.locator('#photoBallCount').innerText();await page.locator('#photoAnalyzerCanvas').click({position:{x:box.width/2,y:box.height/2}});assert.equal(await page.locator('#photoBallCount').innerText(),count,'Second tap adds no extra ball');
  await page.click('#photoResetCorners');assert.equal(await page.locator('#photoAnalyzeNow').isDisabled(),true);
 }
 // Walkthrough: real image loading, alignment, analysis, review and both Apply routes.
 const headerIds=await page.locator('.photoAnalyzerHeader button').evaluateAll(nodes=>nodes.map(n=>n.id));
 assert.ok(headerIds.indexOf('photoAiModeBtn')===headerIds.indexOf('photoWalkthroughBtn')+1);
 assert.equal(await page.locator('.photoAnalyzerToolbar #photoAiModeBtn').count(),0);
 await page.click('#photoWalkthroughBtn');assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'choose');
 const chooserPromise=page.waitForEvent('filechooser');await page.click('#photoChooseImage');const chooser=await chooserPromise;
 assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'picker');
 const walkImage=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=500;const x=c.getContext('2d');x.fillStyle='#171717';x.fillRect(0,0,1000,500);x.fillStyle='#187b56';x.fillRect(70,70,860,360);return c.toDataURL('image/png').split(',')[1];});
 await chooser.setFiles({name:'walkthrough-table.png',mimeType:'image/png',buffer:Buffer.from(walkImage,'base64')});
 await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='find');
 await page.click('#photoFindCorners');await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='corners');
 await page.click('#photoAutoRailsBtn');await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='orientation');
 await page.click('#photoWalkthroughBack');await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'corners');
 await page.click('#photoWalkthroughNext');await page.click('#photoWalkthroughNext');assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'rack');
 await page.locator('#photoRackType').selectOption('9ball');await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='analyze');
 await page.click('#photoAnalyzeNow');await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='review');
 assert.equal(await page.locator('#photoWalkthroughNext').isDisabled(),true);
 await page.click('#photoAddMissed');const walkBox=await page.locator('#photoAnalyzerCanvas').boundingBox();await page.locator('#photoAnalyzerCanvas').click({position:{x:walkBox.width/2,y:walkBox.height/2}});
 await page.locator('#photoDetectionList select').first().selectOption('0');await page.waitForFunction(()=>!document.querySelector('#photoWalkthroughNext').disabled);
 await page.click('#photoWalkthroughNext');assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'save');
 await page.click('#photoArchiveSave');await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().imageSaved&&!billiardsWalkthroughBridge.snapshot().archiveBusy);
 await page.click('#photoWalkthroughNext');assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'apply');
 await page.locator('#photoLayoutName').fill('Walkthrough verified layout');await page.click('#photoApplySave');
 await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='complete');assert.equal(await page.locator('#photoAnalyzerModal').isVisible(),false);
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.dataset.walkthroughStep==='complete'&&!a.paused&&a.currentTime>0));
 await page.click('#analyzePhotoBtn');await page.click('#photoWalkthroughBtn');
 const nativeFile=await page.evaluate(async()=>{const d=await BilliardsPracticeLayouts.load();return fetch(Object.values(d.layouts)[0].url).then(r=>r.text())});
 await page.locator('#photoLayoutFileInput').setInputFiles({name:'repeat-drill.billiards.json',mimeType:'application/json',buffer:Buffer.from(nativeFile)});
 await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='review');await page.click('#photoWalkthroughNext');await page.click('#photoWalkthroughNext');await page.click('#photoApplyTable');
 await page.waitForFunction(()=>billiardsAnalyzeWalkthrough.getState().id==='complete');
 await page.click('#analyzePhotoBtn');
 assert.equal(await page.locator('#btg-analyze-start').count(),0);
 await page.click('#btg-analyze-explore');
 await page.locator('#photoFindCorners').click();
 await page.waitForFunction(()=>billiardsAnalyzeGuide.getState().topicId==='analyze-find-add-corners');
 await page.waitForFunction(()=>window.__playedAudio.some(a=>a.src.includes('analyze-find-add-corners.mp3')&&!a.paused&&a.currentTime>0));
 await page.locator('#photoChooseImage').click();
 assert.equal(await page.evaluate(()=>billiardsAnalyzeGuide.getState().topicId),'analyze-choose-table-image');
 const setups=await page.evaluate(async()=>{
  const data=await BilliardsPracticeLayouts.load();const failures=[];
  for(const [id,entry] of Object.entries(data.layouts)){try{const res=await fetch(entry.url);const parsed=BilliardsLayoutFiles.parse(await res.text());if(!parsed.layout.balls.some(b=>b.id===0))failures.push(id);}catch(e){failures.push(id+':'+e.message)}}
  return {files:Object.keys(data.layouts).length,topics:Object.keys(data.topics).length,failures};
 });assert.equal(setups.files,29);assert.equal(setups.topics,85);assert.deepEqual(setups.failures,[]);
 const clips=await page.evaluate(async()=>{
  const data=await BilliardsRecordedAudio.load();let failed=[];
  for(let i=0;i<data.records.length;i+=12){await Promise.all(data.records.slice(i,i+12).map(async r=>{const res=await fetch(r.topic.audio);if(!res.ok||(await res.arrayBuffer()).byteLength<100)failed.push(r.topic.id)}))}
  return failed;
 });assert.deepEqual(clips,[]);
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.billiardsPoolGuide&&window.billiardsAnalyzeGuide);
 const offlineLayout=await page.evaluate(async()=>{const res=await fetch('./guide/layouts/drill-stop-shot.billiards.json');return res.ok&&(await res.json()).layout.balls.length===3});assert.ok(offlineLayout);
 const offline=await page.evaluate(async()=>{const res=await fetch('./guide/audio/drill-two-rail-kick.mp3?v=practice-ready-v8');return res.ok&&(await res.arrayBuffer()).byteLength>100});assert.ok(offline);
 await page.screenshot({path:'../audio-integration-preview.png',fullPage:false});
 assert.equal(await page.evaluate(()=>window.__spokenText.length),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({walkthrough:'image load → corners → orientation → rack → analysis → review → optional save → Apply; native layout shortcut and Back verified',records:result.count,drillGroups:groups,allAudioFetches:'385 successful',welcomes:'Guide intro autoplays on open/reopen, Play/Pause and Read work, Auto advances into selected category; 5 category MP3s play',resourcePopups:'5 verified destinations open only after real audio ended; Stop cancels navigation',offlineReload:'passed, including native saved setup',practiceSetups:'29 files mapped to 85 topics; Read, More, and Balls load/reset work',dropdown:'remains mounted and focused while Auto advances; current title updates independently',mp3Playback:'decoded and advancing',dedicatedMappings:result,browserErrors:errors,featuresAndOptions:'9 controls and 9 labels play their dedicated MP3 without mutation',controlsTab:'removed',zeroXLinks:2}));
 await browser.close();server.kill();
})().catch(e=>{console.error(e);server.kill();process.exit(1)});
