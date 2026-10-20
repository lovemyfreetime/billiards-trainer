const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const E=require('../play-engine'),catalog=require('../play-audio/scripts.json');
const server=cp.spawn('python3',['-u','-m','http.server','8798','--bind','127.0.0.1'],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',()=>reject(Error('Test server stopped')));});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({viewport:{width:384,height:780},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const OriginalAudio=window.Audio;window.__testAudio=[];window.Audio=function(...args){const a=new OriginalAudio(...args);window.__testAudio.push(a);return a;};});
  await page.goto('http://127.0.0.1:8798/play.html');await page.locator('.play-game-preview').last().waitFor();
  assert.equal(await page.locator('.play-game-preview').count(),20);assert.equal(await page.locator('button button').count(),0,'speakers are not nested in game buttons');
  for(const [id,game] of Object.entries(E.games)){
   const preview=page.locator(`.play-game-card:has([data-game="${id}"]) .play-game-preview`);
   assert.equal(await preview.getAttribute('data-play-narration'),'setup-'+id);const box=await preview.boundingBox();assert(box.width>=52&&box.height>=52,id+' preview is finger-sized');
   await preview.click();await page.waitForFunction(id=>window.__testAudio.some(a=>a.src.includes('/setup-'+id+'.mp3')&&!a.paused),id);
   assert(await page.getByRole('dialog',{name:'Games',exact:true}).isVisible(),id+' preview must keep the catalog open');assert.equal(await page.locator('#playSetupNames').count(),0);
   await page.waitForFunction(id=>document.querySelector('.play-game-card:has([data-game="'+id+'"]) .play-game-preview').getAttribute('aria-pressed')==='true',id);assert.equal(await preview.getAttribute('aria-pressed'),'true',id+' playing icon');await preview.click();assert.equal(await preview.getAttribute('aria-pressed'),'false');
   await page.locator(`[data-game="${id}"]`).click();const setup=page.locator('#playDialog');
   assert.equal(await setup.locator('p').first().textContent(),game.rules);
   const speaker=setup.locator('.play-popup-audio .play-speaker');assert.equal(await speaker.getAttribute('data-play-narration'),'rules-'+id);
   assert.equal(catalog.records['rules-'+id].text,game.name.toLowerCase()+'. '+game.rules.toLowerCase(),id+' recording exactly matches the visible title and rules');
   await speaker.click();await page.waitForFunction(id=>window.__testAudio.some(a=>a.src.includes('/rules-'+id+'.mp3')&&!a.paused),id);
   await setup.getByRole('button',{name:'Back to table',exact:true}).last().click();
   assert.equal(await page.evaluate(()=>BilliardsNarration.speaking()),false,'returning to the catalog stops narration');
  }
  await page.screenshot({path:'/tmp/play-game-speakers-phone.png'});
  for(const [width,height] of [[320,640],[360,640],[800,360],[800,500],[1280,800],[1440,960]]){
   const c=await browser.newContext({viewport:{width,height},serviceWorkers:'block',hasTouch:width<1400,isMobile:width<1000}),p=await c.newPage();await p.goto('http://127.0.0.1:8798/play.html');await p.locator('.play-game-preview').last().waitFor();
   const issues=await p.locator('.play-game-card').evaluateAll(cards=>cards.flatMap(card=>{
    const a=card.querySelector('.play-game-tile'),b=card.querySelector('.play-game-preview'),icon=card.querySelector('.play-tile-icon'),ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),ir=icon.getBoundingClientRect(),name=a.dataset.game,issues=[];
    if(ir.width<20||ir.height<20||getComputedStyle(icon).display==='none')issues.push(name+' game icon missing');
    if(ir.bottom>br.top-4||Math.abs((ir.left+ir.width/2)-(br.left+br.width/2))>1)issues.push(name+' icon must be above the right-hand speaker');
    if(br.width<52||br.height<52)issues.push(name+' small target');
    for(const el of a.querySelectorAll('strong,small')){const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();if((r.bottom>br.top&&r.top<br.bottom&&r.right>br.left-3)||el.scrollWidth>el.clientWidth+1)issues.push(name+' label overlap');}
    if(br.right>ar.right+1||br.left<ar.left||br.bottom>ar.bottom+1||br.top<ar.top-1)issues.push(name+' speaker outside card');return issues;
   }));assert.deepEqual(issues,[],width+'×'+height);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.screenshot({path:`/tmp/play-game-speakers-${width}x${height}.png`});
  }
  assert.deepEqual(errors,[]);console.log('All 20 game previews play without opening setup; all 20 setup speakers play the exact displayed rules; 7 device layouts have large, separate speaker targets.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
