const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),{chromium}=require('playwright');
const dir='test-results/workspace';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8822']);await new Promise(r=>server.stdout.once('data',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const width of [1366,1024]){
   const context=await browser.newContext({viewport:{width,height:768},hasTouch:width===1024,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8822/?train=1');await page.waitForFunction(()=>window.billiardsCompassControls);
   await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);
   for(let iteration=0;iteration<4;iteration++){
    if(iteration)await page.locator('#phoneTrayToggle').click();
    await page.evaluate(async()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{balls:[],allowMissingCueBall:true,shot2Enabled:false,pocketedLog:[],teachingCompass:{enabled:true,x:1.25,y:.64,angle:.35,sizePct:35,linkedBallId:null}});billiardsTourBridge.restore(s);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));});
    // Inspect the rendered WebGL pixels, not only the logical handle positions.
    const hub=await page.evaluate(()=>{const p=Billiards3D.project(billiardsTourBridge.capture().state.teachingCompass),canvas=document.getElementById('table3DCanvas'),r=canvas.getBoundingClientRect(),copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d');Billiards3D.renderSnapshot();ctx.drawImage(canvas,0,0);const x=Math.round((p.x-r.left)*canvas.width/r.width),y=Math.round((p.y-r.top)*canvas.height/r.height),data=ctx.getImageData(x-2,y-2,5,5).data;let dark=0;for(let i=0;i<data.length;i+=4)if(data[i]<45&&data[i+1]<55&&data[i+2]<55)dark++;return {dark,projected:p};});
    assert(hub.dark>=8,`${width} tray transition ${iteration}: drawn hub must align with projected center, ${JSON.stringify(hub)}`);
   }
   await page.screenshot({path:`${dir}/${width}-compass-aligned.png`});
   await page.evaluate(async()=>{const s=billiardsTourBridge.capture();s.state.teachingCompass.enabled=false;billiardsTourBridge.restore(s);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   const capture=()=>page.evaluate(()=>{Billiards3D.renderSnapshot();return document.getElementById('table3DCanvas').toDataURL();});
   const empty=await capture();
   await page.locator('#workspaceBalls [data-ball-id="0"]').click();
   await page.waitForFunction(()=>Billiards3D.renderedBalls().some(b=>b.id===0));
   await page.locator('#workspaceClearBalls').click();await page.waitForFunction(()=>Billiards3D.renderedBalls().length===0);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.equal(await capture(),empty,'Clear restores the same empty rendered table with no stale guides');
   await page.screenshot({path:`${dir}/${width}-cleared-3d.png`});assert.deepEqual(errors,[]);
   console.log(`${width}: rendered compass aligned after four tray-size transitions; Clear leaves no stale graphics`);await context.close();
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
