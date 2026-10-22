(function () {
  'use strict';
  if (document.body.classList.contains('projector')) return;
  const panel = document.getElementById('panel');
  const title = panel?.querySelector('.btg-pool-title');
  const launchers = document.getElementById('btg-pool-launchers');
  if (!panel || !title || !launchers) return;
  const home = document.createComment('Trainer title position');
  title.before(home);
  const header = document.createElement('header');
  header.id = 'phoneHeader';
  const controls = document.createElement('button');
  controls.id = 'phoneControls'; controls.type = 'button';
  controls.textContent = 'Controls'; controls.setAttribute('aria-controls', 'panel');
  controls.setAttribute('aria-expanded', 'false');
  header.append(controls);
  const dismiss = document.createElement('button');
  dismiss.id = 'phoneDismiss'; dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Close controls'); dismiss.tabIndex = -1;
  const actions = document.createElement('nav');
  actions.id = 'phoneActions'; actions.setAttribute('aria-label', 'Table actions');
  for (const [id, label] of [['animate', 'Execute Shot'], ['undoShot', 'Undo'], ['resetLayoutQuick', 'Reset'], ['toggleShot2', '+ Shot 2'], ['toggleCueVisuals1Btn', 'Hide CB 1'], ['toggleCueVisuals2Btn', 'Hide CB 2']]) {
    const source = document.getElementById(id);
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.dataset.trainerAction = id;
    if (id === 'animate') { button.classList.add('primary');button.textContent='Shoot';button.setAttribute('aria-label','Execute Shot'); }
    const sync = () => {
      button.disabled = !source || !!source.disabled;
      if(source?.dataset.guideTopic) button.dataset.guideTopic=source.dataset.guideTopic;
      if(id === 'toggleShot2') button.textContent = source?.textContent?.includes('−') ? '− Shot 2' : '+ Shot 2';
      if(id.startsWith('toggleCueVisuals')) {
        const visible = source?.getAttribute('aria-pressed') !== 'false';
        button.textContent = (visible ? 'Hide' : 'Show') + (id.includes('1') ? ' CB 1' : ' CB 2');
        button.setAttribute('aria-pressed',String(visible));
        button.setAttribute('aria-label',(visible ? 'Hide' : 'Show') + (id.includes('1') ? ' cue ball 1' : ' cue ball 2'));
      }
    };
    sync();
    if (source) new MutationObserver(sync).observe(source, {attributes:true,attributeFilter:['disabled','data-guide-topic','aria-pressed'],childList:true,characterData:true,subtree:true});
    button.addEventListener('click', () => { if (source && !source.disabled) source.click(); });
    actions.append(button);
  }
  const shot2Source=document.getElementById('toggleShot2');
  const syncShot2Actions=()=>{
    const on=shot2Source?.textContent?.includes('−') || false;
    document.body.classList.toggle('phone-two-shots',on);
    const second=actions.querySelector('[data-trainer-action="toggleCueVisuals2Btn"]');
    if(second)second.hidden=!on;
  };
  if(shot2Source)new MutationObserver(syncShot2Actions).observe(shot2Source,{childList:true,characterData:true,subtree:true});
  syncShot2Actions();
  for (const which of [1,2]) {
    const disk = document.createElement('canvas');
    disk.id = 'phoneTip' + which; disk.className = 'phoneTipControl'; disk.hidden = true;
    disk.width = 60; disk.height = 64;
    disk.setAttribute('aria-label','Cue ball ' + which + ': touch to set follow, draw and English');
    disk.dataset.guideTopic = 'cue-ball-diagram-direct-tip-quick';
    let pointer = null;
    disk.addEventListener('pointerdown', event => {
      if(event.button != null && event.button !== 0) return;
      pointer = event.pointerId; disk.setPointerCapture(pointer);
      event.preventDefault(); event.stopPropagation();
      window.billiardsFixedTipInput?.(event,which,'move');
    });
    disk.addEventListener('pointermove', event => {
      if(pointer !== event.pointerId) return;
      event.preventDefault(); window.billiardsFixedTipInput?.(event,which,'move');
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture']) disk.addEventListener(type,event => {
      if(pointer !== event.pointerId) return;
      pointer=null; window.billiardsFixedTipInput?.(event,which,'end');
    });
    document.body.append(disk);
  }
  const notice = document.createElement('div'); notice.id = 'phoneNotice'; notice.setAttribute('role','status');
  const message = document.createElement('span');
  const closeNotice = document.createElement('button'); closeNotice.type = 'button'; closeNotice.textContent = '×'; closeNotice.setAttribute('aria-label','Dismiss fullscreen tip');
  closeNotice.addEventListener('click', () => notice.classList.remove('visible'));
  notice.append(message,closeNotice);
  const flightCanvas = document.createElement('canvas'); flightCanvas.id = 'phoneFlightCanvas'; flightCanvas.setAttribute('aria-hidden','true');
  const scrollRail = document.createElement('div'); scrollRail.id = 'phonePanelScroll'; scrollRail.tabIndex = 0;
  scrollRail.setAttribute('role','scrollbar'); scrollRail.setAttribute('aria-label','Scroll controls');
  scrollRail.setAttribute('aria-controls','panel'); scrollRail.setAttribute('aria-orientation','vertical'); scrollRail.setAttribute('aria-valuemin','0');
  const scrollThumb = document.createElement('div'); scrollThumb.id = 'phonePanelScrollThumb'; scrollRail.append(scrollThumb);
  document.body.append(header,dismiss,actions,notice,flightCanvas,scrollRail);
  function scrollGeometry() {
    const height = scrollRail.clientHeight || 0;
    const max = Math.max(0,panel.scrollHeight-panel.clientHeight);
    const thumb = Math.min(height,Math.max(24,height*panel.clientHeight/Math.max(1,panel.scrollHeight)));
    return {height,max,thumb,travel:Math.max(0,height-thumb)};
  }
  function syncScroll() {
    const g = scrollGeometry();
    scrollThumb.style.height = g.thumb+'px';
    scrollThumb.style.top = (g.max ? g.travel*panel.scrollTop/g.max : 0)+'px';
    scrollRail.setAttribute('aria-valuemax',String(Math.round(g.max)));
    scrollRail.setAttribute('aria-valuenow',String(Math.round(panel.scrollTop || 0)));
  }
  let railDrag = null;
  scrollRail.addEventListener('pointerdown',event => {
    const g = scrollGeometry(); if(!g.max || !g.travel) return;
    const y = event.clientY-scrollRail.getBoundingClientRect().top;
    const thumbY = g.travel*panel.scrollTop/g.max;
    if(y < thumbY || y > thumbY+g.thumb) panel.scrollTop=Math.max(0,Math.min(g.max,(y-g.thumb/2)*g.max/g.travel));
    railDrag = {y:event.clientY,scroll:panel.scrollTop};
    scrollRail.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation(); syncScroll();
  });
  scrollRail.addEventListener('pointermove',event => {
    if(!railDrag) return; const g=scrollGeometry();
    if(g.travel) panel.scrollTop=Math.max(0,Math.min(g.max,railDrag.scroll+(event.clientY-railDrag.y)*g.max/g.travel));
    event.preventDefault(); syncScroll();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])scrollRail.addEventListener(type,()=>{railDrag=null});
  scrollRail.addEventListener('wheel',event => {panel.scrollTop+=event.deltaY; event.preventDefault(); syncScroll()}, {passive:false});
  scrollRail.addEventListener('keydown',event => {
    const steps={ArrowDown:40,ArrowUp:-40,PageDown:panel.clientHeight*.8,PageUp:-panel.clientHeight*.8};
    if(event.key in steps)panel.scrollTop+=steps[event.key];
    else if(event.key==='Home')panel.scrollTop=0;
    else if(event.key==='End')panel.scrollTop=panel.scrollHeight;
    else return;
    event.preventDefault(); event.stopPropagation(); syncScroll();
  });
  panel.addEventListener('scroll',syncScroll);
  new MutationObserver(syncScroll).observe(panel,{childList:true,subtree:true,attributes:true});
  if(window.ResizeObserver)new ResizeObserver(syncScroll).observe(panel);
  let observedGuide = null;
  const guideResize = window.ResizeObserver ? new ResizeObserver(() => syncGuideSpace()) : null;
  function syncGuideSpace() {
    const guide = document.getElementById('bt-guide-pool-root');
    if(guide && guide !== observedGuide && guideResize) {guideResize.disconnect(); guideResize.observe(guide); observedGuide=guide}
    const height = phone.matches && guide?.classList.contains('btg-enabled') ? guide.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--phone-guide-height',height+'px');
  }
  new MutationObserver(syncGuideSpace).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const fullscreen = document.createElement('button');
  fullscreen.id = 'btg-fullscreen'; fullscreen.type = 'button'; fullscreen.className = 'btg-launcher';
  fullscreen.title = 'Fullscreen table'; fullscreen.setAttribute('aria-label','Enter fullscreen'); fullscreen.setAttribute('aria-pressed','false');
  fullscreen.dataset.btgAllow = '1';
  fullscreen.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/></svg>';
  launchers.append(fullscreen);
  const readouts = [];
  for(const [id,kind] of [['tableSpeed1','speed'],['tableSpeed2','speed'],['bottomFollow1','percent'],['bottomFollow2','percent'],['bottomSide1','percent'],['bottomSide2','percent']]) {
    const input=document.getElementById(id); if(!input)continue;
    const output=document.createElement('button');output.type='button';output.id=id+'Readout';output.className='phoneSliderValue sliderStep';
    output.setAttribute('aria-label','Decrease '+input.getAttribute('aria-label'));
    output.title='Decrease one step';
    output.addEventListener('click',()=>window.billiardsStepTableSlider?.(id,-1));
    const label=input.parentNode.querySelector('.tableSpeedLabel,.miniSpinLabel');
    if(label){
      const plus=document.createElement('button');plus.type='button';plus.className=label.className+' sliderStep';plus.id=label.id;plus.textContent=label.textContent;
      plus.setAttribute('aria-label','Increase '+input.getAttribute('aria-label'));plus.title='Increase one step';
      plus.addEventListener('click',()=>window.billiardsStepTableSlider?.(id,1));label.replaceWith(plus);
    }
    input.parentNode.append(output);readouts.push({input,output,kind});
  }
  window.billiardsPhoneReadouts = () => {
    for(const {input,output,kind} of readouts) {
      const value=Number(input.value)||0;
      const percent=Math.round(value*100);
      const text=kind==='speed'?value.toFixed(2):((percent>0?'+':'')+percent+'%');
      if(output.textContent!==text)output.textContent=text;
    }
  };
  for(const {input} of readouts)input.addEventListener('input',window.billiardsPhoneReadouts);
  window.billiardsPhoneReadouts();
  const phone = matchMedia('(max-width:600px), (max-width:1000px) and (max-height:500px) and (pointer:coarse)');
  let fallback = false;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function refreshSize() {
    document.documentElement.style.setProperty('--phone-height', (window.visualViewport?.height || window.innerHeight)+'px');
  }
  function setControls(open) {
    document.body.classList.toggle('phone-controls-open', open && phone.matches);
    controls.setAttribute('aria-expanded', String(open && phone.matches));
    controls.textContent = open && phone.matches ? 'Close' : 'Controls';
    panel.inert = phone.matches && !open;
    syncScroll();
    if (!open && panel.contains(document.activeElement)) controls.focus();
  }
  function layout() {
    document.body.classList.toggle('phone-layout', phone.matches);
    if(phone.matches) { if(title.parentNode !== header) header.prepend(title); }
    else { if(title.parentNode !== panel) home.after(title); }
    setControls(false);
    refreshSize();
    syncGuideSpace();
    flightCanvas.style.display='none';
    window.dispatchEvent(new Event('resize'));
  }
  function syncFullscreen() {
    const active = !!window.BilliardsDisplay?.active() || !!fullscreenElement() || fallback;
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    fullscreen.title = active ? 'Exit fullscreen table' : 'Fullscreen table';
    refreshSize();
    window.dispatchEvent(new Event('resize'));
  }
  function showFallback() {
    fallback = true; setControls(false); syncFullscreen();
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
    message.textContent = apple
      ? 'Table view is ready. For a view without Safari bars, use Share → Add to Home Screen, then open that icon. Turn the phone sideways for a larger table.'
      : 'Table view is ready. For a view without browser bars, add this app to your Home Screen and open its icon. Turn your phone sideways for a larger table.';
    notice.classList.add('visible');
  }
  let startupFullscreen = true;
  async function enterFullscreen(automatic = false) {
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if(!request) { if(!automatic) showFallback(); return; }
    try {
      await request.call(root);
      startupFullscreen = false;
      if(phone.matches && screen.orientation?.lock) { try { await screen.orientation.lock('landscape'); } catch (_) {} }
      syncFullscreen();
    } catch (_) { if(!automatic) showFallback(); }
  }
  // Browser fullscreen needs a trusted gesture. Use the first gameplay release,
  // after its aiming/dragging operation, rather than resizing during a drag.
  document.addEventListener('pointerup', event => {
    if(window.BilliardsDisplay || !startupFullscreen || fullscreenElement() || navigator.standalone) return;
    const target=event.target;
    if(!target?.closest?.('#stageWrap,#phoneActions,.phoneTipControl')) return;
    startupFullscreen=false;
    enterFullscreen(true);
  },true);
  // Cancel automatic entry if the user explicitly leaves fullscreen.
  fullscreen.addEventListener('click', async () => {
    startupFullscreen=false;
    if(window.BilliardsDisplay){setControls(false);await window.BilliardsDisplay.toggle();syncFullscreen();return;}
    if(fullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit.call(document); } catch (_) { message.textContent='Use your browser’s fullscreen exit control.'; notice.classList.add('visible'); }
      return;
    }
    if(fallback) { fallback=false; notice.classList.remove('visible'); syncFullscreen(); return; }
    setControls(false);
    await enterFullscreen();
  });
  controls.addEventListener('click', () => setControls(!document.body.classList.contains('phone-controls-open')));
  dismiss.addEventListener('click', () => { setControls(false); controls.focus(); });
  document.addEventListener('keydown', event => { if(event.key==='Escape') { startupFullscreen=false; setControls(false); fallback=false; notice.classList.remove('visible'); syncFullscreen(); } });
  document.addEventListener('billiards:display-change',syncFullscreen);
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('webkitfullscreenchange',syncFullscreen);
  if(phone.addEventListener) phone.addEventListener('change',layout); else phone.addListener(layout);
  window.addEventListener('resize', () => {refreshSize(); syncScroll(); syncGuideSpace()});
  window.visualViewport?.addEventListener('resize',refreshSize);
  // Suppress pen/touch long-press menus only on gameplay surfaces.
  for(const type of ['contextmenu','selectstart','dragstart']) document.addEventListener(type,event => {
    if(event.target?.closest?.('#stageWrap,#phoneActions,#phoneHeader,.phoneTipControl')) event.preventDefault();
  },{capture:true});
  layout();
})();
