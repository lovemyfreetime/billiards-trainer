const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trainer-clip-test-'));
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8798']);
 await new Promise(resolve=>server.stdout.once('data',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true,serviceWorkers:'block'});
  const errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8798/?train=1');await p.waitForFunction(()=>window.billiardsTourBridge);
  await p.getByRole('button',{name:/TABLE \/ BALLS/}).click();
  const tools=p.getByRole('group',{name:'Video & Audio Narration'});
  const arm=tools.getByRole('button',{name:'Record shot'}),status=tools.locator('#trainerClipStatus');
  const shotView=tools.getByLabel('Shot video view');
  await p.evaluate(()=>{
   window.recordedViews=[];
   const create=BilliardsClipView.create;
   BilliardsClipView.create=function(mode,...args){recordedViews.push(mode);return create.call(this,mode,...args);};
  });
  for(const [index,mode] of ['full','current','stroke'].entries()){
   const i=index+1;
   await p.evaluate(()=>{
    billiardsTourBridge.apply({id:'record-test',balls:[[0,.25,.5],[1,.274,.51],[2,.72,.25]],target:1,pocket:[1,1],speed:.18},{tableL:2.54,tableW:1.27});
    const setup=billiardsTourBridge.capture();
    setup.state.speed=.18;setup.state.freeAim={x:1.6,y:.635};
    billiardsTourBridge.restore(setup);
   });
   await p.locator('#trainerSnapshotCurrent').click();
   await shotView.selectOption(mode);
   assert.equal(await p.locator('#trainerSnapshotCurrent').getAttribute('aria-pressed'),'true');
   assert.equal(await shotView.inputValue(),mode);
   await p.locator('#trainerSnapshotFull').click();
   assert.equal(await shotView.inputValue(),mode);
   const before=await p.evaluate(()=>billiardsTourBridge.capture().state);
   const downloading=p.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.mp4'),timeout:40000});
   const setupEvent=p.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.session.billiards.json'),timeout:40000});
   await arm.click();
   const [download,setup]=await Promise.all([downloading,setupEvent]);
   const video=path.join(dir,i+'.mp4');
   await download.saveAs(video);
   const stem='Shot '+String(i).padStart(2,'0');
   assert.equal(download.suggestedFilename(),stem+'.mp4');
   assert.equal(setup.suggestedFilename(),stem+'.session.billiards.json');
   const payload=JSON.parse(fs.readFileSync(await setup.path(),'utf8'));
   assert.equal(payload.kind,'session');
   assert.deepEqual(payload.state.balls,before.balls);
   assert.equal(payload.state.speed,before.speed);
   const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-of','json',video])).streams[0];
   console.log(i,meta.codec_name,meta.width,meta.height,meta.r_frame_rate,meta.avg_frame_rate,meta.nb_read_frames,meta.duration);
   assert.equal(meta.codec_name,'h264');assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.equal(meta.avg_frame_rate,'30/1');assert.equal(meta.r_frame_rate,'30/1');
   assert.match(await status.textContent(),/Check Downloads/);
   await p.waitForFunction(()=>!window.BilliardsShotRecorder.busy);
  }
  assert.deepEqual(await p.evaluate(()=>recordedViews),['full','current','stroke']);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
