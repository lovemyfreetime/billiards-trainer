const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const {chromium} = require('playwright');
const dir = 'test-results/controller-scroll';
fs.mkdirSync(dir, {recursive:true});
(async () => {
  const server = cp.spawn(process.execPath, ['tests/range-server.cjs','8847']);
  let browser;
  const results = [];
  try {
    await new Promise((resolve,reject) => {server.stdout.once('data',resolve);server.once('error',reject);});
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
    for (const viewport of [{width:1280,height:800},{width:740,height:360},{width:390,height:844}]) {
      const context = await browser.newContext({viewport,hasTouch:true,isMobile:true,serviceWorkers:'block'});
      await context.addInitScript(() => {
        window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;
        window.chrome={webview:{postMessage(){}}};
        window.BilliardsAndroid={controllerInputVersion:()=>1,setControllerEnabled(){}};
        window.__pad={id:'Wireless Controller (1356:2508)',index:7,mapping:'standard',ready:true,axes:[0,0,0,0],buttons:Array(17).fill(0)};
        window.__send=()=>dispatchEvent(new CustomEvent('billiards:controller-state',{detail:[__pad]}));
      });
      const page = await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.goto('http://127.0.0.1:8847/?train=1');
        await page.waitForFunction(()=>window.BilliardsController);
        await page.locator('#workspace-view summary').click();
        await page.locator('#trainerControllerSetup').click();
        await page.locator('#trainerControllerEnabled').check();
        await page.evaluate(()=>__send());
        await page.waitForFunction(()=>document.querySelector('#trainerControllerRaw').textContent.includes('Android input: standard'));
        const mapping=page.getByLabel('Button 14 action',{exact:true});
        await mapping.selectOption('fineLeft');
        await mapping.focus();
        await page.evaluate(()=>{
          const d=document.querySelector('#trainerControllerDialog');
          window.__scrollSamples=[];window.__mutations=0;window.__phase='idle';
          window.__watch=new MutationObserver(records=>{__mutations+=records.length;});
          __watch.observe(d,{subtree:true,childList:true,characterData:true,attributes:true});
          window.__timer=setInterval(()=>{
            __send();__scrollSamples.push({phase:__phase,top:d.scrollTop,height:d.scrollHeight,focus:document.activeElement?.getAttribute('aria-label')});
          },50);
          d.scrollTop=Math.max(0,d.scrollHeight-d.clientHeight-20);
          window.__startTop=d.scrollTop;
        });
        await page.waitForTimeout(1800);
        await page.evaluate(()=>{
          __phase='changing';let n=0;
          window.__changes=setInterval(()=>{n++;__pad.axes=[Math.sin(n)*.3,-.5,.75,0];__pad.buttons[7]=n%2;},70);
        });
        await page.waitForTimeout(1800);
        const evidence=await page.evaluate(()=>{
          clearInterval(__timer);clearInterval(__changes);__watch.disconnect();
          return {startTop:__startTop,samples:__scrollSamples,mutations:__mutations,controller:BilliardsController.status(),raw:document.querySelector('#trainerControllerRaw').textContent};
        });
        assert(evidence.startTop>100,'Fixture reaches the lower button mappings');
        assert(evidence.samples.every(s=>Math.abs(s.top-evidence.startTop)<=2),'Controller telemetry moved the scroll position: '+JSON.stringify(evidence));
        assert(evidence.samples.every(s=>s.focus==='Button 14 action'),'Controller telemetry moved form focus');
        assert.equal(await mapping.inputValue(),'fineLeft');
        await page.evaluate(()=>dispatchEvent(new CustomEvent('billiards:controller-state',{detail:[]})));
        await page.waitForFunction(()=>!BilliardsController.status().connected);
        const missing = await page.evaluate(()=>({top:document.querySelector('#trainerControllerDialog').scrollTop,fields:[...document.querySelectorAll('#trainerControllerButtons select')].map(e=>({disabled:e.disabled}))}));
        await page.evaluate(()=>__send());
        await page.waitForFunction(()=>BilliardsController.status().connected);
        const returnedTop=await page.locator('#trainerControllerDialog').evaluate(e=>e.scrollTop);
        evidence.availability={missing,returnedTop};
        assert(Math.abs(missing.top-evidence.startTop)<=2 && Math.abs(returnedTop-evidence.startTop)<=2,'Controller availability refresh moved scroll: '+JSON.stringify({startTop:evidence.startTop,missing,returnedTop}));
        assert(missing.fields.length>=16 && missing.fields.every(e=>e.disabled),'Unavailable controller mappings stay visible and disabled');
        assert(await mapping.isEnabled(),'Returning controller restores editable mappings');
        assert.equal(await mapping.inputValue(),'fineLeft');
        assert.deepEqual(errors,[]);
        await page.screenshot({path:dir+'/'+viewport.width+'-passed.png'});
        results.push({viewport,status:'passed',...evidence});
        console.log(viewport.width+': stable scroll through Android telemetry and input loss/return; '+evidence.mutations+' DOM mutations');
      } catch (error) {
        results.push({viewport,status:'failed',error:error.stack});
        await page.screenshot({path:dir+'/'+viewport.width+'-failed.png'}).catch(()=>{});
      } finally {await context.close();}
    }
    fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2)+'\n');
    assert.deepEqual(results.filter(r=>r.status==='failed'),[],JSON.stringify(results,null,2));
  } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
