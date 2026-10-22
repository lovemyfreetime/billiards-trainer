const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const raw=fs.readFileSync('index.html','utf8');
const probe=`window.__deflectionProbe=(options={})=>{
 const saved=S;try{
  S=defaultState();S.tableL=2.54;S.tableW=1.27;
  const pixel=(x,y)=>({x:(x-55)/1386*S.tableL,y:(y-278)/692*S.tableW});
  S.balls=[[0,872,900],[7,1360,775],[8,1335,386],[9,431,778]].map(([id,x,y])=>({id,n:id===0?'CB':String(id),...pixel(x,y),active:true}));
  S.freeAim=pixel(1309,779);S.speed=2.48;S.follow=-.9;S.sideSpin=options.side??.44;
  S.cuePreset='custom';S.cueEndmassRatio=options.ratio??35;
  S.shot2Enabled=true;S.shot2={...defaultState().shot2,...S.balls[0],freeAim:{...S.freeAim},speed:S.speed,follow:S.follow,sideSpin:S.sideSpin,cueElevationDeg:S.cueElevationDeg};
  const result=simulate(),second=simulateShot2(),path=result.paths[7],first=path[0],moved=path.find(p=>Math.hypot(p.x-first.x,p.y-first.y)>.006);
  return {squirt:cueSquirtAngle()*180/Math.PI,overlap:result.firstBallContact?.overlap,objectDegrees:moved?Math.atan2(moved.y-first.y,moved.x-first.x)*180/Math.PI:null,first:result.finalBalls,second:second.finalBalls,state:JSON.parse(JSON.stringify({...S,preview:null}))};
 }finally{S=saved;}
};`;
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8788']);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:process.env.CHROMIUM_ARGS?JSON.parse(process.env.CHROMIUM_ARGS):[]});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}});
  await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1:8788/?train=1',r=>r.fulfill({contentType:'text/html',body:raw.replace('window.__BT_PHYSICS_SELF_TEST__ = runPhysicsSelfTests;','window.__BT_PHYSICS_SELF_TEST__ = runPhysicsSelfTests;'+probe)}));
  await page.goto('http://127.0.0.1:8788/?train=1');await page.waitForFunction(()=>window.__deflectionProbe&&window.billiardsTourBridge);
  assert.equal(await page.locator('#cueShaftPreset').inputValue(),'low');
  assert.equal(await page.locator('#cueEndmassRatio').inputValue(),'50.000');
  const data=await page.evaluate(()=>({self:__BT_PHYSICS_SELF_TEST__(),old:__deflectionProbe({ratio:20.151}),standard:__deflectionProbe({ratio:35}),low:__deflectionProbe({ratio:50}),centerOld:__deflectionProbe({ratio:20.151,side:0}),centerNew:__deflectionProbe({ratio:35,side:0})}));
  assert(data.self.ok);assert.deepEqual(data.centerOld.first,data.centerNew.first,'Center-ball physics is unchanged');
  for(const key of ['old','standard','low'])assert.deepEqual(data[key].first,data[key].second,'Both shot engines use identical shaft calibration');
  assert(data.standard.overlap>data.old.overlap+10);assert(data.low.overlap>data.standard.overlap);
  assert(Math.abs(data.standard.objectDegrees)<Math.abs(data.old.objectDegrees)-5);
  // Exercise real saved state and preview migration, including historic values.
  for(const [preset,ratio,expected]of [['standard',20.151,35],['low',29.158,50],['custom',20.151,20.151],['custom',29.158,29.158],['custom',35,35]]){
   await page.evaluate(({preset,ratio,state})=>{const saved=billiardsTourBridge.capture();saved.state={...state,cuePreset:preset,cueEndmassRatio:ratio,shot2Enabled:false};billiardsTourBridge.restore(saved);},{preset,ratio,state:data.standard.state});
   await page.reload();await page.waitForFunction(()=>window.billiardsTourBridge);
   const state=await page.evaluate(()=>billiardsTourBridge.capture().state);
   assert.equal(state.cueEndmassRatio,expected);assert.equal(state.cuePreset,preset);
   assert.equal(state.speed,2.48);assert.equal(state.follow,-.9);assert.equal(state.sideSpin,.44);
   assert.deepEqual(state.balls,data.standard.state.balls);assert.deepEqual(state.freeAim,data.standard.state.freeAim);
   assert.equal(await page.locator('#cueEndmassRatio').inputValue(),expected.toFixed(3));
  }
  await page.locator('.sectionToggle').filter({hasText:'PHYSICS / CALIBRATION'}).click();await page.click('[data-advanced="physicsAdvanced"]');
  await page.selectOption('#cueShaftPreset','low');assert.equal(await page.locator('#cueEndmassRatio').inputValue(),'50.000');
  await page.selectOption('#cueShaftPreset','standard');assert.equal(await page.locator('#cueEndmassRatio').inputValue(),'35.000');
  const before=await page.evaluate(()=>billiardsTourBridge.capture()),prediction=await page.evaluate(()=>billiardsTourBridge.predict());
  await page.click('#animate');await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,{},{timeout:30000});
  const ending=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
  for(const ball of prediction.finalBalls.filter(b=>b.active)){
   const actual=ending.find(b=>b.id===ball.id);assert(actual);assert(Math.hypot(actual.x-ball.x,actual.y-ball.y)<1e-8,'Execution matches revised prediction');
  }
  await page.click('#undoShot');
  const restored=await page.evaluate(()=>billiardsTourBridge.capture().state);
  assert.deepEqual(restored.balls,before.state.balls);assert.equal(restored.cueEndmassRatio,35);
  await page.locator('#trainerLayoutFileInput').setInputFiles('guide/layouts/zero-x-safety-low.billiards.json');
  await page.waitForFunction(()=>billiardsTourBridge.capture().state.lastLayoutName==='Zero-X safety — screenshot estimate');
  const fixture=await page.evaluate(()=>billiardsTourBridge.capture().state);
  assert.equal(fixture.cuePreset,'low');assert.equal(fixture.cueEndmassRatio,50);
  assert.equal(fixture.speed,2.48);assert.equal(fixture.follow,-.9);assert.equal(fixture.sideSpin,.44);
  assert.equal(fixture.shot2Enabled,false);assert.deepEqual(fixture.balls,data.standard.state.balls);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS: both shots, center-ball invariance, saved-state migration, Custom preservation, preset UI, execution and undo',safety:Object.fromEntries(['old','standard','low'].map(k=>[k,{squirt:data[k].squirt,overlap:data[k].overlap,objectDegrees:data[k].objectDegrees}]))}));
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
