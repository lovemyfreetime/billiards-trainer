const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8822']);await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'],...(process.env.LIVE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});try{
for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LIVE_URL||'http://127.0.0.1:8822/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
 async function set(mode,rails,target,ball={x:1.3,y:.65},cue={x:.4,y:.6},speed=6){await page.evaluate(({mode,rails,target,ball,cue,speed})=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{tableL:2.032,tableW:1.016,speed,sideSpin:0,follow:0,airbornePhysics:false,activeShot:1,shot2Enabled:false,balls:[{id:0,n:'CB',...cue,active:true},{id:1,n:'1',...ball,active:true}],bankKick:{mode,phase:rails.length?null:'zero',zero:target,rails,railName:rails[0]||null,ballId:rails.length?1:null,routeVersion:2}});billiardsTourBridge.restore(snap);},{mode,rails,target,ball,cue,speed});}
 const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
 async function solved(count){await page.waitForFunction(()=>!!billiardsTourBridge.capture().state.bankKick.solution,{},{timeout:60000});const sol=(await state()).bankKick.solution;assert.equal(sol.bounces.length,count);assert(sol.reached);return sol;}
 if(!mobile){
 const targets=[{x:1.1092177883,y:.5796229306},{x:1.3862677359,y:.5244082681},{x:.3483910704,y:.2453739337},{x:.1542752312,y:.7410542158}];
 for(let n=1;n<=4;n++){const rails=['bottom','right','top','left'].slice(0,n);await set('bank',rails,targets[n-1]);const sol=await solved(n);assert.deepEqual(sol.bounces.map(b=>b.rail.name),rails);}
 // A real two-cushion bank reaches the selected corner pocket.
 await set('bank',['bottom','right'],{x:0,y:0},{x:1.3,y:.8});const firstBank=await solved(2);
 await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.balls.find(b=>b.id===1).y=.81;billiardsTourBridge.restore(snap);});await page.waitForTimeout(150);const movedBank=await solved(2);assert.notEqual(movedBank.bounces[0].x,firstBank.bounces[0].x,'Moving the bank ball recalculates the route');
 await set('bank',['bottom','right','top'],{x:0,y:1.016},{x:1.3,y:.8});await solved(3);
 await set('kick',['bottom'],{x:2.032,y:0},{x:1.3,y:.4});await solved(1);
 const kicks=[[{x:1.0609298357,y:.6928765768},{x:.8675562404,y:.6418211887}],[{x:1.3324658513,y:.4831880186},{x:1.1658567895,y:.3725470654}],[{x:.3388150444,y:.2196625482},{x:.1621589740,y:.3134315878}],[{x:.5106782124,y:.6545010524},{x:.6604397466,y:.7870585225}]];
 for(let n=1;n<=4;n++){await set('kick',['bottom','right','top','left'].slice(0,n),kicks[n-1][1],kicks[n-1][0],{x:1.3,y:.65});const sol=await solved(n);assert(sol.objectPath.length>2);}
 await set('bank',['bottom','right','top','left'],targets[3],undefined,undefined,.25);await page.waitForTimeout(200);await page.waitForFunction(()=>!document.querySelector('#bankKickRouteStatus').textContent.includes('Calculating'),{},{timeout:60000});assert.equal((await state()).bankKick.solution,null);assert.match(await page.locator('#bankKickRouteStatus').innerText(),/No route/);
 }
 // Real mouse/touch taps in 3D share the ordered-selection flow with 2D.
 await set(null,[],null);if(mobile)await page.locator('#phoneControls').click();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.waitForTimeout(250);
 async function tool(id){if(await page.locator('#phoneControls').getAttribute('aria-expanded')!=='true')await page.locator('#phoneControls').click();await page.locator('#'+id).click();}
 async function tap(q,height=0){const p=await page.evaluate(({q,height})=>Billiards3D.project(q,height),{q,height});if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
 await tool('bankToolToggle');await tap({x:0,y:1.016});assert.equal((await state()).bankKick.phase,'rail');
 await tap({x:.6,y:-.04},.035);await tap({x:2.07,y:.5},.035);assert.deepEqual((await state()).bankKick.rails,['top','right']);await tap({x:1.3,y:.65},.028575);assert.equal((await state()).bankKick.phase,null);assert.equal((await state()).bankKick.ballId,1);
 assert(await page.locator('#bankKickRoutePanel').isVisible());await page.locator('#bankKickUndoRail').click();assert.deepEqual((await state()).bankKick.rails,['top']);assert.equal((await state()).bankKick.phase,'ball');await page.locator('#bankKickClose').click();assert.equal((await state()).bankKick.mode,null);
 assert.deepEqual(errors,[]);console.log((mobile?'Phone touch':'Desktop mouse')+': ordered 3D rail/ball selection, undo rail and close passed'+(!mobile?'; physics-verified 1–4 rail banks/kicks, pocket bank and insufficient-speed rejection passed.':'.'));await context.close();
}
}finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
