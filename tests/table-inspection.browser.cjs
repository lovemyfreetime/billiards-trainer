// Verify drawing-only inspection against the real solver and both shots' controls.
const assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright');
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8786']);
 await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:process.env.CHROMIUM_ARGS?JSON.parse(process.env.CHROMIUM_ARGS):[]});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8786/?train=1');
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsStepTableSlider);
  await page.evaluate(()=>window.billiardsTourBridge.apply({id:'inspection',title:'Inspection',balls:[[0,.3,.5],[1,.65,.5],[2,.7,.25]],target:1,pocket:[1,1],speed:2,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
  const capture=()=>page.evaluate(()=>({state:window.billiardsTourBridge.capture(),prediction:window.billiardsTourBridge.predict()}));
  const original=await capture(),canvas=page.locator('#canvas'),zoom=page.locator('#tableZoom');
  const originalImage=await canvas.screenshot();
  await zoom.click();await zoom.hover();await page.mouse.wheel(0,-240);
  await page.waitForFunction(()=>document.querySelector('#tableZoom').textContent!=='1.0×');
  assert.notDeepEqual(await canvas.screenshot(),originalImage,'View is magnified');
  const rect=await canvas.boundingBox();
  await page.mouse.move(rect.x+rect.width*.45,rect.y+rect.height*.5);
  await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.6,{steps:5});
  await page.mouse.down();await page.mouse.move(rect.x+200,rect.y+300,{steps:4});await page.mouse.up();
  assert.deepEqual(await capture(),original,'Zoom, hover pan and dragging never change layout or predicted shot');
  await zoom.click();assert.equal(await zoom.getAttribute('aria-pressed'),'false');
  assert.deepEqual(await canvas.screenshot(),originalImage,'Reset restores the exact original drawing');
  for(const shot of [1,2]){
   if(shot===2)await page.locator('#toggleShot2').click();
   const roller=page.locator(shot===1?'#aimRoller':'#aimRoller2');
   const aim=()=>page.evaluate(shot=>{const s=window.billiardsTourBridge.capture().state,t=shot===2?s.shot2:s,c=shot===2?t:s.balls.find(b=>b.id===0);return Math.atan2(t.freeAim.y-c.y,t.freeAim.x-c.x);},shot);
   const before=await aim();await roller.locator('[data-aim-step="1"]').click();await page.waitForTimeout(80);
   assert(Math.abs((await aim())-before-.15*Math.PI/180)<1e-8,'One right tap is 0.15° for shot '+shot);
   await roller.locator('[data-aim-step="-1"]').click();await page.waitForTimeout(80);assert(Math.abs((await aim())-before)<1e-8);
   for(const id of ['tableSpeed'+shot,'bottomFollow'+shot,'bottomSide'+shot]){
    const input=page.locator('#'+id),before=Number(await input.inputValue());
    await page.locator('#'+id+'Readout').click();assert(Math.abs(Number(await input.inputValue())-(before-.01))<1e-8);
    await input.locator('..').locator('.tableSpeedLabel,.miniSpinLabel').click();assert(Math.abs(Number(await input.inputValue())-before)<1e-8);
   }
  }
  await zoom.click();const speed=page.locator('#tableSpeed2');const speedBefore=Number(await speed.inputValue());
  await speed.locator('..').locator('.tableSpeedLabel').click();assert.equal(Number(await speed.inputValue()),Number((speedBefore+.01).toFixed(2)),'Controls remain usable in inspection mode');
  await zoom.click();
  await page.screenshot({path:'/tmp/trainer-inspection-desktop.png'});
  // Real two-finger browser input on tablet, followed by a single-finger pan.
  await page.setViewportSize({width:1024,height:768});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await zoom.click();const beforeTouch=await capture(),r=await canvas.boundingBox();
  const touches=(distance)=>[{x:r.x+r.width*.5-distance,y:r.y+r.height*.45,id:1},{x:r.x+r.width*.5+distance,y:r.y+r.height*.45,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(40)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(100)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touches(100)[0]]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touches(100)[0],x:touches(100)[0].x+60}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await zoom.textContent(),'2.5×');assert.deepEqual(await capture(),beforeTouch,'Touch pinch and pan preserve physics');
  await zoom.click();
  await page.setViewportSize({width:430,height:932});await page.waitForTimeout(200);
  await page.screenshot({path:'/tmp/trainer-inspection-phone-before.png'});
  await page.locator('#bottomFollow1Readout').click();
  await page.screenshot({path:'/tmp/trainer-inspection-phone.png'});
  await page.addInitScript(()=>{
    window.__speech=[];window.__messages=[];
    window.chrome.webview.postMessage=m=>{window.__messages.push(m);if(m.type==='set-fullscreen')window.dispatchEvent(new CustomEvent('billiards:native-fullscreen',{detail:m.active}));};
    window.SpeechSynthesisUtterance=function(text){this.text=text;};
    Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices:()=>[],speak(s){window.__speech.push(s.text);}}});
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:8786/welcome.html');
  for(const mode of ['zen','trainer','play']){
    await page.locator('[data-about="'+mode+'"]').click();
    const dialog=page.locator('#about-'+mode),speaker=dialog.locator('.description-speaker');
    await speaker.click();
    assert.equal(await page.evaluate(()=>window.__speech.at(-1)),await dialog.locator('p').first().textContent(),'Speaker reads the exact '+mode+' description');
    assert.equal(await speaker.getAttribute('aria-pressed'),'true');
    await speaker.click();assert.equal(await speaker.getAttribute('aria-pressed'),'false');
    await dialog.locator('form button').click();
  }
  await page.locator('#welcomeFullscreen').click();
  assert.equal(await page.locator('#welcomeFullscreen').getAttribute('aria-pressed'),'false');
  await page.locator('#welcomeFullscreen').click();
  assert.equal(await page.locator('#welcomeFullscreen').getAttribute('aria-pressed'),'true');
  await page.locator('#welcomeClose').click();
  assert.equal(await page.evaluate(()=>window.__messages.at(-1).type),'close-app');
  await page.screenshot({path:'/tmp/welcome-window-controls.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: exact reset, invariant solver/layout, mouse zoom/pan, real touch pinch/pan, both aim rollers, six slider step pairs and zoomed controls.');
  await context.close();
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
