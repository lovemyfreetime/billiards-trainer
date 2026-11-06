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
  await p.evaluate(()=>{
   billiardsTourBridge.apply({id:'record-test',balls:[[0,.25,.5],[1,.65,.5],[2,.72,.25]],target:1,pocket:[1,1],speed:1.4},{tableL:2.54,tableW:1.27});
   const state=billiardsTourBridge.capture();
   state.state.freeAim={x:1.6,y:.635};
   state.state.showPaths=true;state.state.showImpact=true;
   billiardsTourBridge.restore(state);
   let labels=[];
   window.recordedLabels=[];
   const fill=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(text,...args){
    labels.push(String(text));
    return fill.call(this,text,...args);
   };
   window.VideoFrame=class extends VideoFrame{
    constructor(...args){
     super(...args);
     recordedLabels.push(labels);
     labels=[];
    }
   };
  });
  await p.getByRole('button',{name:/TABLE \/ BALLS/}).click();
  const arm=p.locator('#trainerClipArm'),status=p.locator('#trainerClipStatus'),name=p.locator('#trainerClipName');
  for(const [i,stem] of ['Shot 01','Run 07','Run 08'].entries()){
   if(i===1)await name.fill(stem);
   if(i===2)await p.locator('#trainerSnapshotStroke').click();
   const before=await p.evaluate(()=>billiardsTourBridge.capture().state);
   const videoEvent=p.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.mp4'),timeout:40000});
   const setupEvent=p.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.billiards.json'),timeout:40000});
   await arm.click();
   const [download,setup]=await Promise.all([videoEvent,setupEvent]);
   const video=path.join(dir,i+'.mp4');
   await download.saveAs(video);
   assert.equal(download.suggestedFilename(),stem+'.mp4');
   assert.equal(setup.suggestedFilename(),stem+'.session.billiards.json');
   const payload=JSON.parse(fs.readFileSync(await setup.path(),'utf8'));
   assert.equal(payload.kind,'session');
   assert.equal(payload.name,stem);
   assert.deepEqual(payload.state.balls,before.balls);
   assert.equal(payload.state.speed,before.speed);
   await p.waitForFunction(()=>!document.querySelector('#trainerClipArm').disabled);
   assert.notDeepEqual(await p.evaluate(()=>billiardsTourBridge.capture().state.balls),before.balls,'Record shot executes the shot');
   if(i===0){
    const labels=await p.evaluate(()=>recordedLabels);
    for(const frame of [labels[0],labels.at(-1)])for(const label of ['Overlap ','Cut angle ','Exit angle ']){
     assert(frame.some(text=>text.startsWith(label)),label+' captured through the settled frame');
    }
   }
   const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-of','json',video])).streams[0];
   console.log(i,meta.codec_name,meta.width,meta.height,meta.r_frame_rate,meta.avg_frame_rate,meta.nb_read_frames,meta.duration);
   assert.equal(meta.codec_name,'h264');assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.equal(meta.avg_frame_rate,'30/1');assert.equal(meta.r_frame_rate,'30/1');
   assert.match(await status.textContent(),/Check Downloads/);
   await p.evaluate(()=>{const s=billiardsTourBridge.capture();s.state.speed=.35;s.state.sideSpin=.15;billiardsTourBridge.restore(s);});
  }
  assert.equal(await name.inputValue(),'Run 09');
  await p.reload();
  assert.equal(await name.inputValue(),'');
  assert.equal(await name.getAttribute('placeholder'),'Shot 01');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
