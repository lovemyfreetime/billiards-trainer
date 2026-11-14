const assert = require('node:assert/strict');
const cp = require('node:child_process');
const {chromium} = require('playwright');
const server = cp.spawn(process.execPath, ['tests/range-server.cjs', '8831']);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  await new Promise(resolve => server.stdout.once('data', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context = await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
  const errors = [];
  try {
    await context.addInitScript(() => {
      window.__pad = {id:'Sony DualShock 4 test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17}, () => ({value:0,pressed:false}))};
      window.__connected = true;
      Object.defineProperty(navigator, 'getGamepads', {value:() => window.__connected ? [window.__pad] : []});
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    const state = () => page.evaluate(() => billiardsTourBridge.capture().state);
    const axes = values => page.evaluate(values => {window.__pad.axes = values;}, values);
    const setButton = (i, value) => page.evaluate(({i,value}) => {window.__pad.buttons[i] = {value,pressed:value > .5};}, {i,value});
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const button = async i => {await setButton(i, 1); await frames(); await setButton(i, 0); await frames();};
    const neutral = async () => {await axes([0,0,0,0]); await page.evaluate(() => __pad.buttons.forEach(b => {b.value=0;b.pressed=false;})); await page.waitForFunction(() => BilliardsController.status().armed);};
    const apply = () => page.evaluate(() => billiardsTourBridge.apply({id:'controller-test',balls:[[0,.25,.5],[1,.65,.5],[2,.8,.75]],target:1,pocket:[1,1],speed:1,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
    await page.goto('http://127.0.0.1:8831/?train=1');
    await page.waitForFunction(() => window.BilliardsController && window.billiardsTourBridge);
    await apply();
    assert.equal(await page.evaluate(() => BilliardsController.enabled), false, 'Mode is optional and initially off');
    await axes([1,-1,1,-1]); await sleep(150); const untouched = await state();
    await axes([0,0,0,0]); assert.equal(untouched.follow, 0);
    await page.locator('#workspace-view summary').click(); await page.locator('#trainerControllerSetup').click();
    await page.locator('#trainerControllerEnabled').check(); await sleep(130);
    assert.match(await page.locator('#trainerControllerRaw').textContent(), /standard/);
    await page.screenshot({path:'/tmp/trainer-controller-desktop.png'});
    const beforeTest = await state(); await axes([1,-1,1,-1]); await button(7);
    assert.deepEqual(await state(), beforeTest, 'Input test never moves or shoots the table');
    await axes([0,0,0,0]); await page.locator('#trainerControllerClose').click(); await neutral();
    const before = await state(); await axes([.04,-.04,.04,-.04]); await sleep(150); await axes([0,0,0,0]);
    assert.deepEqual(await state(), before, 'Stick drift inside dead zone is ignored');
    await axes([1,-1,1,-1]); await sleep(230); await axes([0,0,0,0]); await sleep(100);
    const changed = await state(); assert.notDeepEqual(changed.freeAim,before.freeAim); assert(changed.speed > before.speed); assert(changed.sideSpin > 0); assert(changed.follow > 0);
    console.log('PASS: optional mode, live diagnostics, dead zone and all four axes');
    await button(5); assert.equal((await state()).shot2Enabled, false, 'R1 never creates Shot 2');
    await page.evaluate(() => document.getElementById('toggleShot2').click()); await neutral(); await button(5);
    assert.equal((await state()).activeShot,2); const secondBefore = await state();
    await axes([1,-1,1,-1]); await sleep(200); await axes([0,0,0,0]); await sleep(100);
    const secondAfter = await state(); assert.equal(secondAfter.speed, secondBefore.speed); assert.equal(secondAfter.follow, secondBefore.follow); assert.notDeepEqual(secondAfter.shot2.freeAim,secondBefore.shot2.freeAim); assert(secondAfter.shot2.speed > secondBefore.shot2.speed);
    await button(4); assert.equal((await state()).activeShot,1);
    const fineBefore = await state(); await button(15); assert.notDeepEqual((await state()).freeAim,fineBefore.freeAim); await button(12); assert((await state()).speed > fineBefore.speed);
    console.log('PASS: Shot 1/2 selection, isolated second-shot values and fine controls');
    await page.evaluate(() => {window.__shootOriginal=billiardsControllerControls.shoot; window.__shoots=0; billiardsControllerControls.shoot=()=>{window.__shoots++;return true;};});
    await setButton(7,.7); await sleep(100); assert.equal(await page.evaluate(() => __shoots),0);
    await setButton(7,.9); await sleep(100); await setButton(7,.75); await sleep(80); await setButton(7,.95); await sleep(160);
    assert.equal(await page.evaluate(() => __shoots),1,'Trigger threshold jitter does not fire again');
    await setButton(7,.1); await sleep(70); await setButton(7,.95); await sleep(80); assert.equal(await page.evaluate(() => __shoots),2); await setButton(7,0);
    await button(9); assert(await page.locator('#trainerControllerDialog').isVisible());
    await setButton(7,1); await page.locator('#trainerControllerClose').click(); await sleep(150);
    assert.equal(await page.evaluate(() => __shoots),2,'Held trigger cannot fire on panel close');
    await setButton(7,0); await neutral();
    await page.evaluate(() => {window.__connected=false;dispatchEvent(new Event('gamepaddisconnected'));}); await sleep(100); await setButton(7,1);
    await page.evaluate(() => {window.__connected=true;dispatchEvent(new Event('gamepadconnected'));}); await sleep(150); assert.equal(await page.evaluate(() => __shoots),2,'Reconnect requires neutral');
    await setButton(7,0); await neutral();
    await page.evaluate(() => dispatchEvent(new Event('blur'))); await setButton(7,1); await page.evaluate(() => dispatchEvent(new Event('focus'))); await sleep(150); assert.equal(await page.evaluate(() => __shoots),2,'Focus return requires neutral');
    await setButton(7,0); await neutral();
    await page.locator('#workspace-view summary').click(); await button(7); assert.equal(await page.evaluate(() => __shoots),2,'Open menu suppresses actions'); await page.keyboard.press('Escape'); await neutral();
    console.log('PASS: one-shot trigger, threshold jitter, panel, focus and disconnect interlocks');
    await page.evaluate(() => billiardsControllerControls.shoot=window.__shootOriginal); await apply(); await neutral();
    await setButton(7,1);
    try { await page.waitForFunction(() => billiardsTourBridge.snapshot().busy, null, {timeout:10000}); }
    finally { await setButton(7,0); }
    await page.waitForFunction(() => !billiardsTourBridge.snapshot().busy, null, {timeout:45000});
    const executed = await state(); await neutral(); await setButton(2,1);
    try { await page.waitForFunction(want => JSON.stringify(billiardsTourBridge.capture().state.balls) !== want, JSON.stringify(executed.balls), {timeout:10000}); }
    finally { await setButton(2,0); }
    assert.notDeepEqual((await state()).balls,executed.balls,'Square uses actual Undo Last Shot');
    await neutral();
    await page.evaluate(() => {window.__redoCalls=0;const redo=billiardsControllerControls.redo;billiardsControllerControls.redo=()=>{window.__redoCalls++;return redo();};});
    console.log('Redo before:',await page.evaluate(()=>({controller:BilliardsController.status(),history:billiardsZenControls.status(),focus:document.activeElement?.id,enabled:!document.getElementById('redoShot').disabled})));
    await setButton(1,1);
    try { await page.waitForFunction(() => window.__redoCalls > 0, null, {timeout:10000}); }
    finally { await setButton(1,0); }
    await page.waitForFunction(() => !billiardsTourBridge.snapshot().busy, null, {timeout:45000});
    console.log('Redo after:',await page.evaluate(()=>({controller:BilliardsController.status(),history:billiardsZenControls.status(),calls:window.__redoCalls,enabled:!document.getElementById('redoShot').disabled})));
    assert.deepEqual((await state()).balls,executed.balls,'Circle restores actual shot result');
    console.log('PASS: real Shoot, Undo and Redo use existing physics/history');
    await apply(); await neutral(); await button(3); await page.waitForFunction(() => Billiards3D.active); await neutral();
    const cameraBefore = await page.evaluate(() => Billiards3D.camera()), shotBeforeCamera = await state();
    await setButton(6,1); await axes([1,.5,.5,.5]);
    try { await page.waitForFunction(want => Billiards3D.camera().azimuth !== want, cameraBefore.azimuth, {timeout:10000}); }
    catch (error) { console.log('Camera input diagnostic:',await page.evaluate(()=>({controller:BilliardsController.status(),body:document.body.className,focus:document.activeElement?.id,hasFocus:document.hasFocus(),shot:billiardsControllerControls.state(),camera:Billiards3D.camera(),pad:window.__pad}))); throw error; }
    await axes([0,0,0,0]); const radiusBeforeZoom=await page.evaluate(()=>Billiards3D.camera().radius); await setButton(12,1);
    try { await page.waitForFunction(want => Billiards3D.camera().radius !== want, radiusBeforeZoom, {timeout:10000}); }
    finally { await setButton(12,0); await setButton(6,0); await frames(); }
    const cameraAfter = await page.evaluate(() => Billiards3D.camera()); assert.notEqual(cameraAfter.azimuth,cameraBefore.azimuth); assert.notDeepEqual(cameraAfter.target,cameraBefore.target); assert.notEqual(cameraAfter.radius,cameraBefore.radius); assert.deepEqual(await state(),shotBeforeCamera,'Camera mode preserves the shot');
    await button(11); const full = await page.evaluate(() => Billiards3D.camera()); assert.equal(full.azimuth,0);
    await button(3); await page.waitForFunction(() => !Billiards3D.active); await neutral(); await button(10); assert(await page.evaluate(() => BilliardsController.status().pointerMode));
    await axes([1,0,0,0]); await sleep(160); await axes([0,0,0,0]); assert(await page.locator('#trainerControllerCursor').isVisible());
    await button(10); assert.equal(await page.evaluate(() => BilliardsController.status().pointerMode),false);
    console.log('PASS: 3D orbit/pan/zoom, reset, return to 2D and positioning cursor');
    await page.evaluate(() => BilliardsController.open());
    await page.getByLabel('Button 2 action',{exact:true}).selectOption('shot2'); await page.getByLabel('Reverse English',{exact:true}).check();
    await page.screenshot({path:'/tmp/trainer-controller-desktop.png'});
    await page.locator('#trainerControllerClose').click(); await neutral();
    await page.reload(); await page.waitForFunction(() => BilliardsController?.enabled); await neutral(); await page.evaluate(() => BilliardsController.open());
    assert.equal(await page.getByLabel('Button 2 action',{exact:true}).inputValue(),'shot2'); assert(await page.getByLabel('Reverse English',{exact:true}).isChecked());
    await page.locator('#trainerControllerReset').click(); assert.equal(await page.getByLabel('Button 2 action',{exact:true}).inputValue(),'undo');
    await page.locator('#trainerControllerClose').click(); await neutral();
    const keyboardBefore = await state(); await page.keyboard.press('ArrowRight'); assert.notDeepEqual((await state()).freeAim,keyboardBefore.freeAim,'Physical keyboard shortcuts still work');
    console.log('PASS: remapping, inverse axes, saved profiles and keyboard parity');
    assert.deepEqual(errors,[]);
    const phone = await browser.newContext({viewport:{width:740,height:360},hasTouch:true,isMobile:true,serviceWorkers:'block'});
    await phone.addInitScript(() => {
      window.__hostEnabled=false;
      window.BilliardsAndroid={controllerInputVersion:()=>1,setControllerEnabled:value=>{window.__hostEnabled=value;}};
    });
    const mobile = await phone.newPage(); mobile.on('pageerror', e => errors.push(e.message));
    await mobile.goto('http://127.0.0.1:8831/?train=1'); await mobile.waitForFunction(() => window.BilliardsController); await mobile.evaluate(() => BilliardsController.open()); await mobile.locator('#trainerControllerEnabled').check();
    await mobile.evaluate(() => dispatchEvent(new CustomEvent('billiards:controller-state',{detail:[{id:'Wireless Controller (1356:2508)',index:7,mapping:'standard',ready:true,axes:[0,0,0,0],buttons:Array(17).fill(0)}]})));
    await mobile.waitForFunction(() => BilliardsController.status().source === 'android'); assert(await mobile.evaluate(() => __hostEnabled));
    const box = await mobile.locator('#trainerControllerDialog').boundingBox(); assert(box.x >= 0 && box.y >= 0 && box.x+box.width <= 741 && box.y+box.height <= 361);
    await mobile.screenshot({path:'/tmp/trainer-controller-phone.png'});
    await mobile.locator('#trainerControllerClose').click(); await mobile.waitForFunction(() => BilliardsController.status().armed);
    const phoneBefore = await mobile.evaluate(() => billiardsTourBridge.capture().state.freeAim);
    await mobile.evaluate(() => dispatchEvent(new CustomEvent('billiards:controller-state',{detail:[{id:'Wireless Controller (1356:2508)',index:7,mapping:'standard',ready:true,axes:[1,0,0,0],buttons:Array(17).fill(0)}]}))); await sleep(180);
    assert.notDeepEqual(await mobile.evaluate(() => billiardsTourBridge.capture().state.freeAim),phoneBefore);
    await mobile.evaluate(() => dispatchEvent(new CustomEvent('billiards:controller-state',{detail:[]}))); await sleep(90); assert.equal(await mobile.evaluate(() => BilliardsController.status().connected),false);
    await phone.close(); assert.deepEqual(errors,[]);
    console.log('PASS: Android event bridge selection, phone layout, input and disconnect');
  } finally { await context.close(); await browser.close(); server.kill(); }
})().catch(e => {console.error(e); server.kill(); process.exitCode=1;});
