const assert=require('node:assert/strict');
const cp=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8897']);
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1366,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8897/?train=1');
  await page.waitForFunction(()=>window.billiardsTourBridge&&window.BilliardsPocketEntryOverlay);
  assert.equal(await page.locator('#shot2CueBallOnly + label').textContent(),'Shot 2 cue ball only');
  assert(await page.locator('#showPocketEntry').count());
  assert.equal(await page.locator('#showPocketEntry').isChecked(),false);
  await page.evaluate(()=>{
   const snap=billiardsTourBridge.capture(),L=snap.state.tableL,W=snap.state.tableW;
   snap.state.balls=[{id:0,n:'CB',x:L/2,y:W*.82,active:true},{id:1,n:'1',x:L/2,y:W*.43,active:true}];
   snap.state.freeAim={x:L/2,y:W*.2};snap.state.speed=2.2;
   snap.state.shot2Enabled=false;snap.state.activeShot=1;snap.state.showPocketEntry=true;
   billiardsTourBridge.restore(snap);
  });
  assert.equal(await page.locator('#showPocketEntry').isChecked(),true);
  const center=await page.evaluate(()=>BilliardsPocketEntryOverlay.reading()&&({name:BilliardsPocketEntryOverlay.reading().name,label:BilliardsPocketEntryOverlay.reading().label}));
  assert.deepEqual(center,{name:'TM',label:'0 · CENTER'});
  await page.screenshot({path:'/tmp/pocket-entry-2d.png'});
  await page.locator('#table3DToggle').click();
  await page.waitForFunction(()=>Billiards3D.active&&document.querySelector('#pocketEntry3DOverlay').style.display==='block',{timeout:20000});
  assert.equal(await page.evaluate(()=>document.querySelector('#pocketEntry3DOverlay').getBoundingClientRect().width>200),true);
  const recording=await page.evaluate(()=>{
   const v=BilliardsClipView.create('current',640,360);v.paint();
   const image=v.canvas.getContext('2d').getImageData(0,0,640,360).data;
   return {pixels:image.length,reading:BilliardsPocketEntryOverlay.reading().label};
  });
  assert.equal(recording.pixels,640*360*4);
  assert.equal(recording.reading,'0 · CENTER');
  const check=page.locator('#showPocketEntry');await check.check();await check.uncheck();
  await page.waitForFunction(()=>document.querySelector('#pocketEntry3DOverlay').style.display==='none');
  assert.deepEqual(errors,[]);
  console.log('Pocket overlay checkbox, live center reading, 2D/3D display and 3D recording composition passed.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
