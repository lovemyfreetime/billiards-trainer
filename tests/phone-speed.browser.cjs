const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium,devices}=require('playwright');
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8798']);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{for(const spec of [
  {name:'Android landscape',...devices['Pixel 7'],viewport:{width:740,height:360}},
  {name:'iPhone landscape',...devices['iPhone 13'],viewport:{width:844,height:390}},
  {name:'iPhone portrait',...devices['iPhone 13'],viewport:{width:390,height:844}}
 ]){
  const {name,...options}=spec,ctx=await browser.newContext({...options,serviceWorkers:'block'});
  await ctx.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const p=await ctx.newPage();await p.goto('http://127.0.0.1:8798/?train=1');await p.waitForFunction(()=>window.billiardsTourBridge&&document.body.classList.contains('phone-focus'));
  const touch=await ctx.newCDPSession(p);
  const drag=async(input,dy)=>{const r=await input.boundingBox(),x=r.x+r.width/2,y=r.y+r.height*.65;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});assert.equal(Number(await input.inputValue()),Number(await input.getAttribute('data-before')),'Touch-down retains the current speed');await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  for(const shot of [1,2]){
   if(shot===2){await p.locator('#phoneControls').click();await p.locator('#toggleShot2').click();await p.locator('#phoneControls').click();await p.evaluate(()=>billiardsSelectShot(2));}
   const input=p.locator('#tableSpeed'+shot),wrap=p.locator('#tableSpeed'+shot+'Wrap'),minus=p.locator('#tableSpeed'+shot+'Readout'),plus=wrap.locator('.tableSpeedLabel');
   const value=()=>input.inputValue().then(Number),initial=await value();
   const r=await input.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+3);assert.equal(await value(),initial,'Track tap never jumps');
   await input.evaluate(e=>e.setAttribute('data-before',e.value));await drag(input,-20);assert(Math.abs(await value()-initial-.2)<1e-8,'Upward swipe adds speed');
   await input.evaluate(e=>e.setAttribute('data-before',e.value));await drag(input,-20);assert(Math.abs(await value()-initial-.4)<1e-8,'New swipe starts at the last speed');
   await input.evaluate(e=>e.setAttribute('data-before',e.value));await drag(input,15);assert(Math.abs(await value()-initial-.25)<1e-8,'Downward swipe reduces speed');
   const before=await value();await minus.tap();assert(Math.abs(await value()-before+.01)<1e-8,'Blank lower end decreases .01');
   const top=await plus.boundingBox();await p.touchscreen.tap(top.x+top.width/2,top.y+29);assert(Math.abs(await value()-before)<1e-8,'The number area increases .01');
   const lower=await minus.boundingBox();assert(lower.y>=r.y+r.height-1,'Decrease is below the track');
   // Both ends repeat while held and stop upon release.
   for(const [button,sign]of [[plus,1],[minus,-1]]){const b=await button.boundingBox(),v=await value();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.waitForFunction(({id,v,sign})=>(Number(document.getElementById(id).value)-v)*sign>=.03-1e-9,{id:await input.getAttribute('id'),v,sign},{timeout:2500});await p.mouse.up();assert((await value()-v)*sign>=.03-1e-9,'Hold repeats in the intended direction');const stopped=await value();await p.waitForTimeout(170);assert.equal(await value(),stopped);}
  }
  for(const id of ['bottomFollow2','bottomSide2']){const input=p.locator('#'+id);await input.evaluate(e=>{e.value='.4';e.dispatchEvent(new Event('input',{bubbles:true}));});const v=Number(await input.inputValue()),r=await input.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);assert.equal(Number(await input.inputValue()),v,'Spin track touch also retains its current setting');}
  await p.screenshot({path:'/tmp/speed-'+name.replaceAll(' ','-')+'.png'});
  await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>!document.body.classList.contains('phone-focus'));assert.equal(await p.locator('#tableSpeed1Wrap').evaluate(e=>e.parentElement.id),'bottomSpeedControls');
  console.log(name+': same phone layout, relative touch swipes, both shots, step buttons, hold repeat and desktop restoration pass');await ctx.close();
 }}finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
