const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trainer-camera-test-'));
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8824']);let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1300,height:800},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.savedCameraClips=[];let pending;
   const timing=window.cameraTestTiming={frames:0,now:null};
   const encode=VideoEncoder.prototype.encode;
   VideoEncoder.prototype.encode=function(...args){
    encode.apply(this,args);
    timing.frames++;
   };
   // Control the capture timeline while keeping rendering and WebCodecs real.
   const now=performance.now.bind(performance), raf=window.requestAnimationFrame.bind(window);
   performance.now=()=>timing.now??now();
   window.requestAnimationFrame=callback=>raf(timestamp=>callback(timing.now??timestamp));
   window.BilliardsAndroid={saveTrainerClip(){},openTrainerClipsFolder(){},
    beginTrainerRecording(stem,setup){pending={stem,setup,chunks:[]};return 'recording-token'},
    appendTrainerRecording(token,base64){pending.chunks.push(base64);return true},
    finishTrainerRecording(){savedCameraClips.push(pending);return pending.stem+'.mp4'},
    abortTrainerRecording(){pending=null}};
  });
  await page.goto('http://127.0.0.1:8824/?train=1');
  await page.waitForFunction(()=>window.BilliardsShotRecorder&&window.BilliardsCameraRecorder&&window.billiardsTourBridge);
  assert.equal(await page.locator('#trainerCameraBar').isVisible(),false,'Floating tools must be off by default');
  if(!await page.locator('#panel').isVisible())await page.locator('#phoneControls').click();
  if(!await page.locator('#trainerCameraToggle').evaluate(e=>e.closest('.section').classList.contains('open')))
   await page.getByRole('button', {name: /TABLE \/ BALLS/}).click();
  await page.locator('#trainerCameraToggle').click();
  if(await page.evaluate(()=>document.body.classList.contains('phone-controls-open')))await page.locator('#phoneControls').click();
  assert.equal(await page.locator('#trainerCameraBar').isVisible(),true);
  assert.equal(await page.locator('#app #trainerCameraBar').count(),0,'Recorder stays outside captured screen');
  await page.locator('[data-camera-mode="current"]').click();
  await page.evaluate(()=>cameraTestTiming.now=10000);
  await page.locator('#trainerCameraRecord').click();
  await page.waitForFunction(()=>window.BilliardsCameraRecorder.recording);
  await page.evaluate(()=>cameraTestTiming.now+=400);
  await page.waitForFunction(()=>cameraTestTiming.frames===13);
  await page.locator('#trainerCameraPause').click();
  assert.equal(await page.evaluate(()=>BilliardsCameraRecorder.paused),true);
  await page.evaluate(()=>cameraTestTiming.now+=2000);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>cameraTestTiming.frames),13,'Pause freezes the encoded frame count');
  await page.locator('#trainerCameraPause').click();
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>cameraTestTiming.frames),13,'Resume does not encode the paused interval');
  await page.evaluate(()=>cameraTestTiming.now+=400);
  await page.waitForFunction(()=>cameraTestTiming.frames===25);
  await page.locator('#trainerCameraStop').click();
  await page.evaluate(()=>cameraTestTiming.now=null);
  await page.waitForFunction(()=>savedCameraClips.length===1&&!window.BilliardsCameraRecorder.recording,null,{timeout:35000});
  assert.match(await page.locator('#trainerCameraStatus').textContent(),/Saved .*\.mp4 separately/);
  assert.equal(await page.locator('#trainerClipName').inputValue(),'Camera 02');
  const data=await page.evaluate(()=>savedCameraClips[0]);
  assert.equal(data.stem,'Camera 01');
  const setup=JSON.parse(data.setup);
  assert.deepEqual(setup.recordingCamera.views,['current']);
  const output=path.join(dir,'camera.mp4');fs.writeFileSync(output,Buffer.concat(data.chunks.map(chunk=>Buffer.from(chunk,'base64'))));
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height,avg_frame_rate,nb_frames:format=duration','-of','json',output]));
  assert.equal(meta.streams[0].width,1920);assert.equal(meta.streams[0].height,1080);
  assert.equal(meta.streams[0].avg_frame_rate,'30/1');
  assert.equal(Number(meta.streams[0].nb_frames),25);
  assert.equal(setup.recordingCamera.frames,25);
  assert(Math.abs(Number(meta.format.duration)-25/30)<.002,'MP4 duration matches the 25 frames captured outside pause');
  // Exercise the two additional canvas-based camera framings as independent MP4s.
  for(const [i,mode] of ['full','stroke'].entries()){
   await page.locator(`[data-camera-mode="${mode}"]`).click();
   assert.equal(await page.locator(`[data-camera-mode="${mode}"]`).getAttribute('aria-pressed'),'true');
   await page.locator('#trainerCameraRecord').click();
   await page.waitForFunction(()=>window.BilliardsCameraRecorder.recording);
   await page.waitForTimeout(550);
   await page.locator('#trainerCameraStop').click();
   await page.waitForFunction(count=>savedCameraClips.length===count&&!window.BilliardsCameraRecorder.recording,i+2,{timeout:35000});
   const extra=await page.evaluate(index=>savedCameraClips[index],i+1);
   assert.deepEqual(JSON.parse(extra.setup).recordingCamera.views,[mode]);
   const mp4=path.join(dir,mode+'.mp4');
   fs.writeFileSync(mp4,Buffer.concat(extra.chunks.map(chunk=>Buffer.from(chunk,'base64'))));
   const videoMeta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height,avg_frame_rate:format=duration','-of','json',mp4]));
   assert.equal(videoMeta.streams[0].width,1920);assert.equal(videoMeta.streams[0].height,1080);
   assert.equal(videoMeta.streams[0].avg_frame_rate,'30/1');
   assert(Number(videoMeta.format.duration)>0,'Saved '+mode+' MP4 has playable duration');
  }
  // Element Capture needs a real chooser; verify that the fourth mode can be selected without prompting.
  await page.locator('[data-camera-mode="screen"]').click();
  assert.equal(await page.locator('[data-camera-mode="screen"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#trainerCameraStatus').textContent(),/choosing this Trainer tab/);
  await page.locator('#trainerCameraClose').click();assert.equal(await page.locator('#trainerCameraBar').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS camera bar, Current/Full Table/Table+Stroke MP4s, Full Screen selection, 1080p/30, pause excludes time, unique names, invisible toolbar');
 }finally{await browser?.close();server.kill();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
