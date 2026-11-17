const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/table-construction';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8835']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile]of [[1600,1000,false],[844,390,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 try{
 await page.goto('http://127.0.0.1:8835/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
 await page.evaluate(()=>billiardsTourBridge.apply({id:'table-construction',title:'Pocket construction',balls:[[0,.3,.5],[1,.74,.5],[2,.91,.13],[7,.48,.1]],target:1,pocket:[1,1],speed:1.3,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
 const before=await page.evaluate(()=>billiardsTourBridge.predict({paths:true}));await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.pocketGeometry().length===6);await page.waitForFunction(()=>Billiards3D.pocketGeometry().every(p=>p.materialMapsReady===2));await settle();
 assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),before,'Construction never changes the solver');
 const wells=await page.evaluate(()=>Billiards3D.pocketGeometry());fs.writeFileSync(dir+'/'+name+'-geometry.json',JSON.stringify(wells,null,2));
 for(const w of wells){assert.equal(w.lining,'flush-pocket-liner','Black lining covers the rail interior');assert.equal(w.woodTextureWidth,1024,'Photographed wood keeps its allocated texture size');assert(w.floorHeight<-.15,'Deep open drop: '+JSON.stringify(w));assert(Math.abs(w.shelfHeight)<.005,'Cloth slate shelf exists before drop: '+JSON.stringify(w));assert(w.backHeight>.035,'Thin liner joins raised rail: '+JSON.stringify(w));assert(Math.abs(w.woodHeight-w.capHeight)<.002,'Wood cap continuous outside liner: '+JSON.stringify(w));assert(Math.abs(w.noseHeight-.05715*.635)<1e-8);}
 await page.screenshot({path:dir+'/'+name+'-overview.png'});
 const s=await page.evaluate(()=>billiardsTourBridge.capture().state),plan=await page.evaluate(()=>{const s=billiardsTourBridge.capture().state,p=BilliardsTableConstruction.plan({L:s.tableL,W:s.tableW,R:s.ballR});return p.pockets.map(v=>({id:v.id,n:v.n,origin:v.origin,center:v.at(v.centerN,0)}));});
 for(const id of [1,2,3,4,5,6]){
  const p=plan.find(p=>p.id===id),azimuth=Math.atan2(-p.n[0],-p.n[1]);
  await page.evaluate(({p,azimuth})=>Billiards3D.restoreCamera({azimuth,elevation:28*Math.PI/180,radius:.52,target:{x:p.center[0],y:.012,z:p.center[2]}}),{p,azimuth});await settle();await page.screenshot({path:dir+'/'+name+'-pocket-'+id+'.png'});
 }
 for(const id of [2,3]){const p=plan.find(p=>p.id===id),azimuth=Math.atan2(-p.n[0],-p.n[1])+.35;await page.evaluate(({p,azimuth})=>Billiards3D.restoreCamera({azimuth,elevation:8*Math.PI/180,radius:.58,target:{x:p.center[0],y:.025,z:p.center[2]}}),{p,azimuth});await settle();await page.screenshot({path:dir+'/'+name+'-cue-height-'+id+'.png'});}
 await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),before);assert.deepEqual(errors,[]);console.log(name+': all six open drops, slate shelves, rail caps, cushion height, offline-local material maps, close-ups and unchanged physics passed');
 }catch(e){await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
