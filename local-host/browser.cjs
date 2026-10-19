'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{createHost}=require('./server.cjs');
(async()=>{
 const service=createHost({port:0,bind:'127.0.0.1',addressProvider:()=>['127.0.0.1']}),{port,hostUrl}=await service.listen(),base='http://127.0.0.1:'+port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),errors=[];
 const api=async()=>fetch(base+'/api/host',{headers:{Authorization:'Bearer '+service.hostToken}}).then(r=>r.json());
 try{
  const host=await browser.newPage({viewport:{width:1366,height:936},serviceWorkers:'block'});host.on('pageerror',e=>errors.push(e.message));
  await host.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await host.goto(hostUrl);await host.locator('[data-game=poker]').click();await host.getByRole('button',{name:'Start game',exact:true}).click();await host.locator('#playSetupNames').fill('Jeff, Cindy');await host.getByRole('button',{name:'Rack them up',exact:true}).click();
  const c1=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),c2=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,serviceWorkers:'block'});
  const p1=await c1.newPage(),p2=await c2.newPage();for(const p of [p1,p2]){p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.spoken=[];window.speechEvents=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){clearTimeout(window.speechTimer);},speak(u){if(!u.text)return;window.spoken.push(u.text);window.speechEvents.push({text:u.text,start:Date.now()});window.speechTimer=setTimeout(()=>{window.speechEvents.at(-1).end=Date.now();u.onend?.();},600)}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};});}
  const invite=(await api()).invite;
  for(const [p,name]of [[p1,'Jeff'],[p2,'Cindy']]){await p.goto(base+'/join#invite='+invite);await p.getByLabel('Your name',{exact:true}).fill(name);await p.getByRole('button',{name:'Join table',exact:true}).click();await p.getByRole('heading',{name:'Waiting for your host',exact:true}).waitFor();assert.equal(await p.locator('#private').isVisible(),false);}
  await host.locator('.play-header').getByRole('button',{name:'Local table',exact:true}).click();await host.locator('#localQR').waitFor({state:'visible'});
  for(const [name,seat]of [['Jeff','0'],['Cindy','1']]){const row=host.locator('.local-member').filter({has:host.locator('strong').filter({hasText:new RegExp('^'+name+' ·')})});await row.getByRole('combobox').selectOption(seat);await row.getByRole('button',{name:'Approve player',exact:true}).click();}
  for(const p of [p1,p2])await p.locator('#gameName').waitFor({state:'visible'});
  await p1.getByRole('button',{name:'Enable turn alerts',exact:true}).click();
  await p2.getByRole('button',{name:'Enable turn alerts',exact:true}).click();
  for(const p of [p1,p2])await p.waitForFunction(()=>window.speechEvents.some(e=>e.end));
  const greetings=(await Promise.all([p1,p2].map(p=>p.evaluate(()=>window.speechEvents[0])))).sort((a,b)=>a.start-b.start);
  assert(greetings[1].start-greetings[0].end>=750,'Player voices finish and leave a gap before the next phone speaks');await host.getByRole('dialog',{name:'Local table',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
  await host.getByRole('button',{name:'Table ready · Break next',exact:true}).click();await host.getByRole('button',{name:'Ball made',exact:true}).click();
  await p1.getByRole('button',{name:'Show my private view',exact:true}).click();await p1.locator('#private button').first().waitFor();const choice=await p1.locator('#private button').first().innerText();
  await p2.getByRole('button',{name:'Show my private view',exact:true}).click();assert.equal(await p2.locator('#private button').count(),0,'Another player gets no pending cards or choices');
  await p1.locator('#private button').first().click();await host.getByRole('status').filter({hasText:'Cindy'}).waitFor();await p1.locator('#private .card').waitFor();assert.equal(await p1.locator('#private .card').innerText(),choice);assert.equal(await p2.locator('#private .card').count(),0);
  await p2.waitForFunction(()=>window.spoken.some(s=>s.includes('Cindy')&&s.includes('your turn')));assert(await p2.evaluate(()=>window.spoken.some(s=>s.includes('your turn'))));
  await host.getByRole('button',{name:'Undo Shot',exact:true}).click();await p1.locator('#private button').first().waitFor();assert.equal(await p1.locator('#private button').count(),2,'Host Undo restores pending card choice');
  await p1.reload();await p1.locator('#gameName').waitFor({state:'visible'});assert.equal(await p1.locator('#private').isVisible(),false,'Reload keeps private information hidden');
  assert(await p1.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p2.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await host.screenshot({path:process.env.LOCAL_HOST_SCREENSHOT||require('node:path').join(require('node:os').tmpdir(),'local-play-host.png')});await p1.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'local-play-player.png')});
  assert.deepEqual(errors,[]);console.log('Local Play browser flow passed: isolated player tabs, approval, private choice, private data isolation, spoken turn event, Undo, reconnect, no external requests, and phone layout.');
 }finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
})().catch(err=>{console.error(err);process.exitCode=1;});
