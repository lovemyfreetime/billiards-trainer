const {chromium}=require('playwright'),assert=require('node:assert/strict');
const server=require('node:child_process').spawn('python',['-u','-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}}),page=await context.newPage();
 await page.addInitScript(()=>{window.__audio=[];const NativeAudio=Audio;window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);__audio.push(a);return a}})});
 await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>window.billiardsPoolGuide);
 const host=page.locator('#bt-guide-pool-root'),play=host.locator('[data-action="play-pause"]');
 const glowing=async expected=>{await page.waitForFunction(expected=>document.getElementById('bt-guide-pool-root').classList.contains('btg-narrating')===expected,expected);for(const action of ['Read','More'])assert.equal(await host.locator(`[data-action="${action}"]`).evaluate(el=>getComputedStyle(el).animationName),expected?'btg-narration-glow':'none')};
 const playing=async()=>{await page.waitForFunction(()=>__audio.some(a=>!a.paused&&a.currentTime>0&&a.dataset.topic));await glowing(true)};
 await page.click('#btg-pool-guide');await playing();assert.equal(await play.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(102, 217, 237)');
 await host.locator('[data-action="Read"]').click();await glowing(true);await host.locator('[data-action="More"]').click();await glowing(true);
 await play.click();await glowing(false);await play.click();await playing();
 // Buffering clears attention until the media emits playing again.
 await page.evaluate(()=>__audio.find(a=>a.dataset.topic==='welcome-guide').dispatchEvent(new Event('waiting')));await glowing(false);
 await page.evaluate(()=>__audio.find(a=>a.dataset.topic==='welcome-guide').dispatchEvent(new Event('playing')));await glowing(true);
 await page.emulateMedia({reducedMotion:'reduce'});for(const action of ['Read','More']){const style=await host.locator(`[data-action="${action}"]`).evaluate(el=>({animation:getComputedStyle(el).animationName,shadow:getComputedStyle(el).boxShadow}));assert.equal(style.animation,'none');assert.notEqual(style.shadow,'none')}
 await page.emulateMedia({reducedMotion:'no-preference'});
 await host.locator('[data-action="■"]').click();await glowing(false);
 await host.locator('.btg-categories button').filter({hasText:/^Drills$/}).click();await playing();
 const lesson=await host.locator('select option').evaluateAll(opts=>opts.find(o=>o.value).value);await host.locator('select').selectOption(lesson);await playing();
 if(await host.locator('[data-action="A"]').getAttribute('aria-pressed')==='false')await host.locator('[data-action="A"]').click();await host.locator('select').focus();await page.evaluate(()=>{window.__select=document.querySelector('#bt-guide-pool-root select');const a=__audio.find(a=>!a.paused&&a.dataset.topic);a.playbackRate=8});
 await page.waitForFunction(id=>billiardsPoolGuide.getState().topicId!==id,lesson);await playing();assert.equal(await page.evaluate(()=>__select===document.querySelector('#bt-guide-pool-root select')),true);
 await page.click('#btg-pool-guide');await page.waitForFunction(()=>!document.getElementById('bt-guide-pool-root').classList.contains('btg-narrating'));
 await page.click('#btg-pool-start');assert.equal(await host.isVisible(),true);assert.equal(await host.locator('[data-action="Try the Shot"]').count(),1);await page.click('#btg-pool-start');assert.equal(await host.evaluate(el=>el.classList.contains('btg-narrating')),false);
 console.log('Guide attention: real welcome/lesson playback and interactive Get Started, pause/resume/stop, buffering, Auto dropdown continuity, and reduced motion passed.');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.kill();process.exit(process.exitCode||0)});
