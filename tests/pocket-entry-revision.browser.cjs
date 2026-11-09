const assert=require('node:assert/strict');
const cp=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8897']);
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
   args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1366,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8897/?train=1');
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.BilliardsPocketEntryOverlay);
  assert.equal(await page.locator('#showPocketEntry').isChecked(),false);
  await page.locator('.section').filter({hasText:'FEATURES & OPTIONS'}).locator('.sectionToggle').click();
  await page.locator('#showPocketEntry').check();
  await page.evaluate(()=>{
   const snap=billiardsTourBridge.capture(),L=snap.state.tableL,W=snap.state.tableW;
   snap.state.balls=[
    {id:0,n:'CB',x:L/2,y:W*.82,active:true},
    {id:1,n:'1',x:L/2,y:W*.43,active:true},
    // Directly occupies the usual near-pocket label position on the cloth.
    {id:2,n:'2',x:L/2,y:.15,active:true}
   ];
   snap.state.freeAim={x:L/2,y:W*.2};snap.state.speed=2.2;
   snap.state.shot2Enabled=false;snap.state.activeShot=1;snap.state.showPocketEntry=true;
   billiardsTourBridge.restore(snap);
  });
  const twoD=await page.evaluate(()=>({reading:BilliardsPocketEntryOverlay.reading()?.label,
    box:BilliardsPocketEntryOverlay.placement().twoD}));
  assert.equal(twoD.reading,'0 · CENTER');
  assert(twoD.box,'2D cloth label finds free space when the preferred spot has a ball');
  await page.screenshot({path:'/tmp/pocket-entry-revised-2d.png'});

  await page.locator('#table3DToggle').click();
  await page.waitForFunction(()=>Billiards3D.active,{timeout:20000});
  await page.waitForFunction(()=>BilliardsPocketEntryOverlay.placement().threeD!==null,{timeout:20000});
  assert.equal(await page.evaluate(()=>BilliardsPocketEntryOverlay.placement().twoD),null,
   'The hidden 2D canvas must not paint a second pocket label in 3D');
  const threeD=await page.evaluate(()=>{
   const box=BilliardsPocketEntryOverlay.placement().threeD,source=document.getElementById('table3DCanvas'),rect=source.getBoundingClientRect();
   const ball=billiardsTourBridge.capture().state.balls.find(b=>b.id===2),q=Billiards3D.project(ball,.028575);
   const p={x:q.x-rect.left,y:q.y-rect.top};
   const touches=box.left<p.x+12&&box.right>p.x-12&&box.top<p.y+12&&box.bottom>p.y-12;
   return {box,touches,canvasVisible:document.getElementById('pocketEntry3DOverlay').style.display==='block'};
  });
  assert(threeD.canvasVisible,'3D text overlay is visible');
  assert(!threeD.touches,'3D text does not overlap the ball at the preferred label position');
  await page.screenshot({path:'/tmp/pocket-entry-revised-3d.png'});
  const recording=await page.evaluate(()=>{
   const clip=BilliardsClipView.create('current',640,360);clip.paint();
   return {pixels:clip.canvas.getContext('2d').getImageData(0,0,640,360).data.length,
     reading:BilliardsPocketEntryOverlay.reading().label};
  });
  assert.equal(recording.pixels,640*360*4);
  assert.equal(recording.reading,'0 · CENTER');
  await page.evaluate(()=>{const input=document.getElementById('showPocketEntry');input.checked=false;
   input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('pocketEntry3DOverlay').style.display==='none');
  assert.deepEqual(errors,[]);
  console.log('2D/3D cloth text avoidance, no obstructed ball, on/off, recording composition passed.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
