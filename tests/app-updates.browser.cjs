const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),crypto=require('node:crypto'),{chromium,devices}=require('playwright');
(async()=>{
 const manager=fs.readFileSync('app-updates.js','utf8'),worker=fs.readFileSync('service-worker.js','utf8');let version=1,corrupt=false;
 const hash=content=>crypto.createHash('sha256').update(content).digest('hex');
 const html=()=>`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Update fixture</title><div id="release">Release ${version}</div><button data-app-update hidden>Check for updates</button><script src="./app-updates.js"></script>`;
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;let body,type='text/javascript';
  if(path==='/service-worker.js')body=worker.replace(/const CACHE_NAME = '[^']+';/,`const CACHE_NAME = 'billiards-trainer-4-12-fixture-${version}';`);
  else if(path==='/offline-assets.json'){type='application/json';body=JSON.stringify({version:String(version),files:{'index.html':hash(html()),'app-updates.js':corrupt?'invalid-hash':hash(manager)}});}
  else if(path==='/app-updates.js')body=manager;
  else if(path==='/'||path==='/index.html'){type='text/html';body=html();}
  else{res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:process.env.CHROMIUM_ARGS?JSON.parse(process.env.CHROMIUM_ARGS):[]});
 try{
  const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage();
  await page.goto(base);await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.reload();await page.waitForFunction(()=>window.BilliardsAppUpdates);
  await page.evaluate(()=>localStorage.setItem('saved-layout','keep my shot'));
  version=2;await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await page.getByRole('button',{name:'Reload app',exact:true}).waitFor();
  await page.waitForFunction(()=>document.getElementById('appUpdateNotice')?.textContent.includes('Update ready'));
  assert.equal(await page.locator('#release').textContent(),'Release 1','A new release never automatically reloads an arranged shot');
  assert.equal(await page.evaluate(()=>localStorage.getItem('saved-layout')),'keep my shot');
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Reload app',exact:true}).click()]);
  assert.equal(await page.locator('#release').textContent(),'Release 2','Explicit reload uses the newly verified complete release');
  assert.equal(await page.evaluate(()=>localStorage.getItem('saved-layout')),'keep my shot');
  await context.setOffline(true);await page.reload();assert.equal(await page.locator('#release').textContent(),'Release 2','Updated app still loads offline');
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();await page.waitForFunction(()=>document.getElementById('appUpdateNotice')?.textContent.includes('offline'));
  await page.getByRole('button',{name:'Dismiss update notice'}).click();
  version=3;corrupt=true;await context.setOffline(false);
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();await page.waitForFunction(()=>document.getElementById('appUpdateNotice')?.textContent.includes('did not finish'));
  assert.equal(await page.locator('#release').textContent(),'Release 2');
  await context.setOffline(true);await page.reload();assert.equal(await page.locator('#release').textContent(),'Release 2','Failed update preserves the previous complete offline release');
  assert.equal(await page.evaluate(()=>localStorage.getItem('saved-layout')),'keep my shot');
  version=4;corrupt=false;await context.setOffline(false);
  await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+61000;window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(()=>document.getElementById('appUpdateNotice')?.textContent.includes('Update ready'));
  assert.equal(await page.locator('#release').textContent(),'Release 2','Reconnection checks remain nondisruptive');
  const keys=await page.evaluate(()=>caches.keys());assert(keys.some(k=>k.endsWith('fixture-2')));assert(!keys.some(k=>k.endsWith('fixture-3')),'Partial releases are never retained instead of the prior complete release');
  await page.screenshot({path:'/tmp/android-update-ready.png'});
  await context.close();
  const native=await browser.newContext();await native.addInitScript(()=>{window.BilliardsBundledAndroid=true;});const wrapped=await native.newPage();await wrapped.goto(base);
  assert.equal(await wrapped.evaluate(()=>BilliardsAppUpdates.supported),false);
  assert.equal(await wrapped.getByRole('button',{name:'Check for updates'}).isVisible(),false,'Bundled wrappers do not register a web update flow');await native.close();
  console.log('Android browser update: explicit reload, state preserved, offline reload, failed download rollback, reconnection check and bundled-wrapper exclusion pass.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
