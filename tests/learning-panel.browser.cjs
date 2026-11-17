const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/learning-panel';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8833']);await new Promise(r=>server.stdout.once('data',r));let browser;const failures=[];
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
for(const [width,height,mobile] of [[2048,1280,false],[1366,768,false],[1024,768,false],[844,390,true],[640,360,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));const state=()=>page.evaluate(()=>billiardsLearningPanel.getState()),audio=()=>page.evaluate(()=>billiardsPoolGuide.getPlaybackState());
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const menu=()=>page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'));
 const same=(a,b)=>{assert.equal(b.topicId,a.topicId,'Lesson unchanged by presentation');assert.equal(b.src,a.src,'One audio source is retained');assert(Math.abs(b.time-a.time)<1.2,'Playback position survives presentation change: '+JSON.stringify({a,b}));};
 async function waitMode(mode){await page.waitForFunction(mode=>billiardsLearningPanel.getState().mode===mode,mode);await settle();}
 async function gaps(mode){const g=await page.evaluate(()=>{const box=e=>e.getBoundingClientRect().toJSON();const spin=document.querySelector('#phoneActions>.bottomSpinGroup.activeSpin'),shoot=document.querySelector('#phoneActions>[data-trainer-action=animate]'),view=document.querySelector('#table3DViews');return{spin:box(spin),shoot:box(shoot),view:box(view)};});const gap=g.shoot.x-g.spin.right;assert(gap>=0&&gap<=8,mode+' Shoot/LR gap is small: '+gap);assert(g.shoot.width>=105,'Shoot uses intended width without legacy cap');if(mode==='3d')assert(g.shoot.x-g.view.right>=0&&g.shoot.x-g.view.right<=8,'Shoot fills up to 3D view adjustment: '+JSON.stringify(g));}
 try{await page.goto('http://127.0.0.1:8833/?train=1');await page.waitForFunction(()=>window.billiardsLearningPanel&&window.billiardsMenuReady);
 const order=await page.locator('#panel>.section').evaluateAll(es=>es.map(e=>e.id));assert.equal(order[order.indexOf('tableSection')+1],'learningSection','Learning is directly below Table & Balls');
 for(const mode of ['2d','3d']){
  if(await page.evaluate(()=>Billiards3D.active)!==(mode==='3d')){await page.locator('#table3DToggle').click();await page.waitForFunction(active=>Billiards3D.active===active,mode==='3d');}
  if(!await menu())await page.locator('#phoneControls').click();
  await page.locator('#btg-pool-start').click();await waitMode('full');assert.equal(await page.evaluate(()=>Billiards3D.active),mode==='3d','Learning shortcut preserves table mode');
  assert(await menu());assert.equal(await page.locator('#learningSection').evaluate(e=>e.classList.contains('open')),true);assert.equal((await state()).trayRetracted,true,'Learning retracts the balls');
  const headings=await page.locator('#learningSection>.sectionToggle,#tableSection>.sectionToggle').evaluateAll(es=>es.map(e=>{const c=getComputedStyle(e);return{height:e.getBoundingClientRect().height,font:c.font,padding:c.padding};}));assert.deepEqual(headings[0],headings[1],'Learning matches existing main tab sizing');
  await page.waitForFunction(()=>{const a=billiardsPoolGuide.getPlaybackState();return a.duration>2&&!a.paused;});
  const visibility=await page.locator('#learningFullSlot [data-action=A]').evaluate(e=>{const chain=[];for(let a=e;a;a=a.parentElement){const c=getComputedStyle(a);chain.push({tag:a.tagName,id:a.id,cls:a.className,hidden:a.hidden,display:c.display,visibility:c.visibility,rect:a.getBoundingClientRect().toJSON()});}return chain;});
  assert(visibility[0].rect.height>0,'Full player visibility: '+JSON.stringify(visibility));

  if(await page.locator('#learningFullSlot [data-action=A]').getAttribute('aria-pressed')==='true')await page.locator('#learningFullSlot [data-action=A]').click();
  const controls=await page.locator('#learningFullSlot .btg-toolbar>button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>({label:e.textContent,rect:e.getBoundingClientRect().toJSON()})));assert(controls.every(c=>c.rect.height>=44),'Full transport controls are finger sized');
  assert((await page.locator('#learningTranscript').inputValue()).length>100);assert((await page.locator('#learningTranscript').boundingBox()).height>=180);assert.equal(await page.locator('#learningTranscript').getAttribute('readonly'),'');
  await page.screenshot({path:dir+'/'+name+'-'+mode+'-full.png'});
  const before=await audio();await page.locator('#learningReturnToTable').click();await waitMode('mini');assert.equal(await menu(),false,'Return to Table closes drawer');same(before,await audio());assert.equal((await audio()).paused,false,'Returning to table keeps audio playing');
  assert(await page.locator('#learningMiniPlayer').isVisible());assert.equal(await page.locator('#workspaceBalls').isVisible(),false);await gaps(mode);
  await page.locator('#learningMiniSlot [data-action="play-pause"]').click();await page.waitForFunction(()=>billiardsPoolGuide.getPlaybackState().paused);
  const held=await audio();await page.locator('#phoneTrayToggle').click();await waitMode('tray');assert.equal(await menu(),false);assert.equal(await page.locator('#learningMiniPlayer').isVisible(),false,'Opening balls tucks player away');assert(await page.locator('#workspaceBalls').isVisible());same(held,await audio());
  const add=page.locator('#workspaceBalls .workspaceBall:not(:disabled)').last();if(await add.count())await add.click();
  await page.locator('#phoneTrayToggle').click();await waitMode('mini');same(held,await audio());assert.equal(await page.locator('#workspaceBalls').isVisible(),false);assert(await page.locator('#learningMiniPlayer').isVisible());
  await page.screenshot({path:dir+'/'+name+'-'+mode+'-mini.png'});
  await page.locator('#learningExpand').click();await waitMode('full');assert(await menu());same(held,await audio());
  await page.locator('#phoneTrayToggle').click();await waitMode('tray');await page.locator('#phoneTrayToggle').click();await waitMode('full');assert(await menu(),'Closing tray restores previous full player');same(held,await audio());
  await page.locator('#learningGuide').click();await waitMode('full');await page.evaluate(()=>billiardsPoolGuide.pause());
  await page.locator('#learningFullSlot .btg-categories button').filter({hasText:'Resources'}).click();await page.evaluate(()=>billiardsPoolGuide.pause());
  const links=await page.locator('#learningFullSlot a[href]').evaluateAll(es=>es.map(e=>({text:e.textContent,url:e.href})));assert(links.some(l=>/youtube\.com|youtu\.be/.test(l.url)),'YouTube resources remain available');assert(links.some(l=>!(/youtube\.com|youtu\.be/.test(l.url))),'Other references remain available');
  assert((await page.locator('#learningTranscript').inputValue()).length>50,'Resource narration has full readable text');await page.screenshot({path:dir+'/'+name+'-'+mode+'-resources.png'});
  await page.locator('#learningReturnToTable').click();await waitMode('mini');await page.locator('#learningClose').click();await waitMode('off');assert.equal(await page.locator('#learningMiniPlayer').isVisible(),false);assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().enabled),false);assert.equal((await audio()).paused,true);
  console.log(name+' '+mode+': full player, mini continuity, tray restoration, references and Shoot gaps passed');
 }
 assert.deepEqual(errors,[]);console.log(name+': matching Learning tab; both top shortcuts/modes; large player/full text/resources; continuous full↔mini; tray retract/edit/restore; Shoot/LR and 3D adjustment gap passed');
 }catch(e){console.error(name+': '+e.stack);failures.push(name+': '+e.message);await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});}finally{await context.close();}
 if(failures.length)break;
}
assert.deepEqual(failures,[]);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
