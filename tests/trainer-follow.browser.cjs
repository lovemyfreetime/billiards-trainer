const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const server = spawn(process.execPath, ['tests/range-server.cjs', '8831']);
  let browser;
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
      args:['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']});
    const context = await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const shot = () => page.evaluate(() => billiardsTourBridge.capture().state);
    const camera = () => page.evaluate(() => Billiards3D.camera());
    const playback = () => page.evaluate(() => billiardsPlayback.state());
    const menu = key => page.locator('#workspace-'+key);
    async function choose(key, selector) {
      const details = menu(key);
      if(!await details.evaluate(el=>el.open)) await details.locator('summary').click();
      await details.locator(selector).click();
    }
    async function follow(side) {
      await choose('follow','[data-view="'+side+'"]');
      await page.waitForFunction(side=>Billiards3D.active && document.querySelector('#workspace-follow [data-view][aria-pressed=true]')?.dataset.view===side,side);
    }
    const motion = speed => choose('motion','[data-speed="'+speed+'"]');
    const shoot = page.locator('#phoneActions [data-trainer-action=animate]');
    fs.mkdirSync('test-results/workspace',{recursive:true});
    const screenshot = name => page.screenshot({path:'test-results/workspace/follow-'+name+'.png'});
    await page.goto('http://localhost:8831/?train=1');
    await page.waitForFunction(()=>window.BilliardsSpinLabUI && window.billiardsTourBridge);
    await page.evaluate(() => {
      billiardsTourBridge.apply({id:'follow',title:'Follow',balls:[[0,.25,.5],[1,.65,.5]],target:1,
        pocket:[1,1],speed:2.5,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27});
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text,x,y,...args) {
        if(this.canvas.parentElement?.closest('#stageWrap') && /^(Cue Ball [12]|Cut angle )/.test(text))
          window.labelCalls.push({text,x,y,alpha:this.globalAlpha,font:this.font});
        return original.call(this,text,x,y,...args);
      };
      window.captureLabels = () => {
        window.labelCalls=[];billiardsTourBridge.restore(billiardsTourBridge.capture());return window.labelCalls;
      };
      window.labelCalls=[];
    });
    assert.equal((await playback()).speed,1);
    assert.equal(await menu('follow').locator('[data-view][aria-pressed=true]').textContent(),'Behind');
    assert(!(await page.evaluate(()=>captureLabels())).some(c=>c.text.startsWith('Cue Ball')));
    await page.evaluate(()=>document.getElementById('toggleShot2').click());
    await page.evaluate(()=>billiardsTrainingBall.set('spots'));
    const labels = await page.evaluate(()=>captureLabels());
    const first = labels.find(c=>c.text==='Cue Ball 1'), second=labels.find(c=>c.text==='Cue Ball 2');
    assert(first && second && (first.x!==second.x || first.y!==second.y),'Both cues have separate cloth labels');
    assert.equal(first.alpha,.64);assert.equal(first.font,second.font);
    const overlap=labels.find(c=>c.text.startsWith('Cut angle '));if(overlap)assert.equal(first.font,overlap.font);
    await screenshot('dual-cue');
    await page.evaluate(()=>document.getElementById('toggleShot2').click());
    assert(!(await page.evaluate(()=>captureLabels())).some(c=>c.text.startsWith('Cue Ball')));
    await menu('view').locator('summary').click();const boxes=await Promise.all(['workspaceFit','tableZoom','btg-fullscreen'].map(id=>page.locator('#'+id).boundingBox()));
    assert(boxes.every((b,i)=>b&&(!i||b.y>=boxes[i-1].y+boxes[i-1].height-1)));await page.keyboard.press('Escape');

    const followSwitch=menu('follow').locator('#followMode');
    async function switchFollow(on){
      if((await followSwitch.getAttribute('aria-checked'))!==String(on))await choose('follow','#followMode');
      await page.waitForFunction(on=>document.getElementById('followMode').getAttribute('aria-checked')===String(on),on);
    }
    async function stopShot(){
      await shoot.tap();await page.waitForFunction(()=>billiardsPlayback.state().running);
      await shoot.tap();await page.waitForFunction(()=>!billiardsPlayback.state().running);
    }
    assert.equal(await followSwitch.getAttribute('aria-checked'),'false');
    assert(await menu('follow').locator('[data-view=left]').isDisabled());
    await stopShot();assert(!await page.evaluate(()=>Billiards3D.active),'Off keeps 2D overhead');
    await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);
    const normalView=await camera();
    await stopShot();assert.deepEqual(await camera(),normalView,'Off preserves the regular 3D camera');
    await page.locator('#table3DToggle').click();
    await switchFollow(true);await page.waitForFunction(()=>Billiards3D.active && Billiards3D.camera().followCue);
    const before=(await shot()).balls;
    let closeRadius;
    for(const distance of ['close','wide']){
      await choose('follow','[data-distance="'+distance+'"]');
      assert(await menu('follow').evaluate(el=>el.open),'Distance stays open to choose a direction');
      for(const side of ['front','left','right','behind']){
        await follow(side);
        const c=await camera();assert(c.followCue);assert.equal(c.followSide,side);assert.equal(c.followDistance,distance);
        if(distance==='close')closeRadius=c.radius;else assert(c.radius>closeRadius*2,'Wide shows more table');
      }
    }
    await page.locator('#table3DLock [data-adjust=edit]').click();
    const touch=await context.newCDPSession(page);
    for(const side of ['front','behind','left','right']){
      await follow(side);
      const original=await camera();
      const priorAim=(await shot()).freeAim;
      const drag=await page.evaluate(()=>{
        const cb=billiardsTourBridge.capture().state.balls.find(b=>b.id===0);
        return [.09,.13,.17].map(dx=>Billiards3D.project({x:cb.x+dx,y:cb.y+.10}));
      });
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:drag[0].x,y:drag[0].y}]});
      for(const {x,y} of drag.slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      assert.notDeepEqual((await shot()).freeAim,priorAim,'Cloth edit changes aim for '+side);
      assert.deepEqual(await camera(),original,'Cloth edit keeps the camera steady for '+side);
    }
    await motion('0.125');await shoot.tap();
    await page.waitForFunction(()=>billiardsPlayback.state().running&&billiardsPlayback.state().time>0);
    assert.equal(await shoot.textContent(),'Stop');
    await page.locator('#table3DCanvas').tap();await page.waitForFunction(()=>!billiardsPlayback.state().running);
    assert.deepEqual((await shot()).balls,before);assert.equal((await playback()).speed,1);
    assert.equal(await followSwitch.getAttribute('aria-checked'),'false');
    await switchFollow(true);await motion('0.25');await choose('motion','#motionLock');await choose('follow','[data-distance=wide]');await follow('left');await choose('follow','#followLock');
    await page.keyboard.press('Escape');await shoot.click();await page.waitForFunction(()=>billiardsPlayback.state().running);
    await shoot.click();assert.equal((await playback()).speed,.25);assert.deepEqual((await shot()).balls,before);
    async function assertWideLeft(){
      const c=await camera();assert(c.followCue);assert.equal(c.followSide,'left');assert.equal(c.followDistance,'wide');assert(c.radius>closeRadius*2);
    }
    await assertWideLeft();
    await switchFollow(false);await page.keyboard.press('Escape');
    assert.equal((await camera()).followCue,false);
    await stopShot();assert.equal((await camera()).followCue,false,'Lock cannot reactivate an Off mode');
    await switchFollow(true);await page.keyboard.press('Escape');await assertWideLeft();
    await motion('1');await shoot.tap();
    await page.waitForFunction(()=>billiardsPlayback.state().running);
    await page.waitForFunction(()=>!billiardsPlayback.state().running,null,{timeout:45000});
    await assertWideLeft();
    await motion('0.25');
    await page.reload();await page.waitForFunction(()=>window.BilliardsSpinLabUI);
    assert.equal((await playback()).speed,.25);assert.equal(await menu('follow').locator('[data-view][aria-pressed=true]').textContent(),'Left');
    if(!await page.evaluate(()=>Billiards3D.active))await page.locator('#table3DToggle').click();
    await page.waitForFunction(()=>Billiards3D.active && Billiards3D.camera().followCue);
    await assertWideLeft();
    await follow('right');await choose('follow','#followLock');await motion('1');await choose('motion','#motionLock');await page.keyboard.press('Escape');
    if(await page.evaluate(()=>Billiards3D.active))await page.locator('#table3DToggle').click();
    // The actual Play button must arm the default/selected camera even when launched in 2D.
    await page.evaluate(()=>document.getElementById('trainerShowPlayback').click());
    await page.locator('#trainerPlaybackCloseup').tap();
    await page.waitForFunction(()=>Billiards3D.active && Billiards3D.camera().followCue && Billiards3D.camera().followDistance==='close');
    await page.locator('#trainerPlaybackWide').tap();
    assert.equal((await camera()).followDistance,'wide');
    for(const side of ['front','behind','left','right']){
      await page.locator('#trainerPlaybackBar [data-follow-side="'+side+'"]').check();
      await page.waitForFunction(side=>Billiards3D.camera().followCue && Billiards3D.camera().followSide===side,side);
    }
    await page.locator('#table3DToggle').click();
    await page.locator('#trainerPlaybackPause').tap();
    await page.waitForFunction(()=>Billiards3D.active&&billiardsPlayback.state().running);
    assert.equal((await camera()).followSide,'right');
    await page.waitForFunction(()=>!billiardsPlayback.state().running,null,{timeout:45000});
    assert.equal(await menu('follow').locator('[data-view][aria-pressed=true]').textContent(),'Behind');
    await page.locator('#trainerPlaybackHide').click();
    assert.equal(await followSwitch.getAttribute('aria-checked'),'false');
    await page.evaluate(()=>{
      const cb=billiardsTourBridge.capture();
      cb.state.speed=.65;cb.state.airbornePhysics=false;cb.state.jumpModeLocked=false;
      billiardsTourBridge.restore(cb);
    });
    async function jumpPanel(open){
      if(await page.locator('body').evaluate(b=>b.classList.contains('phone-controls-open'))!==open)
        await page.locator('#phoneControls').click();
      if(open){
        const group=page.locator('.section').filter({has:page.locator('#jumpModeLock')});
        if(!await group.evaluate(el=>el.classList.contains('open')))await group.locator('.sectionToggle').click();
      }
    }
    async function finishShot(){
      await shoot.tap();await page.waitForFunction(()=>billiardsPlayback.state().running);
      await page.waitForFunction(()=>!billiardsPlayback.state().running,null,{timeout:45000});
    }
    await jumpPanel(true);
    assert(!await page.locator('#jumpModeLock').isChecked());
    await page.locator('#jumpMasseFeatures').click();
    await page.locator('#cueElevation').focus();await page.locator('#cueElevation').press('ArrowRight');
    await jumpPanel(false);
    await stopShot();
    assert((await shot()).airbornePhysics,'An interrupted jump is still set up to retry');
    await finishShot();let after=await shot();
    assert(!after.airbornePhysics);assert.equal(after.cueElevationDeg,3);
    await jumpPanel(true);await page.locator('#jumpMasseFeatures').click();await page.locator('#jumpModeLock').check();
    await page.locator('#cueElevation').focus();await page.locator('#cueElevation').press('ArrowRight');
    const elevation=(await shot()).cueElevationDeg;assert(elevation>3,'Test a raised cue');
    await jumpPanel(false);await finishShot();after=await shot();
    assert(after.airbornePhysics && after.jumpModeLocked);assert.equal(after.cueElevationDeg,elevation);
    await jumpPanel(true);await page.locator('#jumpModeLock').uncheck();await jumpPanel(false);
    await finishShot();assert(!(await shot()).airbornePhysics,'Releasing the lock makes the next shot one-shot again');
    console.log('Follow switch defaults Off, restores manual 3D, honors saved pairs, and Jump/Massé lock and elevation last exactly as selected.');
    for(const width of [740,390,360]){
      await page.setViewportSize({width,height:width===740?390:820});
      const followSummary=menu('follow').locator('summary');
      const f=await followSummary.boundingBox();
      const u=await page.locator('#phoneActions [data-trainer-action=undoShot]').boundingBox();
      assert(f.x+f.width<=u.x || f.y+f.height<=u.y || u.y+u.height<=f.y,'Follow View clears Undo at '+width);
      await followSummary.click();await screenshot(String(width));
      const items=menu('follow').locator('button,.playbackLock');
      for(const item of await items.all()){
        await item.scrollIntoViewIfNeeded();
        assert(await item.evaluate(el=>{
          const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
        }),'Visible follow menu target at '+width);
      }await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors,[]);console.log('Matching cue labels, View stack, 2D camera handoff, eight follow combinations, stable touch aim, locked camera on finish and stop, cloth tap, Stop, natural finish and both persistent locks passed.');
  } finally { await browser?.close(); server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1});
