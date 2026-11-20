const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

async function verifyEntry(browser, options) {
  const context = await browser.newContext({ ...options, reducedMotion: 'reduce', serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.ballDrawProbe = { suppress: false, frames: [], refreshes: 0 };
    });
    // Reproduce a shadow-only frame until the renderer's cached state is refreshed.
    await page.route('**/three-renderer.js?v=4', route => route.fulfill({
      contentType: 'text/javascript',
      body: `
        export * from './three-renderer.js?entry-test-base';
        import { WebGLRenderer as Base } from './three-renderer.js?entry-test-base';
        export class WebGLRenderer extends Base {
          constructor(options) {
            super(options);
            const render = this.render.bind(this), resetState = this.resetState.bind(this);
            this.resetState = () => {
              ballDrawProbe.suppress = false;
              ballDrawProbe.refreshes++;
              resetState();
            };
            this.render = (scene, camera) => {
              const ballGroup = scene.children[1];
              const cue = ballGroup?.children[0];
              const object = ballGroup?.children[1];
              if (!object?.visible || !cue?.visible) return render(scene, camera);
              const mesh = object.children[0];
              mesh.visible = !ballDrawProbe.suppress;
              try {
                render(scene, camera);
                const point = object.getWorldPosition(object.position.clone()).project(camera);
                const gl = this.getContext(), size = 24, pixels = new Uint8Array(size * size * 4);
                const x = Math.round((point.x + 1) * gl.drawingBufferWidth / 2);
                const y = Math.round((point.y + 1) * gl.drawingBufferHeight / 2);
                gl.readPixels(x - size / 2, y - size / 2, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                let red = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                  if (pixels[i] > pixels[i+1] * 1.4 && pixels[i] > pixels[i+2] * 1.2) red++;
                }
                ballDrawProbe.frames.push({ red, position: object.position.toArray(), camera: camera.position.toArray() });
              } finally {
                mesh.visible = true;
              }
            };
          }
        }`,
    }));
    await page.goto('http://127.0.0.1:8947/?train=1');
    await page.waitForFunction(() => window.billiardsMenuReady && window.Billiards3D);
    for (const x of [.9, 1.65]) {
      await page.evaluate(x => {
        const snapshot = billiardsTourBridge.capture();
        Object.assign(snapshot.state, {
          tableL: 2.54, tableW: 1.27, showTable: true, showPaths: false, shot2Enabled: false,
          balls: [{ id: 0, n: 'CB', x: .5, y: .83, active: true }, { id: 3, n: '3', x, y: .4, active: true }],
        });
        billiardsTourBridge.restore(snapshot);
        Object.assign(ballDrawProbe, { suppress: true, frames: [], refreshes: 0 });
      }, x);
      const before = await page.evaluate(() => billiardsTourBridge.capture().state.balls);
      const toggle = page.locator('#table3DToggle');
      await toggle.click();
      await page.waitForFunction(() => ballDrawProbe.refreshes === 1 && ballDrawProbe.frames.some(frame => frame.red > 3), null, { timeout: 12000 }).catch(async error => {
        const state = await page.evaluate(() => ({
          ...ballDrawProbe, active: Billiards3D.active, balls: Billiards3D.renderedBalls(),
        }));
        throw new Error(`Object-ball redraw did not complete: ${JSON.stringify({ state, errors })}`, { cause: error });
      });
      const result = await page.evaluate(() => ({ frames: ballDrawProbe.frames, balls: billiardsTourBridge.capture().state.balls }));
      assert.equal(result.frames[0].red, 0, 'The simulated first frame omits the object ball');
      const recovered = result.frames.find(frame => frame.red > 3);
      assert(Math.abs(recovered.position[0] - (x - 1.27)) < 1e-8, 'The red ball is drawn at the latest saved position');
      assert.deepEqual(recovered.camera, result.frames[0].camera, 'The refresh leaves the camera in place');
      assert.deepEqual(result.balls, before, 'The redraw preserves the actual layout');
      await toggle.click();
      await page.waitForFunction(() => !Billiards3D.active);
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

(async () => {
  const server = spawn(process.execPath, ['tests/range-server.cjs', '8947']);
  let browser;
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    });
    await verifyEntry(browser, { viewport: { width: 1365, height: 900 } });
    await verifyEntry(browser, { viewport: { width: 1024, height: 640 }, isMobile: true, hasTouch: true });
    console.log('3D opening and reopening redraw a missing object ball at its current position on desktop and tablet.');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
