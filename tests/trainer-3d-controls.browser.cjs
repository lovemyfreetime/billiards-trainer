const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const {chromium, devices} = require('playwright');
const output = 'test-results/3d-controls';
fs.mkdirSync(output, {recursive:true});
const results = [];
const overlaps = (a,b) => a.x < b.x+b.width-1 && a.x+a.width > b.x+1 && a.y < b.y+b.height-1 && a.y+a.height > b.y+1;
const specs = [
  {name:'computer',viewport:{width:1365,height:900}},
  {name:'tablet',viewport:{width:1024,height:768},hasTouch:true},
  {...devices['Pixel 7'],name:'phone',viewport:{width:740,height:360}},
  {...devices['iPhone 13'],name:'portrait',viewport:{width:390,height:844}}
];
(async () => {
  const server = cp.spawn(process.execPath, ['tests/range-server.cjs','8796']);
  let browser;
  try {
    await new Promise((resolve,reject) => {server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Fixture server exited: '+code)));});
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
    for (const {name,...options} of specs) {
      const context = await browser.newContext({...options,serviceWorkers:'block'});
      await context.addInitScript(() => {window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
      const page = await context.newPage(), errors=[];
      page.setDefaultTimeout(8000);
      page.on('pageerror',error=>errors.push(error.message));
      const state = () => page.evaluate(()=>billiardsTourBridge.capture().state);
      const frames = () => page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const fixture = async () => {
        await page.evaluate(()=>billiardsTourBridge.apply({id:'shared-controls',balls:[[0,.25,.5],[1,.65,.5]],target:1,pocket:[1,1],speed:1,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
        await frames();
      };
      const dismiss = async () => {
        if(await page.locator('#appViewHint').isVisible()) await page.locator('#appViewHint [data-display-dismiss]').click();
        await page.keyboard.press('Escape');
      };
      const ensure3D = async () => {
        if(!await page.evaluate(()=>Billiards3D.active)) {
          await page.locator('#table3DToggle').click();
          await page.waitForFunction(()=>Billiards3D.active,null,{timeout:15000});
        }
        await dismiss();
      };
      const enableSecondShot = async () => {
        if(!(await state()).shot2Enabled) {
          await page.locator('#phoneControls').click();
          await page.locator('#toggleShot2').click();
          if(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'))) await page.locator('#phoneControls').click();
          await page.waitForFunction(()=>billiardsTourBridge.capture().state.shot2Enabled);
        }
        await frames();
      };
      const phase = async (kind,label,run) => {
        try {await run();results.push({viewport:name,kind,label,status:'passed'});console.log(`PASS ${name} ${kind}: ${label}`);}
        catch(error) {
          results.push({viewport:name,kind,label,status:'failed',error:error.stack});
          console.error(`FAIL ${name} ${kind}: ${label}\n${error.stack}`);
          await page.screenshot({path:`${output}/${name}-${kind}-${label.replace(/\W+/g,'-')}-failed.png`}).catch(()=>{});
        }
      };
      const reachable = async selector => {
        const el=page.locator(selector);assert(await el.isVisible(),selector+' visible');
        const box=await el.boundingBox();assert(box&&box.width>0&&box.height>0,selector+' has a usable size');
        assert(await el.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' is not covered');
        return box;
      };
      try {
        await page.goto('http://127.0.0.1:8796/?train=1');
        await page.waitForFunction(()=>window.Billiards3D&&window.billiardsTourBridge&&window.billiardsWorkspaceSync);
        await fixture();
        // Behavior runs first. A cosmetic mismatch cannot prevent the shot/history checks.
        await phase('behavior','mode and camera',async()=>{
          const before=await state();assert.equal(await page.locator('#table3DToggle').textContent(),'3D Mode');
          await ensure3D();assert.equal(await page.locator('#table3DToggle').getAttribute('aria-pressed'),'true');
          assert.deepEqual(await state(),before,'Entering 3D preserves balls and shot settings');
          const full=page.getByRole('button',{name:'Full View: standing perspective from beside the table',exact:true});
          const cue=page.getByRole('button',{name:'Cue View: look along the active cue-ball shot line',exact:true});
          const near=await page.evaluate(()=>Billiards3D.camera());await full.click();const far=await page.evaluate(()=>Billiards3D.camera());
          assert(Math.abs(far.azimuth-near.azimuth-Math.PI)<1e-8,'Repeat Full View chooses the opposite long rail');
          assert.equal(far.elevation,near.elevation);assert.equal(far.radius,near.radius);
          await full.click();assert.equal((await page.evaluate(()=>Billiards3D.camera())).azimuth,near.azimuth);
          await cue.click();const narrow=await page.evaluate(()=>Billiards3D.camera());await cue.click();const wide=await page.evaluate(()=>Billiards3D.camera());
          assert(Math.abs(wide.radius/narrow.radius-1.15**5)<1e-8,'Second Cue View equals five zoom-out taps');
          for(const key of ['elevation','azimuth'])assert.equal(wide[key],narrow[key]);assert.deepEqual(wide.target,narrow.target);
          await cue.click();assert.equal((await page.evaluate(()=>Billiards3D.camera())).radius,narrow.radius);
          await full.click();
          await page.locator('#table3DLock [data-adjust=edit]').click();assert(await page.evaluate(()=>Billiards3D.locked));
          assert.equal(await page.locator('#table3DLock').getAttribute('aria-pressed'),'true');
          await page.locator('#table3DLock [data-adjust=view]').click();assert.equal(await page.evaluate(()=>Billiards3D.locked),false);
          await page.locator('#table3DPan').click();assert.equal(await page.locator('#table3DPan').getAttribute('aria-pressed'),'true');
          assert.equal(await page.locator('#table3DRotate').getAttribute('aria-pressed'),'false');
          await page.locator('#table3DRotate').click();assert.equal(await page.locator('#table3DRotate').getAttribute('aria-pressed'),'true');
          const camera=await page.evaluate(()=>Billiards3D.camera());
          await page.locator('#table3DZoomSlider').evaluate(e=>{e.value=75;e.dispatchEvent(new Event('input',{bubbles:true}));});
          const zoomed=await page.evaluate(()=>Billiards3D.camera());assert.notEqual(zoomed.radius,camera.radius);
          assert.equal(zoomed.azimuth,camera.azimuth);assert.equal(zoomed.elevation,camera.elevation);
          assert.deepEqual(await state(),before,'Camera controls preserve the complete shot');
        });
        await phase('behavior','two independent shot banks',async()=>{
          await fixture();await ensure3D();
          const picker=page.locator('#phoneAimChoice');assert.equal(await picker.isVisible(),false);assert(await picker.isDisabled());
          const single=await state();await picker.evaluate(e=>e.click());assert.deepEqual(await state(),single,'Unavailable selector cannot add another shot');
          await enableSecondShot();await page.evaluate(()=>billiardsSelectShot(1));await frames();const first=await state();
          await picker.click();await page.waitForFunction(()=>billiardsTourBridge.capture().state.activeShot===2);
          assert.deepEqual((await state()).balls,first.balls);
          for(const id of ['aimControls2','tableSpeed2Wrap','bottomSpin2','phoneTip2'])assert(await page.locator('#'+id).isVisible(),id+' visible');
          for(const id of ['aimControls','tableSpeed1Wrap','bottomSpin1','phoneTip1'])assert.equal(await page.locator('#'+id).isVisible(),false,id+' hidden');
          for(const [id,value] of [['tableSpeed2',1.65],['bottomFollow2',-.55],['bottomSide2',-.45]])await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);
          const second=await state();assert.equal(second.shot2.speed,1.65);assert.equal(second.shot2.follow,-.55);assert.equal(second.shot2.sideSpin,-.45);
          for(const key of ['speed','follow','sideSpin'])assert.equal(second[key],first[key],'Shot 1 '+key+' unchanged');
          const roller=await page.locator('#aimRoller2').boundingBox();await page.mouse.move(roller.x+roller.width/2,roller.y+roller.height/2);await page.mouse.down();
          await page.mouse.move(roller.x+roller.width/2,roller.y+roller.height/2+24,{steps:4});await page.mouse.up();const aimed=await state();
          assert.notDeepEqual(aimed.shot2.freeAim,second.shot2.freeAim);assert.deepEqual(aimed.freeAim,second.freeAim);
          await picker.click();assert.equal((await state()).activeShot,1);assert.equal(await page.locator('#tableSpeed1').inputValue(),String(first.speed));
          await picker.click();assert.equal(await page.locator('#tableSpeed2').inputValue(),'1.65');assert.equal(await page.locator('#bottomFollow2').inputValue(),'-0.55');
        });
        await phase('behavior','Shoot Undo Redo',async()=>{
          await fixture();await ensure3D();await enableSecondShot();await page.evaluate(()=>billiardsSelectShot(1));await frames();
          const before=await state(),shoot=page.locator('[data-trainer-action=animate]');await shoot.click();
          await page.waitForFunction(()=>billiardsTourBridge.snapshot().busy,null,{timeout:10000});
          assert.equal(await shoot.getAttribute('aria-busy'),'true');
          await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,null,{timeout:45000});
          const executed=await state();assert.notDeepEqual(executed.balls,before.balls,'Shoot moved the balls');
          assert.equal(await page.locator('#phoneAimChoice').isVisible(),false,'Completed shot consumes Shot 2');
          await page.locator('[data-trainer-action=undoShot]').click();const undone=await state();
          assert.deepEqual(undone.balls,before.balls,'Undo restores exact pre-shot balls');
          assert.equal(undone.shot2Enabled,before.shot2Enabled);assert(await page.locator('#phoneAimChoice').isVisible());
          await page.evaluate(()=>{window.__testRedoComplete=false;window.addEventListener('billiards:redo-complete',()=>{window.__testRedoComplete=true;},{once:true});});
          await page.locator('[data-trainer-action=redoShot]').click();await page.waitForFunction(()=>window.__testRedoComplete);
          const redone=await state();assert.deepEqual(redone.balls,executed.balls,'Redo restores the saved shot result exactly');
          for(const key of ['shot2Enabled','speed','follow','sideSpin'])assert.equal(redone[key],executed[key],'Redo restores '+key);
        });
        await phase('behavior','drawer and readouts',async()=>{
          await fixture();await ensure3D();const before=await state();
          await page.locator('#phoneControls').click();assert(await page.locator('#panel').isVisible());await page.locator('#phoneControls').click();
          assert.deepEqual(await state(),before,'Opening and closing Tools preserves the shot');
          assert.equal(await page.locator('#btg-fullscreen').isVisible(),false);await page.locator('#workspace-view summary').click();
          assert(await page.locator('#btg-fullscreen').isVisible(),'Fullscreen is discoverable under View');await page.keyboard.press('Escape');
          for(const id of ['kickToolToggle','bankToolToggle','teachingCompassToggle'])assert(await page.locator('#'+id).evaluate(e=>!!e.closest('#featureAimingOptions')),id+' belongs to aiming options');
          const feel=page.locator('#tableSpeed1Feel'),lag=page.locator('#tableSpeed1Lag');assert.match(await feel.innerText(),/\d+\.\d ♦/);
          assert.equal(await lag.innerText(),(await page.locator('#powerFeelText').innerText()).split(' · ')[1]);const previous=await lag.innerText();
          await page.locator('#tableSpeed1').evaluate(e=>{e.value='.25';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.notEqual(await lag.innerText(),previous,'Lag updates with speed');
          for(const [id,start,end] of [['bottomFollow1','Draw','Follow'],['bottomSide1','Left spin','Right spin']]){
            const caption=page.locator('#'+id).locator('..').locator('.phoneSpinCaption');assert.equal(await caption.getAttribute('data-start'),start);assert.equal(await caption.getAttribute('data-end'),end);
            assert.match(await caption.textContent(),/^[+−-]?\d+%$/);
          }
        });
        // The current layout contract uses visibility, hit targets and clearance, not historic colors or coordinates.
        await phase('layout','workspace clearance and stable mode switch',async()=>{
          await fixture();await ensure3D();await page.evaluate(()=>billiardsSelectShot(1));await frames();
          const table=await reachable('#stageWrap'),aim=await reachable('#phoneAimRail'),speed=await reachable('#phoneSpeedRail');
          const spin=await page.locator('#bottomSpin1').boundingBox(),shoot=await reachable('[data-trainer-action=animate]');
          assert(aim.x+aim.width<=table.x+1&&speed.x>=table.x+table.width-1,'Aim is left of the table and Speed is right');
          assert(aim.width>=44&&speed.width>=44,'Side controls retain touch-sized hit areas');
          assert(!overlaps(table,spin)&&!overlaps(table,shoot),'Table clears the bottom controls');assert(!overlaps(spin,shoot),'Shoot clears spin');
          assert(shoot.height>=2*spin.height-2,'Shoot spans both lower rows');
          const tip=await reachable('#phoneTip1');assert(tip.width>=56,'Cue-tip target stays large');
          for(const id of ['bottomFollow1','bottomSide1'])assert(!overlaps(tip,await page.locator('#'+id).boundingBox()),'Tip clears '+id);
          const mode=await reachable('#table3DToggle'),experience=await reachable('#btZenLauncher .experience-toggle');
          assert(mode.x>=experience.x+experience.width&&mode.x-experience.x-experience.width<=8,'Mode directly follows Experiences');assert(Math.abs(mode.y-experience.y)<=1);
          for(const selector of ['#phoneControls','[data-trainer-action=undoShot]','[data-trainer-action=redoShot]','#appCloseControl','#table3DLock','#table3DPan','#table3DRotate','#table3DZoomSlider','#table3DZoomIn','#table3DZoomOut']){
            const box=await reachable(selector);assert(!overlaps(box,shoot),selector+' clears Shoot');
            assert(box.x>=0&&box.y>=0&&box.x+box.width<=options.viewport.width+1&&box.y+box.height<=options.viewport.height+1,selector+' stays in the viewport');
          }
          for(const label of await page.locator('#table3DViews>button:not(#table3DLock),.table3DAdjustmentLabel').evaluateAll(es=>es.map(e=>({text:e.textContent,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight})))){
            assert(label.scrollWidth<=label.width+1&&label.scrollHeight<=label.height+1,'View label fits: '+JSON.stringify(label));
          }
          await page.screenshot({path:`${output}/${name}-3d.png`});const before=await state();
          await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);await dismiss();
          assert.equal(await page.locator('#table3DToggle').textContent(),'3D Mode');assert.equal(await page.locator('#table3DToggle').getAttribute('aria-pressed'),'false');
          assert.deepEqual(await page.locator('#table3DToggle').boundingBox(),mode,'Mode switch retains its position on return to 2D');
          assert.deepEqual(await state(),before,'Return to 2D preserves both shots and settings');
          await page.screenshot({path:`${output}/${name}-2d.png`});
        });
        await phase('runtime','no page errors',async()=>assert.deepEqual(errors,[]));
      } catch(error) {
        results.push({viewport:name,kind:'startup',label:'load workspace',status:'failed',error:error.stack});
        await page.screenshot({path:`${output}/${name}-startup-failed.png`}).catch(()=>{});
      } finally {await context.close();fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2)+'\n');}
    }
    const failures=results.filter(r=>r.status==='failed');
    assert.deepEqual(failures,[],JSON.stringify(failures,null,2));
    console.log(`${results.length} phases passed across ${specs.length} viewports. Behavior and layout are reported separately.`);
  } finally {await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
