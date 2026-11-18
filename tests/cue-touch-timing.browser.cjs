const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const viewport = {width:1024,height:640};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const median = a => { const b=[...a].sort((x,y)=>x-y); return (b[(b.length-1)>>1]+b[b.length>>1])/2; };
async function sample(page, context, kind) {
 const el = page.locator(kind==='aim'?'#aimRoller':'#table3DCanvas');
 const box = await (kind==='aim'?page.locator('#aimRoller .rollerTrack'):el).boundingBox();
 assert(box && box.width>0 && box.height>0, kind+' control is visible');
 const x=box.x+box.width*(kind==='aim'?.5:.45), y=box.y+box.height*.45;
 const cdp = await context.newCDPSession(page);
 const touch = (type,point) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[point]:[]});
 await touch('touchStart',{x,y});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await el.evaluate(node=>{
  window.timingRows=[];
  let active;
  const start=event=>{if(event.isTrusted)active={start:performance.now(),timestamp:event.timeStamp};};
  const finish=()=>{if(active)active.end=performance.now();};
  const render=()=>{if(!active||active.end===undefined)return;const t=performance.now();timingRows.push({handler:active.end-active.start,toRender:t-active.start,queued:active.start-active.timestamp});active=null;};
  node.addEventListener('pointermove',start,true);
  node.addEventListener('pointermove',finish);
  window.addEventListener('billiards:3d-render',render);
  window.clearTiming=()=>{node.removeEventListener('pointermove',start,true);node.removeEventListener('pointermove',finish);window.removeEventListener('billiards:3d-render',render)};
 });
 const before=await page.evaluate(()=>({aim:billiardsTourBridge.capture().state.freeAim,heading:Billiards3D.camera().azimuth}));
 for(let i=1;i<=13;i++){
  const n=await page.evaluate(()=>timingRows.length);
  await touch('touchMove',{x:x+12+2*i,y:y+14+3*i});
  await page.waitForFunction(n=>timingRows.length>n,n,{timeout:18000});
 }
 await touch('touchEnd');await cdp.detach();
 const after=await page.evaluate(()=>({aim:billiardsTourBridge.capture().state.freeAim,heading:Billiards3D.camera().azimuth}));
 if(kind==='aim')assert.notDeepEqual(before.aim,after.aim);else assert.notEqual(before.heading,after.heading);
 return page.evaluate(()=>{clearTiming();return timingRows.slice(3);});
}
async function measure(browser, dir, port) {
 const server=spawn(process.execPath,[dir+'/tests/range-server.cjs',String(port)]);
 const context=await browser.newContext({viewport,screen:viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'});
 try{
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:'+port+'/')).ok)break;}catch{}await sleep(100);}
  await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/?train=1');
  await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsCueSetup);
  await page.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{tableL:2.54,tableW:1.27,speed:2.15,shot2Enabled:false,activeShot:1,sideSpin:0,follow:-.26,cueElevationDeg:3,airbornePhysics:false,showCueStick:true,showPaths:true,freeAim:{x:.65,y:1.04},balls:[{id:0,n:'CB',active:true,x:.65,y:.08},{id:1,n:'1',active:true,x:.65,y:.75}]});billiardsTourBridge.restore(s);});
  await page.locator('#table3DToggle').click();
  await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.cueModel()?.referenceReady);
  if(await page.evaluate(()=>Billiards3D.locked))await page.locator('#table3DLock [data-adjust=view]').click();
  await page.locator('#table3DRotate').evaluate(e=>e.click());
  const aim=await sample(page,context,'aim');
  const orbit=await sample(page,context,'orbit');
  assert.deepEqual(errors,[]);
  return {dir,aim,orbit};
 }finally{await context.close();server.kill();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const results=[];
 try{
  for(const [i,dir] of ['baseline','candidate','candidate','baseline'].entries()){
   const result=await measure(browser,dir,8800+i);
   results.push(result);
   for(const kind of ['aim','orbit'])console.log('BLOCK',i,dir,kind,JSON.stringify(Object.fromEntries(['handler','toRender','queued'].map(key=>[key,median(result[kind].map(v=>v[key]))]))));
  }
  for(const dir of ['baseline','candidate'])for(const kind of ['aim','orbit']){
   const rows=results.filter(r=>r.dir===dir).flatMap(r=>r[kind]);
   console.log('RESULT',dir,kind,JSON.stringify(Object.fromEntries(['handler','toRender','queued'].map(k=>[k,median(rows.map(r=>r[k]))]))),'n='+rows.length);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
