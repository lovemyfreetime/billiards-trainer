const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const international=require('../trainer-international');
const construction=require('../trainer-table-construction');
const files=require('../trainer-layout-files');

for(const key of Object.keys(international.setups)){
 const setup=international.setup(key),{tableL:L,tableW:W,ballR:R}=setup.table;
 assert.equal(new Set(setup.balls.map(b=>b.id)).size,setup.balls.length);
 for(const b of setup.balls){
  assert(b.x>=R&&b.x<=L-R&&b.y>=R&&b.y<=W-R,key);
  for(const a of setup.balls)if(a!==b)assert(Math.hypot(a.x-b.x,a.y-b.y)>=2*R-1e-10,key);
 }
 const layout=files.parse(JSON.stringify({tableL:L,tableW:W,ballR:R,tableType:setup.type,ballSet:setup.set,balls:setup.balls})).layout;
 assert.equal(layout.balls.length,setup.balls.length);
 const G={type:setup.type,pocketless:setup.type==='carom',nose:setup.table.nose,cornerLeg:setup.table.cornerMouth/Math.SQRT2,sideMouth:setup.table.sideMouth};
 const plan=construction.plan({L,W,R,G});
 assert.equal(plan.pockets.length,setup.type==='carom'?0:6);
 assert.equal(plan.rails.length,setup.type==='carom'?4:6);
 for(const p of plan.pockets){
  assert(p.dropPath.flat().every(Number.isFinite),key);
  assert(Math.abs(p.visualMouth-(p.corner?setup.table.cornerMouth:setup.table.sideMouth))<1e-9,key);
 }
}

