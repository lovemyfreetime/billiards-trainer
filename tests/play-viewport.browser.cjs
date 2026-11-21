'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createHost}=require('../local-host/server.cjs');
(async()=>{
 const service=createHost({port:0,bind:'127.0.0.1',addressProvider:()=>['127.0.0.1']}),{port}=await service.listen(),base='http://127.0.0.1:'+port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true});
 async function fits(page,selector,label){
  await page.locator(selector).waitFor({state:'visible'});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.locator(selector).evaluate(root=>{
   const v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight;
   const bad=[...root.querySelectorAll('button,a,summary,input,select')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]')).map(e=>({label:e.textContent.trim()||e.getAttribute('aria-label'),r:e.getBoundingClientRect().toJSON()})).filter(x=>x.r.width&&x.r.height&&(x.r.left<-.5||x.r.top<-.5||x.r.right>w+1||x.r.bottom>h+1));
   return {w,h,bad,client:root.clientHeight,scroll:root.scrollHeight};
  });
  assert.deepEqual(result.bad,[],label+' offscreen controls '+JSON.stringify(result));
  assert(result.scroll<=result.client+2,label+' has vertical overflow '+JSON.stringify(result));
 }
 try{
  for(const spec of [{width:1920,height:1080},{width:1366,height:768},{width:1280,height:720},{width:844,height:390,mobile:true}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},isMobile:!!spec.mobile,hasTouch:!!spec.mobile,userAgent:spec.mobile?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36':undefined,serviceWorkers:'block'});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/play.html');await fits(page,'#playDialog','Home '+JSON.stringify(spec));
   const overlap=await page.evaluate(()=>{
    const stage=document.querySelector('.play-home-scene'),r=stage.getBoundingClientRect(),scale=Math.min(r.width/1536,r.height/1024),left=r.left+r.width*.485-1536*scale/2,top=r.top+(r.height-1024*scale)/2;
    const players=[[530,196,253,488],[580,306,700,485]].map(([x,y,w,h])=>({left:left+x*scale,top:top+y*scale,right:left+(x+w)*scale,bottom:top+(y+h)*scale}));
    return [...document.querySelectorAll('.play-home-family,.play-home-companion,.play-home-footer')].filter(e=>players.some(p=>{const b=e.getBoundingClientRect();return b.left<p.right&&b.right>p.left&&b.top<p.bottom&&b.bottom>p.top;})).map(e=>e.className);
   });assert.deepEqual(overlap,[],'Main controls cover players at '+JSON.stringify(spec));
   for(const group of ['secret','pub','cards','tactical']){
    await page.goto(base+'/play.html?category='+group);await fits(page,'#playDialog','Category '+group+' '+JSON.stringify(spec));
    assert.equal(await page.locator('.play-family-game').count(),5);
    const collision=await page.locator('.play-family-game').evaluateAll(nodes=>nodes.some((a,i)=>nodes.slice(i+1).some(b=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return ar.left<br.right-1&&ar.right>br.left+1&&ar.top<br.bottom-1&&ar.bottom>br.top+1;})));
    assert.equal(collision,false,'Category cards overlap '+JSON.stringify(spec));
   }
   await page.goto(base+'/play.html');await page.getByRole('button',{name:'Tools & voice',exact:true}).click();
   const toolTabs=page.locator('.play-tool-tabs button');for(let i=0;i<await toolTabs.count();i++){await toolTabs.nth(i).click();await fits(page,'.play-tools-dialog','Tools tab '+i+' '+JSON.stringify(spec));}
   await page.locator('.play-tools-top').getByRole('button',{name:'Back to table',exact:true}).click();
   await page.goto(base+'/play.html?catalog=all');await fits(page,'#playDialog','All 20 '+JSON.stringify(spec));assert.equal(await page.locator('.play-game-tile').count(),20);assert(await page.locator('.play-catalog-nav').evaluate(e=>e.getBoundingClientRect().bottom>=(window.visualViewport?.height||innerHeight)-24),'Catalogue must fill the viewport');
   await page.locator('.play-game-tile[data-game=kelly]').click();await fits(page,'#playDialog','Setup '+JSON.stringify(spec));
   await page.goto(base+'/shot-clock.html');await fits(page,'.sc-layout','Clock '+JSON.stringify(spec));
   await page.getByRole('button',{name:'Shot Clock Settings',exact:true}).click();await fits(page,'.sc-layout','Clock settings '+JSON.stringify(spec));
   const tabs=page.locator('.sc-settings-tabs button');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await fits(page,'.sc-layout','Settings tab '+i+' '+JSON.stringify(spec));}
   await page.getByRole('button',{name:'Cancel',exact:true}).click();await fits(page,'.sc-layout','Clock return '+JSON.stringify(spec));
   assert.deepEqual(errors,[]);await context.close();console.log('Play viewport passed',spec);
  }
 }finally{await browser.close();service.server.closeAllConnections();await new Promise(resolve=>service.server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
