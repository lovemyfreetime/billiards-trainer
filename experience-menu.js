/* Shared mode switcher for Trainer, Play and Zen. */
(function(){
'use strict';
let next=0;
const lotus='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="zenLotusMetal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#D4BB92"/><stop offset="1" stop-color="#8F7755"/></linearGradient></defs><g fill="url(#zenLotusMetal)" stroke="#C5A880" stroke-width=".6" stroke-linejoin="round"><path d="M31 51C16 50 6 41 5 29c13 1 23 8 26 22Z"/><path d="M33 51c15-1 25-10 26-22-13 1-23 8-26 22Z"/><path d="M31 49C18 44 12 32 17 18c11 5 16 17 14 31Z"/><path d="M33 49c13-5 19-17 14-31-11 5-16 17-14 31Z"/><path d="M32 48C22 38 22 23 32 10c10 13 10 28 0 38Z"/></g><path d="M12 49q20 15 40 0" fill="none" stroke="#A68D68" stroke-width="1"/></svg>';
window.BilliardsExperienceMenu=function({current,beforeNavigate=()=>true}={}){
 const wrap=document.createElement('span');wrap.className='experience-switcher';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='experience-toggle';toggle.innerHTML=lotus;toggle.setAttribute('aria-label','Change experience');toggle.title='Trainer · Play · Zen';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-haspopup','true');
 const menu=document.createElement('nav');menu.className='experience-menu';menu.id='experience-menu-'+(++next);menu.setAttribute('popover','auto');menu.setAttribute('aria-label','Experiences');toggle.setAttribute('aria-controls',menu.id);
 for(const [mode,label] of [['train','Trainer'],['play','Play'],['zen','Zen']]){
  if(mode===current)continue;
  const url=new URL(location.href);if(url.pathname.endsWith('/play.html'))url.pathname=url.pathname.slice(0,-9);url.searchParams.delete('play');url.searchParams.delete('zen');
  if(mode==='play')url.pathname=url.pathname.replace(/(?:index\.html)?$/,'play.html');if(mode==='zen')url.searchParams.set('zen','1');
  const a=document.createElement('a');a.href=url.href;const art=document.createElement('span');art.className='experience-art';art.setAttribute('aria-hidden','true');if(mode==='zen')art.innerHTML=lotus;else{const img=document.createElement('img');img.src=mode==='train'?'./icons/trainer-experience-v3.webp':'./icons/play-experience-v1.webp';img.alt='';art.append(img);}const name=document.createElement('span');name.textContent=label;a.append(art,name);
  a.onclick=e=>{if(beforeNavigate(mode)===false)e.preventDefault();};menu.append(a);
 }
 toggle.onclick=()=>{if(menu.matches(':popover-open')){menu.hidePopover();return;}menu.showPopover();const r=toggle.getBoundingClientRect(),v=visualViewport,h=v?.height||innerHeight,w=v?.width||innerWidth;menu.style.left=Math.max(8,Math.min(r.left,w-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(r.top-menu.offsetHeight-8,h-menu.offsetHeight-8))+'px';};
 menu.addEventListener('toggle',()=>toggle.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));wrap.append(toggle,menu);return wrap;
};
})();
