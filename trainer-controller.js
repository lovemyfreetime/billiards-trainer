/* Optional gamepad input. The existing Trainer owns shot state and physics. */
(() => {
  'use strict';
  const bridge = window.billiardsControllerControls;
  if (!bridge || bridge.state().projector) return;
  const KEY = 'billiards.controller.v1';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const defaults = ['confirm', 'redo', 'undo', 'view', 'shot1', 'shot2', 'camera', 'shoot', 'snapshot', 'settings', 'cursor', 'reset', 'fineUp', 'fineDown', 'fineLeft', 'fineRight'];
  const actions = {none:'Unassigned', confirm:'Confirm / drag', redo:'Redo shot', undo:'Undo shot', view:'Switch 2D / 3D', shot1:'Select Shot 1', shot2:'Select Shot 2', camera:'Hold for camera', shoot:'Shoot', snapshot:'Snapshot controls', settings:'Controller settings', cursor:'Positioning cursor', reset:'Reset view', fineUp:'Fine speed up', fineDown:'Fine speed down', fineLeft:'Fine aim left', fineRight:'Fine aim right', panUp:'Pan up', panDown:'Pan down', panLeft:'Pan left', panRight:'Pan right', zoomIn:'Zoom in', zoomOut:'Zoom out'};
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
    cursorSpeed:clamp(Number(saved.cursorSpeed) || 1200, 200, 2400),
    profiles:saved.profiles && typeof saved.profiles === 'object' && !Array.isArray(saved.profiles) ? saved.profiles : {}
  };
  const defaultCombos = () => ['panUp','panDown','panLeft','panRight'].map((action,i)=>({modifier:6,button:12+i,action}));
  let effectiveInputs = [], comboSuppressed = new Set(), comboLatched = new Set(), comboActive = new Set();
  let nativeHost = false;
  try { nativeHost = window.BilliardsAndroid?.controllerInputVersion?.() >= 1; } catch (_) {}
  let nativePads = [], pads = [], selected = '', profile = null, current = null;
  let raf = 0, lastTime = 0, lastUI = 0, armed = false, previous = [], latched = [], repeatAt = {}, focused = document.hasFocus();
  let trayDrag = null;
  let pointerMode = false, pointerDown = false, clickTarget = null, cursorX = innerWidth / 2, cursorY = innerHeight / 2;
  let deviceKey = '', renderedProfile = '', lastBlocked = true, statusText = '', dialogReady = false;
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
    <h3>Button assignments</h3><p>Hold L2 in 3D: left stick orbits, right stick up/down zooms, and D-pad pans. L3 turns on a positioning cursor; move it with the left stick and hold Cross to drag a ball. With the cursor on, press the D-pad to enter menu navigation. Cross opens or activates, Square goes back, and L3 exits. PS stays with the operating system.</p><div class="controllerMapping" id="trainerControllerButtons"></div>
    <h3>Button combinations</h3><p>Hold a modifier, then press a button. Combinations override the target button while held. A modifier is reserved for combinations; Camera still controls the sticks. Pan and zoom actions work in 3D. Release both buttons before using their normal actions.</p><div id="trainerControllerCombos"></div><button type="button" id="trainerControllerAddCombo">Add combination</button><output id="trainerControllerComboError" role="alert"></output><p id="trainerControllerProfileNote"></p><button type="button" id="trainerControllerReset">Restore default mapping</button>`;
  document.body.append(dialog);
  const el = id => document.getElementById(id);
  const cursor = document.createElement('div'); cursor.id = 'trainerControllerCursor'; cursor.hidden = true; cursor.setAttribute('aria-hidden', 'true'); document.body.append(cursor);
  const launch = document.createElement('button'); launch.type = 'button'; launch.id = 'trainerControllerSetup'; launch.textContent = 'Controller'; launch.setAttribute('aria-haspopup', 'dialog'); launch.onclick = open;
  (document.querySelector('#workspace-view .workspaceToolGroup') || el('featureAimingOptions') || el('panel')).append(launch);
  let menuMode = false, menuSection = null, menuTarget = null, menuPointer = false, menuOpenedPanel = false;
  const menuControlSelector = 'button,input:not([type=hidden]),select,textarea,summary,[role=button],a[href]';
  function menuVisible(e) {
    if (!e || e.matches(':disabled') || e.disabled || e.closest('[hidden],[inert]') || !e.getClientRects().length) return false;
    for (let p = e; p && p !== document.body; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (p.tagName === 'DETAILS' && !p.open && !p.querySelector(':scope > summary')?.contains(e)) return false;
      if (p.classList.contains('sectionBody') && !p.closest('.section')?.classList.contains('open')) return false;
    }
    return true;
  }
  function menuHeadings() { return [...document.querySelectorAll('#panel .sectionToggle,#workspaceTools > details > summary')].filter(menuVisible); }
  function menuFocus(target, scroll = true) {
    menuTarget?.classList.remove('controllerMenuFocus'); menuTarget = target || null;
    if (!target) return;
    target.classList.add('controllerMenuFocus');
    if (!menuPointer) target.focus({preventScroll:true});
    if (scroll) target.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  function menuItems() {
    if (!menuSection || !menuSection.isConnected || (menuSection.matches('.section') ? !menuSection.classList.contains('open') : !menuSection.open)) { menuSection = null; return menuHeadings(); }
    return [...menuSection.querySelectorAll(menuControlSelector)].filter(e => menuVisible(e) && !e.matches('.sectionToggle') && !(e.tagName === 'SUMMARY' && e.parentElement === menuSection));
  }
  function exitMenu() {
    if (menuMode && document.activeElement?.closest('#panel,#workspaceTools')) document.activeElement.blur();
    menuMode = false; menuSection = null; menuPointer = false;
    menuTarget?.classList.remove('controllerMenuFocus'); menuTarget = null;
    menuNotice.hidden = true;
    if (menuOpenedPanel && document.body.classList.contains('phone-controls-open')) el('phoneControls')?.click();
    menuOpenedPanel = false;
  }
  function enterMenu(target) {
    endPointer(true); pendingAdjust = {aim:0,speed:0,side:0,follow:0}; bridge.finish();
    menuMode = true; pointerMode = true; menuPointer = false; menuSection = null;
    if (el('phoneControls') && !menuVisible(document.querySelector('#panel .sectionToggle'))) {
      menuOpenedPanel = !document.body.classList.contains('phone-controls-open');
      if (menuOpenedPanel) el('phoneControls').click();
    }
    menuNotice.hidden = false;
    menuFocus(target || menuHeadings()[0]);
  }
  function menuActivate(target) {
    if (!menuVisible(target)) return;
    if (target.matches('.sectionToggle,#workspaceTools > details > summary')) {
      const section = target.closest('.section,details');
      const opened = section.matches('.section') ? section.classList.contains('open') : section.open;
      if (!opened) target.click();
      menuSection = section; menuPointer = false; menuFocus(menuItems()[0] || target); return;
    }
    if (target.matches('select,input[type=range],input[type=number]')) { menuPointer = false; menuFocus(target); return; }
    target.click();
  }
  function menuBack() {
    if (menuSection) {
      const heading = menuSection.querySelector('.sectionToggle,summary');
      menuSection = null; menuPointer = false; menuFocus(heading);
    } else { exitMenu(); resetInput(); }
  }
  function menuNavigate(action) {
    menuPointer = false;
    const direction = action === 'fineUp' || action === 'fineLeft' ? -1 : 1;
    if (menuSection && menuVisible(menuTarget) && (action === 'fineLeft' || action === 'fineRight')) {
      if (menuTarget.matches('input[type=range],input[type=number]')) {
        direction > 0 ? menuTarget.stepUp() : menuTarget.stepDown();
        menuTarget.dispatchEvent(new Event('input',{bubbles:true})); menuTarget.dispatchEvent(new Event('change',{bubbles:true})); return;
      }
      if (menuTarget.matches('select')) {
        let i = menuTarget.selectedIndex + direction;
        while (i >= 0 && i < menuTarget.options.length && menuTarget.options[i].disabled) i += direction;
        if (i >= 0 && i < menuTarget.options.length) {menuTarget.selectedIndex=i;menuTarget.dispatchEvent(new Event('change',{bubbles:true}));} return;
      }
    }
    const items = menuItems(); if (!items.length) return;
    const index = items.indexOf(menuTarget); menuFocus(items[index < 0 ? 0 : (index + direction + items.length) % items.length]);
  }
  function menuBlocked() {
    const state = bridge.state();
    return !settings.enabled || !focused || document.hidden || state.busy || state.projector || dialog.open || [...document.querySelectorAll('dialog[open],[aria-modal="true"],#photoAnalyzerModal.open,#layoutQuickPanel.open,.table3DPopover:not([hidden])')].some(menuVisible);
  }
  const menuNotice = document.createElement('div'); menuNotice.id = 'trainerControllerMenuNotice'; menuNotice.hidden = true; menuNotice.setAttribute('role','status');
  menuNotice.textContent = 'MENU • D-pad: navigate • X: open / activate • Left / Right: change value • Square: back • L3: exit'; document.body.append(menuNotice);

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {} }
  function profileKey(pad) { return `${pad.source}:${pad.id}:${pad.mapping || 'raw'}`; }
  function freshProfile(pad) {
    const known = pad.mapping === 'standard';
    return {buttons:Array.from({length:Math.max(16, Math.min(32, pad.buttons.length))}, (_, i) => known && i < 16 ? defaults[i] : 'none'), axes:{aim:0, speed:1, side:2, follow:3}, invert:{}, configured:known, combos:known?defaultCombos():[]};
  }
  function normalizeProfile(pad, raw) {
    const p = freshProfile(pad);
    if (!raw || typeof raw !== 'object') return p;
    p.buttons = p.buttons.map((v, i) => Object.hasOwn(actions, raw.buttons?.[i]) ? raw.buttons[i] : v);
    for (const a of ['aim','speed','side','follow']) {
      if (Number.isInteger(raw.axes?.[a]) && raw.axes[a] >= -1 && raw.axes[a] < 16) p.axes[a] = raw.axes[a];
      p.invert[a] = raw.invert?.[a] === true;
    }
    if (Array.isArray(raw.combos)) p.combos = raw.combos.filter(c=>Number.isInteger(c.modifier)&&Number.isInteger(c.button)&&c.modifier>=0&&c.button>=0&&c.modifier<p.buttons.length&&c.button<p.buttons.length&&c.modifier!==c.button&&Object.hasOwn(actions,c.action)&&c.action!=='camera').map(c=>({...c}));
    if (comboError(p.combos)) p.combos = [];
    p.configured = raw.configured === true || p.configured;
    return p;
  }
  function comboError(combos) {
    const keys=new Set(),modifiers=new Set(combos.map(c=>c.modifier));
    for(const c of combos){
      if(c.modifier===c.button)return 'Choose two different buttons.';
      const key=c.modifier+':'+c.button;if(keys.has(key))return 'That combination already has an action.';keys.add(key);
      if(modifiers.has(c.button))return 'A modifier cannot also be a combination target. Use a different button.';
    }
    return '';
  }
  function resolveInputs() {
    const raw=current?.buttons||[],combos=(profile?.combos||[]).filter(c=>c.action!=='none');
    const eligible = c => !/^(pan|zoom)/.test(c.action) || window.Billiards3D?.active;
    for(const i of comboSuppressed)if((raw[i]||0)<.2)comboSuppressed.delete(i);
    const modifiers=new Set(combos.filter(eligible).map(c=>c.modifier));
    for(const c of combos)if(eligible(c)&&(raw[c.modifier]||0)>.5&&(raw[c.button]||0)>.2)comboSuppressed.add(c.button);
    effectiveInputs=(profile?.buttons||[]).map((action,i)=>({action,value:comboSuppressed.has(i)||(modifiers.has(i)&&action!=='camera')?0:(raw[i]||0)}));
    effectiveInputs.push(...combos.map(c=>{
      const key=c.modifier+':'+c.button,held=eligible(c)&&(raw[c.modifier]||0)>.5&&(raw[c.button]||0)>.2;
      if((raw[c.button]||0)<.2){comboLatched.delete(key);comboActive.delete(key);}
      if(!held)comboActive.delete(key);
      if(held&&!comboLatched.has(key)){comboLatched.add(key);comboActive.add(key);}
      return {action:c.action,value:comboActive.has(key)?raw[c.button]:0};
    }));
    return effectiveInputs.map(e=>e.value);
  }
  function renderCombos() {
    const container=el('trainerControllerCombos');container.replaceChildren();
    el('trainerControllerAddCombo').disabled=!profile;
    if(!profile)return;
    profile.combos.forEach((combo,index)=>{
      const row=document.createElement('div');row.className='controllerComboRow';
      for(const key of ['modifier','button','action']){
        const select=document.createElement('select');select.setAttribute('aria-label',`Combination ${index+1} ${key}`);
        if(key==='action'){for(const [value,label]of Object.entries(actions))if(value!=='camera')select.add(new Option(label,value));}
        else for(let i=0;i<profile.buttons.length;i++)if(!(i===16&&current.mapping==='standard'))select.add(new Option(names[i]||'Button '+i,String(i)));
        select.value=String(combo[key]);select.onchange=()=>{
          const next=profile.combos.map(c=>({...c}));next[index][key]=key==='action'?select.value:Number(select.value);
          const error=comboError(next);el('trainerControllerComboError').textContent=error;
          if(error){select.value=String(combo[key]);return;}profile.combos=next;saveProfile();renderCombos();
        };row.append(select);
      }
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove combination ${index+1}`);remove.onclick=()=>{profile.combos.splice(index,1);saveProfile();renderCombos();};row.append(remove);container.append(row);
    });
  }
  el('trainerControllerAddCombo').onclick=()=>{
    if(!profile)return;
    const limit=Math.min(16,profile.buttons.length);let next=null;
    for(let m=0;m<limit&&!next;m++)for(let b=0;b<limit&&!next;b++){const c={modifier:m,button:b,action:'none'};if(!comboError([...profile.combos,c]))next=c;}
    if(!next){el('trainerControllerComboError').textContent='No conflict-free combination available.';return;}
    profile.combos.push(next);saveProfile();renderCombos();
  };
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
    if (el('trainerControllerDevice').value !== selected) el('trainerControllerDevice').value = selected;
  }
  function saveProfile() {
    if (current && profile) settings.profiles[profileKey(current)] = profile;
    persist(); resetInput();
  }
  function renderMapping(force = false) {
    const rows = el('trainerControllerButtons'), axes = el('trainerControllerAxes');
    const available = !!(current && profile);
    for (const field of [...rows.querySelectorAll('select,input'), ...axes.querySelectorAll('select,input'), ...el('trainerControllerCombos').querySelectorAll('select,button')]) field.disabled = !available;
    el('trainerControllerReset').disabled = !available;
    // Android can briefly withdraw input while a native control changes focus.
    // Keep the form's height and scroll position; unavailable mappings are inert.
    el('trainerControllerAddCombo').disabled = !available;
    if (!available) return;
    const key = `${profileKey(current)}:${profile.buttons.length}`;
    if (!force && renderedProfile === key) return;
    const scrollTop = dialog.scrollTop;
    rows.replaceChildren(); axes.replaceChildren();
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
    renderedProfile = key;
    renderCombos();
    dialog.scrollTop = scrollTop;
  }
  for (const [key, title, min, max, step, suffix] of [['deadzone','Stick dead zone',.05,.4,.01,'%'], ['aim','Aim sensitivity',2,60,1,'deg/s'], ['speed','Speed sensitivity',.2,4,.1,'/s'], ['spin','Spin sensitivity',.2,2,.1,'/s'], ['cursorSpeed','Cursor speed',200,2400,100,'px/s']]) {
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
    document.querySelectorAll('#workspaceTools details[open],.zen-popover-open').forEach(d => d.open = false);
    el('trainerControllerEnabled').checked = settings.enabled;
    nativeEnable(); start();
  }
  function close() { dialog.close(); }
  el('trainerControllerClose').onclick = close;
  dialog.addEventListener('close', () => { resetInput(); nativeEnable(); start(); launch.focus({preventScroll:true}); });
  el('trainerControllerEnabled').checked = settings.enabled;
  el('trainerControllerEnabled').onchange = e => { settings.enabled = e.target.checked; persist(); resetInput(); nativeEnable(); start(); };
  el('trainerControllerDevice').onchange = e => { selected = e.target.value; deviceKey = ''; syncDevice(); };
  el('trainerControllerReset').onclick = () => { if (current) { profile = freshProfile(current); saveProfile(); renderMapping(true); } };
  function trayEvent(type) {
    if (!trayDrag) return;
    trayDrag.target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:988,pointerType:'mouse',button:0,buttons:type==='pointerup'||type==='pointercancel'?0:1,clientX:cursorX,clientY:cursorY}));
  }
  function endTray(cancel = false) {
    if (!trayDrag) return;
    const drag = trayDrag;
    const over = document.elementFromPoint(cursorX,cursorY);
    const onTable = over?.id === 'canvas' || over?.id === 'table3DCanvas';
    const allowed = !cancel && drag.target.isConnected && !drag.target.disabled && (!drag.moved || onTable);
    trayEvent(allowed ? 'pointerup' : 'pointercancel');
    trayDrag = null;
    if (allowed && !drag.moved && drag.target.contains(over)) drag.target.click();
  }
  function endPointer(cancel = false) {
    endTray(cancel);
    if (pointerDown) bridge.pointer(cancel ? 'pointercancel' : 'pointerup', cursorX, cursorY);
    pointerDown = false; clickTarget = null; cursor.dataset.dragging = 'false';
  }
  function resetInput() {
    exitMenu();
    comboSuppressed.clear(); comboLatched.clear(); comboActive.clear(); effectiveInputs = [];
    armed = false; previous = []; latched = []; repeatAt = {}; lastTime = 0; lastBlocked = true;
    pendingAdjust = {aim:0, speed:0, side:0, follow:0}; lastAdjust = 0;
    endPointer(true); pointerMode = false; cursor.hidden = true; bridge.finish();
  }
  function otherModal() {
    const selectors = 'dialog[open],[aria-modal="true"],#photoAnalyzerModal.open,#layoutQuickPanel.open,.table3DPopover:not([hidden]),#workspaceTools details[open],.zen-popover-open';
    return [...document.querySelectorAll(selectors)].some(e => e !== dialog && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  }
  function blocked() {
    const state = bridge.state(), a = document.activeElement;
    return !settings.enabled || document.hidden || !focused || state.busy || state.projector || dialog.open || otherModal() || !!a?.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])') || document.body.classList.contains('phone-controls-open');
  }
  function axis(key) {
    const value = Number(current?.axes[profile?.axes[key]]) || 0, size = Math.abs(value);
    return size <= settings.deadzone ? 0 : Math.sign(value) * (size - settings.deadzone) / (1 - settings.deadzone) * (profile.invert[key] ? -1 : 1);
  }
  function mapped(action) { return effectiveInputs.reduce((v,e)=>e.action===action?Math.max(v,e.value):v,0); }
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
      const ball = target?.closest('#workspaceBalls button[data-ball-id],#zenRack button[data-ball-id]');
      if (ball && !ball.disabled) { trayDrag = {target:ball,x:cursorX,y:cursorY,moved:false,threshold:ball.closest('#zenRack')?5:6}; trayEvent('pointerdown'); cursor.dataset.dragging = 'true'; }
      else if (target?.id === 'table3DCanvas' || target?.id === 'canvas') { pointerDown = bridge.pointer('pointerdown', cursorX, cursorY); cursor.dataset.dragging = String(pointerDown); }
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
    const rawValues = current?.buttons || [], values = resolveInputs();
    if (dialog.open) {
      if (rawValues.every(v => v < .2)) dialogReady = true;
      if (dialogReady && profile?.buttons.some((action, i) => action === 'settings' && rawValues[i] > .5 && (previous[i] || 0) < .2)) close();
    }
    const neutral = current && current.ready !== false && current.axes.every(v => Math.abs(v) <= settings.deadzone) && rawValues.every(v => v < .2);
    const stop = (menuMode ? menuBlocked() : blocked()) || !profile?.configured || current?.ready === false;
    if (stop || !current) {
      if (!lastBlocked || pointerMode) { endPointer(true); pointerMode = false; bridge.finish(); }
      armed = false; repeatAt = {};
      pendingAdjust = {aim:0, speed:0, side:0, follow:0};
    } else if (!armed) {
      if (neutral) { armed = true; latched = []; repeatAt = {}; }
    } else if (menuMode) {
      for (let i = 0; i < values.length; i++) {
        const action = effectiveInputs[i]?.action || 'none';
        if (values[i] > .5 && !latched[i]) {
          latched[i] = true;
          if (action === 'cursor') { resetInput(); break; }
          if (action === 'undo') { menuBack(); break; }
          if (action === 'confirm') menuActivate(menuTarget);
          if (action.startsWith('fine')) repeatAt[action] = 0;
        }
        if (values[i] < .2) latched[i] = false;
      }
      if (menuMode && !menuBlocked()) {
        for (const action of ['fineUp','fineDown','fineLeft','fineRight']) if (mapped(action) > .5 && time >= (repeatAt[action] || 0)) { repeatAt[action] = time + 180; menuNavigate(action); }
        const dx = axis('aim'), dy = axis('speed');
        if (dx || dy) {
          menuPointer = true;
          cursorX = clamp(cursorX + dx * dt * settings.cursorSpeed,12,innerWidth-12); cursorY = clamp(cursorY + dy * dt * settings.cursorSpeed,12,innerHeight-12);
          const target = document.elementFromPoint(cursorX,cursorY)?.closest(menuControlSelector);
          menuFocus(target?.closest('#panel,#workspaceTools') && menuVisible(target) ? target : null,false);
        }
      }
    } else {
      const camera = mapped('camera') > .5 && !!window.Billiards3D?.active;
      for (let i = 0; i < values.length; i++) {
        const action = effectiveInputs[i]?.action || 'none', threshold = action === 'shoot' ? .8 : .5;
        if (values[i] > threshold && !latched[i]) {
          latched[i] = true;
          if (action.startsWith('fine')) repeatAt[action] = 0;
          else press(action);
          // A shot, settings panel or mode change can block the rest of this frame.
          if (blocked()) break;
        }
        if (values[i] < .2) { latched[i] = false; if ((previous[i] || 0) >= .2) release(action); }
      }
      if (!document.body.classList.contains('zen-mode') && !blocked() && !camera && pointerMode && ['fineUp','fineDown','fineLeft','fineRight'].some(a => mapped(a) > .5)) { enterMenu(); for (const a of ['fineUp','fineDown','fineLeft','fineRight']) repeatAt[a] = time + 250; }
      if (!blocked() && !menuMode) {
        let fineAim = 0, fineSpeed = 0;
        for (const [action, direction] of [['fineLeft',-1],['fineRight',1],['fineUp',1],['fineDown',-1]]) if (mapped(action) > .5 && time >= (repeatAt[action] || 0)) {
          repeatAt[action] = time + 120;
          if (action === 'fineLeft' || action === 'fineRight') fineAim += direction * .15;
          else fineSpeed += direction * .01;
        }
        if (!camera && window.Billiards3D?.active) {
          const panX=((mapped('panRight')>.5?1:0)-(mapped('panLeft')>.5?1:0))*dt*280;
          const panY=((mapped('panDown')>.5?1:0)-(mapped('panUp')>.5?1:0))*dt*280;
          const zoomBy=((mapped('zoomOut')>.5?1:0)-(mapped('zoomIn')>.5?1:0))*dt*1.2;
          if(panX||panY||zoomBy)window.Billiards3D.controllerMove({panX,panY,zoomBy});
        }
        if (camera) {
          pendingAdjust = {aim:0, speed:0, side:0, follow:0};
          if(fineAim||fineSpeed)bridge.adjust({aim:fineAim,speed:fineSpeed});
          window.Billiards3D.controllerMove({rotateX:-axis('aim') * dt * 1.5, rotateY:axis('speed') * dt, panX:((mapped('panRight') > .5 ? 1 : 0) - (mapped('panLeft') > .5 ? 1 : 0)) * dt * 280, panY:((mapped('panDown') > .5 ? 1 : 0) - (mapped('panUp') > .5 ? 1 : 0)) * dt * 280, zoomBy:(axis('follow')+(mapped('zoomOut')>.5?1:0)-(mapped('zoomIn')>.5?1:0)) * dt * 1.2});
        }
        else if (pointerMode) {
          pendingAdjust = {aim:0, speed:0, side:0, follow:0};
          cursorX = clamp(cursorX + axis('aim') * dt * settings.cursorSpeed, 12, innerWidth - 12); cursorY = clamp(cursorY + axis('speed') * dt * settings.cursorSpeed, 12, innerHeight - 12);
          if (trayDrag) {
            if (!trayDrag.target.isConnected || trayDrag.target.disabled) endTray(true);
            else if (axis('aim') || axis('speed')) { trayDrag.moved ||= Math.hypot(cursorX-trayDrag.x,cursorY-trayDrag.y)>trayDrag.threshold; trayEvent('pointermove'); }
          }
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
    if (menuMode && menuBlocked()) resetInput();
    cursor.hidden = !pointerMode || stop; cursor.style.left = cursorX + 'px'; cursor.style.top = cursorY + 'px';
    if (time - lastUI >= 120) {
      lastUI = time;
      statusText = !current ? (nativeHost ? 'Waiting for a paired controller. Move a stick to begin.' : 'No controller detected. Pair it and press a button.' + (window.BilliardsAndroid ? ' If no readings appear, install the controller-enabled app update.' : '')) : !settings.enabled ? 'Controller detected. Enable Controller Mode to play.' : dialog.open ? 'Input test active. Table controls are paused.' : !profile?.configured ? 'Assign this controller in Controller Setup before playing.' : current.ready === false ? 'Move a stick, then release all controls to begin.' : stop ? 'Controller paused while another control is open.' : !armed ? 'Release all buttons, triggers and sticks to begin.' : menuMode ? 'Menu navigation active. Square goes back; L3 exits.' : pointerMode ? 'Positioning cursor active. Hold Cross and move the left stick to drag.' : 'Controller ready';
      const status = el('trainerControllerStatus');
      if (status.textContent !== statusText) status.textContent = statusText;
      if (dialog.open) {
        const raw = el('trainerControllerRaw');
        const text = current ? `${current.source === 'android' ? 'Android' : 'Browser'} input: ${current.mapping || 'nonstandard'}\nAxes: ${current.axes.map((v, i) => `${i}: ${Number(v).toFixed(2)}`).join('  ')}\nButtons: ${rawValues.map((v, i) => v > .05 ? `${i}: ${v.toFixed(2)}` : '').filter(Boolean).join('  ') || 'released'}` : 'Waiting for input...';
        if (raw.textContent !== text) raw.textContent = text;
      }
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
    if (menuMode && e.key === 'Escape') { e.preventDefault(); resetInput(); return; }
    if (settings.enabled && !blocked() && current && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)) {
      // Only suppress native gamepad key events; physical keyboards stay unchanged.
      if (e.code === '' || e.code === 'Unidentified') { e.preventDefault(); e.stopImmediatePropagation(); }
    }
  }, true);
  window.BilliardsController = {open, get enabled() { return settings.enabled; }, status() { return {enabled:settings.enabled, connected:!!current, armed, pointerMode, menuMode, source:current?.source || null, message:statusText}; }};
  nativeEnable(); start();
})();
