const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/phone-proportions';fs.mkdirSync(dir,{recursive:true});
const ua='Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const setup=()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};};
const rects=(page,selectors)=>page.evaluate(list=>Object.fromEntries(list.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return [s,{x:r.x,y:r.y,width:r.width,height:r.height,font:getComputedStyle(e).fontSize}];})),selectors);
function compare(actual,expected,label){for(const [s,a] of Object.entries(actual)){const b=expected[s];for(const k of ['x','y','width','height'])assert(Math.abs(a[k]-b[k])<2,label+' '+s+' '+k+': '+a[k]+' vs '+b[k]);assert.equal(a.font,b.font,label+' '+s+' font');}}
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8829']);await new Promise(r=>server.stdout.once('data',r));
 let browser;const failures=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const viewport of [{width:844,height:390},{width:740,height:360},{width:640,height:360},{width:915,height:412}]){
   const name=viewport.width+'x'+viewport.height;
   const mobile=await browser.newContext({viewport,screen:viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:ua,serviceWorkers:'block'});await mobile.addInitScript(setup);
   const page=await mobile.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   let desktop;
   try{
    await page.goto('http://127.0.0.1:8829/?train=1');
    await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsTourBridge&&BilliardsViewport.active&&innerWidth>=1365&&innerHeight>=767);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const fit=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scale:visualViewport.scale,physicalWidth:visualViewport.width*visualViewport.scale,physicalHeight:visualViewport.height*visualViewport.scale}));
    console.log(name+' fitted viewport '+JSON.stringify(fit));
    assert(Math.abs(fit.physicalWidth-viewport.width)<2&&Math.abs(fit.physicalHeight-viewport.height)<2,'The complete layout fits the actual phone screen');
    desktop=await browser.newContext({viewport:{width:fit.width,height:fit.height},hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});await desktop.addInitScript(setup);const reference=await desktop.newPage();reference.setDefaultTimeout(10000);
    await reference.goto('http://127.0.0.1:8829/?train=1');await reference.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsTourBridge);
    const controls=['#stageWrap','#phoneAimRail','#phoneSpeedRail','#workspaceBallShelf','#phoneActions','[data-trainer-action=animate]','#table3DToggle','#phoneControls'];
    compare(await rects(page,controls),await rects(reference,controls),name+' 2D');
    const felt=await page.evaluate(()=>billiardsTourBridge.feltBounds()),refFelt=await reference.evaluate(()=>billiardsTourBridge.feltBounds());
    for(const k of ['width','height'])assert(Math.abs(felt[k]-refFelt[k])<2,'Actual 2D table keeps desktop '+k);
    assert(felt.height/fit.height>.45,'The table retains useful height');
    await page.screenshot({path:dir+'/'+name+'-2d.png'});
    const picker=page.locator('#workspace-picker');
    const centerBefore=await page.locator('#workspace-picker > summary').boundingBox();
    for(const p of [page,reference])await p.locator('#workspace-picker > summary').tap();
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
    compare(await rects(page,['.workspacePickerFan','#workspace-picker > summary','#workspace-setup > summary','#workspace-view > summary','#workspace-motion > summary','#workspace-follow > summary']),await rects(reference,['.workspacePickerFan','#workspace-picker > summary','#workspace-setup > summary','#workspace-view > summary','#workspace-motion > summary','#workspace-follow > summary']),name+' compact picker');
    assert.deepEqual(await page.locator('#workspace-picker > summary').boundingBox(),centerBefore,'Center stays fixed');
    const spacing=await page.evaluate(()=>{const c=document.querySelector('#workspace-picker > summary').getBoundingClientRect(),f=document.querySelector('.workspacePickerFan').getBoundingClientRect(),es=[...document.querySelectorAll('.workspaceTaskMenu > summary')].map(e=>e.getBoundingClientRect()),points=es.map(r=>[r.x+r.width/2,r.y+r.height/2]);return {width:f.width,height:f.height,gaps:points.map(([x,y])=>Math.hypot(x-c.x-c.width/2,y-c.y-c.height/2)-c.width),chords:points.slice(1).map(([x,y],i)=>Math.hypot(x-points[i][0],y-points[i][1])-c.width)};});
    assert(spacing.width<=154&&spacing.height<=110);assert([...spacing.gaps,...spacing.chords].every(g=>g>=4&&g<=8),'Even small gaps around all picker circles');
    await page.screenshot({path:dir+'/'+name+'-picker.png'});
    await page.locator('#workspace-picker > summary').tap();assert.equal(await picker.evaluate(e=>e.open),false,'Center toggles picker closed');
    await page.locator('#workspace-picker > summary').tap();await page.touchscreen.tap(fit.width*.75,fit.height*.4);assert.equal(await picker.evaluate(e=>e.open),false,'Cloth tap dismisses picker even when gameplay stops event bubbling');
    await reference.keyboard.press('Escape');
    for(const p of [page,reference])await p.locator('#phoneControls').tap();
    compare(await rects(page,['#panel','#panel h1','#menuHeaderActions','#shotSection']),await rects(reference,['#panel','#panel h1','#menuHeaderActions','#shotSection']),name+' menu');
    await page.screenshot({path:dir+'/'+name+'-tools.png'});
    await page.locator('#speedNumber').fill('2.3');await page.locator('#speedNumber').press('Tab');assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.speed),2.3);
    for(const p of [page,reference])await p.locator('#phoneControls').tap();
    const aimBefore=await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim);
    const aim=await page.evaluate(()=>{const r=canvas.getBoundingClientRect(),b=billiardsTourBridge.feltBounds();return {x:r.x+b.left+b.width*.72,y:r.y+b.top+b.height*.62};});
    await page.touchscreen.tap(aim.x,aim.y);assert.notDeepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),aimBefore,'Scaled cloth taps still aim correctly');
    for(const p of [page,reference]){await p.locator('#table3DToggle').tap();await p.waitForFunction(()=>Billiards3D.active);}
    compare(await rects(page,[...controls,'#table3DPhoneControls']),await rects(reference,[...controls,'#table3DPhoneControls']),name+' 3D');
    await page.screenshot({path:dir+'/'+name+'-3d.png'});
    const before=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
    await page.locator('[data-trainer-action=animate]').tap();await page.waitForFunction(()=>billiardsZenControls.status().undo&&!billiardsZenControls.status().busy,{},{timeout:30000});
    assert.notDeepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before,'Scaled Shoot remains playable');
    await page.locator('[data-trainer-action=undoShot]').tap();assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before,'Scaled Undo restores the shot');
    for(const p of [page,reference]){await p.goto('http://127.0.0.1:8829/play.html');await p.waitForFunction(()=>document.querySelectorAll('.play-game-tile').length===20);}
    const catalog=['#playDialog','.play-game-grid','[data-game=kelly]','.play-catalog-heading'];compare(await rects(page,catalog),await rects(reference,catalog),name+' Play catalog');
    await page.screenshot({path:dir+'/'+name+'-play.png'});
    for(const p of [page,reference]){await p.locator('[data-game=killer]').tap();await p.locator('#playSetupNames').fill('One, Two');await p.locator('button[type=submit]').tap();}
    compare(await rects(page,['#playRoot','.play-header','#playDock','#playActions']),await rects(reference,['#playRoot','.play-header','#playDock','#playActions']),name+' Play game');
    await page.screenshot({path:dir+'/'+name+'-game.png'});
    for(const p of [page,reference])await p.locator('#playShotClockOpen').tap();
    const clock=['.shot-clock-view','.sc-header','.sc-player','.sc-ring','.sc-footer'];compare(await rects(page,clock),await rects(reference,clock),name+' Shot Clock');
    const fits=await page.evaluate(()=>{const f=document.querySelector('.sc-footer').getBoundingClientRect(),o=document.querySelector('.shot-clock-view');return {bottom:f.bottom,height:innerHeight,overflow:o.scrollHeight-o.clientHeight};});
    assert(fits.bottom<=fits.height+1&&fits.overflow<=1,'Whole Shot Clock, including footer, fits: '+JSON.stringify(fits));
    await page.screenshot({path:dir+'/'+name+'-clock.png'});
    await page.locator('.sc-footer .sc-start').first().tap();assert(await page.locator('.sc-footer .sc-pause').isEnabled(),'Scaled clock starts');
    await page.locator('.sc-footer .sc-pause').tap();
    assert.deepEqual(errors,[]);console.log(name+': desktop proportions match in 2D,3D,Tools,Play,game,clock; aim,shoot,undo and clock taps passed');
   }catch(e){console.error(name+': '+e.stack);failures.push(name+': '+e.message);await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});}
   finally{await desktop?.close();await mobile.close();}
  }
  for(const [path,viewport,mobile] of [['/?train=1',{width:1366,height:768},false],['/play.html',{width:1280,height:800},true],['/?zen=1',{width:844,height:390},true]]){
   const context=await browser.newContext({viewport,screen:viewport,isMobile:mobile,hasTouch:mobile,userAgent:mobile?ua:undefined,serviceWorkers:'block'});await context.addInitScript(setup);const page=await context.newPage();await page.goto('http://127.0.0.1:8829'+path);await page.waitForLoadState('load');
   assert.equal(await page.evaluate(()=>!!window.BilliardsViewport?.active),false,path+' desktop/tablet/Zen stays unchanged');assert.match(await page.locator('meta[name=viewport]').getAttribute('content'),/width=device-width/);await page.screenshot({path:dir+'/'+(path.includes('zen')?'zen':mobile?'tablet':'desktop')+'-unchanged.png'});await context.close();
  }
  assert.deepEqual(failures,[]);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
