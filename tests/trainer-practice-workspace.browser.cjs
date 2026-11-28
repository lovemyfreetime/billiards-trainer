const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8921']);let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=1280,800']});
  const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'});
  await context.addInitScript(()=>{
   Element.prototype.requestFullscreen=()=>Promise.resolve();
   window.BilliardsBundledAndroid=true;window.BilliardsContentUpdateProtocol=1;
   window.BilliardsAndroid={
    forced:0,brokenStatus:true,brokenCheck:false,
    contentUpdateStatus(){if(this.brokenStatus)throw Error('status temporarily unavailable');return JSON.stringify({state:'current'});},
    checkContentUpdates(force){
     if(force)this.forced++;
     if(this.brokenCheck)throw Error('check temporarily unavailable');
     window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:{state:'current'}}));
    }
   };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let release;const gate=new Promise(r=>release=r);
  await page.route('**/guide/pool-audio-map.json*',async r=>{await gate;await r.continue();});
  await page.goto('http://127.0.0.1:8921/?train=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.billiardsMenuReady&&window.BilliardsAppUpdates);
  const tap=id=>page.locator(id).tap({timeout:10000});
  const open=async()=>{if(!await page.evaluate(()=>document.body.classList.contains('phone-controls-open')))await tap('#phoneControls');};
  const close=async()=>{if(await page.evaluate(()=>document.body.classList.contains('phone-controls-open')))await tap('#phoneControls');};
  function status(text){return page.waitForFunction(text=>{const e=document.querySelector('#appUpdateNotice');return e&&!e.hidden&&e.innerText.includes(text);},text);}
  await open();
  await tap('#btg-pool-start');
  assert.match(await page.locator('#trainerLearningStatus').innerText(),/Loading lessons/);
  release();
  await page.waitForFunction(()=>window.billiardsPoolGuide?.getState().category==='start'&&window.billiardsGetStartedTour?.getState().active);
  console.log('An early Get Started shortcut tap shows loading and opens the lesson when ready.');
  for(const view of ['2D','3D']){
   if(view==='3D'){await close();await tap('#table3DToggle');await page.waitForFunction(()=>Billiards3D.active);}
   await open();
   for(const [id,isStart] of [['#btg-pool-guide',false],['#btg-pool-start',true]]){
    await page.evaluate(()=>document.getElementById('panel').scrollTop=0);
    await tap(id);
    await page.waitForFunction(isStart=>{const s=billiardsPoolGuide.getState();return s.enabled&&(s.category==='start')===isStart&&billiardsLearningPanel.getState().mode==='full';},isStart);
    assert.equal(await page.evaluate(()=>Billiards3D.active),view==='3D','the shortcut preserves view mode');
   }
   await page.evaluate(()=>{document.getElementById('panel').scrollTop=0;BilliardsAndroid.brokenCheck=true;});
   await tap('#trainerUpdateCheck');await status('Couldn’t check for updates');
   await tap('#appUpdateNotice .appUpdateClose');
   await page.evaluate(()=>{BilliardsAndroid.brokenCheck=false;});
   await tap('#trainerUpdateCheck');await status('Your offline content is up to date');
   await tap('#appUpdateNotice .appUpdateClose');
  }
  assert.equal(await page.evaluate(()=>BilliardsAndroid.forced),4);
  console.log('Both shortcuts and Updates respond to touch in 2D and 3D, even after a failed native check.');
  await page.evaluate(()=>billiardsPoolGuide.setEnabled(false));await close();
  const setup=async(combo=false)=>page.evaluate(combo=>{
   const snap=billiardsTourBridge.capture();
   Object.assign(snap.state,{view:'2d',activeShot:1,shot2Enabled:false,guidanceEnabled:true,showPocketChances:true,showPocketGlow:true,
    showPocketGhost:true,showPaths:true,showGrid:true,showBankKickNumbers:true,showFullGhostBall:true,showRestingCueBall:true,showImpact:true,
    allowMissingCueBall:false,balls:[{id:0,n:'CB',x:1.27,y:.93,active:true},{id:1,n:'1',x:1.27,y:.49,active:true},...(combo?[{id:2,n:'2',x:1.27,y:.24,active:true}]:[])],
    speed:1.85,follow:0,sideSpin:0,cueElevationDeg:0,angleLock:false,bankKick:{mode:null,phase:null,rails:[]},
    freeAim:{x:1.27,y:.10},tableL:2.54,tableW:1.27});
   billiardsTourBridge.restore(snap);
  },combo);
  await setup();
  const guides=page.locator('#workspaceTableGuides');
  assert.equal(await guides.getAttribute('aria-checked'),'false','new players start in aim-only practice');
  const swatches=[];
  for(const view of ['3D','2D','3D']){
   if(await page.evaluate(()=>Billiards3D.active)!==(view==='3D')){await tap('#table3DToggle');await page.waitForFunction(v=>Billiards3D.active===v,view==='3D');}
   assert.match(await guides.innerText(),/Guides Off/);
   const words=await page.locator('#bottomSpin1 .phoneSpinDirections').evaluateAll(es=>es.map(e=>({
    text:[...e.children].map(s=>s.innerText),
    color:getComputedStyle(e).color,
    visible:e.getBoundingClientRect().width>0
   })));
   assert.deepEqual(words.map(row=>row.text),[['Draw','0%','Follow'],['Left spin','0%','Right spin']]);assert(words.every(r=>r.visible));
   const color=async sel=>page.locator(sel).evaluate(e=>getComputedStyle(e).color);
   assert.equal(await color('.phoneAimLabel'),words[0].color);assert.equal(await color('#tableSpeed1Label'),words[1].color);
   if(!swatches.length)swatches.push(await guides.evaluate(e=>getComputedStyle(e).borderColor));
  }
  const frozen=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
  const marks=()=>page.evaluate(()=>({
   ghosts:Billiards3D.ghostGuides().length,
   labels:Billiards3D.overlayLabels().filter(l=>/^pocket-chance|^bank-rail/.test(l.id)).length,
   handles:billiardsGuidance.aimHandles().length
  }));
  assert.deepEqual(await marks(),{ghosts:0,labels:0,handles:0});
  await guides.tap();assert.equal(await guides.getAttribute('aria-checked'),'true');
  assert.notEqual(await guides.evaluate(e=>getComputedStyle(e).borderColor),swatches[0]);
  await page.waitForFunction(()=>Billiards3D.ghostGuides().length>0&&Billiards3D.overlayLabels().some(l=>l.id.startsWith('bank-rail')));
  await guides.tap();await page.waitForFunction(()=>Billiards3D.ghostGuides().length===0&&!Billiards3D.overlayLabels().some(l=>l.id.startsWith('bank-rail')));
  assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),frozen);
  assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.showFullGhostBall),true);
  console.log('Aim-only default and restore, 2D/3D labels, color ring, and preserved table/preferences passed.');
  const selectTrack=async kind=>{
   const picker=page.locator('#workspace-picker>summary');
   if(!await page.locator('#workspace-picker').evaluate(e=>e.open))await picker.tap();
   await tap('#workspace-follow>summary');
   await tap('#workspace-follow [data-track="'+kind+'"]');
   assert.equal(await page.locator('#workspace-follow [data-track="'+kind+'"]').getAttribute('aria-pressed'),'true');
   await tap('#followMode');
   await page.waitForFunction(k=>{const c=Billiards3D.camera();return c.followCue&&c.followTrack===k;},kind);
   if(await page.locator('#workspace-picker').evaluate(e=>e.open))await picker.tap();
  };
  const trace=async(kind,combo)=>{
   await setup(combo);
   const expected=combo?2:1;
   assert((await page.evaluate(()=>billiardsTourBridge.predict())).pocketed.includes(expected),'live solver pockets the selected test ball');
   await selectTrack(kind);
   await page.evaluate(()=>{
    window.subjects=[];const take=()=>{if(!billiardsPlayback.state().running)return;const c=Billiards3D.camera(),subject=c.followBallId+':'+(c.followPocket||'');
     if(window.subjects.at(-1)!==subject)window.subjects.push(subject);};
    window.addEventListener('billiards:3d-render',take);
   });
   await tap('#phoneActions>[data-trainer-action="animate"]');
   await page.waitForFunction(()=>billiardsPlayback.state().hasReplay&&!billiardsPlayback.state().running,null,{timeout:25000});
   const found=await page.evaluate(()=>window.subjects);
   if(kind==='cue')assert(found.length&&found.every(id=>id==='0:'),'Cue Ball Only never hands off');
   else{
    assert(found.includes('1:')&&found.includes(expected+':TM'),'the camera follows the first contacted ball and reaches the actual pocket: '+found);
    if(combo)assert(found.includes('2:'),'the combination hands off to the second object before the pocket');
   }
   console.log(kind+(combo?' combination':' direct')+': '+found.join(' → '));
  };
  await trace('cue',false);
  await trace('shot',false);
  await trace('shot',true);
  assert.deepEqual(errors,[]);
  await context.close();
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
