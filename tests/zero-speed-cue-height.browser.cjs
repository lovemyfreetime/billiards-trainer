const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const server = spawn(process.execPath, ['tests/range-server.cjs', '8894']);
  let browser;
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    browser = await chromium.launch({args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport:{width:1024,height:640}, hasTouch:true, isMobile:true, deviceScaleFactor:1, serviceWorkers:'block'});
    await context.addInitScript(() => {
      window.BilliardsWindowsHostAvailable = window.BilliardsWindowsFullscreen = true;
      window.chrome = {webview:{postMessage(){}}};
      if (!localStorage.getItem('trainer.playerView.v1')) localStorage.setItem('trainer.playerView.v1',JSON.stringify({height:.21,locked:true}));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8894/?train=1');
    await page.waitForFunction(() => window.billiardsMenuReady && window.billiardsCueView);
    const setValue = (id, value, type) => page.locator('#'+id).evaluate((e, [v,t]) => {
      e.value = String(v); e.dispatchEvent(new Event(t,{bubbles:true}));
    },[value,type]);
    const speed = () => page.evaluate(() => billiardsTourBridge.snapshot().speed);
    const shot = page.locator('#phoneActions>[data-trainer-action=animate]');
    await setValue('speedNumber', .02, 'change');
    const touch = await context.newCDPSession(page);
    const box = await page.locator('#tableSpeed1').boundingBox();
    const p = {x:box.x+box.width/2, y:box.y+box.height*.4};
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y+30}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await speed(),0);
    for (const in3D of [false,true]) {
      if (in3D) {
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(() => Billiards3D.active && Billiards3D.cueModel()?.referenceReady);
      }
      assert.equal(await page.locator('#speedNumber').inputValue(),'0.00');
      assert.equal(await page.locator('#tableSpeed1Feel').textContent(),'0.0 ♦');
      assert.equal(await page.locator('#tableSpeed1Lag').textContent(),'0.00 lag');
      const before = await page.evaluate(() => billiardsTourBridge.capture());
      await shot.click();
      assert.equal(await page.evaluate(() => billiardsPlayback.state().running),false);
      assert.deepEqual(await page.evaluate(() => billiardsTourBridge.capture()),before);
      assert.deepEqual(await page.evaluate(() => billiardsTourBridge.predict({paths:true}).paths),{});
    }
    await page.locator('#tableSpeed1Label').tap();
    assert.equal(await speed(),.01);
    assert.equal(await page.evaluate(() => billiardsTourBridge.predict().cueImpact != null),true);
    await page.locator('#tableSpeed1Readout').tap();
    assert.equal(await speed(),0);
    await page.locator('#toggleShot2').evaluate(e=>e.click());
    await setValue('speed2Number', .01, 'change');
    await page.evaluate(()=>billiardsStepTableSlider('tableSpeed2',-1));
    assert.equal(await page.locator('#speed2Number').inputValue(),'0.00');
    assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.shot2.speed),0);
    assert.equal(await page.locator('#tableSpeed2Lag').textContent(),'0.00 lag');
    await page.locator('#toggleShot2').evaluate(e=>e.click());

    const eye = page.locator('#playerEyeHeightValue');
    const camera = () => page.evaluate(()=>Billiards3D.camera());
    await page.locator('#table3DCueView').click();
    assert.equal((await camera()).playerEyeHeight,.21);
    assert.equal(await eye.textContent(),'8.3 in');
    for (const [preset,height,text] of [['Low',.12,'4.7 in'],['Raised',.28,'11.0 in']]) {
      await page.locator('#playerView'+preset).evaluate(e=>e.click());
      assert.equal((await camera()).playerEyeHeight,height);
      assert.equal(await eye.textContent(),text);
    }
    const elevation = [];
    for (const inches of [2.5,18]) {
      await setValue('playerEyeHeight', inches, 'input');
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const pose = await camera();
      assert.equal(pose.playerEyeHeight,inches*.0254);
      assert.equal(await eye.textContent(),inches.toFixed(1)+' in');
      elevation.push(pose.elevation);
    }
    assert(elevation[1]>elevation[0]);
    await page.reload();
    await page.waitForFunction(()=>window.billiardsCueView && window.billiardsMenuReady);
    assert.equal(await eye.textContent(),'18.0 in');
    assert.equal(await speed(),0);
    assert.deepEqual(errors,[]);
    console.log('Touch rail reaches zero in 2D. Both modes show zero distance and lag, Shoot preserves the layout and history, +0.01 restores a stroke, and both shot controls retain zero.');
    console.log('Existing 21 cm height, Low, Raised, 2.5 and 18 inch camera endpoints, and reload persistence passed.');
  } finally {
    await browser?.close(); server.kill();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
