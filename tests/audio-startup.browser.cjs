const {chromium}=require('playwright'),assert=require('node:assert/strict');
const server=require('node:child_process').spawn('python',['-u','-m','http.server','8766','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/tests/');
 await page.evaluate(()=>{
  window.recordings=[];const NativeAudio=Audio;window.Audio=new Proxy(NativeAudio,{construct(C,args){const a=new C(...args);a.addEventListener('loadstart',()=>{a.recordedStart=false});a.addEventListener('playing',()=>{if(!a.recordedStart){recordings.push({topic:a.dataset.topic,time:a.currentTime});a.recordedStart=true}});window.testAudio=a;return a}});
  const NativeContext=AudioContext;window.AudioContext=new Proxy(NativeContext,{construct(C,args){const c=new C(...args),create=c.createMediaElementSource.bind(c);c.createMediaElementSource=a=>{const s=create(a),analyser=c.createAnalyser(),gain=c.createGain();gain.gain.value=0;s.connect(analyser);analyser.connect(gain);gain.connect(c.destination);a.analyser=analyser;return s};return c}});
  document.body.innerHTML='<button id="start">Start</button><div id="host"></div>';
 });
 await page.addScriptTag({url:'/guide/audio-startup.js'});await page.addScriptTag({url:'/guide/guide.js'});
 await page.evaluate(()=>{
  window.testGuide=BilliardsGuide.mount(document.querySelector('#host'),{storageKey:'startup-test',isActive:()=>true,topics:[
   {id:'welcome-test',category:'fundamentals',categoryWelcome:true,title:'Welcome',audio:'/guide/audio/welcome-fundamentals.mp3'},
   {id:'first',category:'start',title:'First',audio:['/guide/audio/analysis-overview-quick.mp3','/guide/audio/photo-choose-image-quick.mp3']},
   {id:'second',category:'start',title:'Second',audio:'/guide/audio/main-pick-and-play-full-racks.mp3'}]});
  document.querySelector('#start').onclick=()=>testGuide.openCategory('fundamentals');
 });
 await page.click('#start');await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>testAudio.currentTime),0,'Narration does not advance while output warms');
 await page.waitForFunction(()=>testAudio.currentTime>0&&!testAudio.paused);
 const samples=await page.evaluate(async()=>{
  const a=testAudio,data=new Float32Array(a.analyser.fftSize),samples=[],start=performance.now();
  while(performance.now()-start<4000){a.analyser.getFloatTimeDomainData(data);samples.push({wall:(performance.now()-start)/1000,time:a.currentTime,rms:Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length)});await new Promise(r=>setTimeout(r,40))}return samples;
 });
 assert.ok(samples.filter(x=>x.rms>.001).length>samples.length*.4,'Opening speech reaches actual Web Audio output');
 assert.ok(samples.filter(x=>x.wall<.7&&x.rms>.001).length>0,'First spoken words reach output');
 for(let i=1;i<samples.length;i++)assert.ok(samples[i].time-samples[i-1].time<.35,'Playback never skips several words');
 assert.ok(Math.abs((samples.at(-1).time-samples[0].time)-samples.at(-1).wall)<.3,'Narration clock tracks real time');
 await page.evaluate(()=>testGuide.setEnabled(false));
 await page.evaluate(()=>document.querySelector('#start').onclick=()=>testGuide.openCategory('start'));
 await page.click('#start');await page.locator('#host button[title="Stop"]').click();await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>testAudio.paused&&testAudio.currentTime===0),true,'Stop cancels startup');
 await page.click('#start');await page.waitForFunction(()=>testAudio.dataset.topic==='first'&&testAudio.currentTime>0);
 await page.evaluate(()=>testAudio.currentTime=testAudio.duration-.1);
 await page.waitForFunction(()=>testAudio.src.includes('photo-choose-image-quick')&&testAudio.currentTime>0);
 await page.evaluate(()=>testAudio.currentTime=testAudio.duration-.1);
 await page.waitForFunction(()=>testAudio.dataset.topic==='second'&&testAudio.currentTime>0);
 const starts=await page.evaluate(()=>recordings);assert.ok(starts.every(x=>x.time<.15),'Every automatic and manual track begins at zero');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({warmup:'clock held at zero',openingSpeech:'measured at output',clock:'no skips in first four seconds',automaticTracks:'both sequence and next lesson start at zero',stopDuringStartup:'cancelled',starts,errors}));
 await page.evaluate(()=>testGuide.destroy());await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
