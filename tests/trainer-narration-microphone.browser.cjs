const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');

(async()=>{
 const source='/tmp/trainer-microphone-source.mp4';
 const imported='/tmp/trainer-microphone-import.wav';
 cp.execFileSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=30',
  '-t','2.5','-c:v','libx264','-pix_fmt','yuv420p',source]);
 cp.execFileSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i','sine=frequency=510:sample_rate=48000',
  '-t','1.8','-c:a','pcm_s16le',imported]);
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8813']);
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({
   executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
   args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']
  });
  const context=await browser.newContext({viewport:{width:1100,height:760},permissions:['microphone']});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.savedVideos=[];window.savedAudio=[];window.openedAudioFolder=false;
   let videoPending,audioPending;
   window.BilliardsAndroid={
    saveTrainerClip(){},supportsNarratedVideo(){return true},supportsNarrationAudio(){return true},
    beginTrainerRecording(stem,session){videoPending={stem,session,chunks:[]};return 'video-token';},
    appendTrainerRecording(token,base64){videoPending.chunks.push(base64);return true;},
    finishTrainerRecording(){savedVideos.push(videoPending);return videoPending.stem+'.mp4';},
    abortTrainerRecording(){videoPending=null;},
    beginNarrationAudio(stem,extension,mime){audioPending={stem,extension,mime,chunks:[]};return 'audio-token';},
    appendNarrationAudio(token,base64){audioPending.chunks.push(base64);return true;},
    finishNarrationAudio(){savedAudio.push(audioPending);return 'Download/Billiards Trainer/Audio/'+audioPending.stem+'.'+audioPending.extension;},
    abortNarrationAudio(){audioPending=null;},
    openNarrationAudioFolder(){openedAudioFolder=true;}
   };
  });
  await page.goto('http://127.0.0.1:8813/?train=1');
  await page.waitForFunction(()=>window.BilliardsShotRecorder);
  await page.evaluate(()=>document.querySelector('#trainerNarrateVideo').click());
  await page.locator('#narrationVideoFile').setInputFiles(source);
  await page.waitForFunction(()=>document.querySelector('#narrationPreview').readyState>=2);
  await page.locator('#narrationAudioFile').setInputFiles(imported);
  assert.equal(await page.locator('#narrationSourceMode').inputValue(),'import');
  assert((await page.locator('#narrationAudioPreview').getAttribute('src')).startsWith('blob:'));
  await page.locator('#narrationName').fill('Microphone test 01');
  await page.locator('#narrationSaveDraft').click();
  await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.includes('project saved'));
  // Recording while the video plays must not replace the imported audio.
  await page.locator('#narrationPreview').evaluate(v=>{v.currentTime=.3});
  await page.locator('#narrationRecord').click();
  await page.waitForFunction(()=>!document.querySelector('#narrationStop').disabled);
  assert.equal(await page.locator('#narrationRecordingIndicator').isVisible(),true);
  assert.match(await page.locator('#narrationRecordingIndicator').textContent(),/RECORDING MICROPHONE/);
  await page.waitForTimeout(850);
  await page.locator('#narrationStop').click();
  await page.waitForFunction(()=>document.querySelectorAll('#narrationTakes li button').length===3);
  assert.equal(await page.locator('#narrationRecordingIndicator').isVisible(),false);
  assert.equal(await page.locator('#narrationSourceMode').inputValue(),'record');
  const firstAt=Number(/At ([0-9.]+)s/.exec(await page.locator('#narrationTakes li').first().textContent())[1]);
  await page.locator('#narrationPreview').evaluate(v=>{v.currentTime=.1;});
  await page.locator('#narrationHold').fill('1');
  await page.locator('#narrationAddHold').click();
  const afterHold=Number(/At ([0-9.]+)s/.exec(await page.locator('#narrationTakes li').first().textContent())[1]);
  assert(Math.abs(afterHold-firstAt-1)<.11,'Later audio shifts with a non-destructive frame hold');
  await page.locator('#narrationHolds li').filter({hasText:'0.10s · hold 1s'}).locator('button').click();
  const afterRemove=Number(/At ([0-9.]+)s/.exec(await page.locator('#narrationTakes li').first().textContent())[1]);
  assert(Math.abs(afterRemove-firstAt)<.11,'Removing a hold restores narration timing');
  await page.locator('#narrationTakes button').first().click();
  assert((await page.locator('#narrationAudioPreview').getAttribute('src')).startsWith('blob:'));
  // A retake replaces an earlier segment, not the original source or imported track.
  await page.locator('#narrationTakes button').nth(1).click();
  await page.waitForFunction(()=>!document.querySelector('#narrationStop').disabled);
  await page.waitForTimeout(650);
  await page.locator('#narrationStop').click();
  await page.waitForFunction(()=>document.querySelectorAll('#narrationTakes li button').length===3);
  await page.locator('#narrationAudioFolder').click();
  assert(await page.evaluate(()=>openedAudioFolder));
  await page.locator('#narrationSaveAudio').click();
  await page.waitForFunction(()=>savedAudio.length===1);
  const audio=await page.evaluate(()=>savedAudio[0]);
  assert.equal(audio.extension,'wav');assert.equal(audio.mime,'audio/wav');
  const wave=Buffer.concat(audio.chunks.map(part=>Buffer.from(part,'base64')));
  assert.equal(wave.toString('ascii',0,4),'RIFF');assert(wave.length>48000);
  await page.locator('#narrationSaveDraft').click();
  await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.includes('project saved'));
  await page.reload();await page.waitForFunction(()=>window.BilliardsShotRecorder);
  await page.evaluate(()=>document.querySelector('#trainerNarrateVideo').click());
  await page.locator('#narrationDrafts').selectOption('Microphone test 01');
  await page.locator('#narrationLoadDraft').click();
  await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.includes('project loaded'));
  assert.equal(await page.locator('#narrationSourceMode').inputValue(),'record');
  assert.equal(await page.locator('#narrationTakes li button').count(),3);
  await page.locator('#narrationSourceMode').selectOption('import');
  assert((await page.locator('#narrationAudioPreview').getAttribute('src')).startsWith('blob:'),
   'Uploaded Chase/existing audio remains available after microphone recording and reload');
  await page.locator('#narrationSourceMode').selectOption('record');
  await page.locator('#narrationExport').click();
  await page.waitForFunction(()=>savedVideos.length===1||(!document.querySelector('#narrationExport').disabled&&document.querySelector('#narrationStatus').textContent),null,{timeout:180000});
  assert.equal(await page.evaluate(()=>savedVideos.length),1,await page.locator('#narrationStatus').textContent());
  const file=await page.evaluate(()=>savedVideos[0]);
  const output='/tmp/trainer-microphone-narrated.mp4';
  fs.writeFileSync(output,Buffer.concat(file.chunks.map(part=>Buffer.from(part,'base64'))));
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output]));
  assert.equal(meta.streams.find(s=>s.codec_type==='video').width,1920);
  assert.equal(meta.streams.find(s=>s.codec_type==='video').avg_frame_rate,'30/1');
  assert(meta.streams.some(s=>s.codec_type==='audio'));
  assert.equal(file.session,null,'Narrated export is separate and never writes an original session');
  assert.deepEqual(errors,[]);
  console.log('PASS microphone capture, retake replacement, audio save/folder, imported audio retained, project reload, 1080p/30 MP4 export');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
