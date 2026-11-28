const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const url='http://127.0.0.1:8943/?train=1';
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8943']);let browser;
 try{
  await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const viewport of [{width:1280,height:800},{width:915,height:412},{width:412,height:840}]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'});
   await context.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(Error('Fixed viewport for layout checks'));});
   try{
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(8000);
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.billiardsWorkspaceSync&&window.billiardsTourBridge);
    const tap=selector=>page.locator(selector).tap();
    const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
    const guide=page.locator('#workspaceTableGuides'),shoot=page.locator('#phoneActions > [data-trainer-action=animate]');
    const assertDock=async()=>{
     const a=await guide.boundingBox(),b=await shoot.boundingBox();
     const layout=()=>page.evaluate(()=>({iw:innerWidth,ih:innerHeight,vw:visualViewport.width,vh:visualViewport.height,scale:visualViewport.scale,scroll:[scrollX,scrollY],body:document.body.className,shelf:[workspaceBallShelf.offsetWidth,workspaceBallShelf.offsetHeight],guide:workspaceTableGuides.parentElement.id}));
     const before=await layout();
     assert(a&&b&&!overlap(a,b),'Guides never covers Shoot');
     assert(await guide.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Guides is reachable');
     await tap('#phoneTrayToggle');await frames();
     assert.deepEqual(await guide.boundingBox(),a,'Guides stays in exactly the same place '+JSON.stringify({before,after:await layout(),viewport}));
     await tap('#phoneTrayToggle');await frames();
     assert.deepEqual(await guide.boundingBox(),a,'Restoring the tray does not move Guides');
    };
    await frames();await assertDock();
    assert.equal(await guide.getAttribute('aria-checked'),'false');
    await guide.tap();assert.equal(await guide.getAttribute('aria-checked'),'true');
    await guide.tap();assert.equal(await guide.getAttribute('aria-checked'),'false');
    await page.evaluate(()=>{
     const snap=billiardsTourBridge.capture();
     Object.assign(snap.state,{freeAim:{x:1.8,y:.6},angleLock:false,shot2Enabled:false,allowMissingCueBall:false,balls:[{id:0,n:'CB',x:1.25,y:.85,active:true}]});
     billiardsTourBridge.restore(snap);
    });
    await frames();
    const click=async({x,y},pointer)=>pointer==='touch'?page.touchscreen.tap(x,y):page.mouse.click(x,y);
    const xy2D=async([u,v])=>page.evaluate(([u,v])=>{const b=billiardsTourBridge.feltBounds(),r=stageWrap.getBoundingClientRect();return{x:r.left+b.left+u*b.width,y:r.top+b.top+v*b.height};},[u,v]);
    const xy3D=async([u,v,h=0])=>page.evaluate(([u,v,h])=>{const {tableL,tableW}=billiardsTourBridge.capture().state;return Billiards3D.project({x:u*tableL,y:v*tableW},h);},[u,v,h]);
    const assertAim=async(map,positions)=>{
     for(const [i,pointer] of ['touch','mouse'].entries()){
      const before=(await state()).freeAim;
      for(const [label,uv] of positions){
       const p=await map(uv);await click(p,pointer);
       assert.deepEqual((await state()).freeAim,before,pointer+' on '+label+' leaves aim alone');
      }
      const point=await map([.37+i*.2,.44+i*.09]);await click(point,pointer);
      assert.notDeepEqual((await state()).freeAim,before,pointer+' on cloth changes aim');
     }
    };
    if(viewport.width>500)await assertAim(xy2D,[['cushion',[.3,-.009]],['wood rail',[.43,-.037]],['corner pocket',[.005,.005]],['middle pocket',[.5,.004]],['off-table background',[-.12,.5]]]);
    await tap('#table3DToggle');await page.waitForFunction(()=>Billiards3D.active&&!Billiards3D.camera().transitioning);
    await frames();await assertDock();
    if(viewport.width>500)await assertAim(xy3D,[['cushion',[.3,-.012,.034]],['wood rail',[.43,-.065,.044]],['middle pocket',[.5,-.019,.042]],['off-table background',[.3,-.22,0]]]);
    if(viewport.width===1280){
     await tap('#table3DToggle');await page.waitForFunction(()=>!Billiards3D.active);
     await tap('#phoneControls');
     await page.evaluate(()=>{const e=document.getElementById('showScoreBoard');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
     await frames();
     const [board,title,stage]=await Promise.all(['#scoreBoard','.btg-pool-title h1','#stageWrap'].map(s=>page.locator(s).boundingBox()));
     assert(board.y>=title.y+title.height&&board.y+board.height<=stage.y+1,'Player controls sit below the title and above the table');
     const labelOverlap=await page.locator('#bottomSpin1 .phoneSpinDirections').evaluateAll(rows=>rows.some(row=>{
      const texts=[...row.children].map(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();});
      return texts.some((r,i)=>i&&r.left<texts[i-1].right);
     }));
     assert.equal(labelOverlap,false,'Spin direction and percent labels stay separate with the panel open');
    }
    assert.deepEqual(errors,[]);
    console.log(viewport.width+'×'+viewport.height+': stable Guides in 2D/3D'+(viewport.width>500?', cloth-only tap and click':'')+(viewport.width===1280?', player controls and spin labels':'')+' passed.');
   }finally{await context.close();}
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
