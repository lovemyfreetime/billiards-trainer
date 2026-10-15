const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
fs.mkdirSync('/tmp/guide-refinement',{recursive:true});
const server=cp.spawn('python',['-u','-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});server.stderr.on('data',()=>{});
(async()=>{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')))});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 try{
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900},hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__audio=[];window.__playScenes=[];const A=Audio;window.Audio=new Proxy(A,{construct(C,args){const a=new C(...args);__audio.push(a);const play=a.play.bind(a);a.play=function(){if(a.dataset.topic)__playScenes.push({topic:a.dataset.topic,name:window.billiardsTourBridge?.capture().state.lastLayoutName});return play()};return a}})});
 await p.goto('http://127.0.0.1:8765/index.html');await p.waitForFunction(()=>window.billiardsLessonPractice&&window.billiardsAnalyzeAudioMap);
 fs.writeFileSync('/tmp/guide-refinement/runtime-topics.json',JSON.stringify(await p.evaluate(()=>({main:billiardsPoolAudioMap.topics,analyze:billiardsAnalyzeAudioMap.topics})),null,2));
 async function finishNarration(){await p.waitForFunction(()=>__audio.some(a=>a.dataset.topic===billiardsPoolGuide.getState().topicId&&!a.paused&&Number.isFinite(a.duration)));await p.evaluate(()=>{const a=__audio.find(a=>a.dataset.topic===billiardsPoolGuide.getState().topicId);a.currentTime=Math.max(0,a.duration-.05)});}
 const scenes=JSON.parse(fs.readFileSync('guide/topic-scenes.json')).topics;
 const host=p.locator('#bt-guide-pool-root'),select=host.locator('select.btg-lesson-select');
 // Every selectable scene passes the native loader and preserves calibrated friction.
 const diagnostic=await p.evaluate(scenes=>{
  const b=billiardsTourBridge,cp=b.capture();cp.state.muRoll=.017;b.restore(cp);const out=[];
  for(const s of Object.values(scenes).filter(s=>s.category!=='start')){if(!b.loadLesson(s))throw Error('load rejected '+s.id);const a=b.capture().state;if(a.lastLayoutName!==s.file.name)throw Error('name '+s.id);if(a.muRoll!==.017)throw Error('calibration '+s.id);for(const ball of s.file.layout.balls){const actual=a.balls.find(x=>x.id===ball.id);if(!actual||Math.abs(actual.x-ball.x)>1e-8||Math.abs(actual.y-ball.y)>1e-8)throw Error('centers '+s.id);}const pred=b.predict();out.push({id:s.id,profile:s.profile,first:pred.firstBallContact,pocketed:pred.pocketed,rails:pred.railEvents});}b.restore(cp);return out;
 },scenes);
 fs.writeFileSync('/tmp/guide-refinement/scene-diagnostics.json',JSON.stringify(diagnostic,null,2));
 await p.evaluate(()=>billiardsPoolGuide.openCategory('fundamentals'));await select.selectOption('contact-point-geometry-quick');
 await p.waitForFunction(()=>__audio.some(a=>a.dataset.topic==='contact-point-geometry-quick'&&!a.paused));
 assert.equal(await p.evaluate(()=>__playScenes.filter(x=>x.topic==='contact-point-geometry-quick').at(-1).name),scenes['contact-point-geometry-quick'].file.name,'Scene loaded before audio play');
 const before=await p.evaluate(()=>billiardsTourBridge.capture()),box=await p.locator('#canvas').boundingBox(),x=box.x+box.width*.6,y=box.y+box.height*.55;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+30,y+15,{steps:3});await p.mouse.up();
 assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.freeAim),before.state.freeAim,'First complete gesture only hands off');assert.equal(await p.evaluate(()=>billiardsLessonPractice.getState().phase),'practice');
 await p.mouse.click(x+60,y+30);assert.notDeepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.freeAim),before.state.freeAim,'Second gesture aims');
 await p.evaluate(()=>billiardsLessonPractice.retry());assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.balls),before.state.balls);assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.freeAim),before.state.freeAim);
 // Autoplay runs a real ten-second countdown and loads the following scene.
 if(await host.locator('[aria-label="Autoplay next lesson"]').getAttribute('aria-pressed')==='false')await host.locator('[aria-label="Autoplay next lesson"]').click();await select.selectOption('contact-point-geometry-quick');
 await finishNarration();
 await p.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');assert.equal(await p.evaluate(()=>billiardsLessonPractice.getState().remaining),10);assert.equal(await p.locator('.btg-lesson-prompt').isVisible(),true);const felt=await p.evaluate(()=>billiardsTourBridge.feltBounds());const promptBox=await p.locator('.btg-lesson-prompt').boundingBox(),stageBox=await p.locator('#stageWrap').boundingBox();assert.ok(promptBox.x>=stageBox.x+felt.left&&promptBox.x+promptBox.width<=stageBox.x+felt.right);const started=Date.now();
 await p.waitForFunction(()=>billiardsPoolGuide.getState().topicId!=='contact-point-geometry-quick',null,{timeout:14000});assert.ok(Date.now()-started>=9400,'Countdown runs ten seconds');
 assert.equal(await p.evaluate(()=>billiardsTourBridge.capture().state.lastLayoutName),scenes[await p.evaluate(()=>billiardsPoolGuide.getState().topicId)].file.name);
 await select.selectOption('contact-point-geometry-quick');await finishNarration();await p.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');
 await p.locator('.btg-lesson-prompt').tap();assert.equal(await p.locator('.btg-lesson-prompt').isVisible(),false);assert.equal(await p.evaluate(()=>billiardsLessonPractice.getState().phase),'practice');await p.waitForTimeout(10500);assert.equal(await p.evaluate(()=>billiardsPoolGuide.getState().topicId),'contact-point-geometry-quick','Tap cancels advancement');
 await select.selectOption('fundamentals-stable-bridge');assert.equal(await host.locator('[data-action="play-pause"]').isDisabled(),false);await finishNarration();await p.waitForFunction(()=>billiardsLessonPractice.getState().phase==='countdown');
 // Explorer explanations never replace the current arrangement.
 const reference=await p.evaluate(()=>billiardsTourBridge.capture().state.balls);await p.evaluate(()=>{billiardsPoolGuide.setExploring(true);billiardsPoolGuide.selectTopic('table-markers-quick')});assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.balls),reference);
 await p.evaluate(()=>{billiardsPoolGuide.setExploring(false);billiardsPoolGuide.openCategory('physics')});
 await select.selectOption('compass-tool-intro-quick');assert.equal(await p.evaluate(()=>billiardsTourBridge.capture().state.teachingCompass.enabled),true);await p.evaluate(()=>billiardsPoolGuide.pause());
 await p.screenshot({path:'/tmp/guide-refinement/topic-guide-desktop.png'});
 await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/guide-refinement/topic-guide-phone.png'});const bounds=await host.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391,'Phone player fits');
 assert.deepEqual(errors,[]);console.log('133 native scenes, calibrated settings, load-before-audio, first-gesture handoff, reset, real countdown, touch cancellation, new fundamentals audio, Explorer preservation, compass, desktop/phone passed.');
 // Finish the last visible lesson without wrapping to the first.
 await p.evaluate(()=>billiardsPoolGuide.openCategory('physics'));await host.locator('[aria-label="Guide skill level"]').fill('2');
 const last=await p.evaluate(()=>billiardsPoolAudioMap.topics.filter(t=>t.category==='physics'&&!t.categoryWelcome&&!t.explorerOnly&&(t.level||0)<=2).at(-1).id);await select.selectOption(last);if(await host.locator('[aria-label="Autoplay next lesson"]').getAttribute('aria-pressed')==='false')await host.locator('[aria-label="Autoplay next lesson"]').click();
 await finishNarration();await p.waitForFunction(()=>billiardsLessonPractice.getState().phase==='practice');assert.equal(await p.evaluate(()=>billiardsLessonPractice.getState().phase),'practice');assert.equal(await p.evaluate(()=>billiardsPoolGuide.hasNextLesson()),false);assert.equal(await p.evaluate(()=>billiardsPoolGuide.nextLesson()),false);
 const blocked=await p.evaluate(()=>{const b=billiardsTourBridge,original=b.snapshot,before=JSON.stringify(b.capture().state.balls);b.snapshot=()=>({...original(),busy:true});const result=billiardsPoolGuide.selectTopic('compass-tool-intro-quick');b.snapshot=original;return {result,same:before===JSON.stringify(b.capture().state.balls)};});assert.deepEqual(blocked,{result:false,same:true});
 console.log('Final lesson stops without wrapping; a busy shot rejects layout changes.');
 await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
