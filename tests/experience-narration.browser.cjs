const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const live=process.env.LIVE_URL,server=live?null:cp.spawn('python3',['-u','-m','http.server','8834','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{if(server)await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const viewport of [{width:1366,height:768},{width:915,height:412}]){
 const p=await browser.newPage({viewport,hasTouch:true,ignoreHTTPSErrors:true,serviceWorkers:'block',...(live&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const OriginalAudio=window.Audio;window.testNarrations=[];window.Audio=function(...args){const audio=new OriginalAudio(...args);window.testNarrations.push(audio);return audio;};window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};window.speechSynthesis.speak=()=>{throw Error('Device narration must not run');};});
 await p.goto(live||'http://127.0.0.1:8834/welcome.html',{waitUntil:'domcontentloaded'});
 for(const mode of ['zen','trainer','play']){
  await p.getByRole('button',{name:'About '+(mode==='zen'?'Zen':mode==='trainer'?'Trainer':'Play'),exact:true}).click();const dialog=p.locator('#about-'+mode),speaker=dialog.locator('.description-speaker');await speaker.click();
  await p.waitForFunction(()=>{const a=testNarrations.at(-1);return a&&!a.paused&&a.currentTime>.15&&a.duration>12;});
  assert.equal(await p.evaluate(()=>testNarrations.at(-1).playbackRate),1);assert.equal(await speaker.getAttribute('aria-pressed'),'true');
  if(mode==='trainer')await p.screenshot({path:'/tmp/experience-chase-'+viewport.width+'.png'});
  if(mode==='zen'){await speaker.click();assert(await p.evaluate(()=>testNarrations.at(-1).paused));await speaker.click();await p.waitForFunction(()=>!testNarrations.at(-1).paused);}
  if(mode==='play'){await p.evaluate(()=>{const a=testNarrations.at(-1);a.currentTime=a.duration-.1;});await p.waitForFunction(()=>document.querySelector('#about-play .description-speaker').getAttribute('aria-pressed')==='false');}
  await dialog.getByRole('button',{name:'Close',exact:true}).click();await p.waitForFunction(()=>testNarrations.every(a=>a.paused));
 }
 await p.route('**/guide/audio/experience-zen.mp3',r=>r.abort());await p.getByRole('button',{name:'About Zen',exact:true}).click();await p.locator('#about-zen .description-speaker').click();await p.waitForFunction(()=>document.querySelector('#about-zen [role=status]').textContent.includes('could not play'));assert.equal(await p.locator('#about-zen .description-speaker').getAttribute('aria-pressed'),'false');assert.deepEqual(errors,[]);await p.close();console.log(viewport.width+': all three original MP3s decode/play, toggle/close/end stop, failed audio shows retry without device voice.');
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
