const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8793']);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:process.env.CHROMIUM_ARGS?JSON.parse(process.env.CHROMIUM_ARGS):[]});
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width<600,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8793/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.BilliardsShotBudget);
   await page.evaluate(()=>{
    billiardsTourBridge.apply({id:'budget',title:'Budget test',balls:[[0,.25,.5],[1,.65,.5],[2,.75,.25]],target:1,pocket:[1,1],speed:2.4,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27});
    const draw=BilliardsShotBudget.draw;BilliardsShotBudget.draw=(ctx,items)=>{window.__budgetLabels=items;draw(ctx,items);};
   });
   const before=await page.evaluate(()=>billiardsTourBridge.predict());
   if(viewport.width<600)await page.locator('#phoneControls').click();
   await page.locator('#shotBudget').click();await page.waitForFunction(()=>window.__budgetLabels?.length>1);
   assert.equal(await page.locator('#shotBudget').getAttribute('aria-pressed'),'true');
   assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict()),before,'Budget toggle leaves actual shot prediction unchanged');
   const a=await page.locator('#shotBudget').boundingBox(),b=await page.locator('#jumpMasseFeatures').boundingBox(),tip=await page.locator('#tipArea').boundingBox();
   assert(Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1);assert(a.x<b.x&&a.y+a.height<=tip.y+1);assert.equal(await page.locator('#jumpMasseFeatures').textContent(),'JUMP / MASSÉ');
   const original=await page.evaluate(()=>JSON.stringify(__budgetLabels));
   await page.evaluate(()=>{const input=document.getElementById('tableSpeed1');input.value='3.2';input.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(old=>JSON.stringify(window.__budgetLabels)!==old,original);
   assert(await page.evaluate(()=>__budgetLabels.every(p=>Math.abs(p.angle)<=Math.PI/2)));
   const readings=await page.evaluate(()=>__budgetLabels.map(p=>({type:p.type,text:p.text,side:p.side,loss:p.loss,feel:p.feel,strokeFeel:p.strokeFeel,endpoint:p.endpoint})));
   assert(readings.some(p=>p.type==='loss'&&p.loss>0),'Red contact losses are rendered');
   assert(readings.some(p=>p.type==='feel'&&Number.isFinite(p.feel)),'Live diamond feel is rendered');
   if(viewport.width>=600)assert(readings.some(p=>p.type==='feel'&&p.endpoint&&p.text.endsWith('D total')),'Endpoint repeats the required stroke total');

   if(viewport.width<600)await page.locator('#phoneControls').click();
   await page.screenshot({path:'/tmp/shot-budget-'+viewport.width+'.png'});
   await page.reload();await page.waitForFunction(()=>window.billiardsTourBridge);assert.equal(await page.locator('#shotBudget').getAttribute('aria-pressed'),'true','Toggle is saved');
   if(viewport.width<600)await page.locator('#phoneControls').click();
   await page.locator('#jumpMasseFeatures').click();assert.equal(await page.locator('#airbornePhysics').isChecked(),true);
   await page.locator('#shotBudget').click();assert.equal(await page.locator('#shotBudget').getAttribute('aria-pressed'),'false');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Desktop and phone: equal adjacent buttons above tip, live path labels, unchanged shot, live speed updates, upright text, saved toggle and independent jump control pass.');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
