/* One audio session, presented in the Learning section or below the table. */
(() => {
  'use strict';
  function mount({guide,tour,host}) {
    if (!document.body.classList.contains('trainer-workspace')) return null;
    const byId=id=>document.getElementById(id),body=document.body,panel=byId('panel'),section=byId('learningSection'),content=byId('learningBody'),tray=byId('phoneTrayToggle');
    if (!section || !content || !byId('workspaceBallShelf')) return null;
    host.dataset.learningDock='1';host.classList.add('learning-player');
    const modes=document.createElement('div');modes.className='learningModes';modes.setAttribute('aria-label','Learning mode');
    function button(id,label,title) {const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.setAttribute('aria-label',title||label);b.dataset.learningNavigation='1';return b;}
    const start=button('learningGetStarted','Get Started'),lessons=button('learningGuide','Guide');modes.append(start,lessons);
    const returnButton=button('learningReturnToTable','← Return to Table','Return to table and use the mini player');returnButton.className='learningReturn';
    const fullSlot=document.createElement('div');fullSlot.id='learningFullSlot';
    content.append(modes,returnButton,fullSlot);fullSlot.append(host);
    const mini=document.createElement('div');mini.id='learningMiniPlayer';mini.setAttribute('aria-label','Learning mini player');mini.hidden=true;
    const title=document.createElement('span');title.className='learningMiniTitle';title.setAttribute('aria-live','polite');
    const miniSlot=document.createElement('div');miniSlot.id='learningMiniSlot';
    const expand=button('learningExpand','→','Open Learning and the full media player');expand.title='Open full player in Learning';
    const close=button('learningClose','×','Close learning player');mini.append(title,miniSlot,expand,close);byId('workspaceBallShelf').append(mini);
    let mode='off',prior='mini',opening=false,lastTopic=null,trayBefore=null;
    let oldMenu=body.classList.contains('phone-controls-open'),oldTray=body.classList.contains('phone-tray-hidden'),old3D=body.classList.contains('table-3d');
    const isOpen=()=>body.classList.contains('phone-controls-open');
    const trayHidden=()=>body.classList.contains('phone-tray-hidden');
    function setTray(hidden) {if (trayHidden()!==hidden)tray.click();}
    function drawer(open) {if(isOpen()!==open)byId('phoneControls').click();}
    function openSection() {
      for(const sibling of panel.children) if(sibling.classList.contains('section')) {const open=sibling===section;sibling.classList.toggle('open',open);sibling.querySelector(':scope > .sectionToggle')?.setAttribute('aria-expanded',String(open));}
    }
    function describe() {
      const s=guide.getState(),t=guide.getSelectedTopic();title.textContent=t?.title||(s.category==='start'?'Get Started':'Guide');title.title=title.textContent;
      start.setAttribute('aria-pressed',String(s.category==='start'));lessons.setAttribute('aria-pressed',String(s.category!=='start'));
      returnButton.hidden=!s.enabled;
    }
    function apply(next) {
      const changed=mode!==next;mode=next;
      body.classList.toggle('learning-active',next!=='off');body.classList.toggle('learning-mini',next==='mini');body.classList.toggle('learning-tray',next==='tray');
      host.classList.toggle('learning-is-mini',next!=='full');mini.hidden=next!=='mini';
      const slot=next==='full'||next==='off'?fullSlot:miniSlot;if(host.parentNode!==slot)slot.append(host);
      describe();if(changed){byId('workspaceBallShelf').scrollLeft=0;window.billiardsWorkspaceDock?.();window.dispatchEvent(new Event('resize'));}
    }
    function full() {if(!guide.getState().enabled){open('guide');return;}apply('full');setTray(true);drawer(true);openSection();requestAnimationFrame(()=>{panel.scrollTop+=section.getBoundingClientRect().top-panel.getBoundingClientRect().top-64;});}
    function miniView() {if(!guide.getState().enabled)return;apply('mini');setTray(true);drawer(false);}
    function open(kind) {
      if(mode==='off')trayBefore=trayHidden();opening=true;
      const s=guide.getState();
      if(kind==='start'){if(!s.enabled||s.category!=='start'){if(tour)tour.start();else guide.openCategory('start');}}
      else if(!s.enabled||s.category==='start')guide.openGuide();
      opening=false;full();
    }
    function off() {apply('off');if(trayBefore!==null){const saved=trayBefore;trayBefore=null;setTray(saved);}}
    function sync(state) {if(opening)return;if(!state.enabled){off();return;}if(mode==='off'){trayBefore=trayHidden();full();}else describe();}
    function rendered() {describe();const t=guide.getState().topicId;if(mode==='full'&&t!==lastTopic)openSection();lastTopic=t;}
    start.onclick=()=>open('start');lessons.onclick=()=>open('guide');returnButton.onclick=miniView;expand.onclick=full;close.onclick=()=>guide.setEnabled(false);
    section.querySelector(':scope > .sectionToggle').addEventListener('click',()=>{if(section.classList.contains('open')&&mode==='full')miniView();else full();});
    new MutationObserver(()=>{
      const menu=isOpen(),hidden=trayHidden(),threeD=body.classList.contains('table-3d');
      const menuChanged=menu!==oldMenu,trayChanged=hidden!==oldTray,viewChanged=threeD!==old3D;oldMenu=menu;oldTray=hidden;old3D=threeD;
      if(!guide.getState().enabled||opening)return;
      if(viewChanged&&mode!=='tray') {setTray(true);if(!menu&&mode==='full')miniView();return;}
      if(trayChanged) {
        if(!hidden&&(mode==='full'||mode==='mini')){prior=mode;apply('tray');drawer(false);return;}
        if(hidden&&mode==='tray'){if(prior==='full')full();else miniView();return;}
      }
      if(menuChanged){if(menu&&mode==='mini')full();else if(!menu&&mode==='full')miniView();}
    }).observe(body,{attributes:true,attributeFilter:['class']});
    if(guide.getState().enabled){trayBefore=trayHidden();miniView();}else apply('off');
    const api={open,full,mini:miniView,sync,rendered,getState:()=>({mode,prior,trayRetracted:trayHidden()})};window.billiardsLearningPanel=api;return api;
  }
  window.BilliardsLearningPanel={mount};
})();
