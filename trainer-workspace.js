/* Shared 2D/3D workspace. Existing controls remain the owners of shot state. */
(() => {
  'use strict';
  if (!document.body.classList.contains('trainer-workspace')) return;
  const byId = id => document.getElementById(id);
  const bar = document.createElement('nav');
  bar.id = 'workspaceTools'; bar.setAttribute('aria-label', 'Table tools');
  const groups = {};
  for (const [key, label] of [['setup', 'Import'], ['view', 'View'], ['motion', 'Motion'], ['follow', 'Follow View']]) {
    const details = document.createElement('details'); details.id = 'workspace-' + key;
    const summary = document.createElement('summary'); summary.textContent = label;
    const content = document.createElement('div'); content.className = 'workspaceToolGroup';
    details.append(summary, content); bar.append(details); groups[key] = content;
    details.addEventListener('toggle', () => {
      if (details.open) for (const other of bar.querySelectorAll('details')) if (other !== details) other.open = false;
      summary.setAttribute('aria-expanded', String(details.open));
    });
  }
  document.body.append(bar);
  const aiming = document.createElement('div'); aiming.id = 'workspaceAimTools';
  byId('featureAimingOptions').querySelector('legend').after(aiming);
  groups.aiming = aiming;
  const closeGroups = () => bar.querySelectorAll('details').forEach(d => d.open = false);
  document.addEventListener('pointerdown', e => { if (!bar.contains(e.target)) closeGroups(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = bar.querySelector('details[open]');
    if (open) { open.open = false; open.querySelector('summary').focus(); }
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
  const colors = ['#f4f4ed', '#f6d21f', '#2678ff', '#e84132', '#744ac4', '#f07a22', '#2e9c4d', '#7b2d20', '#111'];
  function place(id, event) {
    if (window.billiardsZenControls?.status().busy) return;
    if (window.Billiards3D?.active) {
      const q = event ? window.Billiards3D.tablePoint(event) : null;
      if (!event || q) window.billiards3DBallControls?.place(id, q);
    } else window.billiardsZenControls?.place(id, event?.clientX, event?.clientY);
    sync();
  }
  const buttons = Array.from({length: 16}, (_, id) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.ballId = id;
    button.className = 'workspaceBall' + (id > 8 ? ' stripe' : '');
    button.style.setProperty('--ball-color', colors[id > 8 ? id - 8 : id]);
    const number = document.createElement('span'); number.textContent = id || 'C'; button.append(number);
    let drag = null, moved = false, ghost = null;
    const cleanup = () => { drag = null; ghost?.remove(); ghost = null; };
    button.addEventListener('pointerdown', e => {
      if (e.button !== 0 || button.disabled) return;
      drag = {x:e.clientX, y:e.clientY}; moved = false; button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', e => {
      if (!drag) return;
      moved ||= Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6;
      if (!moved) return;
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
    for (const button of buttons) {
      const id = Number(button.dataset.ballId), present = data.balls.includes(id), pocketed = data.pocketed.includes(id);
      button.disabled = data.busy || present;
      button.classList.toggle('on-table', present); button.classList.toggle('pocketed', pocketed);
      const label = (id ? 'Ball ' + id : 'Cue ball') + (present ? ' on table' : pocketed ? ' pocketed. Tap or drag to return' : '. Tap or drag to add');
      button.setAttribute('aria-label', label); button.title = label;
    }
    count.textContent = data.pocketed.length ? data.pocketed.length + ' pocketed' : '';
    clear.disabled = data.busy;
    trayToggle.setAttribute('aria-label', document.body.classList.contains('phone-tray-hidden') ? 'Show ball tray' : 'Hide ball tray');
  }
  const trayState = {twoD: true, threeD: false};
  let dockMode = null;
  trayToggle.addEventListener('click', () => { trayState[dockMode ? 'threeD' : 'twoD'] = !document.body.classList.contains('phone-tray-hidden'); sync(); window.dispatchEvent(new Event('resize')); });
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
    const rack = byId('table3DRackToggle');
    if (rack) {
      if (active && trayToggle.parentNode === tools) trayToggle.after(rack);
      else clear.before(rack);
    }
    const experience = byId('btZenLauncher');
    if (experience && experience.parentNode !== bar) bar.prepend(experience);
    const mode = byId('table3DToggle');
    if (mode) { if (experience) experience.after(mode); else bar.prepend(mode); }
    move(bar, byId('phoneAimChoice'));
    sync();
  };
  byId('phoneControls')?.addEventListener('click', closeGroups);
  const experienceObserver = new MutationObserver(() => {
    if (byId('btZenLauncher')) { bar.prepend(byId('btZenLauncher')); window.billiardsWorkspaceDock(); experienceObserver.disconnect(); }
  });
  experienceObserver.observe(document.body, {childList:true});
  window.billiardsWorkspaceDock();
  window.dispatchEvent(new Event('resize'));
})();
