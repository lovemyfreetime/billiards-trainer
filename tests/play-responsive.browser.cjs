const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python3',['-u','-m','http.server','8781','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')));});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:768,height:358},isMobile:true,hasTouch:true,deviceScaleFactor:2}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8781/?play=1');
 await p.locator('#playDialog').getByRole('button',{name:/^Killer/}).click();await p.locator('#playCatalogStart').click();await p.locator('#playDialog button[type=submit]').click();
 await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
 for(const [width,height]of [[768,358],[915,412],[1024,600],[1280,800],[412,915]]){
  await p.setViewportSize({width,height});
  const ready=p.locator('#playActions .play-primary');await ready.waitFor({state:'visible'});
  const box=await ready.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height-35,`primary action fits ${width}x${height}`);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
  const geometry=await p.evaluate(()=>{const c=document.querySelector('#canvas').getBoundingClientRect(),f=billiardsTourBridge.feltBounds();return{stageH:c.height,feltH:f.height};});
  if(width>650&&height<=600){assert.equal(await p.locator('#playNotice').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'turn notice is not clipped');assert(geometry.feltH/geometry.stageH>.58,`felt uses landscape height ${width}x${height}`);for(const id of ['playAim','play-speed','play-follow','play-sideSpin']){const b=await p.locator('#'+id).boundingBox();const dock=await p.locator('#playDock').boundingBox();assert(b.y+b.height<=dock.y+dock.height+1,`${id} fits dock ${width}x${height}`);}}
  if(width===768)await p.screenshot({path:'/tmp/play-landscape-fixed.png'});
 }
 await p.setViewportSize({width:768,height:358});await p.locator('#playActions .play-primary').click();await p.getByRole('button',{name:'Execute Shot',exact:true}).waitFor({state:'visible'});
 assert.deepEqual(errors,[]);console.log('Play responsive: screenshot-sized 768×358 mobile landscape, 915×412, short tablet 1024×600, desktop and portrait; primary actions and short-screen sliders fit; table uses available height; no horizontal overflow or page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
