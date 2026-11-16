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
      page.on('pageerror', e => { errors.push(e.message); console.error('Browser initialization/interaction error:', e.stack); });
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
      const reveal = async selector => {
        const ids = await page.locator(selector).evaluate(e => { const a=[]; for(let p=e.parentElement;p;p=p.parentElement) if(p.tagName==='DETAILS') a.unshift(p.id); return a; });
        for(const id of ids) { const d=page.locator('#'+id); if(!(await d.evaluate(e=>e.open))) await d.locator(':scope > summary').click(); }
      };
      const liveAim = async mode => {
        await open('liveStats');
        assert(await page.locator('#firstBall').isVisible(), 'Live Results has its own tab');
        await page.locator('#cutAngle').scrollIntoViewIfNeeded();
        if(viewport.width>=1000) {
          const table=await page.locator('#stageWrap').boundingBox(), panel=await page.locator('#panel').boundingBox();
          assert(table.x+table.width<=panel.x-8,'Docked menu leaves the whole table workspace uncovered');
        }
        const before = await state(), value = await page.locator('#cutAngle').textContent();
        const roller = page.locator('#aimRoller');
        assert(await roller.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}), 'Aim roller is reachable with Tools open');
        const r=await roller.boundingBox();
        await page.mouse.move(r.x+r.width/2,r.y+r.height/2); await page.mouse.down();
        await page.mouse.move(r.x+r.width/2,r.y+r.height/2+12,{steps:3}); await page.mouse.up();
        assert.notDeepEqual((await state()).freeAim,before.freeAim, 'Aiming changes the shot while Tools stays open');
        await page.waitForFunction(v=>document.querySelector('#cutAngle').textContent!==v,value);
        assert(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open')));
        await picture(mode+'-live-results');
      };
      const picture = tag => page.screenshot({ path: `${dir}/${viewport.width}-${tag}.png` });
      try {
        await page.goto('http://127.0.0.1:8826/?train=1');
        await page.waitForFunction(() => window.billiardsMenuReady && window.billiardsPoolGuide && window.BilliardsShotRecorder && document.querySelector('#trainingBallStyle'));
        assert.deepEqual(await page.locator('#panel > .section > .sectionToggle .menuTitle').allTextContents(), ['Shot', 'Live Shot Results', 'Table & Balls', 'Table Notes', 'Capture', 'Saved', 'Features & Options']);
        await drawer();
        assert.equal(await page.locator('#shotSection > .sectionToggle').getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#panel h1 .editionSub').textContent(),'AI Edition');
        assert(await page.locator('#panel h1 .editionSub').isVisible());
        assert(await page.locator('#panel h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=26));
        const titleBox=await page.locator('#panel h1').boundingBox(), toolsBox=await page.locator('#phoneControls').boundingBox();
        assert(titleBox.y>=toolsBox.y+toolsBox.height,'Menu title clears the fixed Tools control');
        await picture('header');
        assert.equal(await page.locator('#liveStatsSection').evaluate(e=>e.previousElementSibling.id),'shotSection');
        const toolbar = ['#btZenLauncher .experience-toggle','#table3DToggle','#workspace-picker > summary','[data-trainer-action=undoShot]','[data-trainer-action=redoShot]','#phoneControls'];
        const boxes=[];
        for(const selector of toolbar){
          const el=page.locator(selector),r=await el.boundingBox(); boxes.push(r);
          assert(Math.abs(r.width-r.height)<1,selector+' is circular');
          assert(Math.abs(r.width-46)<1,selector+' uses the same diameter');
          assert(await el.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' is reachable');
        }
        assert.equal(await page.locator('#table3DToggle').textContent(),'3D');
        assert(boxes[5].x-boxes[4].x-boxes[4].width>boxes[4].x-boxes[3].x-boxes[3].width+8,'Tools has a distinct gap after Redo');
        assert.equal(await page.locator('.workspaceBall').first().evaluate(e=>getComputedStyle(e).outlineStyle),'none');
        assert(await page.locator('.workspaceBall').first().evaluate(e=>getComputedStyle(e).backgroundImage.startsWith('url(')));
        if(viewport.width===1366){
          const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');for(let id=0;id<16;id++)x.drawImage(BilliardsBallArt.image(id),(id%8)*128,Math.floor(id/8)*128);return c.toDataURL().split(',')[1];});
          fs.writeFileSync(dir+'/ball-art.png',Buffer.from(data,'base64'));
        }
        const mainBlue=await page.locator('#shotSection > .sectionToggle').evaluate(e=>getComputedStyle(e).backgroundColor);
        const subBlue=await page.locator('#menuFullRacks > summary').evaluate(e=>getComputedStyle(e).backgroundColor);
        assert.notEqual(mainBlue,subBlue,'Main and subsection blues have different depths');
        for(const id of ['menuFullRacks','menuLayoutSetup','menuSingleBall','menuMarkers','menuPhoto','menuVideo','menuAudio','menuRecordShot','menuRecordSession','menuCamera','menuSavedLayouts','menuSavedFiles','menuFileActions','menu-featureTableOptions','menu-featureCueOptions','menu-featureAimingOptions','menu-featureOtherOptions','menuPhysics']) assert.equal(await page.locator('#'+id).evaluate(e=>e.tagName),'DETAILS',id+' is collapsible');
        assert.equal(await page.locator('#airbornePhysics').count(),0);
        assert(await page.locator('#menuPhysics').evaluate(e=>e.previousElementSibling.id==='calibrationSection'));
        await page.evaluate(() => billiardsTourBridge.apply({ id: 'task-menu', title: 'Menu task check', balls: [[0, .25, .5], [1, .65, .5]], target: 1, pocket: [1, 1], speed: .3, followPercent: 0, sidePercent: 0 }, { tableL: 2.54, tableW: 1.27 }));
        const initial = await state();
        for (const key of ['shot', 'liveStats', 'table', 'draw', 'capture', 'saved', 'options']) {
          await open(key);
          assert.equal(await page.locator('#panel > .section.open').count(), 1, 'Task switching collapses the previous task');
          const heading = page.locator('#' + key + 'Section > .sectionToggle');
          await heading.scrollIntoViewIfNeeded();
          const box = await heading.boundingBox();
          assert(box.height >= 34 && box.height <= 40 && box.x >= 0 && box.x + box.width <= viewport.width + 1, key + ' heading fits and is touchable');
          if (viewport.width === 1366) await picture('2d-' + key);
        }
        assert.deepEqual(await state(), initial, 'Menu exploration preserves the shot');
        await open('shot');
        assert.equal(await page.locator('#shot1Metrics').isVisible(),false,'Shot contains only the original shot controls');
        assert.equal(await page.locator('#shotBody details').count(),0);
        assert(await page.locator('#speedNumber').isVisible());
        assert.equal(await page.locator('#panel > .section > .sectionToggle .menuIcon,#panel > .section > .sectionToggle .menuDescription').count(),0);
        assert.equal(await page.locator('#trainerAnnotateGroup').evaluate(e=>e.closest('details')?.id||''),'');
        await open('liveStats');
        assert(await page.locator('#firstBall').isVisible());
        assert.equal(await page.locator('#liveStatsSection > .sectionToggle').getAttribute('data-guide-topic'), 'main-panel-live-stats');
        await page.locator('#liveStatsSection > .sectionToggle').click();
        await open('options');
        assert.equal(await page.locator('#physicsDefaults').isVisible(), false, 'Calibration stays collapsed inside Options');
        await page.locator('#calibrationSection > .sectionToggle').click();
        assert(await page.locator('#physicsSave').isVisible());
        assert(await page.locator('#tableL').isVisible());
        assert.equal(await page.locator('#muSlide').isVisible(), false, 'Presets precede advanced coefficients');
        await reveal('#muSlide');
        assert(await page.locator('#muSlide').isVisible());
        assert.equal(await page.locator('#trainerAppInfo').evaluate(e=>e.previousElementSibling.id),'menuPhysics');
        assert(await page.locator('#calibrationSection').evaluate(e=>parseFloat(getComputedStyle(e).marginTop)>=20));
        await page.locator('#trainerAppInfo').evaluate(e=>e.hidden=false);
        assert.equal(Math.round((await page.locator('#trainerAppInfo').boundingBox()).height),Math.round((await page.locator('#menu-featureOtherOptions > summary').boundingBox()).height));
        assert.equal(await page.locator('#trainerAppInfo').evaluate(e=>getComputedStyle(e).backgroundColor),subBlue);
        if(viewport.width===1366){await page.locator('#trainerAppInfo').scrollIntoViewIfNeeded();await picture('features-info');}
        await page.locator('#trainerAppInfo').evaluate(e=>e.hidden=true);
        for (const id of ['kickToolToggle', 'bankToolToggle', 'teachingCompassToggle']) assert.equal(await page.locator('#' + id).evaluate(e => e.closest('fieldset').id), 'featureAimingOptions');
        for (const [id, topic] of [['table', 'main-panel-table-balls'], ['shot', 'main-panel-shot'], ['options', 'main-panel-features-options']]) {
          assert.equal(await page.locator('#' + id + 'Section > .sectionToggle').getAttribute('data-guide-topic'), topic);
        }
        assert(await page.locator('#trainingBallStyle').count(), 'Dynamically mounted cue-ball controls survive');
        await open('shot'); await reveal('#jumpMasseFeatures');
        const jumpBefore=(await state()).airbornePhysics;
        await page.locator('#jumpMasseFeatures').click();
        assert.equal((await state()).airbornePhysics,!jumpBefore,'Shot owns Jump/Massé');
        await open('options'); await reveal('#muSlide');
        const slideBefore=(await state()).muSlide;
        await page.locator('#muSlide').press('ArrowUp'); await page.locator('#muSlide').press('Tab');
        assert((await state()).muSlide>slideBefore,'Advanced Physics edits use their existing state handler');
        assert.equal((await state()).airbornePhysics,!jumpBefore,'Other physics edits preserve Jump/Massé');
        await open('shot'); await reveal('#jumpMasseFeatures'); await page.locator('#jumpMasseFeatures').click();
        await open('saved');
        await reveal('#layoutNameInput');
        await page.locator('#layoutNameInput').fill('Menu recall');
        await page.locator('#saveLayoutBtn').click();
        const saved = await state();
        await page.evaluate(() => billiardsTourBridge.apply({ id: 'different', title: 'Recall check', balls: [[0, .4, .3], [2, .7, .6]], target: 2, pocket: [1, 1], speed: 1, followPercent: 0, sidePercent: 0 }, { tableL: 2.54, tableW: 1.27 }));
        await open('saved');
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
          await liveAim(mode);
          await open('capture');
          await reveal('#trainerSnapshotFull');
          for (const [id, suffix] of [['trainerSnapshotFull', 'full'], ['trainerSnapshotCurrent', 'current'], ['trainerSnapshotStroke', 'stroke']]) {
            await page.locator('#' + id).click();
            await page.locator('#trainerSnapshotName').fill(`${mode}-${suffix}`);
            const event = page.waitForEvent('download');
            await page.locator('#trainerAnnotateSnapshot').click();
            const download = await event;
            assert.equal(download.suggestedFilename(), `${mode}-${suffix}.png`);
            const data = fs.readFileSync(await download.path());
            fs.writeFileSync(`${dir}/${viewport.width}-${mode}-${suffix}-export.png`, data);
            console.log(`${viewport.width} ${mode}-${suffix}: ${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`);
            assert.equal(data.subarray(1, 4).toString(), 'PNG');
            assert(data.readUInt32BE(16) >= 32 && data.readUInt32BE(20) >= 32, 'Snapshot has usable dimensions, including portrait perspective');
            assert(data.length > 1000, 'Snapshot contains image content');
            const colors = await page.evaluate(async base64 => {
              const image = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], {type: 'image/png'}));
              const canvas = document.createElement('canvas');canvas.width = canvas.height = 64;
              const ctx = canvas.getContext('2d');ctx.drawImage(image, 0, 0, 64, 64);image.close();
              const pixels = ctx.getImageData(0, 0, 64, 64).data, colors = new Set();
              for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) colors.add(pixels[i] + ',' + pixels[i + 1] + ',' + pixels[i + 2]);
              return colors.size;
            }, data.toString('base64'));
            assert(colors > 20, 'Export contains rendered table content rather than a blank canvas');
            console.log(`${viewport.width} ${mode}-${suffix}: ${data.readUInt32BE(16)}x${data.readUInt32BE(20)}, ${colors} sampled colors`);
          }
          await page.locator('#trainerSnapshotFolder').click();
          assert.match(await page.locator('#trainerSnapshotStatus').textContent(), /Downloads/);
          await picture(mode + '-capture');
          const session = page.locator('#trainerClipSession');
          await reveal('#trainerClipSession');
          await session.click();
          assert.equal(await session.getAttribute('aria-pressed'), 'true');
          await session.click();
          assert.equal(await session.getAttribute('aria-pressed'), 'false');
        }
        assert.deepEqual(errors, [], 'No initialization or interaction errors');
        console.log(viewport.width + ': seven compact sections, state preservation, blue disclosures, title, live aiming/results, physics, Guide, Saved recall, Notes, 2D/3D PNGs and sessions passed');
      } catch (error) {
        await picture('failure');
        failures.push(viewport.width + ': ' + error.stack);
        console.error(failures.at(-1));
      } finally { await context.close(); }
    }
    assert.deepEqual(failures, []);
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
