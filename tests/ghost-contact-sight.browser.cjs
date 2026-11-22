const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
 const remote=process.env.LIVE_TRAINER_URL, port=8929;
 const server=remote?null:spawn(process.execPath,['tests/range-server.cjs', String(port)]);
 let browser;
 try {
  if(server)await new Promise(resolve=>server.stdout.once('data',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
   args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
   ...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:820},ignoreHTTPSErrors:true,serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(remote||'http://127.0.0.1:'+port+'/?train=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsTourBridge);
  await page.evaluate(()=>{
   const s=billiardsTourBridge.capture();
   Object.assign(s.state,{tableType:'pool',ballSet:'classic',tableL:2.54,tableW:1.27,ballR:.028575,
    balls:[{id:0,x:.48,y:.60,active:true},{id:10,x:1.28,y:.60,active:true}],
    freeAim:{x:1.28,y:.60},speed:1.6,follow:0,sideSpin:0,cueElevationDeg:0,
    showFullGhostBall:false,showRestingCueBall:false,showPocketGhost:false,showCueStick:false,
    shot2Enabled:false,activeShot:1,showTable:true,showImpact:false,showPaths:false});
   billiardsTourBridge.restore(s);
  });
  const trace=()=>page.evaluate(()=>billiardsTourBridge.predict({paths:true}));
  const baseline=await trace();
  const flag=async(value)=>page.evaluate(v=>{
   const el=document.querySelector('#showFullGhostBall');el.checked=v;el.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  await flag(true);await page.evaluate(()=>document.querySelector('#table3DToggle').click());
  await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.ghostGuides().some(g=>g.kind==='contact'));
  assert.deepEqual(await trace(),baseline,'Guide leaves the shot prediction intact');
  const output='test-results/ghost-contact-sight/'+(remote?'live':'local');
  fs.mkdirSync(output,{recursive:true});
  // Set the eye at ball-centre height with a legal 2-degree camera pitch.
  // The expected dot comes from the solver and the projection, independently of the mesh.
  async function view(offset,elevate,record){
   const pose=await page.evaluate(({offset,elevate})=>{
    const h=billiardsTourBridge.predict().firstBallContact,s=billiardsTourBridge.capture().state,R=s.ballR;
    const g=h.cuePos,n=h.normal,radius=.29,elevation=(2+elevate)*Math.PI/180;
    const azimuth=Math.atan2(-n.x,-n.y)+offset*Math.PI/180;
    Billiards3D.restoreCamera({azimuth,elevation,radius,target:{x:g.x-s.tableL/2,
     y:R-radius*Math.sin(2*Math.PI/180),z:g.y-s.tableW/2}});
    return {g,R,point:{x:h.objPos.x-n.x*R,y:h.objPos.y-n.y*R},overlap:h.overlap};
   },{offset,elevate});
   await page.waitForFunction(()=>!Billiards3D.camera().transitioning);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const coords=await page.evaluate(({g,R,point})=>({
    ring:Billiards3D.project(g,R),dot:Billiards3D.project(point,R),
    ballRadius:Math.abs(Billiards3D.project(g,R*1.75).y-Billiards3D.project(g,R).y)/.75
   }),pose);
   const screenshot=await page.screenshot(record?{path:output+'/'+record+'.png'}:{});
   // Read the actual frame so a filled white disk, an unbroken core or a
   // camera-facing dot cannot pass by reporting the correct world positions.
   const samples=await page.evaluate(async({image,c})=>{
    const img=new Image();img.src='data:image/png;base64,'+image;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,img.width,img.height).data;
    function rgb(p){const i=4*(Math.round(p.y)*img.width+Math.round(p.x));return Array.from(pixels.slice(i,i+3));}
    function isWhite(p){const v=rgb(p);return Math.min(...v)>187 && Math.max(...v)-Math.min(...v)<32;}
    const stations=[0,Math.PI/2,Math.PI,3*Math.PI/2];
    const rim=stations.map(a=>[.113,.122,.131,.14,.149,.158].some(k=>isWhite({
     x:c.ring.x+Math.cos(a)*k*c.ballRadius,y:c.ring.y+Math.sin(a)*k*c.ballRadius})));
    return {dot:rgb(c.dot),dotSides:[-1,1].map(sign=>rgb({x:c.dot.x+sign*.047*c.ballRadius,y:c.dot.y})),center:rgb(c.ring),rim};
   },{image:screenshot.toString('base64'),c:coords});
   const separation=Math.hypot(coords.ring.x-coords.dot.x,coords.ring.y-coords.dot.y);
   return {samples,separation,coords,overlap:pose.overlap};
  }
  const red=([r,g,b])=>r>155&&r>2*g&&r>2*b;
  for(const cut of [0,1,-1]){
   await page.evaluate(cut=>{
    const s=billiardsTourBridge.capture(),cue=s.state.balls.find(b=>b.id===0);
    const angle=Math.asin(cut*s.state.ballR/.80);
    s.state.freeAim={x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)};billiardsTourBridge.restore(s);
   },cut);
   const aligned=await view(0,0,cut===1?'aligned':null);
   assert(Math.abs(aligned.overlap-(cut?50:100))<.01);
   assert(aligned.separation<.1&&red(aligned.samples.center)&&aligned.samples.rim.every(Boolean),
    'Red through a complete white ring '+JSON.stringify(aligned));
   const side=await view(35,0,cut===1?'off-axis':null);
   assert(side.separation>side.coords.ballRadius*.35&&red(side.samples.dot)&&!red(side.samples.center),
    'Orbit separates the two actual markers '+JSON.stringify(side));
   console.log({cut,alignedPixels:aligned.separation,offAxisPixels:side.separation,ring:aligned.samples.rim});
  }
  const raised=await view(0,25,'raised');
  assert(Math.abs(raised.coords.dot.y-raised.coords.ring.y)>raised.coords.ballRadius*.25 &&
   [raised.samples.dot,...raised.samples.dotSides].some(red),'Vertical parallax with stem in front of dot '+JSON.stringify(raised));
  await flag(false);await page.waitForFunction(()=>!Billiards3D.ghostGuides().some(g=>g.kind==='contact'));
  await flag(true);
  const shot1=await page.evaluate(()=>billiardsTourBridge.capture());
  const device=await page.context().newCDPSession(page);
  await device.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await page.evaluate(()=>{
   const s=billiardsTourBridge.capture(),obj=s.state.balls.find(b=>b.id===10);
   Object.assign(s.state,{shot2Enabled:true,shot2Initialized:true,shot2CueBallOnly:false,activeShot:2,
    shot2:{...s.state.shot2,x:.72,y:.82,autoFollow:false,freeAim:{x:obj.x,y:obj.y},speed:1.1,follow:0,sideSpin:0,cueElevationDeg:0}});
   billiardsTourBridge.restore(s);
  });
  await page.waitForFunction(()=>Billiards3D.ghostGuides().some(g=>g.shot===2&&g.target?.id===10));
  await page.evaluate(()=>{const s=billiardsTourBridge.capture();s.state.shot2CueBallOnly=true;billiardsTourBridge.restore(s);});
  await page.waitForFunction(()=>Billiards3D.ghostGuides().length===0);
  await page.evaluate(s=>{billiardsTourBridge.restore(s);document.querySelector('#animate').click();},shot1);
  await page.waitForFunction(()=>billiardsPlayback.state().running && Billiards3D.ghostGuides().length===0);
  await page.waitForFunction(()=>!billiardsPlayback.state().running,null,{timeout:50000});
  await page.evaluate(s=>{s.state.balls=s.state.balls.filter(b=>b.id===0);billiardsTourBridge.restore(s);},shot1);
  await page.waitForFunction(()=>!Billiards3D.ghostGuides().some(g=>g.kind==='contact'));
  assert.deepEqual(errors,[]);console.log('Straight and mirrored half-ball cuts, horizontal and vertical parallax, visibility and shot invariance passed.');
 } finally {await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
