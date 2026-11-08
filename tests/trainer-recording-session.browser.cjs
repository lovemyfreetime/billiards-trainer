const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
(async()=>{
const server=cp.spawn(process.execPath,['tests/range-server.cjs','8811']);let browser;
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const p=await browser.newPage({viewport:{width:1100,height:750},serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log(m.text())});
 await p.addInitScript(()=>{
  window.saved=[];let pending;window.openedClips=false;
  window.BilliardsAndroid={
   saveTrainerClip(){},
   openTrainerClipsFolder(){window.openedClips=true},
   beginTrainerRecording(stem,session){pending={stem,session,chunks:[]};return 'token'},
   appendTrainerRecording(token,data){pending.chunks.push(data);return true},
   finishTrainerRecording(){saved.push(pending);return pending.stem+'.mp4'},
   abortTrainerRecording(){pending=null}
  };
 });
 await p.goto('http://127.0.0.1:8811/?train=1');await p.waitForFunction(()=>window.billiardsTourBridge);
 const setup=async(spin=0)=>p.evaluate(spin=>{
  billiardsTourBridge.apply({id:'session-test',balls:[[0,.25,.5],[1,.274,.51],[2,.72,.25]],target:1,pocket:[1,1],speed:.18,showPaths:true,showImpact:true},{tableL:2.54,tableW:1.27});
  const s=billiardsTourBridge.capture();s.state.speed=.18;s.state.freeAim={x:1.6,y:.635};s.state.sideSpin=spin;billiardsTourBridge.restore(s);
 },spin);
 await setup();
 await p.evaluate(()=>document.querySelector('#table3DToggle').click());await p.waitForFunction(()=>Billiards3D.active);
 await p.evaluate(()=>{document.querySelector('#trainerClipFolder').click();document.querySelector('#trainerClipName').value='Lesson 009';document.querySelector('#trainerClipPair').click()});
 await p.waitForFunction(()=>saved.length===2&&!document.querySelector('#trainerClipPair').disabled,null,{timeout:85000});
 assert(await p.evaluate(()=>openedClips));assert.deepEqual(await p.evaluate(()=>saved.map(x=>x.stem)),['Lesson 009 - Current','Lesson 009 - Stroke']);
 assert.equal(await p.locator('#trainerClipName').inputValue(),'Lesson 010');
 const pair=await p.evaluate(()=>saved.map(x=>JSON.parse(x.session).state));
 assert.deepEqual(pair[0].balls,pair[1].balls);assert.equal(pair[0].sideSpin,pair[1].sideSpin);
 console.log('PASS paired modes, same setup, folder button and 009 -> 010');
 await p.evaluate(()=>document.querySelector('#trainerClipSession').click());
 await setup(.1);await p.evaluate(()=>[...document.querySelectorAll('#table3DViews button')].find(b=>b.textContent==='Cue View').click());
 const cueView=await p.evaluate(()=>BilliardsClipView.captureView());
 await p.evaluate(()=>document.querySelector('#animate').click());await p.waitForFunction(()=>!billiardsTourBridge.snapshot().busy);
 await setup(-.1);await p.evaluate(()=>Billiards3D.prepareSnapshot());
 const fullView=await p.evaluate(()=>BilliardsClipView.captureView());
 await p.evaluate(()=>document.querySelector('#animate').click());await p.waitForFunction(()=>!billiardsTourBridge.snapshot().busy);
 await p.evaluate(()=>{document.querySelector('#trainerClipSession').click();document.querySelector('#trainerSnapshotFull').click()});
 const original=await p.evaluate(()=>billiardsTourBridge.capture());
 const originalView=await p.evaluate(()=>BilliardsClipView.captureView());
 assert.equal(await p.locator('#trainerSessionView').inputValue(),'stroke-current');
 await p.evaluate(()=>{window.renderedViews=[];const create=BilliardsClipView.create;BilliardsClipView.create=function(mode,...args){renderedViews.push({mode,camera:Billiards3D.camera()});return create.call(this,mode,...args)}});
 assert.match(await p.locator('#trainerClipSessionStatus').textContent(),/2 shots/);
 await p.evaluate(()=>document.querySelector('#trainerClipReplay').click());
 await p.waitForFunction(()=>saved.length===3&&!document.querySelector('#trainerClipReplay').disabled,null,{timeout:100000});
 const file=await p.evaluate(()=>JSON.parse(saved[2].session));
 assert.equal(file.recordingShots.length,2);
 assert.deepEqual(file.recordingShots.map(s=>s.recordingView),[cueView,fullView]);
 assert.deepEqual(await p.evaluate(()=>BilliardsClipView.captureView()),originalView);
 const views=await p.evaluate(()=>renderedViews);assert(views.every(v=>v.mode==='stroke-current'));
 assert(views.some(v=>v.camera.azimuth===cueView.camera.azimuth&&v.camera.radius===cueView.camera.radius));
 assert(views.some(v=>v.camera.azimuth===fullView.camera.azimuth&&v.camera.radius===fullView.camera.radius));
assert.equal(file.recordingShots[0].state.sideSpin,.1);assert.equal(file.recordingShots[1].state.sideSpin,-.1);
 assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.capture()),original);
 assert.equal(await p.locator('#trainerClipName').inputValue(),'Lesson 011');
 for(let i=0;i<3;i++){
  const data=await p.evaluate(i=>saved[i],i);
  const name='/tmp/session-export-'+i+'.mp4';fs.writeFileSync(name,Buffer.concat(data.chunks.map(x=>Buffer.from(x,'base64'))));
  const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,avg_frame_rate:format=duration','-of','json',name]));
  assert.equal(meta.streams[0].width,1920);assert.equal(meta.streams[0].height,1080);assert.equal(meta.streams[0].avg_frame_rate,'30/1');assert(Number(meta.format.duration)>(i===2?8:4));
  console.log(data.stem,meta.format.duration);
 }
 await p.reload();await p.waitForFunction(()=>window.billiardsTourBridge);assert.match(await p.locator('#trainerClipSessionStatus').textContent(),/2 shots/);assert.equal(await p.locator('#trainerClipName').inputValue(),'');
 assert.deepEqual(errors,[]);console.log('PASS saved cue/full cameras and stroke panel independently of snapshot selection; session capture, continuous video, exact settings, original state restored, recovery and name reset');
}finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
