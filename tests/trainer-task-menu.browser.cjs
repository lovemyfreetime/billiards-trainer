const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');

const dir = 'test-results/task-menu';
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const server = cp.spawn(process.execPath, ['tests/range-server.cjs', '8826']);
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  let browser;
  const failures = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 740, height: 360 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', acceptDownloads: true, hasTouch: viewport.width <= 740 });
      await context.addInitScript(() => {
        window.BilliardsWindowsHostAvailable = true;
        window.BilliardsWindowsFullscreen = true;
        window.chrome = { webview: { postMessage() {} } };
      });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const state = () => page.evaluate(() => billiardsTourBridge.capture().state);
      const drawer = async () => {
        if (!(await page.locator('body').evaluate(e => e.classList.contains('phone-controls-open')))) await page.locator('#phoneControls').click();
      };
      const open = async key => {
        await drawer();
        const section = page.locator('#' + key + 'Section');
        const heading = section.locator(':scope > .sectionToggle');
        if (!(await section.evaluate(e => e.classList.contains('open')))) await heading.click();
        assert.equal(await heading.getAttribute('aria-expanded'), 'true');
      };
      const picture = tag => page.screenshot({ path: `${dir}/${viewport.width}-${tag}.png` });
      try {
        await page.goto('http://127.0.0.1:8826/?train=1');
        await page.waitForFunction(() => window.billiardsPoolGuide && window.BilliardsShotRecorder && document.querySelector('#trainingBallStyle'));
        assert.deepEqual(await page.locator('#panel > .section > .sectionToggle span').allTextContents(), ['TABLE', 'SHOT', 'DRAW', 'CAPTURE', 'SAVED', 'OPTIONS']);
        await page.evaluate(() => billiardsTourBridge.apply({ id: 'task-menu', balls: [[0, .25, .5], [1, .65, .5]], target: 1, pocket: [1, 1], speed: .3 }, { tableL: 2.54, tableW: 1.27 }));
        const initial = await state();
        for (const key of ['table', 'shot', 'draw', 'capture', 'saved', 'options']) {
          await open(key);
          const heading = page.locator('#' + key + 'Section > .sectionToggle');
          await heading.scrollIntoViewIfNeeded();
          const box = await heading.boundingBox();
          assert(box.height >= 44 && box.x >= 0 && box.x + box.width <= viewport.width + 1, key + ' heading fits and is touchable');
          if (viewport.width === 1366) await picture('2d-' + key);
        }
        assert.deepEqual(await state(), initial, 'Menu exploration preserves the shot');
        await open('shot');
        assert.equal(await page.locator('#shot1Metrics').isVisible(), false, 'Opening Shot does not implicitly expand Live Stats');
        await page.locator('#liveStatsSection > .sectionToggle').click();
        assert(await page.locator('#firstBall').isVisible());
        assert.equal(await page.locator('#liveStatsSection > .sectionToggle').getAttribute('data-guide-topic'), 'main-panel-live-stats');
        await page.locator('#liveStatsSection > .sectionToggle').click();
        await open('options');
        assert.equal(await page.locator('#physicsDefaults').isVisible(), false, 'Calibration stays collapsed inside Options');
        await page.locator('#calibrationSection > .sectionToggle').click();
        assert(await page.locator('#physicsSave').isVisible());
        assert(await page.locator('#tableL').isVisible());
        assert.equal(await page.locator('#muSlide').isVisible(), false, 'Presets precede advanced coefficients');
        await page.locator('[data-advanced=physicsAdvanced]').click();
        assert(await page.locator('#muSlide').isVisible());
        for (const id of ['kickToolToggle', 'bankToolToggle', 'teachingCompassToggle']) assert.equal(await page.locator('#' + id).evaluate(e => e.closest('fieldset').id), 'featureAimingOptions');
        for (const [id, topic] of [['table', 'main-panel-table-balls'], ['shot', 'main-panel-shot'], ['options', 'main-panel-features-options']]) {
          assert.equal(await page.locator('#' + id + 'Section > .sectionToggle').getAttribute('data-guide-topic'), topic);
        }
        assert(await page.locator('#trainingBallStyle').count(), 'Dynamically mounted cue-ball controls survive');
        await open('saved');
        await page.locator('#layoutNameInput').fill('Menu recall');
        await page.locator('#saveLayoutBtn').click();
        const saved = await state();
        await page.evaluate(() => billiardsTourBridge.apply({ id: 'different', balls: [[0, .4, .3], [2, .7, .6]], target: 2, pocket: [1, 1], speed: 1 }, { tableL: 2.54, tableW: 1.27 }));
        await page.locator('#loadLayoutBtn').click();
        assert.deepEqual((await state()).balls, saved.balls, 'Saved layout recall uses its existing state');
        assert(await page.locator('#savedSection .bt-file-library').count(), 'Saved Files remains in Saved');
        await open('draw');
        await page.locator('[data-annotate-tool=line]').click();
        await page.locator('#phoneControls').click();
        const points = await page.evaluate(() => {
          const f = billiardsTourBridge.annotationFrame(), rect = stageWrap.getBoundingClientRect();
          return [.3, .55].map(x => { const p = f.map({ x, y: .3 }); return { x: rect.left + p.x, y: rect.top + p.y }; });
        });
        await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
        await page.mouse.move(points[1].x, points[1].y, { steps: 6 }); await page.mouse.up();
        assert.equal((await state()).annotations.items.length, 1, 'Draw retains its original handlers');
        await open('draw');
        await page.locator('#trainerAnnotateLock').click();
        for (const mode of ['2d', '3d']) {
          if (mode === '3d') {
            if (await page.locator('body').evaluate(e => e.classList.contains('phone-controls-open'))) await page.locator('#phoneControls').click();
            await page.locator('#table3DToggle').click();
            await page.waitForFunction(() => Billiards3D.active);
          }
          await open('capture');
          for (const [id, suffix] of [['trainerSnapshotFull', 'full'], ['trainerSnapshotCurrent', 'current'], ['trainerSnapshotStroke', 'stroke']]) {
            await page.locator('#' + id).click();
            await page.locator('#trainerSnapshotName').fill(`${mode}-${suffix}`);
            const event = page.waitForEvent('download');
            await page.locator('#trainerAnnotateSnapshot').click();
            const download = await event;
            assert.equal(download.suggestedFilename(), `${mode}-${suffix}.png`);
            const data = fs.readFileSync(await download.path());
            assert.equal(data.subarray(1, 4).toString(), 'PNG');
            assert(data.readUInt32BE(16) > 100 && data.readUInt32BE(20) > 100, 'Snapshot has real dimensions');
            assert(data.length > 1000, 'Snapshot contains image content');
          }
          await page.locator('#trainerSnapshotFolder').click();
          assert.match(await page.locator('#trainerSnapshotStatus').textContent(), /Downloads/);
          await picture(mode + '-capture');
          const session = page.locator('#trainerClipSession');
          const details = session.locator('xpath=ancestor::details[1]');
          if (!(await details.evaluate(e => e.open))) await details.locator('summary').click();
          await session.click();
          assert.equal(await session.getAttribute('aria-pressed'), 'true');
          await session.click();
          assert.equal(await session.getAttribute('aria-pressed'), 'false');
        }
        assert.deepEqual(errors, [], 'No initialization or interaction errors');
        console.log(viewport.width + ': six sections, state preservation, nested stats/calibration, Guide, Saved recall, Draw, 2D/3D PNGs and sessions passed');
      } catch (error) {
        await picture('failure');
        failures.push(viewport.width + ': ' + error.stack);
        console.error(failures.at(-1));
      } finally { await context.close(); }
    }
    assert.deepEqual(failures, []);
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
