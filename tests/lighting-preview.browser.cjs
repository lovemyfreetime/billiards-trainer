const fs=require('fs'),cp=require('child_process'),assert=require('assert/strict'),{chromium}=require('playwright');
const out='test-results/lighting';fs.mkdirSync(out,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8797']);await new Promise(r=>server.stdout.once('data',r));
let browser;const results=[];
try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const baseline=cp.execFileSync('git',['show','1744a233772eeb4aa8f1f91492c14d388b4e5e4a:trainer-3d.js'],{encoding:'utf8'});
for(const variant of ['baseline','softbox']){
 const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(variant==='baseline')await page.route('**/trainer-3d.js*',r=>r.fulfill({contentType:'application/javascript',body:baseline}));
 await page.goto('http://127.0.0.1:8797/?train=1');
 await page.waitForFunction(()=>window.Billiards3D&&window.billiardsTourBridge);
 await page.evaluate(()=>billiardsTourBridge.apply({id:'lighting-preview',balls:[[0,.46,.48],[1,.51,.48],[3,.56,.48],[8,.46,.59],[9,.51,.59],[12,.56,.59]],target:1,pocket:[1,1],speed:1,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
 const start=Date.now();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.waitForTimeout(700);
 if(await page.locator('#appViewHint').isVisible())await page.locator('#appViewHint [data-display-dismiss]').click();await page.keyboard.press('Escape');
 const initMs=Date.now()-start;await page.screenshot({path:out+'/'+variant+'-full-table.png'});
 for(const [name,azimuth,elevation] of [['front',0,.48],['diagonal',.85,.65],['opposite',Math.PI,.45],['overhead',-.5,1.25]]){
 await page.evaluate(({azimuth,elevation})=>Billiards3D.restoreCamera({azimuth,elevation,radius:.85,target:{x:.0254,y:.0286,z:.04445},followCue:false}),{azimuth,elevation});
 await page.waitForTimeout(350);await page.locator('#table3DCanvas').screenshot({path:out+'/'+variant+'-'+name+'.png'});
 }
 const timing=await page.evaluate(async()=>{const t=[];for(let i=0;i<30;i++){const s=performance.now();Billiards3D.controllerMove({rotateX:2});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));t.push(performance.now()-s);}return {meanMs:t.reduce((a,b)=>a+b)/t.length,maxMs:Math.max(...t),samples:t};});
 results.push({variant,initMs,timing,errors,camera:await page.evaluate(()=>Billiards3D.camera())});assert.equal(errors.length,0,errors.join(';'));
 await ctx.close();
}
}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1)});
