const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
 const server = cp.spawn(process.execPath, ['tests/range-server.cjs', '8797']);
 await new Promise(resolve => server.stdout.once('data', resolve));
 let browser;
 try {
  browser = await chromium.launch({
   headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
   args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
  });
  for (const touch of [false, true]) {
   const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, hasTouch: touch, serviceWorkers: 'block' });
   await context.addInitScript(() => {
    window.BilliardsWindowsHostAvailable = true;
    window.BilliardsWindowsFullscreen = true;
    window.chrome = { webview: { postMessage() {} } };
   });
   const page = await context.newPage();
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.goto('http://127.0.0.1:8797/?train=1');
   await page.waitForFunction(() => window.billiardsTourBridge && document.querySelector('#trainerAnnotateLock'));
   await page.evaluate(() => billiardsTourBridge.apply({
    id: 'annotation-test', title: 'Annotation lesson', balls: [[0, .25, .5], [1, .65, .5]],
    target: 1, pocket: [1, 1], speed: .3, followPercent: 0, sidePercent: 0
   }, { tableL: 2.54, tableW: 1.27 }));
   const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const state = () => page.evaluate(() => billiardsTourBridge.capture().state);
   const annotationCount = async () => (await state()).annotations?.items.length || 0;
   const ink = () => page.locator('#trainerAnnotationCanvas').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
    return count;
   });
   await page.getByRole('button', { name: /TABLE \/ BALLS/ }).click();
   const bounds = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons =>
    buttons.map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
   const folder = await page.locator('#trainerSnapshotFolder').boundingBox();
   assert(bounds.every(r => Math.abs(r.y - folder.y) < 8), 'Snapshot group and folder share row three');
   const clear = await page.locator('#trainerAnnotateClear').boundingBox();
   const eraser = await page.locator('[data-annotate-tool=erase]').boundingBox();
   assert(Math.abs(clear.y - eraser.y) < 1, 'Clear is in row two');
   const points = await page.evaluate(() => {
    const f = billiardsTourBridge.annotationFrame(), rect = document.querySelector('#stageWrap').getBoundingClientRect();
    return [.3, .55].map(x => { const p = f.map({ x, y: .3 }); return { x: rect.left + p.x, y: rect.top + p.y }; });
   });
   const cdp = touch ? await context.newCDPSession(page) : null;
   const drag = async (a, b) => {
    if (touch) {
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
     await page.mouse.move(a.x, a.y); await page.mouse.down();
     await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    }
   };
   for(const tool of ['line','arrow','circle','draw']){
    await page.locator('[data-annotate-tool='+tool+']').click();
    await drag(points[0], points[1]);
   }
   assert.equal(await annotationCount(), 4);
   await page.locator('#trainerAnnotateLock').click();
   assert(await page.locator('[data-annotate-tool=line]').isDisabled());
   await page.locator('#table3DToggle').click();
   await page.waitForFunction(() => Billiards3D.active);
   await settle();
   assert(await ink() > 100, 'Annotations appear in 3D without touching cloth');
   await page.screenshot({ path: '/tmp/trainer-annotations-3d-' + (touch ? 'touch' : 'mouse') + '.png' });
   await page.locator('#table3DLock [data-adjust=edit]').click();
   const aimBefore = (await state()).freeAim;
   const aim = await page.evaluate(() => {
    const s = billiardsTourBridge.snapshot();
    return Billiards3D.project({ x: s.tableL * .4, y: s.tableW * .65 });
   });
   if (touch) await page.touchscreen.tap(aim.x, aim.y); else await page.mouse.click(aim.x, aim.y);
   await settle();
   assert.equal(await annotationCount(), 4, 'Locked cloth touch does not add a mark');
   assert.notDeepEqual((await state()).freeAim, aimBefore, 'Locked annotations let the student aim');
   assert(await ink() > 100, 'Annotations survive a 3D aiming redraw');
   await page.locator('#table3DLock [data-adjust=view]').click();
   const canvas = await page.locator('#table3DCanvas').boundingBox();
   await drag({ x: canvas.x + canvas.width * .5, y: canvas.y + canvas.height * .5 },
    { x: canvas.x + canvas.width * .5 + 45, y: canvas.y + canvas.height * .5 + 15 });
   await settle();
   assert(await ink() > 100, 'Annotations survive camera redraw');
   await page.locator('#table3DToggle').click();
   await settle();
   assert(await ink() > 100, 'Annotations survive returning to 2D');
   const portable = await page.evaluate(() => BilliardsLayoutFiles.parse(JSON.stringify(billiardsTourBridge.exportFile())));
   assert.equal(portable.layout.annotations.items.length,4,'Portable lesson includes all annotations');
   assert.equal(portable.layout.annotations.locked,true);
   await page.locator('#layoutNameInput').fill('Locked lesson');
   await page.locator('#saveLayoutBtn').click();
   await page.locator('#trainerAnnotateLock').click();
   await page.locator('#trainerAnnotateClear').click();
   assert.equal(await annotationCount(), 0);
   await page.locator('#loadLayoutBtn').click();
   await settle();
   assert.equal(await annotationCount(), 4, 'Recall restores the saved annotations');
   assert.equal((await state()).annotations.locked, true);
   await page.locator('#animate').click();
   await page.waitForFunction(() => !billiardsTourBridge.snapshot().busy, null, { timeout: 60000 });
   assert.equal(await annotationCount(), 4);
   await page.locator('#undoShot').click();
   assert.equal(await annotationCount(), 4, 'Shot undo preserves the lesson overlay');
   await page.reload();
   await page.waitForFunction(() => window.billiardsTourBridge?.capture().state.annotations?.items.length === 4);
   assert.equal((await state()).annotations.locked, true, 'Reload restores the lock');
   await page.getByRole('button', { name: /TABLE \/ BALLS/ }).click();
   await page.locator('#trainerSnapshotCurrent').click();
   const colors = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons => buttons.map(b => getComputedStyle(b).backgroundColor));
   assert.equal(colors[0], colors[2]); assert.notEqual(colors[0], colors[1]);
   await page.locator('#trainerSnapshotFull').click();
   const full = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons => buttons.map(b => getComputedStyle(b).backgroundColor));
   assert.equal(full[0], full[1]); assert.notEqual(full[0], colors[0]);
   const download = page.waitForEvent('download');
   await page.locator('#trainerAnnotateSnapshot').click();
   assert((await download).suggestedFilename().endsWith('.png'));
   await page.screenshot({ path: '/tmp/trainer-annotations-' + (touch ? 'touch' : 'mouse') + '.png' });
   assert.deepEqual(errors, []);
   console.log((touch ? 'Touch' : 'Mouse') + ': grouped controls, live 3D ink, lock/aim, orbit, save/recall, shot/undo, reload, colors and snapshot passed.');
   await context.close();
  }
 } finally {
  await browser?.close();
  server.kill();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
