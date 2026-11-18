const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const angleChange = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

(async () => {
  const server = spawn(process.execPath, ['tests/range-server.cjs', '8896']);
  let browser;
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const context = await browser.newContext({
      viewport: { width: 1024, height: 640 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 1, serviceWorkers: 'block'
    });
    await context.addInitScript(() => {
      window.BilliardsWindowsHostAvailable = window.BilliardsWindowsFullscreen = true;
      window.chrome = { webview: { postMessage() {} } };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8896/?train=1');
    await page.waitForFunction(() => window.billiardsMenuReady && window.billiardsCueView);
    await page.evaluate(() => {
      const setup = billiardsTourBridge.capture();
      Object.assign(setup.state, {
        balls: [{ id: 0, n: 'CB', x: 1.0, y: 0.6, active: true }],
        freeAim: { x: 1.8, y: 0.6 }, allowMissingCueBall: false,
        angleLock: false, showCueStick: true, showTable: true, activeShot: 1, shot2Enabled: false
      });
      billiardsTourBridge.restore(setup);
    });
    await page.locator('#table3DToggle').tap();
    await page.waitForFunction(() => Billiards3D.active && Billiards3D.cueModel()?.referenceReady);
    await page.locator('#table3DCueView').tap();
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const camera = () => page.evaluate(() => Billiards3D.camera());
    const state = () => page.evaluate(() => billiardsTourBridge.capture().state);
    const screenPoint = (point, height = 0) => page.evaluate(([p, h]) => {
      const {x,y} = Billiards3D.project(p, h);
      return { x, y };
    }, [point, height]);
    const touch = await context.newCDPSession(page);
    const send = async (type, point) => {
      await touch.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
      await settle();
    };
    await settle();
    const baseline = process.env.COMPARE_PREVIOUS === '1';
    const initial = await camera();
    assert(initial.playerView && await page.evaluate(() => Billiards3D.locked));
    const start = await screenPoint({x:1.35, y:.71});
    const end = {x:start.x + 18, y:start.y + 5};
    const target = await page.evaluate(p => Billiards3D.tablePoint({clientX:p.x,clientY:p.y}), end);
    assert(target, 'drag ends on cloth');
    await send('touchStart', start);
    const headings = [(await camera()).azimuth];
    for (let i = 1; i <= 4; i++) {
      await send('touchMove', {x:start.x + i*(end.x-start.x)/4, y:start.y + i*(end.y-start.y)/4});
      headings.push((await camera()).azimuth);
    }
    const drift = Math.max(...headings.map(a => Math.abs(angleChange(a, initial.azimuth))));
    const aimingError = distance((await state()).freeAim, target);
    console.log('During cloth drag: max camera turn %s deg, target error %s mm',
      (drift*180/Math.PI).toFixed(2), (aimingError*1000).toFixed(1));
    if (baseline) {
      assert(drift > .05, 'Previous release reproduces camera drift during a cloth edit');
    } else {
      assert(drift < 1e-6, 'Camera stays steady while the finger edits the shot');
      assert(aimingError < .005, 'Aim reaches the cloth under the finger');
    }
    await send('touchEnd');
    const aligned = await camera();
    assert(aligned.playerView && Math.abs(angleChange(aligned.azimuth, initial.azimuth)) > .05);
    const shot = await state(), cue = shot.balls.find(b => b.id === 0);
    const expected = Math.atan2(cue.x - shot.freeAim.x, cue.y - shot.freeAim.y);
    assert(Math.abs(angleChange(aligned.azimuth, expected)) < .01, 'Release realigns the view behind the selected shot');

    if (!baseline) {
      const ballStart = await screenPoint(cue, shot.ballR);
      const ballTarget = {x:cue.x+.06, y:cue.y-.04};
      const ballEnd = await screenPoint(ballTarget, shot.ballR);
      await send('touchStart', ballStart);
      await send('touchMove', ballEnd);
      assert.deepEqual(await camera(), aligned, 'Camera stays still while positioning the cue ball');
      assert(distance((await state()).balls.find(b => b.id === 0), ballTarget) < .005);
      await send('touchCancel');
      assert(distance((await state()).balls.find(b => b.id === 0), cue) < .005, 'Interrupted ball placement restores its origin');
    }

    const offCloth = await page.evaluate(() => {
      const canvas = document.getElementById('table3DCanvas'), box = canvas.getBoundingClientRect();
      for (let y = box.top + 10; y < box.bottom - 10; y += 8) {
        const x = box.left + box.width * .55;
        if (document.elementFromPoint(x, y) === canvas && !Billiards3D.tablePoint({clientX:x, clientY:y})) return {x, y};
      }
      throw Error('No exposed off-cloth canvas point in the test viewport');
    });
    const beforeOutside = await state(), held = await camera();
    await send('touchStart', offCloth);
    await send('touchEnd');
    assert.deepEqual(await camera(), held, 'Stationary outside tap holds Cue View');
    const locked = () => page.evaluate(() => Billiards3D.locked);
    assert(await locked());
    await send('touchStart', offCloth);
    await send('touchMove', {x:offCloth.x+3, y:offCloth.y+1});
    await send('touchEnd');
    const afterJitter = await camera();
    console.log('Outside tap with 3 px of movement: Cue View %s, Balls and shot adjustment %s',
      afterJitter.playerView, await locked());
    if (!baseline) {
      assert.deepEqual(afterJitter, held, 'Small touch drift holds Cue View');
      assert(await locked());
    } else if (!afterJitter.playerView) {
      await page.locator('#table3DCueView').tap();
      await settle();
    }
    await send('touchStart', offCloth);
    await send('touchMove', {x:offCloth.x+28, y:offCloth.y+2});
    await send('touchEnd');
    assert.equal((await camera()).playerView, false, 'A deliberate outside orbit leaves cue alignment');
    assert(Math.abs(angleChange((await camera()).azimuth, held.azimuth)) > .10);
    console.log('Outside orbit kept Balls and shot adjustment: %s', await locked());
    if (baseline) {
      assert.equal(await locked(), false, 'Previous release reproduces automatic adjustment-mode switch');
      return;
    }
    assert(await locked(), 'Outside orbit keeps Balls and shot adjustment selected');
    assert(await page.locator('#table3DLock [data-adjust=edit]').evaluate(e => e.classList.contains('selected')));
    const afterOutside = await state();
    assert.deepEqual(afterOutside.freeAim, beforeOutside.freeAim);
    assert.deepEqual(afterOutside.balls, beforeOutside.balls);
    const nextTarget = {x:cue.x+.32,y:cue.y+.02};
    const nextTap = await screenPoint(nextTarget);
    await send('touchStart', nextTap);
    await send('touchEnd');
    assert(distance((await state()).freeAim, nextTarget) < .005, 'Next cloth touch still edits the shot');
    await page.locator('#table3DLock [data-adjust=view]').tap();
    const beforeOrbit = await state(), orbitStart = await camera();
    await send('touchStart', start);
    await send('touchMove', end);
    await send('touchEnd');
    assert(Math.abs(angleChange((await camera()).azimuth, orbitStart.azimuth)) > .03);
    const afterOrbit = await state();
    assert.deepEqual(afterOrbit.freeAim, beforeOrbit.freeAim);
    assert.deepEqual(afterOrbit.balls, beforeOrbit.balls);
    assert.deepEqual(errors, []);
    console.log('Release alignment, cue-ball editing, cancellation and independent camera orbit passed.');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
