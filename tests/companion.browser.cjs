'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('../companion-dev/server.cjs');
const out=process.env.COMPANION_TEST_OUTPUT||'/tmp/billiards-companion-checks';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const host=createServer({port:0});const origin=await host.listen();let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote',...(process.env.CHROMIUM_SINGLE_PROCESS?['--single-process','--disable-gpu']:[])]});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.SpeechRecognition=class{start(){this.onstart?.();this.onresult?.({results:[[{transcript:'A dictated practice thought'}]]});this.onend?.();}stop(){this.onend?.();}};window.__readText='';window.speechSynthesis.speak=u=>{window.__readText=u.text;u.onend?.();};});
  // Fixture responses are confined to tests. The product has no simulated AI mode.
  let connected=true,submitted=[];
  await page.route('**/api/companion/**',async route=>{
   const url=new URL(route.request().url()),p=url.pathname.split('/').pop();let data;
   if(p==='session')data={connected,sharing:connected};if(p==='models')data={models:[{slug:'fixture-model',displayName:'Test fixture'}]};
   if(p==='reply'){const req=route.request().postDataJSON();submitted.push(req);const a=req.messages.at(-1).attachments.find(a=>a.kind==='layout');const layout=JSON.parse(JSON.stringify(a?.layout||{name:'Test',tableL:2.54,tableW:1.27,ballR:.028575,balls:[{id:0,x:.5,y:.5},{id:1,x:1.5,y:.7}]}));layout.balls.find(b=>b.id===0).x+=.08;data={text:JSON.stringify({text:'Compare this hypothetical cue-ball finish with your original position.',layouts:[{title:'A finish to compare',layout,annotations:[{type:'region',at:{x:.4,y:.5},radius:.08}]}]})};}
   if(p==='disconnect'){connected=false;data={ok:true};}await route.fulfill({json:data||{},status:200});
  });
  await page.goto(origin+'/?companion=1');await page.waitForFunction(()=>window.billiardsCompanion&&window.billiardsPoolGuide);await page.waitForFunction(()=>document.querySelector('#phModel').value==='fixture-model');
  assert(await page.locator('#practiceHub').isVisible());assert(await page.locator('#canvas').isVisible());
  await page.evaluate(()=>{const s=billiardsTourBridge.capture(),L=s.state.tableL,W=s.state.tableW;s.state.balls=[{id:0,n:'CB',x:L*.2,y:W*.5,active:true},{id:1,n:'1',x:L*.55,y:W*.4,active:true},{id:2,n:'2',x:L*.7,y:W*.7,active:true}];s.state.allowMissingCueBall=false;s.state.freeAim={x:L*.55,y:W*.4};billiardsTourBridge.restore(s);});
  const baseline=await page.evaluate(()=>billiardsTourBridge.capture());
  await page.click('#phAttachTable');await page.selectOption('#phSource','physical_report');await page.click('#phAttachTable');
  const snapshots=await page.evaluate(()=>billiardsCompanion.getState().pending);assert.equal(snapshots.length,2);assert.equal(snapshots[1].source,'physical_report');
  await page.evaluate(()=>{const s=billiardsTourBridge.capture();s.state.balls.find(b=>b.id===0).x+=.03;billiardsTourBridge.restore(s);});
  assert.equal((await page.evaluate(()=>billiardsCompanion.getState().pending[0].layout.balls.find(b=>b.id===0).x)),snapshots[0].layout.balls.find(b=>b.id===0).x);
  await page.locator('#phPending button').filter({hasText:'Remove'}).first().click();await page.fill('#phInput','This is approximately where it finished. What can I explore?');await page.click('#phSend');await page.waitForFunction(()=>billiardsCompanion.getState().messages.length===2);
  assert.equal(submitted[0].messages[0].attachments[0].source,'physical_report');assert.equal(await page.locator('.ph-message[data-role=assistant] canvas').count(),1);
  const prior=await page.evaluate(()=>billiardsTourBridge.capture());await page.locator('.ph-message[data-role=assistant]').getByRole('button',{name:'← Use on table',exact:true}).click();
  const changed=await page.evaluate(()=>billiardsTourBridge.capture());assert.notEqual(changed.state.balls.find(b=>b.id===0).x,prior.state.balls.find(b=>b.id===0).x);assert.equal(changed.state.muRoll,prior.state.muRoll);assert(await page.locator('#phClearMarks').isVisible());
  await page.click('#phRestoreTable');const restored=await page.evaluate(()=>billiardsTourBridge.capture());assert.deepEqual(restored.state.balls,prior.state.balls);assert.equal(restored.state.muRoll,prior.state.muRoll);
  await page.locator('.ph-message[data-role=assistant]').getByRole('button',{name:'Sketch',exact:true}).click();const box=await page.locator('dialog canvas').boundingBox();await page.mouse.move(box.x+box.width*.25,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.up();await page.getByRole('button',{name:'Attach sketch',exact:true}).click();assert.equal((await page.evaluate(()=>billiardsCompanion.getState().pending[0].annotations)).at(-1).type,'arrow');
  await page.locator('.ph-message[data-role=assistant]').getByRole('button',{name:'Read aloud',exact:true}).click();assert.match(await page.evaluate(()=>window.__readText),/hypothetical/);await page.click('#phDictate');assert.equal(await page.locator('#phInput').inputValue(),'A dictated practice thought');assert.equal((await page.evaluate(()=>billiardsCompanion.getState().messages.length)),2,'Dictation never submits a message');
  await page.setInputFiles('#phFiles',{name:'table-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=','base64')});await page.waitForFunction(()=>billiardsCompanion.getState().pending.some(a=>a.kind==='image'));
  await page.screenshot({path:path.join(out,'companion-desktop.png')});
  await page.fill('#phInput','Unsent discovery');await page.reload();await page.waitForFunction(()=>window.billiardsCompanion&&document.querySelector('#phInput').value==='Unsent discovery');assert.equal((await page.evaluate(()=>billiardsCompanion.getState().messages.length)),2);assert.equal((await page.evaluate(()=>billiardsCompanion.getState().pending.length)),2);
  await page.click('[data-page=notes]');await page.fill('#phNoteInput','The angle started looking right.');await page.click('#phSaveNote');await page.waitForFunction(()=>billiardsCompanion.getState().notes.length===1);await page.getByRole('button',{name:'Bring to Companion',exact:true}).click();assert.equal((await page.evaluate(()=>billiardsCompanion.getState().pending.length)),3);
  await page.click('[data-page=library]');await page.fill('#phSearch','stop');await page.waitForFunction(()=>document.querySelectorAll('#phLibrary .ph-card').length>0);assert(await page.locator('#phLibrary').innerText());await page.locator('#phLibrary .ph-card').first().click();assert.equal(await page.locator('#practiceHub').isVisible(),false);assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().enabled),true);
  await page.click('#phHubTab');assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().enabled),false);await page.click('[data-page=companion]');
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});const cdp=await context.newCDPSession(page),{windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>billiardsCompanion.open(true));const composer=await page.locator('#phCompose').boundingBox();assert(composer.x>=0&&composer.x+composer.width<=391);assert(composer.y>=0&&composer.y+composer.height<=844);assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(out,'companion-phone.png')});await page.click('#phBackTable');assert.equal(await page.locator('#practiceHub').isVisible(),false);await page.click('#phPhoneLaunch');assert(await page.locator('#practiceHub').isVisible());
  // A disconnected app retains the draft and never manufactures an assistant reply.
  await page.locator('#phConnection summary').click();await page.click('#phDisconnect');await page.click('#phSend');assert.equal((await page.evaluate(()=>billiardsCompanion.getState().messages.length)),2);assert.equal(await page.locator('#phInput').inputValue(),'Unsent discovery');assert.match(await page.locator('#phStatus').innerText(),/Connect ChatGPT/);
  assert.deepEqual(errors,[]);await page.goto(origin+'/?train=1');await page.waitForFunction(()=>window.billiardsCompanion);assert.equal(await page.locator('#practiceHub').isVisible(),false);assert(await page.locator('#speed').count());assert.deepEqual(errors,[]);
  console.log('Desktop and phone: immutable snapshots, provenance, table round-trip, calibration preservation, sketching, draft/history persistence, reflections, lesson handoff, disconnected behavior, and no page errors passed.');
 }finally{await browser?.close();await new Promise(resolve=>host.server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
