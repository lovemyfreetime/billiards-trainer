const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),{insetFromBoundary}=require('../photo-corner-sensing');
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8858']);await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});try{
 for(const viewport of [{width:1366,height:900},{width:844,height:390},{width:390,height:844}]){
  const page=await browser.newPage({viewport,hasTouch:true,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8858/?train=1');await page.waitForFunction(()=>window.BilliardsCornerSensing?.snap&&window.billiardsWalkthroughBridge);
  if(!await page.locator('#analyzePhotoBtn').isVisible())await page.locator('#phoneControls').click();await page.locator('#analyzePhotoBtn').click();
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=460;const x=c.getContext('2d');x.fillStyle='rgb(125,90,60)';x.fillRect(0,0,800,460);x.fillStyle='rgb(35,145,85)';x.fillRect(100,80,600,300);x.fillRect(75,185,45,55);return c.toDataURL().split(',')[1]});
  await page.locator('#photoFileInput').setInputFiles({name:'break-cloth-table.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('#tableCamera [data-action=snap]')?.disabled===false);await page.locator('#tableCamera [data-action=overlay]').click();await page.locator('#tableCamera [data-action=snap]').tap();await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().imageReady&&!document.querySelector('#tableCamera'));
  await page.locator('#photoResetCorners').click();
  const q=[{x:120,y:75},{x:680,y:100},{x:702,y:360},{x:112,y:378}];
  const image=page.locator('#photoAnalyzerCanvas'),bounds=await image.boundingBox();
  for(const [i,p] of q.entries()){
   if(viewport.width===1366){await page.mouse.move(bounds.x+p.x/800*bounds.width,bounds.y+p.y/460*bounds.height);await page.mouse.down();if(i===0)assert.equal((await page.evaluate(()=>billiardsWalkthroughBridge.snapshot())).corners.length,0,'mouse mark waits for release');await page.mouse.up();}
   else await image.tap({position:{x:p.x/800*bounds.width,y:p.y/460*bounds.height}});
   if(i===0){const first=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());assert.equal(first.corners.length,1);assert(first.lastCornerDropSnapped,'first corner snaps without three other marks');assert(Math.hypot(first.corners[0].x-p.x,first.corners[0].y-p.y)>3,'first rough point visibly shifts to rail intersection');}
  }
  const state=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());assert(state.cornersValid,JSON.stringify(state));assert.equal(state.cornerSensingEvidence.method,'manual-rail-snap');assert.equal(state.cornerSensingEvidence.snappedEdges,4);assert.equal(state.analysisRevision,0,'marking corners never starts ball recognition');
  const expected=insetFromBoundary([{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}],{tableLength:2.2352,tableWidth:1.1176}).corners;
  state.corners.forEach((p,i)=>assert(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<7,JSON.stringify({p,expected:expected[i]})));
  await page.locator('#photoAutoRailsBtn').click();assert.deepEqual((await page.evaluate(()=>billiardsWalkthroughBridge.snapshot())).corners,state.corners,'retry uses original rough marks');assert.deepEqual(errors,[]);
  console.log(viewport,'four rough touch taps snap automatically, ignore break cloth and retry identically');
  const mid={x:(state.corners[0].x+state.corners[1].x)/2,y:(state.corners[0].y+state.corners[1].y)/2};
  const start={x:bounds.x+mid.x/800*bounds.width,y:bounds.y+mid.y/460*bounds.height},end={x:start.x,y:start.y+12};
  if(viewport.width===1366){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();}
  else {const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  const adjusted=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
  assert(adjusted.cornersValid,'whole-edge drag stays valid');
  assert(Math.abs(adjusted.corners[0].y-state.corners[0].y-6*460/bounds.height)<1,'half-speed fine correction');
  for(const i of [2,3])assert(Math.hypot(adjusted.corners[i].x-state.corners[i].x,adjusted.corners[i].y-state.corners[i].y)<.01,'opposite rail does not move');
  assert.equal(adjusted.analysisRevision,0);assert.deepEqual(errors,[]);
  console.log(viewport,'whole green edge drags at half speed; opposite rail preserved');
  await page.locator('#photoFileInput').setInputFiles({name:'framed-break-cloth.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('#tableCamera [data-action=snap]')?.disabled===false);await page.locator('#tableCamera [data-action=top]').click();await page.locator('#tableCamera [data-action=snap]').tap();await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().imageReady&&!document.querySelector('#tableCamera'));
  const initial=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());assert(initial.cornersValid);
  await page.locator('#photoAutoRailsBtn').click();const rescanned=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());assert.deepEqual(rescanned.corners,initial.corners,'first frame fit and sensing share original evidence');
  await page.locator('#photoResetCorners').click();await page.locator('#photoAutoRailsBtn').click();assert.deepEqual((await page.evaluate(()=>billiardsWalkthroughBridge.snapshot())).corners,initial.corners,'Reset does not change framed rail evidence');
  console.log(viewport,'first framed fit, rescan and Reset + sensing are identical');await page.close();
 }
}finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
