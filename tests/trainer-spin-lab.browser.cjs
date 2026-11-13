const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('test-results/spin-lab');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8838']);let browser,p;
 try{
  await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  p=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true});const errors=[];
  p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8838/?train=1');await p.waitForFunction(()=>window.billiardsTrainingBall&&window.BilliardsSpinLabUI);
  await p.evaluate(()=>billiardsTourBridge.apply({id:'training-ball-test',balls:[[0,.25,.5],[1,.6,.5]],target:1,pocket:[1,1],speed:.5},{tableL:2.54,tableW:1.27}));
  await p.getByRole('button',{name:/FEATURES & OPTIONS/}).click();
  const state=()=>p.evaluate(()=>billiardsTourBridge.capture().state);
  const baseline=await p.evaluate(()=>billiardsTourBridge.predict());
  for(const style of ['spots','split','stripe']){
   await p.locator('#trainingBallStyle').selectOption(style);
   assert.equal((await state()).trainingBallStyle,style);
   assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.predict()),baseline);
  }
  const q0=(await state()).balls.find(b=>b.id===0).orientation;
  await p.locator('#trainingBallPreview').scrollIntoViewIfNeeded();
  const box=await p.locator('#trainingBallPreview').boundingBox(),panel=await p.locator('#panel').boundingBox();assert(box.x>=panel.x&&box.x+box.width<=panel.x+panel.width,'Preview stays in its Options panel');
  await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:5});await p.mouse.up();
  const dragged=(await state()).balls.find(b=>b.id===0).orientation;assert.notDeepEqual(dragged,q0);
  await p.locator('#undoAction').click();assert.deepEqual((await state()).balls.find(b=>b.id===0).orientation,q0,'One undo reverses the entire drag');
  await p.locator('#redoAction').click();assert.deepEqual((await state()).balls.find(b=>b.id===0).orientation,dragged);
  await p.getByRole('button',{name:/TABLE \/ BALLS/}).click();
  await p.locator('#trainerPlaybackSpeed').selectOption('0.125');
  await p.locator('#trainingBallPreview').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'training-ball-options.png')});console.log('Training options and drag undo/redo passed');
  await p.reload();await p.waitForFunction(()=>window.billiardsTrainingBall);
  assert.equal((await state()).trainingBallStyle,'stripe');assert.equal((await state()).shotPlaybackSpeed,.125);assert.deepEqual((await state()).balls.find(b=>b.id===0).orientation,dragged);
  await p.locator('#table3DToggle').click();await p.waitForFunction(()=>window.Billiards3D?.active);
  assert.equal(await p.locator('#trainerPlaybackToggle').count(),0,'No permanent Playback button over the table');
  assert.equal(await p.locator('#trainerPlaybackBar').isVisible(),false);
  await p.locator('#phoneControls:visible, #table3DDrawer:visible').first().click();
  if(!await p.locator('#trainerShowPlayback').isVisible())await p.getByRole('button',{name:/TABLE \/ BALLS/}).click();
  await p.locator('#trainerShowPlayback').click();
  await p.locator('#phoneControls:visible, #table3DDrawer:visible').first().click();
  await p.locator('#trainerPlaybackCloseup').click();await p.locator('#trainerPlaybackFollow').check();
  const camera=await p.evaluate(()=>Billiards3D.camera());assert.equal(camera.followCue,true);
  // A short real shot keeps all export checks fast, including eighth speed.
  async function setup(speed){await p.evaluate(speed=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{shot2Enabled:false,activeShot:1,speed:.18,follow:0,sideSpin:0,cueElevationDeg:0,airbornePhysics:false,freeAim:{x:1.6,y:.635},trainingBallStyle:'split',shotPlaybackSpeed:speed});s.state.balls=[{id:0,n:'CB',x:.635,y:.635,active:true,orientation:[0,0,0,1]}];billiardsTourBridge.restore(s);},speed);}
  await setup(.125);
  await p.locator('#trainerPlaybackStep').click();
  let playback=await p.evaluate(()=>billiardsPlayback.state());assert.equal(playback.paused,true);assert(Math.abs(playback.time-.125/30)<1e-9);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const still=await p.evaluate(()=>Billiards3D.renderedBalls().find(b=>b.id===0));await p.waitForTimeout(150);
  assert.deepEqual(await p.evaluate(()=>Billiards3D.renderedBalls().find(b=>b.id===0)),still,'Pause freezes translation and texture');
  const pausedRenders=await p.evaluate(async()=>{let n=0;const onRender=()=>n++;window.addEventListener('billiards:2d-render',onRender);await new Promise(r=>setTimeout(r,300));window.removeEventListener('billiards:2d-render',onRender);return n;});
  assert.equal(pausedRenders,0,'Paused playback must stop table redraws');
  console.log('Paused playback: zero table redraws in 300 ms');
  await p.locator('#trainerPlaybackStep').click();assert((await p.evaluate(()=>billiardsPlayback.state())).time>playback.time);
  await p.locator('#trainerPlaybackBack').click();assert(Math.abs((await p.evaluate(()=>billiardsPlayback.state())).time-playback.time)<1e-9);
  await p.screenshot({path:path.join(out,'paused-closeup.png')});
  await p.locator('#trainerPlaybackQuickSpeed').selectOption('1');await p.locator('#trainerPlaybackPause').click();await p.waitForFunction(()=>!billiardsPlayback.state().running);
  const end=await state(),history=await p.evaluate(()=>billiardsTourBridge.snapshot().undoCount);
  await p.locator('#trainerPlaybackReplay').click();await p.waitForFunction(()=>!billiardsPlayback.state().running);
  assert.deepEqual(await state(),end,'Replay restores the ending setup');assert.equal(await p.evaluate(()=>billiardsTourBridge.snapshot().undoCount),history);
  // Repeatedly leave a paused replay, then shoot and undo normally.
  for(let i=0;i<3;i++){
   const saved=await state(),count=await p.evaluate(()=>billiardsTourBridge.snapshot().undoCount);
   await p.locator('#trainerPlaybackQuickSpeed').selectOption('0.125');
   await p.locator('#trainerPlaybackReplay').click();await p.locator('#trainerPlaybackPause').click();
   await p.locator('#trainerPlaybackHide').click();
   const closed=await p.evaluate(()=>billiardsPlayback.state());assert.equal(closed.running,false);assert.equal(closed.speed,1);
   assert.equal(await p.locator('#trainerPlaybackBar').isVisible(),false);
   assert.equal(await p.evaluate(()=>Billiards3D.camera().followCue),false);
   assert.deepEqual((await state()).balls,saved.balls,'Close restores layout');
   assert.equal(await p.evaluate(()=>billiardsTourBridge.snapshot().undoCount),count,'Close does not commit a shot');
   await p.locator('#phoneControls:visible, #table3DDrawer:visible').first().click();await p.locator('#trainerShowPlayback').click();await p.locator('#phoneControls:visible, #table3DDrawer:visible').first().click();
  }
  await setup(1);const beforeNormal=(await state()).balls;
  await p.evaluate(()=>document.getElementById('animate').click());await p.waitForFunction(()=>!billiardsPlayback.state().running);
  await p.evaluate(()=>document.getElementById('undoShot').click());assert.deepEqual((await state()).balls,beforeNormal,'Shoot and Undo recover after closing playback');
  console.log('Three pause/close/reopen cycles, normal Shoot and Undo passed');
  // The existing recorder exports the selected speed in every supported view.
  console.log('Persistence, 3D pause/step/replay and cue following passed');
  await p.setViewportSize({width:960,height:600});
  const clips=[];
  for(const [speed,mode] of (process.env.SPIN_LAB_UI_ONLY?[]:process.env.SPIN_LAB_RECORDING_SMOKE?[[1,'current']]:[[1,'current'],[.25,'full'],[.125,'stroke']])){
   await setup(speed);await p.evaluate(()=>Billiards3D.followCue(true));
   console.log('Export start',speed,mode);const before=await state();const downloads=[];const onDownload=d=>downloads.push(d);p.on('download',onDownload);
   await p.evaluate(mode=>{document.getElementById('trainerClipView').value=mode;document.getElementById('trainerClipArm').click();},mode);
   await p.waitForFunction(()=>{const p=billiardsPlayback.state();return p.recording&&p.running;},null,{timeout:20000});
   const duration=await p.evaluate(()=>billiardsPlayback.state().duration);
   await p.waitForFunction(()=>!BilliardsShotRecorder.busy,null,{timeout:360000});
   assert(await p.locator('#trainerPlaybackQuickSpeed').isEnabled(),'Playback speed unlocks as soon as saving finishes');assert(await p.locator('#trainerPlaybackCloseup').isEnabled(),'Camera controls unlock after saving');
   p.off('download',onDownload);assert.equal(downloads.length,2,await p.locator('#trainerClipStatus').textContent());
   const video=downloads.find(d=>d.suggestedFilename().endsWith('.mp4')),setupFile=downloads.find(d=>d.suggestedFilename().endsWith('.json'));
   const filename=path.join(out,'slow-'+speed+'-'+mode+'.mp4');await video.saveAs(filename);
   const saved=JSON.parse(fs.readFileSync(await setupFile.path(),'utf8'));assert.equal(saved.state.shotPlaybackSpeed,speed);assert.equal(saved.state.trainingBallStyle,'split');assert.deepEqual(saved.state.balls,before.balls);
   const stream=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-of','json',filename])).streams[0];
   assert.equal(stream.width,1920);assert.equal(stream.height,1080);assert.equal(stream.avg_frame_rate,'30/1');
   assert(Math.abs(Number(stream.duration)-(4+duration/speed))<.07,JSON.stringify({speed,duration,output:stream.duration}));
   assert.equal(await p.evaluate(()=>Billiards3D.camera().followCue),true,'Full-table capture restores camera following');
   const result={speed,mode,simulationSeconds:duration,videoSeconds:stream.duration,frames:stream.nb_read_frames};clips.push(result);console.log('Export passed',result);fs.writeFileSync(path.join(out,'recording-results.json'),JSON.stringify(clips,null,2));
  }
  fs.writeFileSync(path.join(out,'recording-results.json'),JSON.stringify(clips,null,2));console.log(clips);
  // Responsive toolbar stays in the viewport and clear of the recorder bar.
  for(const [name,width,height] of [['desktop',1440,900],['tablet',1024,768],['phone-landscape',844,390],['phone-portrait',390,844]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(150);
   const b=await p.locator('#trainerPlaybackBar').boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height,name);
   for(const selector of ['#table3DToggle','[data-trainer-action=undoShot]','[data-trainer-action=redoShot]']){const controls=await p.locator(selector).all();for(const control of controls){if(!await control.isVisible())continue;const r=await control.boundingBox();assert(r.x+r.width<=b.x||b.x+b.width<=r.x||r.y+r.height<=b.y||b.y+b.height<=r.y,'Playback must not cover '+selector+' on '+name);}}
   await p.screenshot({path:path.join(out,'playback-'+name+'.png')});
  }
  assert.deepEqual(errors,[]);console.log(process.env.SPIN_LAB_RECORDING_SMOKE?'Recording completion controls and UI smoke test passed.':process.env.SPIN_LAB_UI_ONLY?'Focused UI: ball setup, history, playback and four viewports passed.':'Ball setup, drag undo/redo, persistence, 3D pause/step/replay, following camera, 1080p/30 slow MP4s and four viewports passed.');
 }catch(error){if(p){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),String(error)+'\n'+JSON.stringify(await p.evaluate(()=>({playback:window.billiardsPlayback?.state(),status:document.getElementById('trainerClipStatus')?.textContent})).catch(()=>null)));}throw error;}finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
