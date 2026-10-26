(function () {
  'use strict';
  if (document.body.classList.contains('projector')) return;
  // Older Chrome needs its native vertical-range appearance, not writing-mode alone.
  const chromiumVersion=Number(/(?:Chrome|Chromium)\/(\d+)/.exec(navigator.userAgent)?.[1]);
  document.body.classList.toggle('legacy-vertical-ranges',chromiumVersion>0&&chromiumVersion<124);
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
  for (const [id, label] of [['animate', 'Execute Shot'], ['undoShot', 'Undo'], ['redoShot', 'Redo'], ['resetLayoutQuick', 'Reset'], ['toggleShot2', '+ Shot 2'], ['toggleCueVisuals1Btn', 'Hide CB 1'], ['toggleCueVisuals2Btn', 'Hide CB 2']]) {
    const source = document.getElementById(id);
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.dataset.trainerAction = id;
    if (id === 'animate') { button.classList.add('primary');button.textContent='Shoot';button.setAttribute('aria-label','Execute Shot'); }
    const sync = () => {
      const running=id==='animate'&&source?.dataset.running==='true';
      button.disabled = !source || !!source.disabled || running;
      if(id==='animate'){button.classList.toggle('shot-running',running);button.setAttribute('aria-busy',String(running));}
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
    if (source) new MutationObserver(sync).observe(source, {attributes:true,attributeFilter:['disabled','data-guide-topic','aria-pressed','data-running'],childList:true,characterData:true,subtree:true});
    button.addEventListener('click', () => { if (source && !source.disabled) source.click(); });
    actions.append(button);
  }
  const trayToggle=document.createElement('button');trayToggle.id='phoneTrayToggle';trayToggle.type='button';trayToggle.textContent='Tray';trayToggle.setAttribute('aria-label','Hide pocketed-ball tray');trayToggle.setAttribute('aria-expanded','true');trayToggle.onclick=()=>{const hidden=document.body.classList.toggle('phone-tray-hidden');trayToggle.setAttribute('aria-expanded',String(!hidden));trayToggle.setAttribute('aria-label',(hidden?'Show':'Hide')+' pocketed-ball tray');};document.body.append(trayToggle);
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
    const height = focused() && guide?.classList.contains('btg-enabled') ? guide.getBoundingClientRect().height : 0;
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
    window.billiardsBindHoldAdjust(output,()=>window.billiardsStepTableSlider?.(id,-1),()=>!input.disabled);
    const label=input.parentNode.querySelector('.tableSpeedLabel,.miniSpinLabel');
    if(label){
      const plus=document.createElement('button');plus.type='button';plus.className=label.className+' sliderStep';plus.id=label.id;plus.textContent=label.textContent;
      plus.setAttribute('aria-label','Increase '+input.getAttribute('aria-label'));plus.title='Increase one step';
      window.billiardsBindHoldAdjust(plus,()=>window.billiardsStepTableSlider?.(id,1),()=>!input.disabled);label.replaceWith(plus);
    }
    input.parentNode.append(output);
    const plusLabel=input.parentNode.querySelector('.miniSpinLabel');
    if(plusLabel)plusLabel.dataset.stepLabel=plusLabel.textContent;
    const caption=document.createElement('span');
    caption.className=kind==='percent'?'phoneSpinCaption':'phoneSpeedValue';
    if(kind==='percent'){caption.dataset.start=input.id.includes('Follow')?'Draw':'Left spin';caption.dataset.end=input.id.includes('Follow')?'Follow':'Right spin';}
    input.parentNode.append(caption);
    // Phone ranges act as relative rollers: a new touch never changes the value.
    // Each drag starts from the current setting, so lifting and swiping again adds to it.
    let drag=null;
    input.addEventListener('touchstart',event=>{if(document.body.classList.contains('phone-focus'))event.preventDefault();},{passive:false});
    input.addEventListener('pointerdown',event=>{
      if(!document.body.classList.contains('phone-focus')||input.disabled||event.isPrimary===false||drag||(event.button!=null&&event.button!==0))return;
      event.preventDefault();event.stopPropagation();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,value:Number(input.value),width:Math.max(60,input.getBoundingClientRect().width-22)};
      input.setPointerCapture(event.pointerId);
    },true);
    input.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      event.preventDefault();
      const delta=kind==='speed'?(drag.y-event.clientY)*.01:(event.clientX-drag.x)/drag.width*(Number(input.max)-Number(input.min));
      const value=Math.round(Math.max(Number(input.min),Math.min(Number(input.max),drag.value+delta))*100)/100;
      if(Number(input.value)===value)return;
      input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])input.addEventListener(type,event=>{
      if(!drag||event.pointerId!==drag.id)return;
      drag=null;input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    readouts.push({input,output,kind,plusLabel,caption});
  }
  window.billiardsPhoneReadouts = () => {
    for(const {input,output,kind,plusLabel,caption} of readouts) {
      const value=Number(input.value)||0;
      const percent=Math.round(value*100);
      const text=kind==='speed'?value.toFixed(2):((percent>0?'+':'')+percent+'%');
      const phoneFocus=document.body.classList.contains('phone-focus');
      const compact=kind==='percent'&&phoneFocus;
      const valueText=phoneFocus?(kind==='speed'?'':'−'):text;
      if(output.textContent!==valueText)output.textContent=valueText;
      if(plusLabel){const label=compact?'+':plusLabel.dataset.stepLabel;if(plusLabel.textContent!==label)plusLabel.textContent=label;}
      const captionText=kind==='speed'?text:(document.body.classList.contains('table-3d')?'':(input.id.includes('Follow')?'F/D ':'L/R '))+text;
      if(caption.textContent!==captionText)caption.textContent=captionText;
    }
  };
  for(const {input} of readouts)input.addEventListener('input',window.billiardsPhoneReadouts);
  window.billiardsPhoneReadouts();
  // Reuse the existing controls and event handlers in a table-first phone layout.
  const toolShelf=document.createElement('div');toolShelf.id='phoneToolShelf';toolShelf.setAttribute('aria-label','Table tools');title.after(toolShelf);
  const relocated=[];
  for(const id of ['analyzePhotoBtn','cameraCaptureBtn','quickLayoutRecall','kickToolToggle','bankToolToggle','teachingCompassToggle','compassSizeWrap','compassRotateWrap','angleLock','aimControls','aimControls2']){
    const element=document.getElementById(id);if(!element)continue;
    const anchor=document.createComment(id+' desktop position');element.before(anchor);relocated.push({element,anchor,aim:id.startsWith('aimControls')});
  }
  const leftRail=document.createElement('div');leftRail.id='phoneAimRail';leftRail.setAttribute('aria-label','Fine aim');
  const aimLabel=document.createElement('span');aimLabel.className='phoneAimLabel';aimLabel.textContent='AIM';leftRail.append(aimLabel);
  const rightRail=document.createElement('div');rightRail.id='phoneSpeedRail';rightRail.setAttribute('aria-label','Shot speed');
  document.body.append(leftRail,rightRail);
  for(const id of ['tableSpeed1Wrap','tableSpeed2Wrap','bottomSpin1','bottomSpin2']){
    const element=document.getElementById(id);if(!element)continue;
    const anchor=document.createComment(id+' desktop position');element.before(anchor);relocated.push({element,anchor,speed:id.startsWith('tableSpeed'),spin:id.startsWith('bottomSpin')});
  }
  let guideAnchor;
  function dockGuide(){const guide=document.getElementById('bt-guide-pool-root');if(!guide)return;if(focused()){if(!guideAnchor){guideAnchor=document.createComment('Guide desktop position');guide.before(guideAnchor);}if(guide.parentNode!==panel)toolShelf.after(guide);}else if(guideAnchor&&guide.parentNode!==guideAnchor.parentNode)guideAnchor.after(guide);}
  new MutationObserver(dockGuide).observe(document.body,{childList:true,subtree:true});
  const analyzeToolbar=document.querySelector('.photoAnalyzerToolbar'),analyzeHeader=document.querySelector('.photoAnalyzerHeader'),analyzeMoves=[];
  if(analyzeToolbar&&analyzeHeader){for(const element of [...analyzeHeader.children]){if(element.classList.contains('btg-analyze-title'))continue;const anchor=document.createComment('Analyze header position');element.before(anchor);analyzeMoves.push({element,anchor});}}
  for(const id of ['photoWelcomePlay','photoWelcomeStop']){const element=document.getElementById(id);if(element&&analyzeToolbar){const anchor=document.createComment('Analyze welcome position');element.before(anchor);analyzeMoves.push({element,anchor});}}
  const photoMenu=document.createElement('div');photoMenu.id='phonePhotoMenu';photoMenu.setAttribute('popover','auto');photoMenu.setAttribute('aria-label','Saved photos');document.body.append(photoMenu);
  const photoButton=document.createElement('button');photoButton.id='phonePhotosButton';photoButton.type='button';photoButton.textContent='Photos';photoButton.setAttribute('aria-label','Saved photos');photoButton.setAttribute('aria-expanded','false');
  const nativePhotoPopover=typeof photoMenu.showPopover==='function';
  if(!nativePhotoPopover)photoMenu.removeAttribute?.('popover');
  const photoMenuOpen=()=>nativePhotoPopover?photoMenu.matches(':popover-open'):photoMenu.classList.contains('legacy-popover-open');
  function closePhotoMenu(){if(nativePhotoPopover)photoMenu.hidePopover();else photoMenu.classList.remove('legacy-popover-open');photoButton.setAttribute('aria-expanded','false');}
  function openPhotoMenu(){if(nativePhotoPopover)photoMenu.showPopover();else photoMenu.classList.add('legacy-popover-open');photoButton.setAttribute('aria-expanded','true');}
  if(!nativePhotoPopover){document.addEventListener('pointerdown',event=>{if(!photoMenu.contains(event.target)&&!photoButton.contains(event.target))closePhotoMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape')closePhotoMenu();});}
  photoButton.onclick=()=>{if(photoMenuOpen())closePhotoMenu();else{openPhotoMenu();const r=photoButton.getBoundingClientRect();photoMenu.style.left=Math.max(4,Math.min(innerWidth-photoMenu.offsetWidth-4,r.left))+'px';photoMenu.style.top=(r.bottom+5)+'px';}};
  photoMenu.addEventListener('toggle',()=>photoButton.setAttribute('aria-expanded',String(photoMenuOpen())));
  const archiveMoves=[];for(const id of ['photoArchiveSelect','photoArchiveLoad','photoArchiveDelete','photoArchiveSave','photoArchiveExport']){const element=document.getElementById(id);if(element){const anchor=document.createComment('Photo archive position');element.before(anchor);archiveMoves.push({element,anchor});}}
  const photoBar=document.createElement('div');photoBar.id='phoneAnalyzeBar';let toolbarAnchor;
  if(analyzeToolbar){toolbarAnchor=document.createComment('Analyze toolbar desktop position');analyzeToolbar.before(toolbarAnchor);analyzeToolbar.parentNode.append(photoBar);analyzeToolbar.append(photoButton);}
  const autoRack=document.getElementById('photoRackType')?.querySelector('option[value="auto"]'),autoRackText=autoRack?.textContent;
  function layoutAnalyze(){
    if(!analyzeToolbar)return;
    const close=document.getElementById('photoAnalyzerClose');
    if(focused()){photoBar.append(analyzeToolbar,close);for(const {element}of archiveMoves)photoMenu.append(element);for(const id of ['photoWelcomePlay','photoWelcomeStop']){const el=document.getElementById(id);if(el)photoMenu.append(el);}if(autoRack)autoRack.textContent='Rack';}
    else{const ai=document.getElementById('photoAiModeBtn');if(ai&&ai.textContent==='AI')ai.textContent=ai.getAttribute('aria-label')||'AI: AUTO';toolbarAnchor.after(analyzeToolbar);for(const {element,anchor}of archiveMoves)anchor.after(element);if(autoRack)autoRack.textContent=autoRackText;closePhotoMenu();}
  }
  document.getElementById('photoAnalyzerClose')?.addEventListener('click',closePhotoMenu);
  const compactText={photoChooseImage:'Image',photoFindCorners:'Corners',photoResetCorners:'Reset',photoFineTune:'Layout',photoAutoRailsBtn:'Sense',photoAnalyzeNow:'Analyze',photoAddMissed:'+ Ball',photoWalkthroughBtn:'Walkthrough',photoWelcomePlay:'Welcome',photoWelcomeStop:'Stop voice',photoApplyTable:'Apply',photoApplySave:'Apply + Save',photoLoadTableFile:'Load',photoSaveTableFile:'Save'};
  const originalText=new Map();for(const id of Object.keys(compactText)){const el=document.getElementById(id);if(el){originalText.set(el,el.textContent);if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.textContent);}}
  if(analyzeToolbar)new MutationObserver(()=>{if(!focused())return;const ai=document.getElementById('photoAiModeBtn');if(ai&&ai.textContent!=='AI'){ai.setAttribute('aria-label',ai.textContent);ai.textContent='AI';}for(const [el,text]of originalText)if(el.textContent===text&&text!==compactText[el.id])el.textContent=compactText[el.id];}).observe(analyzeToolbar,{childList:true,subtree:true});
  const aimChoice=document.createElement('button');aimChoice.id='phoneAimChoice';aimChoice.type='button';aimChoice.textContent='1';aimChoice.setAttribute('aria-label','Switch active shot');aimChoice.onclick=()=>{const second=document.getElementById('aimControls2')?.classList.contains('activeAim');if(!document.body.classList.contains('phone-two-shots'))return;window.billiardsSelectShot?.(second?1:2);};actions.prepend(aimChoice);
  const syncAim=()=>{const second=document.getElementById('aimControls2')?.classList.contains('activeAim');document.body.classList.toggle('phone-active-shot-2',!!second);aimChoice.textContent=document.body.classList.contains('table-3d')?(second?'Shot 2':'Shot 1'):(second?'2':'1');aimChoice.setAttribute('aria-pressed',String(!!second));const available=document.body.classList.contains('phone-two-shots');aimChoice.disabled=!available;aimChoice.hidden=!available;aimChoice.title=available?'Switch adjustments between the two loaded shots':'Load or enable Shot 2 in Tools to switch shots';aimChoice.setAttribute('aria-label','Adjusting shot '+(second?'2':'1')+(available?'. Switch shot':'. Load Shot 2 in Tools to switch'));};
  if(shot2Source)new MutationObserver(syncAim).observe(shot2Source,{childList:true,characterData:true,subtree:true});
  for(const id of ['aimControls','aimControls2']){const el=document.getElementById(id);if(el)new MutationObserver(syncAim).observe(el,{attributes:true,attributeFilter:['class']});}
  const phone = matchMedia('(max-width:600px), (max-width:1000px) and (max-height:500px) and (pointer:coarse)');
  const focused=()=>phone.matches||document.body.classList.contains('table-3d');
  let fallback = false;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function refreshSize() {
    document.documentElement.style.setProperty('--phone-height', (window.visualViewport?.height || window.innerHeight)+'px');
  }
  function setControls(open) {
    document.body.classList.toggle('phone-controls-open', open && focused());
    controls.setAttribute('aria-expanded', String(open && focused()));
    controls.textContent = open && focused() ? '×' : '☰';
    controls.setAttribute('aria-label',document.body.classList.contains('table-3d')?(open?'Close tools':'Open tools'):(open && focused() ? 'Close trainer controls' : 'Open trainer controls'));
    controls.title=open && focused() ? 'Close controls' : 'Controls';
    panel.inert = focused() && !open;
    syncScroll();
    if (!open && panel.contains(document.activeElement)) controls.focus();
  }
  function layout() {
    document.body.classList.toggle('phone-layout', focused());
    document.body.classList.toggle('phone-focus',focused());
    if(title.parentNode !== panel)home.after(title);
    if(focused()){header.prepend(fullscreen);for(const {element,aim,speed,spin}of relocated){if(aim)leftRail.append(element);else if(speed)rightRail.append(element);else if(spin)actions.prepend(element);else toolShelf.append(element);}for(const {element}of analyzeMoves)analyzeToolbar.append(element);}
    else{launchers.append(fullscreen);for(const {element,anchor}of relocated)anchor.after(element);for(const {element,anchor}of analyzeMoves)anchor.after(element);}
    for(const [el,text]of originalText)el.textContent=focused()?compactText[el.id]:text;
    for(const which of [1,2]){const disk=document.getElementById('phoneTip'+which),spin=document.getElementById('bottomSpin'+which);if(disk){if(focused()&&spin)spin.append(disk);else document.body.append(disk);}}
    if(document.body.classList.contains('table-3d'))launchers.append(fullscreen);
    layoutAnalyze();
    dockGuide();syncAim();window.billiardsPhoneReadouts();
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
      if(focused() && screen.orientation?.lock) { try { await screen.orientation.lock('landscape'); } catch (_) {} }
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
  let previous3D=document.body.classList.contains('table-3d');
  new MutationObserver(()=>{const value=document.body.classList.contains('table-3d');if(value!==previous3D){previous3D=value;layout();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.billiardsControlLayout=layout;
  layout();
})();
