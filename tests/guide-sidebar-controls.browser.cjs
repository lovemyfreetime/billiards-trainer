const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const {chromium} = require('playwright');
const dir = 'test-results/guide-sidebar';
fs.mkdirSync(dir, {recursive:true});
(async () => {
  const server = cp.spawn(process.execPath, ['tests/range-server.cjs','8846']);
  let browser;
  const results = [];
  try {
    await new Promise((resolve,reject) => {server.stdout.once('data',resolve);server.once('error',reject);});
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
    for(const viewport of [{width:1536,height:900},{width:1365,height:900},{width:1024,height:768},{width:390,height:844}]) {
      const context = await browser.newContext({viewport,serviceWorkers:'block'});
      await context.addInitScript(() => {window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
      const page = await context.newPage();page.setDefaultTimeout(10000);
      const errors = [];page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.goto('http://127.0.0.1:8846/?train=1');
        await page.waitForFunction(()=>window.billiardsGetStartedTour&&window.billiardsPoolGuide);
        await page.locator('#phoneControls').click();
        await page.locator('#btg-pool-start').click();
        await page.evaluate(()=>billiardsPoolGuide.pause());
        const host = page.locator('#bt-guide-pool-root');
        const practice = host.locator('[data-action=Practice]');
        await practice.waitFor({state:'visible'});
        const hit = await practice.evaluate(e=>{const r=e.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {reachable:e.contains(top),coveredBy:top?.outerHTML.slice(0,200)};});
        assert(hit.reachable,'Practice is covered: '+hit.coveredBy);
        await practice.click();
        assert.match(await host.locator('.btg-learning-card').textContent(),/Purpose.*Instruction.*Success.*Transfer/s);
        const toolbar = host.locator('.btg-toolbar');
        assert(await toolbar.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Sidebar toolbar fits its own width');
        const toggle = host.locator('.btg-expansion-tab');
        assert(await toggle.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Reading toggle remains reachable');
        await page.screenshot({path:dir+'/'+viewport.width+'-practice.png'});
        assert.deepEqual(errors,[]);
        results.push({viewport,status:'passed'});console.log(viewport.width+': Practice opens and sidebar controls remain reachable');
      } catch(error) {
        results.push({viewport,status:'failed',error:error.stack});
        await page.screenshot({path:dir+'/'+viewport.width+'-failed.png'}).catch(()=>{});
      } finally {await context.close();}
    }
    fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2)+'\n');
    assert.deepEqual(results.filter(r=>r.status==='failed'),[],JSON.stringify(results,null,2));
  } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
