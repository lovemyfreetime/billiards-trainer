const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/view-learning-ui';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8836']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile]of [[1600,1000,false],[844,390,true]]){
 const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};window.__clothTexts=[];const p=CanvasRenderingContext2D.prototype,clear=p.clearRect,fill=p.fillText;p.clearRect=function(...args){if(this.canvas.id==='canvas')__clothTexts=[];return clear.apply(this,args);};p.fillText=function(t,x,y,...rest){if(this.canvas.id==='canvas')__clothTexts.push({text:String(t),x,y});return fill.call(this,t,x,y,...rest);};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
 const menu=async open=>{if(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'))!==open)await page.locator('#phoneControls').click();await settle();};
 const point=async(x,y,ball=false)=>page.evaluate(({x,y,ball})=>{const s=billiardsTourBridge.capture().state;if(Billiards3D.active)return Billiards3D.project({x:x*s.tableL,y:y*s.tableW},ball?s.ballR:0);const r=stageWrap.getBoundingClientRect(),q=billiardsTourBridge.annotationFrame().map({x,y});return{x:r.left+q.x,y:r.top+q.y};},{x,y,ball});
 try{
 await page.goto('http://127.0.0.1:8836/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsMenuReady);
 await page.evaluate(()=>{const place=BilliardsShotBudget.placeBadge;BilliardsShotBudget.placeBadge=(rows,anchor,options)=>{const card=place(rows,anchor,options);if(card&&rows[0]?.text.startsWith('Overlap '))window.__clothOverlapCard=card;return card;};return billiardsTourBridge.apply({id:'view-labels',title:'View labels',balls:[[0,.22,.4],[1,.52,.4]],target:1,pocket:[1,1],speed:1.3,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27});});await menu(false);
 const labels=await page.evaluate(()=>{const s=billiardsTourBridge.capture().state,f=billiardsTourBridge.annotationFrame(),expected=[[-.085,-.085],[s.tableL/2,-.095],[s.tableL+.085,-.085],[s.tableL+.085,s.tableW+.085],[s.tableL/2,s.tableW+.095],[-.085,s.tableW+.085]];return expected.map(([x,y],i)=>{const q=f.map({x:x/s.tableL,y:y/s.tableW});return __clothTexts.some(t=>t.text===String(i+1)&&Math.hypot(t.x-q.x,t.y-q.y)<.1);});});assert(labels.every(Boolean),'All six 2D pocket numbers sit behind the pockets');await page.screenshot({path:dir+'/'+name+'-2d-pockets.png'});
 for(const mode of ['2d','3d']){
  if(mode==='3d'){
   await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.overlayLabels().some(l=>l.id.startsWith('overlap-')));await settle();
   const before=await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),camera=await page.evaluate(()=>Billiards3D.camera()),fixed=await page.evaluate(()=>Billiards3D.overlayLabels());
   const placement=await page.evaluate(()=>{
    const card=window.__clothOverlapCard,s=billiardsTourBridge.capture().state,f=billiardsTourBridge.annotationFrame(),r=canvas.getBoundingClientRect(),p=f.inverse({x:r.left+(card.box.left+card.box.right)/2*r.width/(canvas.width/devicePixelRatio),y:r.top+(card.box.top+card.box.bottom)/2*r.height/(canvas.height/devicePixelRatio)}),label=Billiards3D.overlayLabels().find(l=>l.id==='overlap-0');
    return {expected:[p.x*s.tableL-s.tableL/2,.0002,p.y*s.tableW-s.tableW/2],center:label.center};
   });assert(placement.center.every((v,j)=>Math.abs(v-placement.expected[j])<1e-6),'Metrics retain the original collision-avoiding cloth badge location');
   for(const [i,azimuth]of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI/4].entries()){
    await page.evaluate(({camera,azimuth})=>Billiards3D.restoreCamera({...camera,azimuth,...(azimuth===Math.PI/4?{elevation:.16,radius:camera.radius*.8}:{})}),{camera,azimuth});await settle();
    const labels=await page.evaluate(()=>Billiards3D.overlayLabels());for(const id of ['HEAD / BREAK','FOOT / RACK','overlap-0'])assert(labels.some(l=>l.id===id),'Visible '+id+' at orbit '+i);
    for(const l of labels){
     const original=fixed.find(v=>v.id===l.id),[x,y,z,w]=l.rotation,normal=[2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)],right=[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y)];
     assert(normal.every((v,j)=>Math.abs(v-[0,1,0][j])<1e-8),'Text remains flat on the cloth');assert.equal(l.center[1],.0002);assert(l.depthTest,'Balls can occlude cloth text');
     assert.deepEqual(l.center,original.center,'Orbit/elevation/zoom never translates a label');assert.deepEqual(l.scale,original.scale,'Orbit/elevation/zoom never resizes a label');
     assert(Math.abs(right[0]-Math.cos(azimuth))<1e-8&&Math.abs(right[2]+Math.sin(azimuth))<1e-8,'Only the in-cloth heading follows camera rotation');
    }
    const shot=labels.find(l=>l.id==='overlap-0');assert(shot.rows.some(r=>r.startsWith('Cut angle '))&&shot.rows.some(r=>r.startsWith('Exit angle ')));
    assert.equal(await page.evaluate(()=>__clothTexts.some(t=>/^(HEAD \/ BREAK|FOOT \/ RACK|Overlap |Cut angle |Exit angle )/.test(t.text))),false,'Cloth text planes are not duplicated in the texture');
    await page.screenshot({path:dir+'/'+name+'-orbit-'+i+'.png'});
   }
   await page.evaluate(camera=>Billiards3D.restoreCamera(camera),camera);await settle();assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),before,'Camera-facing text never changes physics');
   const originalSetup=await page.evaluate(()=>billiardsTourBridge.capture());
   await page.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{shot2Enabled:false,activeShot:1,airbornePhysics:true,cueElevationDeg:55,speed:3.63,follow:.02,sideSpin:0,showPaths:true,freeAim:{x:2.2,y:.635},balls:[{id:0,n:'CB',x:.4,y:.635,active:true},{id:3,n:'3',x:.9,y:.635,active:true}]});billiardsTourBridge.restore(s);});
   await page.waitForFunction(()=>Billiards3D.overlayLabels().some(l=>l.id==='flight-1-TAKEOFF')&&Billiards3D.overlayLabels().some(l=>l.id==='flight-1-L1')&&Billiards3D.overlayLabels().some(l=>l.id==='flight-1-clearance'));
   const flightBefore=await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),flightFixed=await page.evaluate(()=>Billiards3D.overlayLabels().filter(l=>l.id.startsWith('flight-')));
   for(const [i,azimuth]of [0,Math.PI/2,Math.PI,Math.PI*1.5].entries()){
    await page.evaluate(({camera,azimuth})=>Billiards3D.restoreCamera({...camera,azimuth}),{camera,azimuth});await settle();
    const flight=await page.evaluate(()=>Billiards3D.overlayLabels().filter(l=>l.id.startsWith('flight-')));
    assert.equal(flight.length,flightFixed.length,'Every flight label remains visible');
    for(const l of flight){const original=flightFixed.find(v=>v.id===l.id),[x,y,z,w]=l.rotation,right=[1-2*(y*y+z*z),2*(x*z-w*y)];assert(Math.abs(right[0]-Math.cos(azimuth))<1e-8&&Math.abs(right[1]+Math.sin(azimuth))<1e-8,'Flight text faces the reader like the metrics');assert.deepEqual(l.center,original.center,'Flight text stays anchored');assert.deepEqual(l.scale,original.scale,'Flight text keeps its size');assert(l.depthTest,'Flight text remains on the cloth');}
    assert.equal(await page.evaluate(()=>__clothTexts.some(t=>/^(TAKEOFF|L[1-4]|(?:CLEARS|CLIPS) BALL)/.test(t.text))),false,'Flight text is not baked upside down into the cloth texture');
    await page.screenshot({path:dir+'/'+name+'-flight-orbit-'+i+'.png'});
   }
   assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict({paths:true})),flightBefore,'Flight label headings never change physics');
   await page.evaluate(({saved,camera})=>{billiardsTourBridge.restore(saved);Billiards3D.restoreCamera(camera);},{saved:originalSetup,camera});await settle();
   await page.locator('#table3DLock [data-adjust=edit]').click();
  }
  if(process.env.CLOTH_LABELS_ONLY)continue;
  await menu(true);if(!await page.locator('#drawSection').evaluate(e=>e.classList.contains('open')))await page.locator('#drawSection>.sectionToggle').click();
  for(const tool of ['line','arrow','circle','draw','erase']){await page.locator('[data-annotate-tool='+tool+']').click();assert(await page.locator('#trainerAnnotationMode').isVisible());await page.locator('#trainerAnnotationMode button').click();assert.equal(await page.locator('#trainerAnnotationInput').evaluate(e=>e.classList.contains('active')),false);}
  await page.locator('[data-annotate-tool=text]').click();await page.locator('#trainerAnnotationText').fill('Next shot');const p=await point(.4,.65);await page.mouse.click(p.x,p.y);await settle();
  assert((await state()).annotations.items.some(i=>i.tool==='text'&&i.text==='Next shot'),'Text placed on table');assert.match(await page.locator('#trainerAnnotationMode').innerText(),/Text mode/);await page.screenshot({path:dir+'/'+name+'-'+mode+'-text-mode.png'});
  await menu(false);assert.equal(await page.locator('#trainerAnnotationInput').evaluate(e=>e.classList.contains('active')),false,'Closing the drawer ends the notes mode');assert.equal(await page.locator('#trainerAnnotationMode').isVisible(),false);
  const cue=(await state()).balls.find(b=>b.id===0),s=await state(),a=await point(cue.x/s.tableL,cue.y/s.tableW,true),b=await point(mode==='3d'?.36:.29,mode==='3d'?.55:.48,true);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();await settle();
  const moved=(await state()).balls.find(b=>b.id===0);assert(Math.hypot(moved.x-cue.x,moved.y-cue.y)>.03,'Ball movement works immediately after closing notes in '+mode);
  console.log(name+' '+mode+': notes indicator, Done, close-to-exit, saved text and restored ball movement passed');
 }
 assert.deepEqual(errors,[]);console.log(name+': 2D pocket placement, four orbit headings plus low elevation/zoom and unchanged physics passed');
 }catch(e){await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
