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
  for (const [id, label] of [['animate', 'Execute Shot'], ['undoShot', 'Undo'], ['resetLayoutQuick', 'Reset Layout']]) {
    const source = document.getElementById(id);
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.dataset.trainerAction = id;
    if (id === 'animate') button.classList.add('primary');
    const sync = () => { button.disabled = !!source?.disabled; if(source?.dataset.guideTopic) button.dataset.guideTopic=source.dataset.guideTopic; };
    sync();
    if (source) new MutationObserver(sync).observe(source, {attributes:true,attributeFilter:['disabled','data-guide-topic']});
    button.addEventListener('click', () => { if (source && !source.disabled) source.click(); });
    actions.append(button);
  }
  const notice = document.createElement('div'); notice.id = 'phoneNotice'; notice.setAttribute('role','status');
  const message = document.createElement('span');
  const closeNotice = document.createElement('button'); closeNotice.type = 'button'; closeNotice.textContent = '×'; closeNotice.setAttribute('aria-label','Dismiss fullscreen tip');
  closeNotice.addEventListener('click', () => notice.classList.remove('visible'));
  notice.append(message,closeNotice);
  document.body.append(header,dismiss,actions,notice);
  const fullscreen = document.createElement('button');
  fullscreen.id = 'btg-fullscreen'; fullscreen.type = 'button'; fullscreen.className = 'btg-launcher';
  fullscreen.title = 'Fullscreen table'; fullscreen.setAttribute('aria-label','Enter fullscreen'); fullscreen.setAttribute('aria-pressed','false');
  fullscreen.dataset.btgAllow = '1';
  fullscreen.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/></svg>';
  launchers.append(fullscreen);
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
    if (!open && panel.contains(document.activeElement)) controls.focus();
  }
  function layout() {
    document.body.classList.toggle('phone-layout', phone.matches);
    if(phone.matches) { if(title.parentNode !== header) header.prepend(title); }
    else { if(title.parentNode !== panel) home.after(title); }
    setControls(false);
    refreshSize();
    window.dispatchEvent(new Event('resize'));
  }
  function syncFullscreen() {
    const active = !!fullscreenElement() || fallback;
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
  fullscreen.addEventListener('click', async () => {
    if(fullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit.call(document); } catch (_) { message.textContent='Use your browser’s fullscreen exit control.'; notice.classList.add('visible'); }
      return;
    }
    if(fallback) { fallback=false; notice.classList.remove('visible'); syncFullscreen(); return; }
    setControls(false);
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if(!request) { showFallback(); return; }
    try {
      await request.call(root);
      // Locking is optional; the layout also works when the user rotates manually.
      if(phone.matches && screen.orientation?.lock) { try { await screen.orientation.lock('landscape'); } catch (_) {} }
      syncFullscreen();
    } catch (_) { showFallback(); }
  });
  controls.addEventListener('click', () => setControls(!document.body.classList.contains('phone-controls-open')));
  dismiss.addEventListener('click', () => { setControls(false); controls.focus(); });
  document.addEventListener('keydown', event => { if(event.key==='Escape') { setControls(false); fallback=false; notice.classList.remove('visible'); syncFullscreen(); } });
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('webkitfullscreenchange',syncFullscreen);
  if(phone.addEventListener) phone.addEventListener('change',layout); else phone.addListener(layout);
  window.addEventListener('resize', refreshSize);
  window.visualViewport?.addEventListener('resize',refreshSize);
  layout();
})();
