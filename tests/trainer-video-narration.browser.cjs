const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8812']);let browser;
 try{
  await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const p=await browser.newPage({viewport:{width:1100,height:750},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log(m.text())});
  await p.addInitScript(()=>{window.saved=[];let pending;window.BilliardsAndroid={saveTrainerClip(){},supportsNarratedVideo(){return true},beginTrainerRecording(stem,session){pending={stem,session,chunks:[]};return 'token'},appendTrainerRecording(token,data){pending.chunks.push(data);return true},finishTrainerRecording(){saved.push(pending);return pending.stem+'.mp4'},abortTrainerRecording(){pending=null}}});
  await p.goto('http://127.0.0.1:8812/?train=1');await p.waitForFunction(()=>window.BilliardsShotRecorder);
  await p.evaluate(()=>document.querySelector('#trainerNarrateVideo').click());
  assert.equal(await p.locator('#narrationPreview').evaluate(v=>{const e=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});v.dispatchEvent(e);return e.defaultPrevented}),false,'Editor Space must not trigger the Trainer shortcut');
  await p.locator('#narrationVideoFile').setInputFiles(process.env.NARRATION_TEST_VIDEO||'/tmp/session-export-1.mp4');
  await p.waitForFunction(()=>document.querySelector('#narrationPreview').readyState>=2);
  const inputDuration=await p.locator('#narrationPreview').evaluate(v=>v.duration);
  await p.locator('#narrationAudioFile').setInputFiles(process.env.NARRATION_TEST_AUDIO||'/tmp/narration-test.wav');
  await p.locator('#narrationPreview').evaluate(v=>new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=1}));
  await p.locator('#narrationHold').fill('3');await p.locator('#narrationAddHold').click();
  await p.locator('#narrationOffset').fill('0.25');await p.locator('#narrationName').fill('Narration test 01');
  await p.locator('#narrationExport').click();
  await p.waitForFunction(()=>saved.length===1||(!document.querySelector('#narrationExport').disabled&&document.querySelector('#narrationStatus').textContent),null,{timeout:180000});
  assert.equal(await p.evaluate(()=>saved.length),1,await p.locator('#narrationStatus').textContent());
  const data=await p.evaluate(()=>saved[0]);assert.equal(data.stem,'Narration test 01');assert.equal(data.session,null);
  const output='/tmp/narration-export.mp4';fs.writeFileSync(output,Buffer.concat(data.chunks.map(c=>Buffer.from(c,'base64'))));
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output]));
  assert.equal(meta.streams[0].width,1920);assert.equal(meta.streams[0].height,1080);assert.equal(meta.streams[0].avg_frame_rate,'30/1');assert(meta.streams.some(s=>s.codec_type==='audio'));
  assert(Math.abs(Number(meta.format.duration)-inputDuration-3)<.1);
  const sample=time=>cp.execFileSync('ffmpeg',['-v','error','-ss',String(time),'-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-vf','scale=160:90','pipe:1']);
  assert.deepEqual(sample(1.5),sample(3.5));assert.notDeepEqual(sample(.1),sample(6));
  const audio=cp.execFileSync('ffmpeg',['-v','error','-i',output,'-vn','-f','f32le','-ac','1','-ar','48000','pipe:1']);
  const rms=(from,to)=>{let n=0,sum=0;for(let i=Math.round(from*48000);i<Math.min(to*48000,audio.length/4);i++){sum+=audio.readFloatLE(i*4)**2;n++}return Math.sqrt(sum/n)};
  assert(rms(0,.15)<.001);assert(rms(.5,1.5)>.01);
  assert.deepEqual(errors,[]);console.log('PASS narration MP4-only save, 1080p/30, audio offset and audible track, exact 3-second held frame, continued motion; duration',meta.format.duration,'audio',meta.streams.find(s=>s.codec_type==='audio').codec_name);
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
