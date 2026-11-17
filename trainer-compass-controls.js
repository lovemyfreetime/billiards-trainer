/* Invisible hit strokes follow the original compass in both table views. */
(() => {
  'use strict';
  const api = window.billiardsCompassControls;
  if (!api || !document.body.classList.contains('trainer-workspace')) return;
  const ns = 'http://www.w3.org/2000/svg', layer = document.createElement('div');
  layer.id = 'compassHandles'; layer.setAttribute('role', 'group'); layer.setAttribute('aria-label', 'Compass adjustments');
  const svg = document.createElementNS(ns, 'svg'), defs = document.createElementNS(ns, 'defs');
  const clip = document.createElementNS(ns, 'clipPath'), bounds = document.createElementNS(ns, 'rect');
  clip.id = 'compassStageClip'; clip.setAttribute('clipPathUnits', 'userSpaceOnUse'); clip.append(bounds); defs.append(clip); svg.append(defs);
  const group = document.createElementNS(ns, 'g'); group.setAttribute('clip-path', 'url(#compassStageClip)'); svg.append(group); layer.append(svg); document.body.append(layer);
  let active = null;
  const valid = p => p && p.visible && Number.isFinite(p.x) && Number.isFinite(p.y);
  const finish = cancel => {
    if (!active) return;
    const {gesture, target, pointer} = active; active = null;
    target.classList.remove('dragging'); api.end(gesture, cancel);
    if (target.hasPointerCapture(pointer)) target.releasePointerCapture(pointer);
    sync();
  };
  function hitStroke(kind, axis = 0) {
    const path = document.createElementNS(ns, 'path');
    path.classList.add('compassHit', kind); path.dataset.compassAction = kind; path.dataset.axis = axis;
    path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button');
    path.setAttribute('aria-label', kind === 'resize' ? 'Resize compass by dragging its outer ring' : axis ? 'Rotate compass by dragging its cross line' : 'Rotate compass by dragging its arrow line');
    path.addEventListener('pointerdown', e => {
      if (e.button !== 0 || active) return;
      const gesture = api.begin(kind, e); if (!gesture) return;
      e.preventDefault(); e.stopPropagation(); active = {gesture, target:path, pointer:e.pointerId};
      path.classList.add('dragging'); path.setPointerCapture(e.pointerId);
    });
    path.addEventListener('pointermove', e => {
      if (active?.pointer !== e.pointerId || active.target !== path) return;
      e.preventDefault(); e.stopPropagation(); api.move(active.gesture, e);
    });
    path.addEventListener('pointerup', e => { if (active?.pointer === e.pointerId) { api.move(active.gesture, e); finish(false); } });
    for (const event of ['pointercancel', 'lostpointercapture']) path.addEventListener(event, e => { if (active?.pointer === e.pointerId) finish(true); });
    path.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) || active) return;
      const c = api.state(), bearing = kind === 'rotate' ? c.angle + axis*Math.PI/2 : 0, distance = c.radius * (kind === 'rotate' ? .7 : 1);
      const p = api.project({x:c.x+Math.cos(bearing)*distance,y:c.y+Math.sin(bearing)*distance}); if (!valid(p)) return;
      const g = api.begin(kind, {clientX:p.x,clientY:p.y}); if (!g) return;
      e.preventDefault(); e.stopPropagation();
      const sign = ['ArrowRight','ArrowUp'].includes(e.key) ? 1 : -1;
      const angle = g.bearing + (kind === 'rotate' ? sign*Math.PI/180*(e.shiftKey ? 10 : 1) : 0);
      const radius = g.distance + (kind === 'resize' ? sign*.015*(e.shiftKey ? 5 : 1) : 0);
      const q = api.project({x:g.x+Math.cos(angle)*radius,y:g.y+Math.sin(angle)*radius});
      if (valid(q)) api.move(g, {clientX:q.x,clientY:q.y}); api.end(g);
    });
    group.append(path); return path;
  }
  const lines = [hitStroke('rotate', 0), hitStroke('rotate', 1)], ring = hitStroke('resize');
  function sync() {
    const c = api.state(); layer.hidden = !c.enabled;
    if (!c.enabled) { if (active) finish(true); return; }
    const stage = document.getElementById('stageWrap').getBoundingClientRect(), center = api.project(c);
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    for (const [key,value] of Object.entries({x:stage.x,y:stage.y,width:stage.width,height:stage.height})) bounds.setAttribute(key,value);
    let outline = '', previous = false;
    for (let i=0;i<=72;i++) {
      const angle = i*Math.PI/36, p = api.project({x:c.x+Math.cos(angle)*c.radius,y:c.y+Math.sin(angle)*c.radius});
      if (!valid(p)) { previous=false; continue; }
      outline += `${previous ? 'L' : 'M'}${p.x},${p.y}`; previous=true;
    }
    ring.setAttribute('d',outline);
    lines.forEach((line,axis) => {
      let d = '';
      for (const sign of [-1,1]) {
        const angle = c.angle+axis*Math.PI/2, dx=Math.cos(angle)*sign, dy=Math.sin(angle)*sign;
        const end = api.project({x:c.x+dx*c.radius,y:c.y+dy*c.radius});
        if (!valid(end) || !valid(center)) continue;
        // Leave the existing center hub available for moving and linking the compass.
        const gap = Math.min(.8,16/(Math.hypot(end.x-center.x,end.y-center.y)||1));
        const start = api.project({x:c.x+dx*c.radius*gap,y:c.y+dy*c.radius*gap});
        if (valid(start)) d += `M${start.x},${start.y}L${end.x},${end.y}`;
      }
      line.setAttribute('d',d);
    });
  }
  for (const event of ['billiards:2d-render','billiards:3d-render','resize']) window.addEventListener(event,sync);
  window.addEventListener('blur',()=>finish(true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')finish(true);});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  sync();
})();
