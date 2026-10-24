const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
(async()=>{
 const manager=fs.readFileSync('app-updates.js','utf8');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app-updates.js'?'text/javascript':'text/html');res.end(req.url==='/app-updates.js'?manager:'<!doctype html><button data-app-update hidden>Check for updates</button><script src="/app-updates.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{for(const platform of ['Android','Windows']){
  const c=await browser.newContext();await c.addInitScript(platform=>{
   window['BilliardsBundled'+platform]=true;window.BilliardsContentUpdateProtocol=1;window.__nativeState='current';window.__checks=0;window.__applies=0;window.__busy=false;window.billiardsTourBridge={snapshot:()=>({busy:window.__busy})};
   window.addEventListener('billiards:before-reload',()=>localStorage.setItem('saved-layout','preserved before restart'));
   const status=()=>({state:window.__nativeState,done:20,total:20});
   const check=()=>{window.__checks++;window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:status()}));};
   const apply=()=>{window.__applies++;window.__savedAtApply=localStorage.getItem('saved-layout');};
   if(platform==='Android')window.BilliardsAndroid={contentUpdateStatus:()=>JSON.stringify({state:'idle'}),checkContentUpdates:check,applyContentUpdate:apply};
   else window.chrome={webview:{postMessage:m=>{if(m.type==='content-update-check')check();if(m.type==='content-update-apply')apply();if(m.type==='content-update-status')window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:{state:'idle'}}));}}};
   navigator.serviceWorker.register=()=>{throw Error('Native wrapper must never register a browser service worker');};
  },platform);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);assert(await p.evaluate(()=>BilliardsAppUpdates.supported&&BilliardsAppUpdates.native));assert.equal(await p.evaluate(()=>__checks),1);assert.equal(await p.locator('#appUpdateNotice').count(),0,'Background current-version checks stay quiet');
  const check=p.getByRole('button',{name:'Check for updates',exact:true});assert(await check.isVisible());await p.evaluate(()=>__nativeState='failed');await check.click();assert((await p.locator('#appUpdateNotice').textContent()).includes('working offline version is unchanged'));assert.equal(await p.evaluate(()=>__applies),0);
  await p.evaluate(()=>__nativeState='native-required');await check.click();assert((await p.locator('#appUpdateNotice').textContent()).includes('newer installed app'));
  await p.evaluate(()=>{__nativeState='ready';window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:{state:'ready'}}));});const restart=p.getByRole('button',{name:'Restart app',exact:true});await restart.waitFor();assert.equal(await p.evaluate(()=>__applies),0,'Update readiness never interrupts the current session');
  await p.evaluate(()=>__busy=true);await restart.click();assert.equal(await p.evaluate(()=>__applies),0,'An executing shot blocks restart');await p.evaluate(()=>__busy=false);await restart.click();assert.equal(await p.evaluate(()=>__applies),1);assert.equal(await p.evaluate(()=>__savedAtApply),'preserved before restart','Saved session is flushed before the native reload request');assert.deepEqual(errors,[]);await c.close();console.log(platform+': native bridge, quiet background checks, failure notice, protocol gate, restart guard and saved session passed');
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
