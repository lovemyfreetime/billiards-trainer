/* Shared 2D/3D workspace. Existing controls remain the owners of shot state. */
(() => {
  'use strict';
  if (!document.body.classList.contains('trainer-workspace')) return;
  const byId = id => document.getElementById(id);
  const bar = document.createElement('nav');
  bar.id = 'workspaceTools'; bar.setAttribute('aria-label', 'Table tools');
  const groups = {};
  for (const [key, label] of [['setup', 'Import'], ['view', 'View'], ['motion', 'Motion'], ['follow', 'Follow View']]) {
    const details = document.createElement('details'); details.id = 'workspace-' + key; details.className = 'workspaceTaskMenu';
    const summary = document.createElement('summary'); summary.textContent = label;
    const content = document.createElement('div'); content.className = 'workspaceToolGroup';
    details.append(summary, content); bar.append(details); groups[key] = content;
    details.addEventListener('toggle', () => {
      if (details.open) {
        picker.open = true;
        for (const other of bar.querySelectorAll('.workspaceTaskMenu')) if (other !== details) other.open = false;
        requestAnimationFrame(() => positionToolMenu(details));
      }
      summary.setAttribute('aria-expanded', String(details.open));
    });
  }
  const picker = document.createElement('details'); picker.id = 'workspace-picker';
  const pickerButton = document.createElement('summary'); pickerButton.setAttribute('aria-label', 'Import, View, Motion and Follow View');
  pickerButton.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  const fan = document.createElement('div'); fan.className = 'workspacePickerFan';
  fan.append(...bar.querySelectorAll('.workspaceTaskMenu')); picker.append(pickerButton, fan); bar.append(picker);
  function positionToolMenu(details) {
    if (!details.open) return;
    const summary = details.querySelector(':scope > summary'), menu = details.querySelector('.workspaceToolGroup');
    const r = summary.getBoundingClientRect(), width = Math.min(menu.offsetWidth, innerWidth-16);
    menu.style.setProperty('--tools-menu-top', r.bottom+8+'px');
    menu.style.setProperty('--tools-menu-left', Math.max(8, Math.min(innerWidth-width-8,r.left+(r.width-width)/2))+'px');
  }
  function positionPicker() {
    const mode = byId('table3DToggle'); if (!mode) return;
    const size = pickerButton.offsetWidth || 46, firstLeft = mode.getBoundingClientRect().right + 4;
    const radius = size + 6;
    picker.style.marginLeft = (radius - 2) + 'px';
    fan.style.setProperty('--picker-left', firstLeft + 'px');
    fan.style.setProperty('--picker-width', 2*radius+size+'px');
    fan.style.setProperty('--picker-height', radius+size+8+'px');
    fan.style.setProperty('--picker-size', size+'px');
    [...fan.children].forEach((details, i) => {
      const angle = Math.PI - i*Math.PI/3;
      details.style.setProperty('--picker-x', radius+radius*Math.cos(angle)+'px');
      details.style.setProperty('--picker-y', 8+radius*Math.sin(angle)+'px');
    });
    for (const d of fan.querySelectorAll('.workspaceTaskMenu[open]')) positionToolMenu(d);
  }
  picker.addEventListener('toggle', () => {
    pickerButton.setAttribute('aria-expanded', String(picker.open));
    if (picker.open) requestAnimationFrame(positionPicker);
    else fan.querySelectorAll('.workspaceTaskMenu').forEach(d => d.open = false);
  });
  const topActions = document.createElement('div'); topActions.id = 'workspaceTopActions';
  topActions.append(...document.querySelectorAll('#phoneActions > [data-trainer-action=undoShot],#phoneActions > [data-trainer-action=redoShot]'), byId('phoneControls'));
  bar.append(topActions);
  document.body.append(bar);
  const aiming = document.createElement('div'); aiming.id = 'workspaceAimTools';
  byId('featureAimingOptions').querySelector('legend').after(aiming);
  groups.aiming = aiming;
  const closeGroups = () => bar.querySelectorAll('details').forEach(d => d.open = false);
  document.addEventListener('pointerdown', e => {
    if (!picker.contains(e.target)) picker.open = false;
    if (!bar.contains(e.target)) closeGroups();
  }, {capture:true});
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = bar.querySelector('.workspaceTaskMenu[open]') || (picker.open ? picker : null);
    if (open) { closeGroups(); pickerButton.focus(); }
  });
  const groupIds = {
    setup: ['analyzePhotoBtn', 'cameraCaptureBtn', 'quickLayoutRecall'],
    aiming: ['kickToolToggle', 'bankToolToggle', 'teachingCompassToggle', 'compassSizeWrap', 'compassRotateWrap'],
    view: ['tableZoom', 'btg-fullscreen']
  };
  const rename = (id, text) => { const el = byId(id); if (el) { el.textContent = text; el.setAttribute('aria-label', text); } };
  rename('analyzePhotoBtn', 'Real Table Image Import');
  byId('analyzePhotoBtn').replaceChildren('Real Table', document.createElement('br'), 'Image Import');
  rename('cameraCaptureBtn', 'Camera Import');
  rename('quickLayoutRecall', 'Layouts'); rename('table3DRackToggle', 'Rack'); rename('teachingCompassToggle', 'Compass');
  const camera = byId('cameraCaptureBtn');
  if (camera) { camera.tabIndex = 0; camera.setAttribute('role', 'button'); camera.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); camera.click(); } }); }
  const fit = document.createElement('button'); fit.type = 'button'; fit.textContent = 'Full Table'; fit.id = 'workspaceFit';
  fit.onclick = () => { window.BilliardsTableZoom?.reset(); closeGroups(); };
  groups.view.append(fit);
  for (const key of Object.keys(groupIds)) for (const id of groupIds[key]) {
    const el = byId(id); if (!el) continue;
    if (!['compassSizeWrap', 'compassRotateWrap', 'angleLock', 'btg-fullscreen'].includes(id)) el.addEventListener('click', closeGroups);
  }
  for (const id of ['kickToolToggle', 'bankToolToggle']) byId(id).addEventListener('click', () => {
    if (document.body.classList.contains('phone-controls-open')) byId('phoneControls').click();
  });

  const shelf = document.createElement('section'); shelf.id = 'workspaceBallShelf'; shelf.setAttribute('aria-label', 'Ball tray');
  const trayToggle = byId('phoneTrayToggle');
  trayToggle.textContent = 'Balls'; trayToggle.setAttribute('aria-controls', 'workspaceBalls');
  const balls = document.createElement('div'); balls.id = 'workspaceBalls'; balls.setAttribute('role', 'group'); balls.setAttribute('aria-label', 'Add or return balls');
  const count = document.createElement('output'); count.id = 'workspaceBallCount'; count.setAttribute('aria-label', 'Balls pocketed');
  const clear = document.createElement('button'); clear.type = 'button'; clear.id = 'workspaceClearBalls'; clear.textContent = 'Clear';
  clear.setAttribute('aria-label', 'Clear table of all balls'); clear.title = 'Clear table';
  clear.onclick = () => { if (window.billiards3DBallControls?.clearTable()) sync(); };
  const earlier = document.createElement('button'), later = document.createElement('button');
  for (const [button, direction, label] of [[earlier, -1, 'Earlier balls'], [later, 1, 'More balls']]) {
    button.type = 'button'; button.className = 'workspaceTrayScroll'; button.textContent = direction < 0 ? '‹' : '›';
    button.setAttribute('aria-label', label); button.onclick = () => balls.scrollBy({left:direction * Math.max(80, balls.clientWidth * .7), behavior:'smooth'});
  }
  const syncScroll = () => {
    const overflow = balls.scrollWidth > balls.clientWidth + 2;
    earlier.hidden = later.hidden = !overflow;
    earlier.disabled = balls.scrollLeft <= 1; later.disabled = balls.scrollLeft + balls.clientWidth >= balls.scrollWidth - 1;
  };
  balls.addEventListener('scroll', syncScroll, {passive:true});
  new ResizeObserver(syncScroll).observe(balls);
  shelf.append(trayToggle, clear, earlier, balls, later, count); document.body.append(shelf);
  let trayLayoutPending=false,trayScrollRange=null;
  function alignBallTray(){
    trayLayoutPending=false;if(!balls.getClientRects().length)return;
    const frame=shelf.getBoundingClientRect(),scale=frame.width/shelf.offsetWidth;if(!(scale>0))return;
    let left=6;
    for(const control of [trayToggle,byId('table3DRackToggle'),byId('table3DShotOrder'),clear,byId('table3DLock')]){
      if(control?.parentElement!==shelf||!control.getClientRects().length)continue;
      left=Math.max(left,(control.getBoundingClientRect().right-frame.left)/scale+6);
    }
    const plan=byId('table3DPlanControls'),planWidth=plan?.parentElement===shelf&&!plan.hidden?plan.offsetWidth+6:0;
    const right=shelf.clientWidth-8-planWidth,available=Math.max(100,right-left);
    const columns=available>=16*26+15*4?16:8;
    const separate=available<8*26+7*4;
    const x=separate?6:left,width=Math.min(separate?shelf.clientWidth-12:available,columns*30+(columns-1)*3);
    balls.style.left=x+'px';balls.style.width=width+'px';balls.style.setProperty('--tray-columns',columns);
    balls.style.top=(separate?48:4)+'px';balls.style.transform='none';
    const height=Math.max(50,(separate?48:4)+(columns===16?32:68)+6);
    shelf.style.height=height+'px';shelf.style.setProperty('--tray-extra',Math.max(0,height-48)+'px');
    document.body.style.setProperty('--workspace-tray-extra',Math.max(0,height-48)+'px');
    earlier.hidden=later.hidden=true;balls.scrollLeft=0;
  }
  function queueTrayLayout(){if(!trayLayoutPending){trayLayoutPending=true;requestAnimationFrame(alignBallTray);}}
  const trayObserver=new ResizeObserver(queueTrayLayout);trayObserver.observe(shelf);trayObserver.observe(balls);
  if(byId('phoneActions'))trayObserver.observe(byId('phoneActions'));
  window.addEventListener('resize',queueTrayLayout);
  const colors = ['#f4f4ed', '#f6d21f', '#2678ff', '#e84132', '#744ac4', '#f07a22', '#2e9c4d', '#7b2d20', '#111'];
  function place(id, event) {
    if (window.billiardsZenControls?.status().busy) return;
    if (window.Billiards3D?.active) {
      const q = event ? window.Billiards3D.tablePoint(event) : null;
      if (!event || q) window.billiards3DBallControls?.place(id, q);
    } else window.billiardsZenControls?.place(id, event?.clientX, event?.clientY);
    sync();
  }
  const buttons = Array.from({length: 24}, (_, id) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.ballId = id;
    button.className = 'workspaceBall' + (id > 8 ? ' stripe' : '');
    button.style.setProperty('--ball-color', colors[id > 8 ? id - 8 : id]);
    button.style.setProperty('--ball-art', 'url("' + window.BilliardsBallArt.url(id) + '")');
    const number = document.createElement('span'); number.textContent = id || 'C'; number.hidden = true; button.append(number);
    let drag = null, moved = false, ghost = null;
    const cleanup = () => { drag = null; ghost?.remove(); ghost = null; };
    button.addEventListener('pointerdown', e => {
      if (e.button !== 0 || button.disabled) return;
      e.preventDefault();
      drag = {x:e.clientX, y:e.clientY}; moved = false; button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', e => {
      if (!drag) return;
      moved ||= Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6;
      if (!moved) return;
      if(id===0&&window.Billiards3D?.active&&!window.Billiards3D.locked)window.Billiards3D.arrangeBalls(true);
      if (!ghost) { ghost = button.cloneNode(true); ghost.classList.add('workspaceBallGhost'); ghost.setAttribute('aria-hidden', 'true'); ghost.tabIndex = -1; document.body.append(ghost); }
      ghost.style.left = (e.clientX - 18) + 'px'; ghost.style.top = (e.clientY - 18) + 'px';
    });
    button.addEventListener('pointerup', e => { if (!drag) return; cleanup(); if (moved) place(id, e); });
    button.addEventListener('pointercancel', () => { cleanup(); moved = true; });
    button.addEventListener('lostpointercapture', cleanup);
    button.addEventListener('click', e => { if (!moved || e.detail === 0) place(id); moved = false; });
    balls.append(button); return button;
  });
  // Native table drags retain capture on their canvas, including past its edge.
  let tableDrag = null, tableGhost = null;
  const contains = (el, e) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  const dropTarget = e => contains(shelf, e) ? shelf : contains(trayToggle, e) ? trayToggle : null;
  const clearTableDrag = () => {
    tableDrag = null; tableGhost?.remove(); tableGhost = null;
    shelf.classList.remove('ball-drop-ready'); trayToggle.classList.remove('ball-drop-ready');
  };
  window.billiardsWorkspaceBallDrag = {
    begin(id, e) { clearTableDrag(); if (id >= 0 && id <= 15) tableDrag = {id, x:e.clientX, y:e.clientY}; },
    move(e) {
      if (!tableDrag) return;
      const target = dropTarget(e);
      shelf.classList.toggle('ball-drop-ready', target === shelf);
      trayToggle.classList.toggle('ball-drop-ready', target === trayToggle);
      const outside = !contains(byId('stageWrap'), e);
      if ((outside || target) && !tableGhost) {
        tableGhost = buttons[tableDrag.id].cloneNode(true); tableGhost.disabled = false;
        tableGhost.classList.remove('on-table', 'pocketed'); tableGhost.classList.add('workspaceBallGhost');
        tableGhost.setAttribute('aria-hidden', 'true'); tableGhost.tabIndex = -1; document.body.append(tableGhost);
      }
      if (tableGhost) { tableGhost.hidden = !outside && !target; tableGhost.style.left = (e.clientX - 17) + 'px'; tableGhost.style.top = (e.clientY - 17) + 'px'; }
    },
    end(e) {
      const accepted = !!tableDrag && Math.hypot(e.clientX - tableDrag.x, e.clientY - tableDrag.y) > 6 && !!dropTarget(e);
      clearTableDrag(); return accepted;
    },
    cancel: clearTableDrag
  };
  window.addEventListener('blur', clearTableDrag);
  function sync() {
    const data = window.billiards3DBallControls?.status(); if (!data) return;
    const set=data.ballSet||'classic', art=window.BilliardsInternational, maxId=art.maxId(set);
    for (const button of buttons) {
      const id = Number(button.dataset.ballId), present = data.balls.includes(id), pocketed = data.pocketed.includes(id);
      button.hidden=id>maxId;
      button.disabled = button.hidden || data.busy || present&&id!==0;
      const design=art.ball(set,id);
      if(!button.hidden&&button.dataset.set!==set){
        button.style.setProperty('--ball-art','url("'+window.BilliardsBallArt.url(id,set)+'")');
        button.dataset.set=set;
      }
      button.classList.toggle('on-table', present); button.classList.toggle('pocketed', pocketed);
      const label = (design?.name||(id ? 'Ball ' + id : 'Cue ball')) + (present ? (id===0?' on table. Drag to reposition':' on table') : pocketed ? ' pocketed. Tap or drag to return' : '. Tap or drag to add');
      button.setAttribute('aria-label', label); button.title = label;
    }
    count.textContent = data.pocketed.length ? data.pocketed.length + ' pocketed' : '';
    count.title=count.textContent;trayToggle.title=count.textContent||'Ball tray';
    queueTrayLayout();
    clear.disabled = data.busy;
    trayToggle.setAttribute('aria-label', document.body.classList.contains('phone-tray-hidden') ? 'Show ball tray' : 'Hide ball tray');
  }
  const trayState = {twoD: true, threeD: false};
  try{Object.assign(trayState,JSON.parse(localStorage.getItem('trainer.ballTray.v1')||'{}'));}catch{}
  let dockMode = null;
  trayToggle.addEventListener('click', () => { trayState[dockMode ? 'threeD' : 'twoD'] = !document.body.classList.contains('phone-tray-hidden'); try{localStorage.setItem('trainer.ballTray.v1',JSON.stringify(trayState));}catch{}if(document.body.classList.contains('phone-tray-hidden'))window.Billiards3D?.arrangeBalls(false);sync(); window.dispatchEvent(new Event('resize')); });
  window.billiardsWorkspaceSync = sync;
  // Busy changes during a shot also disable tray placement before the next UI update.
  const shoot = byId('animate');
  if (shoot) new MutationObserver(sync).observe(shoot, {attributes:true, attributeFilter:['disabled', 'data-running']});
  const move = (parent, element) => { if (element && element.parentNode !== parent) parent.append(element); };
  window.billiardsWorkspaceDock = () => {
    for (const [key, ids] of Object.entries(groupIds)) for (const id of ids) move(groups[key], byId(id));
    move(byId('featureCueOptions'), byId('angleLock'));
    const active = document.body.classList.contains('table-3d');
    const views = byId('table3DViews'), tools = byId('table3DTools');
    const cameraRow = byId('table3DPhoneControls');
    if (dockMode !== active) {
      dockMode = active;
      document.body.classList.toggle('phone-tray-hidden', !trayState[active ? 'threeD' : 'twoD']);
      trayToggle.setAttribute('aria-expanded', String(trayState[active ? 'threeD' : 'twoD']));
    }
    const ballLock=byId('table3DLock');if(ballLock){move(shelf,ballLock);ballLock.hidden=!active;}
    if (active) {
      cameraRow.hidden = false; move(document.body, cameraRow);
      move(cameraRow, tools); move(cameraRow, views);
      if(document.body.classList.contains('phone-tray-hidden')) { move(tools, trayToggle); tools.prepend(trayToggle); }
      else shelf.prepend(trayToggle);
    } else {
      cameraRow.hidden = true; move(groups.view, views); move(groups.view, tools);
      shelf.prepend(trayToggle);
    }
    fit.hidden = active;
    const rack=byId('table3DRackToggle'),order=byId('table3DShotOrder'),plan=byId('table3DPlanControls');
    if(rack&&order&&plan){
      const onTools=active&&trayToggle.parentNode===tools;
      tools.classList.toggle('tray-actions-in-tools',onTools);
      if(onTools){
        if(trayToggle.nextElementSibling!==rack||rack.nextElementSibling!==order)trayToggle.after(rack,order);
        move(tools,plan);
      }else{
        if(clear.previousElementSibling!==order||order.previousElementSibling!==rack)clear.before(rack,order);
        move(shelf,plan);
      }
      queueTrayLayout();
    }
    const experience = byId('btZenLauncher');
    if (experience && experience.parentNode !== bar) bar.prepend(experience);
    const mode = byId('table3DToggle');
    if (mode) { if (experience) experience.after(mode); else bar.prepend(mode); mode.after(picker); }
    move(bar, byId('phoneAimChoice'));
    sync();
    positionPicker();
  };
  byId('phoneControls')?.addEventListener('click', closeGroups);
  const experienceObserver = new MutationObserver(() => {
    if (byId('btZenLauncher')) { bar.prepend(byId('btZenLauncher')); window.billiardsWorkspaceDock(); experienceObserver.disconnect(); }
  });
  experienceObserver.observe(document.body, {childList:true});
  window.billiardsWorkspaceDock();
  window.addEventListener('resize', positionPicker);
  window.dispatchEvent(new Event('resize'));
})();
