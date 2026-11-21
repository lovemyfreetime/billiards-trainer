'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createHost}=require('../local-host/server.cjs');
const games=require('../play-engine').games;
(async()=>{
 const service=createHost({port:0,bind:'127.0.0.1',addressProvider:()=>['127.0.0.1']}),{port}=await service.listen(),base='http://127.0.0.1:'+port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true});
 async function fits(page,selector,label){
  await page.locator(selector).waitFor({state:'visible'});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.locator(selector).evaluate(root=>{
   const v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight;
   const bad=[...root.querySelectorAll('button,a,summary,input,select')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]')).map(e=>({label:e.textContent.trim()||e.getAttribute('aria-label'),r:e.getBoundingClientRect().toJSON()})).filter(x=>x.r.width&&x.r.height&&(x.r.left<-.5||x.r.top<-.5||x.r.right>w+1||x.r.bottom>h+1));
   const cards=[...root.querySelectorAll('.play-home-family')].map(e=>e.getBoundingClientRect()),collision=cards.some((a,i)=>cards.slice(i+1).some(b=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1));return {w,h,bad,client:root.clientHeight,scroll:root.scrollHeight,collision};
  });
  assert.equal(result.collision,false,label+' overlapping main cards');
  assert.deepEqual(result.bad,[],label+' offscreen controls '+JSON.stringify(result));
  assert(result.scroll<=result.client+2,label+' has vertical overflow '+JSON.stringify(result));
 }
 try{
  for(const spec of [{width:1920,height:1080},{width:1366,height:768},{width:1280,height:720},{width:844,height:390,mobile:true}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},isMobile:!!spec.mobile,hasTouch:!!spec.mobile,userAgent:spec.mobile?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36':undefined,serviceWorkers:'block'});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/play.html');await fits(page,'#playDialog','Home '+JSON.stringify(spec));
   const overlap=await page.evaluate(()=>{
    const stage=document.querySelector('.play-home-scene'),r=stage.getBoundingClientRect(),dialog=document.getElementById('playDialog'),photo=getComputedStyle(dialog,'::before'),closer=photo.content!=='none';
    const crop=getComputedStyle(dialog),canvas=dialog.getBoundingClientRect(),pixelScale=canvas.width/dialog.clientWidth,scale=closer?parseFloat(crop.getPropertyValue('--play-photo-width'))/1536*pixelScale:Math.min(r.width/1536,r.height/1024),left=closer?canvas.left+parseFloat(crop.getPropertyValue('--play-photo-left'))*pixelScale:r.left+r.width*.485-1536*scale/2,top=closer?canvas.top+parseFloat(crop.getPropertyValue('--play-photo-top'))*pixelScale:r.top+(r.height-1024*scale)/2;
    // A little overlap on the standing man's lower body is allowed; keep his face and all of her clear.
    const players=(closer?[[548,196,165,190],[580,306,700,485]]:[[530,196,253,488],[580,306,700,485]]).map(([x,y,w,h])=>({left:left+x*scale,top:top+y*scale,right:left+(x+w)*scale,bottom:top+(y+h)*scale}));
    const blocked=[...document.querySelectorAll('.play-home-family,.play-home-companion,.play-home-footer,.play-home-voice')].filter(e=>players.some(p=>{const b=e.getBoundingClientRect();return b.left<p.right&&b.right>p.left&&b.top<p.bottom&&b.bottom>p.top;})).map(e=>e.className);
    if(closer&&top+1024*scale<innerHeight-1)blocked.push('Photo stops above the bottom controls');
    if(closer&&scale<Math.min(r.width/1536,r.height/1024)*1.2)blocked.push('Photo did not zoom in');
    return blocked;
   });assert.deepEqual(overlap,[],'Main controls cover players at '+JSON.stringify(spec));
   for(const group of ['secret','pub','cards','tactical']){
    await page.goto(base+'/play.html?category='+group);await fits(page,'#playDialog','Category '+group+' '+JSON.stringify(spec));
    assert.equal(await page.locator('.play-family-game').count(),5);
    const collision=await page.locator('.play-family-game').evaluateAll(nodes=>nodes.some((a,i)=>nodes.slice(i+1).some(b=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return ar.left<br.right-1&&ar.right>br.left+1&&ar.top<br.bottom-1&&ar.bottom>br.top+1;})));
    assert.equal(collision,false,'Category cards overlap '+JSON.stringify(spec));
    const composition=await page.locator('.play-family-stage').evaluate(stage=>{
     const board=stage.getBoundingClientRect(),cards=[...stage.querySelectorAll('.play-family-game')].map(e=>e.getBoundingClientRect()),middle=cards[4];
     return {centerError:Math.max(Math.abs(middle.left+middle.width/2-board.left-board.width/2),Math.abs(middle.top+middle.height/2-board.top-board.height/2)),span:Math.max(...cards.map(r=>r.right))-Math.min(...cards.map(r=>r.left)),cardWidth:middle.width};
    });
    assert(composition.centerError<1,'Fifth game must remain centered '+JSON.stringify(spec));
    assert(composition.span<=composition.cardWidth*3.2,'Outer games must form a compact group '+JSON.stringify(spec));
   }
   await page.goto(base+'/play.html');await page.locator('.play-home-footer').getByRole('button',{name:'Tools',exact:true}).click();
   const toolTabs=page.locator('.play-tool-tabs button[aria-pressed]');assert.deepEqual(await toolTabs.allTextContents(),['Clicker','Voice','Drills']);
   for(let i=0;i<await toolTabs.count();i++){
    await toolTabs.nth(i).click();
    await fits(page,'.play-tools-dialog','Tools tab '+i+' '+JSON.stringify(spec));
    await page.waitForFunction(()=>{const root=document.querySelector('.play-tools-dialog'),r=root.querySelector('h2').getBoundingClientRect();return root.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
    if(process.env.PLAY_REVIEW_DIR){require('node:fs').mkdirSync(process.env.PLAY_REVIEW_DIR,{recursive:true});await page.screenshot({path:process.env.PLAY_REVIEW_DIR+'/tools-'+spec.width+'-'+i+'.png'});}
    const tools=await page.locator('.play-tools-dialog').evaluate(root=>{
     const r=root.getBoundingClientRect(),controls=['.play-tools-audio .play-speaker','#appDisplayControl','#appCloseControl'].map(selector=>root.querySelector(selector).getBoundingClientRect());
     return {x:r.x,y:r.y,width:r.width,height:r.height,narrators:root.querySelectorAll('[data-play-narration]').length,clock:[...root.querySelectorAll('button')].filter(b=>b.textContent==='Shot Clock').length,alignment:controls.map(r=>r.y+r.height/2),gaps:controls.slice(1).map((r,i)=>r.left-controls[i].right),background:getComputedStyle(root,'::backdrop').backgroundColor,picker:root.querySelectorAll('.experience-corner').length};
    });
    assert(Math.abs(tools.x)<1&&Math.abs(tools.y)<1&&Math.abs(tools.width-spec.width)<1&&Math.abs(tools.height-spec.height)<1,'Tools fills the screen '+JSON.stringify(tools));
    assert.equal(tools.narrators,1);assert.equal(tools.clock,1);assert.equal(tools.picker,0);assert.equal(tools.background,'rgb(16, 29, 23)');
    assert(Math.max(...tools.alignment)-Math.min(...tools.alignment)<1,'Tools narration and dots align '+JSON.stringify(tools));
    assert(tools.gaps.every(gap=>gap>=0&&gap<=24),'Tools window actions stay together without overlap '+JSON.stringify(tools));
   }
   await toolTabs.nth(0).click();await page.getByRole('button',{name:'Assign next remote button',exact:true}).click();await page.keyboard.press('F8');assert.match(await page.locator('.play-tools-dialog > [data-input-status]').textContent(),/assigned/);
   await page.locator('.play-tools-top').getByRole('button',{name:'Shot Clock',exact:true}).click();await fits(page,'.sc-layout','Clock from Tools '+JSON.stringify(spec));
   await page.locator('.sc-navigation .sc-back').click();await fits(page,'#playDialog','Home from clock '+JSON.stringify(spec));
   await page.locator('.play-home-footer').getByRole('button',{name:'Tools',exact:true}).click();
   await page.locator('.play-tools-top').getByRole('button',{name:'Back to table',exact:true}).click();await fits(page,'#playDialog','Home after fullscreen '+JSON.stringify(spec));
   await page.goto(base+'/play.html?catalog=all');await fits(page,'#playDialog','All 20 '+JSON.stringify(spec));assert.equal(await page.locator('.play-game-tile').count(),20);assert(await page.locator('.play-catalog-nav').evaluate(e=>e.getBoundingClientRect().bottom>=(window.visualViewport?.height||innerHeight)-24),'Catalogue must fill the viewport');
   const catalogue=await page.locator('#playDialog').evaluate(root=>{
    const rects=[...root.querySelectorAll('.play-game-tile')].map(e=>e.getBoundingClientRect()),nav=[...root.querySelector('.play-catalog-nav').children].map(e=>e.getBoundingClientRect());
    return {cardHeights:rects.map(r=>r.height),cardWidths:rects.map(r=>r.width),rowGaps:[5,10,15].map(i=>rects[i].top-rects[i-5].bottom),navWidths:nav.map(r=>r.width),navHeights:nav.map(r=>r.height),ordinals:root.querySelectorAll('.play-tile-number').length};
   });
   for(const name of ['cardHeights','cardWidths','rowGaps','navWidths','navHeights'])assert(Math.max(...catalogue[name])-Math.min(...catalogue[name])<1,'Catalogue '+name+' must be even '+JSON.stringify(spec));
   assert.equal(catalogue.ordinals,0,'No ordinal labels on game choices');
   const gameOrder=await page.locator('.play-game-tile').evaluateAll(nodes=>nodes.map(e=>e.dataset.game));
   for(const [id,game] of Object.entries(games)){
    await page.locator('.play-game-tile[data-game='+id+']').click();await fits(page,'#playDialog','Setup '+id+' '+JSON.stringify(spec));
    const setup=await page.locator('#playDialog').evaluate(root=>{
     const panel=root.querySelector('.play-setup-panel'),r=root.getBoundingClientRect(),actions=[...panel.querySelector('.play-dialog-actions').children].map(e=>({label:e.textContent,r:e.getBoundingClientRect().toJSON()}));
     const controls=['.play-popup-audio .play-speaker','#appDisplayControl','#appCloseControl'].map(selector=>{const e=root.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {r:r.toJSON(),background:s.backgroundImage,border:parseFloat(s.borderTopWidth),shadow:s.boxShadow};});
     const art=root.querySelector('.play-setup-art svg');return {r:r.toJSON(),actions,controls,art:art?.getAttribute('preserveAspectRatio'),artSource:art?.querySelector('image')?.getAttribute('href'),inset:root.querySelectorAll('.play-setup-emblem').length,picker:getComputedStyle(root.querySelector('#playModeSwitch')).display,rules:panel.querySelector('.play-setup-rules').textContent,background:getComputedStyle(panel).backgroundImage};
    });
    assert.equal(setup.rules,game.rules,id+' rules are preserved');assert.equal(setup.inset,0);assert.equal(setup.picker,'none');assert.equal(setup.art,'xMidYMid meet','Keep the whole selected scene visible');assert(setup.artSource.endsWith('/'+id+'.webp'));
    assert(setup.r.width>=spec.width-1&&setup.r.height>=spec.height-1,'Game artwork covers the setup screen');assert.equal(setup.actions.length,3);
    assert(Math.max(...setup.actions.map(a=>a.r.top))-Math.min(...setup.actions.map(a=>a.r.top))<1,id+' actions share one row');
    assert(Math.max(...setup.controls.map(c=>c.r.top+c.r.height/2))-Math.min(...setup.controls.map(c=>c.r.top+c.r.height/2))<1,id+' narration aligns with window controls '+JSON.stringify(setup.controls));
    for(const control of setup.controls.slice(1)){assert.equal(control.background,'none');assert.equal(control.border,0);assert.equal(control.shadow,'none');assert(control.r.width>20&&control.r.height>20,'Window actions retain separate targets');}
    if(id==='ghost')assert.equal(await page.locator('#playSetupCount option').count(),4);
    if(id==='equalizer')assert.equal(await page.locator('#playAllowances').inputValue(),'1, 1');
    await page.getByRole('button',{name:'Back to table',exact:true}).click();await page.locator('.play-home-footer').getByRole('button',{name:'All 20 games',exact:true}).click();
   }
   await page.locator('.play-game-tile[data-game=kelly]').click();
   await page.locator('#playSetupNames').fill('Nora, Eli');await page.locator('#playSetupNames').press('ArrowRight');
   assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'kelly','Editing names must not browse');
   for(let i=1;i<=gameOrder.length;i++){
    await page.getByRole('button',{name:'Next game',exact:true}).click();
    assert.equal(await page.locator('#playDialog').getAttribute('data-game'),gameOrder[i%gameOrder.length],'Browse every game in catalogue order, including wraparound');
   }
   assert.equal(await page.locator('#playSetupNames').inputValue(),'Nora, Eli','Browsing preserves the per-game draft');
   await page.getByRole('button',{name:'Previous game',exact:true}).click();assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'equalizer','Previous wraps from first to last');
   await page.locator('#playAllowances').fill('0, 2');await page.getByRole('button',{name:'Next game',exact:true}).click();await page.getByRole('button',{name:'Previous game',exact:true}).click();assert.equal(await page.locator('#playAllowances').inputValue(),'0, 2','Miss allowances survive browsing');
   await page.locator('#playDialog').press('ArrowRight');assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'kelly','Keyboard browsing wraps forward');
   const canvas=await page.locator('#playDialog').boundingBox(),point={x:canvas.x+canvas.width*.85,y:canvas.y+canvas.height*.85},drag=async(dx,dy)=>{
    if(spec.mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx*i/6,y:point.y+dy*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+dx,point.y+dy,{steps:6});await page.mouse.up();}
   };
   await drag(-150,0);assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'bounty','Swipe left opens next full-screen game');
   await drag(120,0);assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'kelly','Swipe right opens previous full-screen game');
   await drag(8,-100);assert.equal(await page.locator('#playDialog').getAttribute('data-game'),'kelly','Vertical motion must not browse');
   assert.equal(await page.evaluate(()=>localStorage.getItem('billiardsPlaySession-v1')),null,'Browsing must not create or replace a saved game');
   await fits(page,'#playDialog','Swipe browser '+JSON.stringify(spec));
   await page.goto(base+'/shot-clock.html');await fits(page,'.sc-layout','Clock '+JSON.stringify(spec));
   await page.getByRole('button',{name:'Shot Clock Settings',exact:true}).click();await fits(page,'.sc-layout','Clock settings '+JSON.stringify(spec));
   const tabs=page.locator('.sc-settings-tabs button');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await fits(page,'.sc-layout','Settings tab '+i+' '+JSON.stringify(spec));}
   await page.getByRole('button',{name:'Cancel',exact:true}).click();await fits(page,'.sc-layout','Clock return '+JSON.stringify(spec));
   assert.deepEqual(errors,[]);await context.close();console.log('Play viewport passed',spec);
  }
 }finally{await browser.close();service.server.closeAllConnections();await new Promise(resolve=>service.server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
