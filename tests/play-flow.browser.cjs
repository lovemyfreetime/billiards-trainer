const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn('python3',['-u','-m','http.server','8779','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')));});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:1440,height:960}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6000);
 await p.goto('http://127.0.0.1:8779/?play=1');
 const status=()=>p.evaluate(()=>billiardsPlayStatus());
 async function setup(name,mode='real'){
  if(await p.locator('#playDialog[open]').count()===0)await p.locator('#playNew').click();
  await p.locator('#playDialog').getByRole('button',{name:new RegExp('^'+name)}).click();if(await p.locator('#playCatalogStart').isVisible())await p.locator('#playCatalogStart').click();
  await p.locator('#playDialog button[type=submit]').click();
  await p.getByRole('button',{name:'Table ready · Break next',exact:true}).click();
 }
 async function ready(){if((await status()).phase==='placement')await p.locator('#playActions button.play-primary').click();}
 await setup('Killer');
 await p.getByRole('button',{name:'Miss',exact:true}).click();assert.equal((await status()).shots,0,'first dry break retry is free');await ready();
 await p.getByRole('button',{name:'Miss',exact:true}).click();assert.deepEqual((await status()).lives,[2,3]);assert.equal((await status()).active,1);
 await p.locator('#playUndo').click();assert.deepEqual((await status()).lives,[3,3]);assert.equal((await status()).active,0);
 await p.getByRole('button',{name:'Miss',exact:true}).click();
 for(let i=0;i<5&&(await status()).phase!=='result';i++){await ready();await p.getByRole('button',{name:'Foul',exact:true}).click();await p.getByRole('button',{name:'Scratch',exact:true}).click();}
 assert.equal((await status()).phase,'result');await p.locator('#playUndo').click();assert.notEqual((await status()).phase,'result');
 const beforeReload=await status();await p.reload();await p.waitForSelector('#playRoot');assert.deepEqual(await status(),beforeReload,'reload preserves game and Undo');
 await setup('Poker Pool');
 await p.getByRole('button',{name:'Ball made',exact:true}).click();assert.equal((await status()).phase,'choose');
 assert.equal(await p.locator('#playRoot .play-card').count(),0,'pending cards absent from public DOM');
 async function choose(){await p.getByRole('button',{name:'Choose your card privately',exact:true}).click();assert.equal(await p.locator('#playDialog .play-card').count(),0,'pass screen hides cards');await p.getByRole('button',{name:'Reveal privately',exact:true}).click();const c=await p.locator('#playDialog button.play-card').first().textContent();await p.locator('#playDialog button.play-card').first().click();return c;}
 const first=await choose();await p.locator('#playUndo').click();assert.equal((await status()).phase,'choose');assert.equal(await choose(),first,'Undo retains the same card choices');
 for(let i=1;i<10;i++){await ready();await p.getByRole('button',{name:'Ball made',exact:true}).click();await choose();}
 assert.equal((await status()).phase,'result');assert.equal(await p.locator('#playResult .play-card').count(),10,'showdown reveals both five-card hands');
 await setup('Cutthroat');for(let id=1;id<=5;id++)await p.getByRole('button',{name:`Ball ${id} made`,exact:true}).click();await p.getByRole('button',{name:'Record balls',exact:true}).click();assert.equal((await status()).active,1);
 await p.getByRole('button',{name:'Ball 11 made',exact:true}).click();await p.getByRole('button',{name:'Foul',exact:true}).click();await p.getByRole('button',{name:'Scratch',exact:true}).click();assert((await status()).remaining.includes(1));assert((await status()).remaining.includes(11));
 await p.locator('#playUndo').click();assert(!(await status()).remaining.includes(1));
 await setup('Ghost Runout');
 await p.getByRole('button',{name:'Miss',exact:true}).click();await ready();
 await p.getByRole('button',{name:'Ball 1 made',exact:true}).click();await p.getByRole('button',{name:'Record balls',exact:true}).click();assert(!(await status()).remaining.includes(1));await p.locator('#playUndo').click();assert((await status()).remaining.includes(1));
 assert.equal(await p.locator('#playRoot canvas').count(),0);assert.equal(await p.locator('#playExpand').count(),0);assert.equal(await p.evaluate(()=>typeof billiardsPlayBridge),'undefined','Play does not load the Trainer runtime');
 await p.locator('.play-footer').getByRole('link',{name:'Train',exact:true}).click();await p.waitForSelector('#btPlayLauncher');assert.equal(await p.locator('body.play-mode').count(),0);
 assert(await p.evaluate(()=>billiardsPlayBridge.capture().balls.length>0),'Train keeps its own layout');
 await p.locator('#btPlayLauncher').click();await p.waitForSelector('#playRoot');assert.equal((await status()).game,'ghost');
 await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await p.setViewportSize({width:412,height:915});await p.screenshot({path:'/tmp/play-phone.png'});assert.equal(await p.locator('#playUndo').isVisible(),true);assert.equal(await p.locator('#phoneHeader').isVisible(),false);assert.equal(await p.locator('#phoneActions').isVisible(),false);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'phone has no horizontal overflow');
 await p.setViewportSize({width:1440,height:960});await p.screenshot({path:'/tmp/play-screen.png'});
 assert.deepEqual(errors,[]);console.log('Browser: all four games; real-table scoring; Killer elimination/reload/Undo; private Poker choices, deterministic Undo and full showdown; Cutthroat revival; Ghost real-table inventory and Undo; unchanged Trainer layout; no playable table; phone layout. No page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
