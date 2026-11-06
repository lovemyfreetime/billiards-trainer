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
  await p.evaluate(()=>billiardsTourBridge.apply({id:'record-test',balls:[[0,.25,.5],[1,.65,.5],[2,.72,.25]],target:1,pocket:[1,1],speed:.35},{tableL:2.54,tableW:1.27}));
  await p.getByRole('button',{name:/TABLE \/ BALLS/}).click();
  const arm=p.locator('#trainerClipArm'),status=p.locator('#trainerClipStatus');
  for(const i of [1,2,3]){
   if(i===3)await p.locator('#trainerSnapshotStroke').click();
   const before=await p.evaluate(()=>billiardsTourBridge.capture().state);
   await arm.click();
   await p.waitForFunction(()=>document.querySelector('#trainerClipArm').getAttribute('aria-pressed')==='true',null,{timeout:7000});
   const downloading=p.waitForEvent('download',{timeout:40000});
   await p.locator('#animate').click();
   const download=await downloading;
   const video=path.join(dir,i+'.mp4');
   await download.saveAs(video);
   assert.equal(download.suggestedFilename(),String(i).padStart(2,'0')+'.mp4');
   const setupEvent=p.waitForEvent('download');
   await p.locator('#trainerClipSetup').click();
   const setup=await setupEvent;
   const payload=JSON.parse(fs.readFileSync(await setup.path(),'utf8'));
   assert.equal(payload.kind,'session');
   assert.deepEqual(payload.state.balls,before.balls);
   assert.equal(payload.state.speed,before.speed);
   const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-of','json',video])).streams[0];
   console.log(i,meta.codec_name,meta.width,meta.height,meta.r_frame_rate,meta.avg_frame_rate,meta.nb_read_frames,meta.duration);
   assert.equal(meta.codec_name,'h264');assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.equal(meta.avg_frame_rate,'30/1');assert.equal(meta.r_frame_rate,'30/1');
   assert.match(await status.textContent(),/Check Downloads/);
   await p.evaluate(()=>{const s=billiardsTourBridge.capture();s.state.speed=.35;s.state.sideSpin=.15;billiardsTourBridge.restore(s);});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
