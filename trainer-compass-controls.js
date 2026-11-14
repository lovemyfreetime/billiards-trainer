/* Screen-space handles keep the compass usable beyond the cloth in either view. */
(() => {
  'use strict';
  const api = window.billiardsCompassControls;
  if (!api || !document.body.classList.contains('trainer-workspace')) return;
  const layer = document.createElement('div'); layer.id = 'compassHandles';
  layer.setAttribute('role', 'group'); layer.setAttribute('aria-label', 'Compass adjustments');
  document.body.append(layer);
  let active = null;
  const finish = cancel => {
    if (!active) return;
    const {gesture, button, pointer} = active; active = null;
    button.classList.remove('dragging');
    api.end(gesture, cancel);
    if (button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
    sync();
  };
  const handles = ['rotate', 'resize'].flatMap(kind => Array.from({length:4}, (_, i) => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'compassHandle ' + kind; button.dataset.handle = kind + i;
    button.setAttribute('aria-label', (kind === 'rotate' ? 'Rotate compass' : 'Resize compass') + ' handle ' + (i + 1));
    button.title = kind === 'rotate' ? 'Drag to rotate' : 'Drag inward or outward to resize';
    button.addEventListener('pointerdown', e => {
      if (e.button !== 0 || active) return;
      e.preventDefault(); e.stopPropagation();
      const gesture = api.begin(kind, e); if (!gesture) return;
      active = {gesture, button, pointer:e.pointerId}; button.classList.add('dragging');
      button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', e => {
      if (active?.pointer !== e.pointerId || active.button !== button) return;
      e.preventDefault(); e.stopPropagation(); api.move(active.gesture, e);
    });
    button.addEventListener('pointerup', e => { if (active?.pointer === e.pointerId) { api.move(active.gesture, e); finish(false); } });
    for (const event of ['pointercancel', 'lostpointercapture']) button.addEventListener(event, e => { if (active?.pointer === e.pointerId) finish(true); });
    button.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || active) return;
      e.preventDefault(); e.stopPropagation();
      const r = button.getBoundingClientRect(), start = {clientX:r.x+r.width/2,clientY:r.y+r.height/2}, g = api.begin(kind, start);
      if (!g) return;
      const sign = ['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : -1;
      const angle = g.bearing + (kind === 'rotate' ? sign * Math.PI / 180 * (e.shiftKey ? 10 : 1) : 0);
      const radius = g.distance + (kind === 'resize' ? sign * .015 * (e.shiftKey ? 5 : 1) : 0);
      const p = api.project({x:g.x+Math.cos(angle)*radius,y:g.y+Math.sin(angle)*radius});
      if (p) api.move(g, {clientX:p.x,clientY:p.y}); api.end(g);
    });
    layer.append(button); return {button, kind, i};
  }));
  function sync() {
    const c = api.state();
    layer.hidden = !c.enabled;
    if (!c.enabled) { if (active) finish(true); return; }
    const stage = document.getElementById('stageWrap').getBoundingClientRect(), center = api.project(c);
    for (const h of handles) {
      const angle = h.i * Math.PI / 2 + (h.kind === 'rotate' ? c.angle : 0);
      let radius = c.radius * (h.kind === 'rotate' ? .30 : 1);
      let p = api.project({x:c.x+Math.cos(angle)*radius,y:c.y+Math.sin(angle)*radius});
      if (h.kind === 'rotate' && p && center) {
        const distance = Math.hypot(p.x-center.x,p.y-center.y);
        radius *= Math.min(2.1, Math.max(1, 36 / (distance || 1)));
        p = api.project({x:c.x+Math.cos(angle)*radius,y:c.y+Math.sin(angle)*radius});
      }
      const visible = p && p.visible && p.x >= stage.left+10 && p.x <= stage.right-10 && p.y >= stage.top+10 && p.y <= stage.bottom-10;
      h.button.hidden = !visible && active?.button !== h.button;
      if (!p) continue;
      h.button.style.left = p.x + 'px'; h.button.style.top = p.y + 'px';
      const distance = center ? Math.hypot(p.x-center.x,p.y-center.y) : 44;
      h.button.style.setProperty('--handle-hit', Math.min(44, Math.max(20, distance * .9)) + 'px');
    }
  }
  for (const event of ['billiards:2d-render', 'billiards:3d-render', 'resize']) window.addEventListener(event, sync);
  window.addEventListener('blur', () => finish(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') finish(true); });
  new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
  sync();
})();
