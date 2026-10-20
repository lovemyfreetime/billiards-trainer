const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const server=cp.spawn(process.execPath,[require('node:path').join(__dirname,'range-server.cjs'),'8792'],{stdio:['ignore','pipe','ignore']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  localStorage.setItem('billiards-pool-guide-v1',JSON.stringify({enabled:false,level:0,autoplay:false,category:'fundamentals'}));
  window.__audio=[];window.__ended=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__audio.push(a);a.addEventListener('ended',()=>{if(a.dataset.topic)__ended.push({id:a.dataset.topic,src:a.currentSrc})});a.addEventListener('playing',()=>{if(a.dataset.getStartedTransition)a.playbackRate=16});return a}});
 });
 // Order must come from the curriculum, even if a future catalog merge changes insertion order.
 await context.route('**/guide/pool-audio-map.json?*',async route=>{const r=await route.fetch(),data=await r.json();data.topics.reverse();await route.fulfill({json:data})});
 // Only shorten practice waiting time; narration files and native media endings stay real.
 await context.route('**/guide/get-started-tour.json?*',async route=>{const r=await route.fetch(),data=await r.json();data.transition.seconds=1;await route.fulfill({json:data})});
 await p.goto(process.env.BILLIARDS_TEST_URL||'http://127.0.0.1:8792/index.html?train=1');await p.waitForFunction(()=>window.billiardsGetStartedTour);
 const host=p.locator('#bt-guide-pool-root'),select=host.locator('select'),button=name=>host.locator(`[data-action="${name}"]`);
 async function playing(id){try{await p.waitForFunction(id=>__audio.some(a=>a.dataset.topic===id&&!a.paused&&a.currentTime>0&&!a.ended),id)}catch(e){throw Error('Expected narration '+id+'; state '+JSON.stringify(await p.evaluate(()=>billiardsPoolGuide.getState()))+'; '+e.message)}}
 async function finish(id){await playing(id);await p.evaluate(id=>{const a=__audio.find(a=>a.dataset.topic===id&&!a.paused);if(!Number.isFinite(a.duration))throw Error('Missing duration for '+id);a.currentTime=a.duration-.08},id);await p.waitForFunction(id=>__ended.some(e=>e.id===id),id)}
 const curriculum=await p.evaluate(()=>billiardsPoolAudioMap.curriculum),categories=Object.keys(curriculum),counts=[27,49,32,28,5];
 const expectedEnded=[];
 await p.click('#btg-pool-guide');assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().autoplay),true);
 // Previous at welcome restarts its recording instead of jumping to the end.
 await playing('welcome-guide');await button('⏮').click();assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().topicId),'welcome-guide');
 for(let k=0;k<categories.length;k++){
  const category=categories[k],ids=curriculum[category].flatMap(g=>g.topics);
  assert.equal(ids.length,counts[k]);if(k)await host.locator('.btg-categories button').filter({hasText:new RegExp('^'+({physics:'Physics & Tools',drills:'Drills',exercises:'Exercises',more:'Resources'}[category])+'$')}).click();
  assert.deepEqual(await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean)),ids,category+' display order');
  assert.equal(await host.getByRole('slider',{name:'Guide skill level'}).count(),0,'All difficulty levels remain visible');
  const welcome=k?'welcome-'+category:'welcome-guide';expectedEnded.push(welcome);await finish(welcome);
  for(const id of ids){
   await playing(id);const current=await p.evaluate(id=>{const a=__audio.find(a=>a.dataset.topic===id&&!a.paused),t=billiardsPoolAudioMap.topics.find(t=>t.id===id);return {source:a.currentSrc,expected:Array.isArray(t.audio)?t.audio[0]:t.audio,selected:document.querySelector('#bt-guide-pool-root select').value,title:document.querySelector('.btg-current-lesson').textContent,topicTitle:t.title}},id);
   assert.equal(new URL(current.source).pathname,new URL(current.expected,p.url()).pathname);assert.equal(current.selected,id);assert(current.title.includes(current.topicTitle));expectedEnded.push(id);await finish(id);
  }
  await p.waitForFunction(()=>__audio.filter(a=>a.dataset.topic).every(a=>a.paused));assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().topicId),ids.at(-1),'End stops without wrapping');
  console.log(category+': all '+ids.length+' lessons played in displayed order');
 }
 assert.deepEqual(await p.evaluate(()=>__ended.map(e=>e.id)),expectedEnded,'No skipped, repeated or unexpected Guide narrations');
 // Guide remembers Auto separately; entering Quick Start must not change that preference.
 await button('A').click();await p.click('#btg-pool-guide');await p.click('#btg-pool-guide');assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().autoplay),false);await p.click('#btg-pool-start');
 const steps=await p.evaluate(()=>billiardsGetStartedTour.steps);await p.evaluate(()=>__ended=[]);
 for(let i=0;i<steps.length;i++){
  const step=steps[i];await playing(step.topicId);const state=await p.evaluate(()=>({tour:billiardsGetStartedTour.getState(),layout:billiardsTourBridge.capture().state.lastLayoutName,src:__audio.find(a=>a.dataset.topic===billiardsPoolGuide.getState().topicId&&!a.paused).currentSrc}));
  assert.equal(state.tour.index,i);assert.equal(state.layout,'Get Started — '+step.title);assert.equal(new URL(state.src).pathname,new URL(step.audio,p.url()).pathname);
  await p.evaluate(id=>__audio.find(a=>a.dataset.topic===id&&!a.paused).playbackRate=16,step.topicId);
 }
 await p.waitForFunction(()=>!billiardsPoolGuide.getState().enabled);assert.deepEqual(await p.evaluate(()=>__ended.map(e=>e.id)),steps.map(s=>s.topicId));console.log('Quick Start: all eight complete recordings, layouts, transitions and final close in order');
 await p.click('#btg-pool-start');await button('play-pause').click();await button('⏭').click();assert.equal(await p.evaluate(()=>billiardsGetStartedTour.getState().index),1);await button('⏮').click();assert.equal(await p.evaluate(()=>billiardsGetStartedTour.getState().index),0);
 await p.click('#btg-pool-guide');assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().autoplay),false);
 await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});await p.setViewportSize({width:390,height:844});assert.deepEqual(await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean)),curriculum.fundamentals.flatMap(g=>g.topics));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS: complete Guide curriculum, all levels, native audio order, independent Auto preferences, manual navigation and phone list.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
