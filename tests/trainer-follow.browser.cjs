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
    const follow = side => choose('follow','[data-view="'+side+'"]');
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
    assert.equal(await menu('follow').locator('[aria-pressed=true]').textContent(),'Behind');
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

    const before=(await shot()).balls;
    await follow('close');await page.waitForFunction(()=>Billiards3D.active && !document.getElementById('workspace-follow').open);assert.equal((await camera()).followCue,false);
    for(const side of ['front','left','right','behind']){
      await follow(side);await page.waitForFunction(side=>Billiards3D.camera().followSide===side,side);
      assert((await camera()).followCue);
    }
    await motion('0.125');await shoot.tap();
    await page.waitForFunction(()=>billiardsPlayback.state().running&&billiardsPlayback.state().time>0);
    assert.equal(await shoot.textContent(),'Stop');
    await page.locator('#table3DCanvas').tap();await page.waitForFunction(()=>!billiardsPlayback.state().running);
    assert.deepEqual((await shot()).balls,before);assert.equal((await playback()).speed,1);
    await motion('0.25');await choose('motion','#motionLock');await follow('left');await choose('follow','#followLock');
    await page.keyboard.press('Escape');await shoot.click();await page.waitForFunction(()=>billiardsPlayback.state().running);
    await shoot.click();assert.equal((await playback()).speed,.25);assert.deepEqual((await shot()).balls,before);
    await page.reload();await page.waitForFunction(()=>window.BilliardsSpinLabUI);
    assert.equal((await playback()).speed,.25);assert.equal(await menu('follow').locator('button[aria-pressed=true]').textContent(),'Left');
    await follow('right');await choose('follow','#followLock');await motion('1');await choose('motion','#motionLock');await page.keyboard.press('Escape');
    if(await page.evaluate(()=>Billiards3D.active))await page.locator('#table3DToggle').click();
    // The actual Play button must arm the default/selected camera even when launched in 2D.
    await page.evaluate(()=>document.getElementById('trainerShowPlayback').click());
    await page.locator('#trainerPlaybackCloseup').tap();
    await page.waitForFunction(()=>Billiards3D.active && !Billiards3D.camera().followCue);
    for(const side of ['front','behind','left','right']){
      await page.locator('#trainerPlaybackBar [data-follow-side="'+side+'"]').check();
      await page.waitForFunction(side=>Billiards3D.camera().followCue && Billiards3D.camera().followSide===side,side);
    }
    await page.locator('#table3DToggle').click();
    await page.locator('#trainerPlaybackPause').tap();
    await page.waitForFunction(()=>Billiards3D.active&&billiardsPlayback.state().running);
    assert.equal((await camera()).followSide,'right');
    await page.waitForFunction(()=>!billiardsPlayback.state().running,null,{timeout:45000});
    assert.equal(await menu('follow').locator('button[aria-pressed=true]').textContent(),'Behind');
    await page.locator('#trainerPlaybackHide').click();
    for(const width of [740,390,360]){
      await page.setViewportSize({width,height:width===740?390:820});
      await menu('follow').locator('summary').click();await screenshot(String(width));
      const target=menu('follow').locator('[data-view=behind]');assert(await target.evaluate(el=>{
        const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      }));await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors,[]);console.log('Matching cue labels, View stack, 2D camera handoff, five views, cloth tap, Stop, natural finish and both persistent locks passed.');
  } finally { await browser?.close(); server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1});