(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8894']);
 await new Promise(r=>server.stdout.once('data',r));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8894/?train=1');
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
  const capture=()=>page.evaluate(()=>billiardsTourBridge.capture());
  const start=key=>page.evaluate(key=>{
   document.getElementById('fullRackSelect').value=key;
   document.getElementById('startFullRack').click();
  },key);
  const restore=saved=>page.evaluate(saved=>billiardsTourBridge.restore(saved),saved);
  const pool=(await capture()).state;
  for(const key of Object.keys(international.setups)){
   await start(key);
   const {state}=await capture(),expected=international.setup(key);
   assert.equal(state.tableType,expected.type);
   assert.equal(state.ballSet,expected.set);
   assert.equal(state.balls.length,expected.balls.length);
   assert.equal(state.tableL,expected.table.tableL);
   assert.equal(state.ballR,expected.table.ballR);
   if(['snooker15','snooker6','snookerPlus'].includes(key)){
    const hit=await page.evaluate(()=>billiardsTourBridge.predict().firstBallContact);
    assert.equal(hit?.objName,'Red',key+' opening should hit a red first');
   }
   if(key==='snooker6')assert.equal(international.maxId(state.ballSet),12);
  }
  await page.evaluate(()=>{document.getElementById('equipmentRack').value='caromHalf';});
  await page.evaluate(()=>document.getElementById('applyEquipmentRack').click());
  assert.equal((await capture()).state.tableL,2.30);
  await page.evaluate(()=>{
   document.getElementById('physicsSave').click();
   document.getElementById('physicsPresetName').value='Half-match verification';
   document.getElementById('physicsPresetApply').click();
  });
  await start('snooker6');
  await page.evaluate(()=>{
   document.getElementById('physicsLoad').click();
   document.getElementById('physicsPresetApply').click();
  });
  assert.equal((await capture()).state.rackChoice,'caromHalf');
  assert.equal((await capture()).state.tableL,2.30);
  assert.match(await page.locator('#equipmentSummary').textContent(),/2300 × 1150 mm/);
  await start('carom3');
  const selectCloth = value => page.locator('#caromCloth').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
  assert.equal(await page.locator('#caromCloth').inputValue(),'standard');
  await selectCloth('fast');
  assert.equal((await capture()).state.muRoll,international.tables.carom.fastMuRoll);
  await start('caromStraight');
  await page.reload();
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
  assert.equal(await page.locator('#caromCloth').inputValue(),'fast');
  await selectCloth('standard');
  const carom=await capture(),{tableL:L,tableW:W,ballR:R}=carom.state;
  for(const aim of [{x:0,y:0},{x:L/2,y:0},{x:L,y:W},{x:L/2,y:W}]){
   const saved=structuredClone(carom);
   Object.assign(saved.state,{balls:[{id:0,x:L/2,y:W/2,active:true}],freeAim:aim,speed:2,follow:0,sideSpin:0,cueElevationDeg:0});
   await restore(saved);
   const p=await page.evaluate(()=>billiardsTourBridge.predict());
   assert.equal(p.pocketEvents.length,0);
   assert(p.railEvents.length>0);
   assert(p.finalBalls.every(b=>b.active&&b.x>=R&&b.x<=L-R&&b.y>=R&&b.y<=W-R));
  }
  await restore(carom);
  await page.evaluate(()=>document.getElementById('table3DToggle').click());
  await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.renderedBalls().length===3);
  assert.equal(await page.evaluate(()=>Billiards3D.pocketGeometry().length),0);
  await start('snooker15');
  await page.waitForFunction(()=>Billiards3D.renderedBalls().length===22&&Billiards3D.pocketGeometry().length===6);
  await page.evaluate(()=>document.getElementById('table3DToggle').click());
  await page.waitForFunction(()=>!Billiards3D.active);
  assert.equal(await page.locator('#caromClothRow').evaluate(el=>el.hidden),true);
  const snooker=await capture();
 async function pocketProbe(from,aim){
  const saved=structuredClone(snooker);
  Object.assign(saved.state,{balls:[{id:0,...from,active:true}],freeAim:aim,speed:1.2,follow:0,sideSpin:0,cueElevationDeg:0});
  await restore(saved);
  return page.evaluate(()=>billiardsTourBridge.predict({trace:true}));
 }
 const mid=snooker.state.tableL/2;
 const straight=await pocketProbe({x:mid,y:.3},{x:mid,y:0});
 assert.equal(straight.pocketEvents[0]?.pocket,'TM');
 assert.equal(straight.jawEvents.length,0);
 const corner=await pocketProbe({x:.24,y:.24},{x:0,y:0});
 assert.equal(corner.pocketEvents[0]?.pocket,'TL');
 assert.equal(corner.jawEvents.length,0);
 const jaw=await pocketProbe({x:mid+.033,y:.3},{x:mid+.033,y:0});
 assert(jaw.jawEvents.length>0,'Off-center entry contacts the rounded jaw');
 assert.equal(jaw.pocketEvents.length,0,'Glancing shot rejects at the jaw');
 console.log('Rounded snooker jaws: clean side and corner entries and rejected glancing entry passed.');
  async function roll(sign,nap){
   const saved=structuredClone(snooker),s=saved.state,x=s.tableL/2,y=s.tableW/2;
   Object.assign(s,{balls:[{id:0,x,y,active:true}],freeAim:{x:x+sign,y},speed:.45,follow:0,sideSpin:0,cueElevationDeg:0,clothNap:nap});
   await restore(saved);
   return page.evaluate(x=>Math.abs(billiardsTourBridge.predict().finalBalls[0].x-x),x);
  }
  assert(Math.abs(await roll(1,0)-await roll(-1,0))<1e-8);
  const withNap=await roll(1,.025),againstNap=await roll(-1,.025);
  assert(withNap>againstNap);
  console.log('Snooker .45 m/s roll with/against nap:',withNap.toFixed(4),againstNap.toFixed(4),'m');
  await restore(snooker);
  await page.reload();
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
  assert.equal((await capture()).state.balls.length,22);
  await start('rack8');
  assert.equal((await capture()).state.tableL,pool.tableL);
  assert.equal((await capture()).state.ballSet,'classic');
  await page.evaluate(()=>{const s=document.getElementById('poolBallSet');s.value='black';s.dispatchEvent(new Event('change'));});
  assert.equal((await capture()).state.ballSet,'black');
  assert.deepEqual(errors,[]);
  console.log(Object.keys(international.setups).length+' layouts, 2D/3D profile switches, carom rebounds, snooker nap, reload, and pool palette passed.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
