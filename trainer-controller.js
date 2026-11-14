/* Optional gamepad input. The existing Trainer owns shot state and physics. */
(() => {
  'use strict';
  const bridge = window.billiardsControllerControls;
  if (!bridge || bridge.state().projector) return;
  const KEY = 'billiards.controller.v1';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const defaults = ['confirm', 'redo', 'undo', 'view', 'shot1', 'shot2', 'camera', 'shoot', 'snapshot', 'settings', 'cursor', 'reset', 'fineUp', 'fineDown', 'fineLeft', 'fineRight'];
  const actions = {none:'Unassigned', confirm:'Confirm / drag', redo:'Redo shot', undo:'Undo shot', view:'Switch 2D / 3D', shot1:'Select Shot 1', shot2:'Select Shot 2', camera:'Hold for camera', shoot:'Shoot', snapshot:'Snapshot controls', settings:'Controller settings', cursor:'Positioning cursor', reset:'Reset view', fineUp:'Fine speed up / zoom in', fineDown:'Fine speed down / zoom out', fineLeft:'Fine aim left', fineRight:'Fine aim right'};
  const names = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { saved = {}; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const settings = {
    enabled:saved.enabled === true,
    deadzone:clamp(Number(saved.deadzone) || .15, .05, .4),
    aim:clamp(Number(saved.aim) || 12, 2, 60),
    speed:clamp(Number(saved.speed) || 1.2, .2, 4),
    spin:clamp(Number(saved.spin) || .8, .2, 2),
    profiles:saved.profiles && typeof saved.profiles === 'object' && !Array.isArray(saved.profiles) ? saved.profiles : {}
  };
  let nativeHost = false;
  try { nativeHost = window.BilliardsAndroid?.controllerInputVersion?.() >= 1; } catch (_) {}
  let nativePads = [], pads = [], selected = '', profile = null, current = null;
  let raf = 0, lastTime = 0, lastUI = 0, armed = false, previous = [], latched = [], repeatAt = {}, focused = document.hasFocus();
  let pointerMode = false, pointerDown = false, clickTarget = null, cursorX = innerWidth / 2, cursorY = innerHeight / 2;
  let deviceKey = '', lastBlocked = true, statusText = '', dialogReady = false;
  let lastAdjust = 0, pendingAdjust = {aim:0, speed:0, side:0, follow:0};
  const dialog = document.createElement('dialog'); dialog.id = 'trainerControllerDialog';
  dialog.setAttribute('aria-labelledby', 'trainerControllerTitle');
  dialog.innerHTML = `<header><h2 id="trainerControllerTitle">Controller Setup</h2><button type="button" id="trainerControllerClose" aria-label="Close controller settings">Close</button></header>
    <label><input type="checkbox" id="trainerControllerEnabled"> Enable Controller Mode</label>
    <p>Pair your controller, then press a button or move a stick. Release all controls before returning to the table. Settings are saved on this device.</p>
    <label for="trainerControllerDevice">Controller</label><select id="trainerControllerDevice" aria-label="Controller"></select>
    <output id="trainerControllerStatus" role="status"></output>
    <h3>Live input test</h3><p>Move each stick and press each button here. The table stays paused for controller input while this panel is open.</p><output id="trainerControllerRaw" aria-label="Live controller input"></output>
    <div class="controllerSettings" id="trainerControllerSensitivity"></div>
    <h3>Stick assignments</h3><div id="trainerControllerAxes"></div>
    <h3>Button assignments</h3><p>Hold L2 for camera controls. L3 turns on a positioning cursor; move it with the left stick and hold Cross to drag a ball. PS stays with the operating system.</p><div class="controllerMapping" id="trainerControllerButtons"></div>
    <p id="trainerControllerProfileNote"></p><button type="button" id="trainerControllerReset">Restore default mapping</button>`;
  document.body.append(dialog);
  const el = id => document.getElementById(id);
  const cursor = document.createElement('div'); cursor.id = 'trainerControllerCursor'; cursor.hidden = true; cursor.setAttribute('aria-hidden', 'true'); document.body.append(cursor);
  const launch = document.createElement('button'); launch.type = 'button'; launch.id = 'trainerControllerSetup'; launch.textContent = 'Controller'; launch.setAttribute('aria-haspopup', 'dialog'); launch.onclick = open;
  (document.querySelector('#workspace-view .workspaceToolGroup') || el('featureAimingOptions') || el('panel')).append(launch);
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {} }
  function profileKey(pad) { return `${pad.source}:${pad.id}:${pad.mapping || 'raw'}`; }
  function freshProfile(pad) {
    const known = pad.mapping === 'standard';
    return {buttons:Array.from({length:Math.max(16, Math.min(32, pad.buttons.length))}, (_, i) => known && i < 16 ? defaults[i] : 'none'), axes:{aim:0, speed:1, side:2, follow:3}, invert:{}, configured:known};
  }
  function normalizeProfile(pad, raw) {
    const p = freshProfile(pad);
    if (!raw || typeof raw !== 'object') return p;
    p.buttons = p.buttons.map((v, i) => Object.hasOwn(actions, raw.buttons?.[i]) ? raw.buttons[i] : v);
    for (const a of ['aim','speed','side','follow']) {
      if (Number.isInteger(raw.axes?.[a]) && raw.axes[a] >= -1 && raw.axes[a] < 16) p.axes[a] = raw.axes[a];
      p.invert[a] = raw.invert?.[a] === true;
    }
    p.configured = raw.configured === true || p.configured;
    return p;
  }
  function readPads() {
    if (nativeHost) return nativePads;
    try { return Array.from(navigator.getGamepads?.() || []).filter(p => p?.connected).map(p => ({source:'browser', index:p.index, id:p.id, mapping:p.mapping, ready:true, axes:Array.from(p.axes), buttons:Array.from(p.buttons, b => Number(b.value) || (b.pressed ? 1 : 0))})); }
    catch (_) { return []; }
  }
  const padToken = p => `${p.source}:${p.index}:${p.id}`;
  function syncDevice() {
    pads = readPads();
    if (!pads.some(p => padToken(p) === selected)) selected = pads[0] ? padToken(pads[0]) : '';
    current = pads.find(p => padToken(p) === selected) || null;
    const key = current ? `${padToken(current)}:${current.mapping}` : '';
    if (key !== deviceKey) {
      resetInput(); deviceKey = key;
      profile = current ? normalizeProfile(current, settings.profiles[profileKey(current)]) : null;
      renderMapping();
    }
    const inventory = JSON.stringify(pads.map(p => [padToken(p), p.id]));
    if (el('trainerControllerDevice').dataset.inventory !== inventory) {
      el('trainerControllerDevice').dataset.inventory = inventory;
      el('trainerControllerDevice').replaceChildren(...(pads.length ? pads.map(p => new Option(p.id, padToken(p))) : [new Option('No controller detected', '')]));
    }
    el('trainerControllerDevice').value = selected;
  }
  function saveProfile() {
    if (current && profile) settings.profiles[profileKey(current)] = profile;
    persist(); resetInput();
  }
  function renderMapping() {
    const rows = el('trainerControllerButtons'), axes = el('trainerControllerAxes'); rows.replaceChildren(); axes.replaceChildren();
    if (!current || !profile) return;
    profile.buttons.forEach((action, index) => {
      if (index === 16 && current.mapping === 'standard') return;
      const label = document.createElement('label'), select = document.createElement('select');
      label.append(`${current.mapping === 'standard' ? names[index] || 'Button ' + index : 'Button ' + index} `);
      select.setAttribute('aria-label', `Button ${index} action`); select.dataset.button = index;
      for (const [value, title] of Object.entries(actions)) select.add(new Option(title, value));
      select.value = action; select.onchange = () => { profile.buttons[index] = select.value; profile.configured = true; saveProfile(); };
      label.append(select); rows.append(label);
    });
    for (const [key, title] of [['aim','Aim'], ['speed','Speed'], ['side','English'], ['follow','Follow/draw']]) {
      const row = document.createElement('div'); row.className = 'controllerAxisRow';
      const select = document.createElement('select'); select.setAttribute('aria-label', `${title} axis`);
      select.add(new Option('Unassigned', '-1'));
      for (let i = 0; i < Math.max(4, Math.min(16, current.axes.length)); i++) select.add(new Option('Axis ' + i, String(i)));
      select.value = String(profile.axes[key]); select.onchange = () => { profile.axes[key] = Number(select.value); profile.configured = true; saveProfile(); };
      const label = document.createElement('label'), invert = document.createElement('input'); invert.type = 'checkbox'; invert.checked = profile.invert[key] === true;
      invert.setAttribute('aria-label', `Reverse ${title}`); invert.onchange = () => { profile.invert[key] = invert.checked; saveProfile(); }; label.append(invert, 'Reverse');
      const text = document.createElement('span'); text.textContent = title; row.append(text, select, label); axes.append(row);
    }
    el('trainerControllerProfileNote').textContent = profile.configured ? 'Profile saved separately for this controller and connection type.' : 'This controller reports a nonstandard layout. Use the live input numbers to assign its buttons and sticks before playing.';
    if (window.BilliardsAndroid && !nativeHost) el('trainerControllerProfileNote').textContent += ' If this Android app shows no input readings, install the controller-enabled app update.';
  }
  for (const [key, title, min, max, step, suffix] of [['deadzone','Stick dead zone',.05,.4,.01,'%'], ['aim','Aim sensitivity',2,60,1,'deg/s'], ['speed','Speed sensitivity',.2,4,.1,'/s'], ['spin','Spin sensitivity',.2,2,.1,'/s']]) {
    const label = document.createElement('label'), input = document.createElement('input'), output = document.createElement('output');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = settings[key]; input.setAttribute('aria-label', title);
    const update = () => output.textContent = (key === 'deadzone' ? Math.round(settings[key] * 100) : settings[key]) + suffix;
    input.oninput = () => { settings[key] = Number(input.value); update(); persist(); resetInput(); }; update(); label.append(title, input, output); el('trainerControllerSensitivity').append(label);
  }
  function hostEnabled(on) { try { window.BilliardsAndroid?.setControllerEnabled?.(!!on); } catch (_) {} }
  function nativeEnable() { hostEnabled((settings.enabled || dialog.open) && focused && !document.hidden); }
  function open() {
    resetInput();
    dialogReady = false;
    if (!dialog.open) dialog.showModal();
    document.querySelectorAll('#workspaceTools details[open]').forEach(d => d.open = false);
    el('trainerControllerEnabled').checked = settings.enabled;
    nativeEnable(); start();
  }
  function close() { dialog.close(); }
  el('trainerControllerClose').onclick = close;
  dialog.addEventListener('close', () => { resetInput(); nativeEnable(); start(); launch.focus({preventScroll:true}); });
  el('trainerControllerEnabled').checked = settings.enabled;
  el('trainerControllerEnabled').onchange = e => { settings.enabled = e.target.checked; persist(); resetInput(); nativeEnable(); start(); };
  el('trainerControllerDevice').onchange = e => { selected = e.target.value; deviceKey = ''; syncDevice(); };
  el('trainerControllerReset').onclick = () => { if (current) { profile = freshProfile(current); saveProfile(); renderMapping(); } };
  function endPointer(cancel = false) {
    if (pointerDown) bridge.pointer(cancel ? 'pointercancel' : 'pointerup', cursorX, cursorY);
    pointerDown = false; clickTarget = null; cursor.dataset.dragging = 'false';
  }
  function resetInput() {
    armed = false; previous = []; latched = []; repeatAt = {}; lastTime = 0; lastBlocked = true;
    pendingAdjust = {aim:0, speed:0, side:0, follow:0}; lastAdjust = 0;
    endPointer(true); pointerMode = false; cursor.hidden = true; bridge.finish();
  }
  function otherModal() {
    const selectors = 'dialog[open],[aria-modal="true"],#photoAnalyzerModal.open,#layoutQuickPanel.open,.table3DPopover:not([hidden]),#workspaceTools details[open]';
    return [...document.querySelectorAll(selectors)].some(e => e !== dialog && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  }
  function blocked() {
    const state = bridge.state(), a = document.activeElement;
    return !settings.enabled || document.hidden || !focused || state.busy || state.projector || dialog.open || otherModal() || !!a?.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])') || document.body.classList.contains('phone-controls-open') || document.body.classList.contains('zen-mode');
  }
  function axis(key) {
    const value = Number(current?.axes[profile?.axes[key]]) || 0, size = Math.abs(value);
    return size <= settings.deadzone ? 0 : Math.sign(value) * (size - settings.deadzone) / (1 - settings.deadzone) * (profile.invert[key] ? -1 : 1);
  }
  function mapped(action) { return profile ? profile.buttons.reduce((v, a, i) => a === action ? Math.max(v, current.buttons[i] || 0) : v, 0) : 0; }
  function clickSnapshot() {
    endPointer(true); pointerMode = false;
    const group = el('trainerAnnotateGroup');
    if (!group) return;
    if (!document.body.classList.contains('phone-controls-open')) el('phoneControls')?.click();
    for (let parent = group.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    group.scrollIntoView({block:'nearest'}); el('trainerSnapshotName')?.focus({preventScroll:true});
  }
  function press(action) {
    if (Object.values(pendingAdjust).some(Boolean)) {
      bridge.adjust(pendingAdjust); pendingAdjust = {aim:0, speed:0, side:0, follow:0};
    }
    if (action === 'settings') return open();
    if (action === 'shoot' && !pointerMode) return bridge.shoot();
    if (action === 'undo') return bridge.undo();
    if (action === 'redo') return bridge.redo();
    if (action === 'shot1' || action === 'shot2') return bridge.select(action === 'shot2' ? 2 : 1);
    if (action === 'view') { endPointer(true); pointerMode = false; return el('table3DToggle')?.click(); }
    if (action === 'reset') return window.Billiards3D?.resetView();
    if (action === 'snapshot') return clickSnapshot();
    if (action === 'cursor') { endPointer(true); pointerMode = !pointerMode; return; }
    if (action === 'confirm') {
      if (!pointerMode) { const a = document.activeElement; if (a?.matches('button') && a !== launch && !a.disabled && !a.matches('#animate,[data-trainer-action="animate"]')) a.click(); return; }
      const target = document.elementFromPoint(cursorX, cursorY);
      if (target?.id === 'table3DCanvas' || target?.id === 'canvas') { pointerDown = bridge.pointer('pointerdown', cursorX, cursorY); cursor.dataset.dragging = String(pointerDown); }
      else clickTarget = target?.closest('button,input,select,summary');
    }
  }
  function release(action) {
    if (action === 'confirm') {
      const target = clickTarget;
      endPointer();
      if (pointerMode && target && !target.disabled && target.contains(document.elementFromPoint(cursorX, cursorY))) target.click();
    }
  }
  function tick(time) {
    raf = 0;
    if (document.hidden || !focused || !settings.enabled && !dialog.open) return;
    const dt = lastTime ? clamp((time - lastTime) / 1000, 0, .04) : 0; lastTime = time;
    syncDevice();
    const values = current?.buttons || [];
    if (dialog.open) {
      if (values.every(v => v < .2)) dialogReady = true;
      if (dialogReady && profile?.buttons.some((action, i) => action === 'settings' && values[i] > .5 && (previous[i] || 0) < .2)) close();
    }
    const neutral = current && current.ready !== false && current.axes.every(v => Math.abs(v) <= settings.deadzone) && values.every(v => v < .2);
    const stop = blocked() || !profile?.configured || current?.ready === false;
    if (stop || !current) {
      if (!lastBlocked || pointerMode) { endPointer(true); pointerMode = false; bridge.finish(); }
      armed = false; repeatAt = {};
      pendingAdjust = {aim:0, speed:0, side:0, follow:0};
    } else if (!armed) {
      if (neutral) armed = true;
    } else {
      const camera = mapped('camera') > .5 && !!window.Billiards3D?.active;
      for (let i = 0; i < values.length; i++) {
        const action = profile.buttons[i] || 'none', threshold = action === 'shoot' ? .8 : .5;
        if (values[i] > threshold && !latched[i]) {
          latched[i] = true;
          if (action.startsWith('fine')) repeatAt[action] = 0;
          else press(action);
          // A shot, settings panel or mode change can block the rest of this frame.
          if (blocked()) break;
        }
        if (values[i] < .2) { latched[i] = false; if ((previous[i] || 0) >= .2) release(action); }
      }
      if (!blocked()) {
        let fineAim = 0, fineSpeed = 0, zoom = 0;
        for (const [action, direction] of [['fineLeft',-1],['fineRight',1],['fineUp',1],['fineDown',-1]]) if (mapped(action) > .5 && time >= (repeatAt[action] || 0)) {
          repeatAt[action] = time + 120;
          if (camera && (action === 'fineUp' || action === 'fineDown')) zoom -= direction * .06;
          else if (action === 'fineLeft' || action === 'fineRight') fineAim += direction * .15;
          else fineSpeed += direction * .01;
        }
        if (camera) {
          pendingAdjust = {aim:0, speed:0, side:0, follow:0};
          window.Billiards3D.controllerMove({rotateX:-axis('aim') * dt * 1.5, rotateY:axis('speed') * dt, panX:axis('side') * dt * 280, panY:axis('follow') * dt * 280, zoomBy:zoom});
        }
        else if (pointerMode) {
          pendingAdjust = {aim:0, speed:0, side:0, follow:0};
          cursorX = clamp(cursorX + axis('aim') * dt * 500, 12, innerWidth - 12); cursorY = clamp(cursorY + axis('speed') * dt * 500, 12, innerHeight - 12);
          if (pointerDown && (axis('aim') || axis('speed'))) bridge.pointer('pointermove', cursorX, cursorY);
        } else {
          const change = {aim:axis('aim') * dt * settings.aim + fineAim, speed:-axis('speed') * dt * settings.speed + fineSpeed, side:axis('side') * dt * settings.spin, follow:-axis('follow') * dt * settings.spin};
          for (const key of Object.keys(change)) pendingAdjust[key] += change[key];
          // Limit expensive shot previews while keeping camera/cursor motion smooth.
          if ((time - lastAdjust >= 48 || fineAim || fineSpeed) && Object.values(pendingAdjust).some(Boolean)) {
            bridge.adjust(pendingAdjust); pendingAdjust = {aim:0, speed:0, side:0, follow:0}; lastAdjust = time;
          }
        }
      }
    }
    previous = Array.from(values); lastBlocked = stop;
    cursor.hidden = !pointerMode || stop; cursor.style.left = cursorX + 'px'; cursor.style.top = cursorY + 'px';
    if (time - lastUI >= 120) {
      lastUI = time;
      statusText = !current ? (nativeHost ? 'Waiting for a paired controller. Move a stick to begin.' : 'No controller detected. Pair it and press a button.' + (window.BilliardsAndroid ? ' If no readings appear, install the controller-enabled app update.' : '')) : !settings.enabled ? 'Controller detected. Enable Controller Mode to play.' : dialog.open ? 'Input test active. Table controls are paused.' : !profile?.configured ? 'Assign this controller in Controller Setup before playing.' : current.ready === false ? 'Move a stick, then release all controls to begin.' : stop ? 'Controller paused while another control is open.' : !armed ? 'Release all buttons, triggers and sticks to begin.' : pointerMode ? 'Positioning cursor active. Hold Cross and move the left stick to drag.' : 'Controller ready';
      el('trainerControllerStatus').textContent = statusText;
      if (dialog.open) el('trainerControllerRaw').textContent = current ? `${current.source === 'android' ? 'Android' : 'Browser'} input: ${current.mapping || 'nonstandard'}\nAxes: ${current.axes.map((v, i) => `${i}: ${Number(v).toFixed(2)}`).join('  ')}\nButtons: ${values.map((v, i) => v > .05 ? `${i}: ${v.toFixed(2)}` : '').filter(Boolean).join('  ') || 'released'}` : 'Waiting for input...';
    }
    start();
  }
  function start() { if (!raf && focused && !document.hidden && (settings.enabled || dialog.open)) raf = requestAnimationFrame(tick); }
  function suspend() { if (raf) cancelAnimationFrame(raf); raf = 0; resetInput(); hostEnabled(false); }
  window.addEventListener('billiards:controller-state', e => {
    if (!nativeHost) return;
    const data = e.detail;
    if (!Array.isArray(data)) return;
    nativePads = data.filter(p => p && typeof p.id === 'string' && Array.isArray(p.axes) && Array.isArray(p.buttons)).map(p => ({...p, source:'android', axes:p.axes.slice(0,16).map(v => clamp(Number(v) || 0,-1,1)), buttons:p.buttons.slice(0,32).map(v => clamp(Number(v) || 0,0,1))}));
    start();
  });
  window.addEventListener('gamepadconnected', start);
  window.addEventListener('gamepaddisconnected', () => { resetInput(); start(); });
  window.addEventListener('blur', () => { focused = false; suspend(); });
  window.addEventListener('focus', () => { focused = true; resetInput(); nativeEnable(); start(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else { resetInput(); nativeEnable(); start(); } });
  window.addEventListener('pagehide', suspend);
  // Browser button defaults must not also move the shot through arrow shortcuts.
  document.addEventListener('keydown', e => {
    if (settings.enabled && !blocked() && current && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)) {
      // Only suppress native gamepad key events; physical keyboards stay unchanged.
      if (e.code === '' || e.code === 'Unidentified') { e.preventDefault(); e.stopImmediatePropagation(); }
    }
  }, true);
  window.BilliardsController = {open, get enabled() { return settings.enabled; }, status() { return {enabled:settings.enabled, connected:!!current, armed, pointerMode, source:current?.source || null, message:statusText}; }};
  nativeEnable(); start();
})();
