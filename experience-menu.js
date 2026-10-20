/* Shared mode switcher for Trainer, Play and Zen. */
(function(){
'use strict';
let next=0;
const lotus='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="zenLotusMetal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#D4BB92"/><stop offset="1" stop-color="#8F7755"/></linearGradient></defs><g fill="url(#zenLotusMetal)" stroke="#C5A880" stroke-width=".6" stroke-linejoin="round"><path d="M31 51C16 50 6 41 5 29c13 1 23 8 26 22Z"/><path d="M33 51c15-1 25-10 26-22-13 1-23 8-26 22Z"/><path d="M31 49C18 44 12 32 17 18c11 5 16 17 14 31Z"/><path d="M33 49c13-5 19-17 14-31-11 5-16 17-14 31Z"/><path d="M32 48C22 38 22 23 32 10c10 13 10 28 0 38Z"/></g><path d="M12 49q20 15 40 0" fill="none" stroke="#A68D68" stroke-width="1"/></svg>';
// Each menu owns its gradient: Play has both a footer and a Games-dialog menu.
// Referencing a gradient in a hidden sibling SVG can drop the gold fill.
function lotusIcon(){return lotus.replaceAll('zenLotusMetal','zenLotusMetal-'+(++next));}
// Miniature of the opening page, built from the same three experience artworks.
function homeArt(){
 const preview=document.createElement('span');preview.className='experience-home-preview';preview.setAttribute('aria-hidden','true');
 const choices=document.createElement('span');choices.className='experience-home-choices';
 for(const mode of ['zen','train','play']){const card=document.createElement('span');card.className='experience-home-mini experience-home-mini--'+mode;const art=document.createElement('span');art.className='experience-home-mini-art';if(mode==='zen')art.innerHTML=lotusIcon();else{const img=document.createElement('img');img.src=mode==='train'?'./icons/trainer-original-execute-v2.svg':'./icons/play-experience-v1.webp';img.alt='';art.append(img);}const dot=document.createElement('span');dot.className='experience-home-dot';card.append(art,dot);choices.append(card);}
 preview.append(choices);return preview;
}
window.BilliardsExperienceHomeArt=homeArt;
window.BilliardsExperienceMenu=function({current,beforeNavigate=()=>true}={}){
 if(window.BilliardsOfflinePlay){const link=document.createElement('a');link.href='./play.html';link.textContent='Play games';return link;}
 const wrap=document.createElement('span');wrap.className='experience-switcher';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='experience-toggle';if(current==='zen')toggle.innerHTML=lotusIcon();else{const img=document.createElement('img');img.src=current==='train'?'./icons/trainer-original-execute-v2.svg':'./icons/play-experience-v1.webp';img.alt='';toggle.append(img);toggle.classList.add('experience-toggle-image');}toggle.dataset.experience=current;toggle.setAttribute('aria-label','Change experience');toggle.title='Trainer · Play · Zen · Home';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-haspopup','true');
 const menu=document.createElement('nav');menu.className='experience-menu experience-menu--'+current;menu.id='experience-menu-'+(++next);menu.setAttribute('popover','manual');menu.setAttribute('aria-label','Experiences');toggle.setAttribute('aria-controls',menu.id);
 for(const [mode,label] of [['zen','Zen'],['train','Trainer'],['play','Play'],['home','Home']]){
  if(mode===current)continue;
  const url=new URL(location.href);if(url.pathname.endsWith('/play.html'))url.pathname=url.pathname.slice(0,-9);url.searchParams.delete('play');url.searchParams.delete('zen');url.searchParams.delete('train');
  if(mode==='home'){url.pathname=url.pathname.replace(/(?:index\.html)?$/,'welcome.html');url.search='';url.hash='';}
  if(mode==='play')url.pathname=url.pathname.replace(/(?:index\.html)?$/,'play.html');if(mode==='zen')url.searchParams.set('zen','1');if(mode==='train')url.searchParams.set('train','1');
  const a=document.createElement('a');a.href=url.href;a.dataset.experience=mode;a.setAttribute('aria-label','Open '+label);a.title=label;const art=document.createElement('span');art.className='experience-art';art.setAttribute('aria-hidden','true');if(mode==='home')art.append(homeArt());else if(mode==='zen')art.innerHTML=lotusIcon();else{const img=document.createElement('img');img.src=mode==='train'?'./icons/trainer-original-execute-v2.svg':'./icons/play-experience-v1.webp';img.alt='';art.append(img);}const name=document.createElement('span');name.textContent=label;a.append(art,name);
  a.onclick=e=>{if(beforeNavigate(mode)===false)e.preventDefault();};menu.append(a);
 }
 toggle.onclick=()=>{if(menu.matches(':popover-open')){menu.hidePopover();return;}menu.showPopover();const r=toggle.getBoundingClientRect(),v=visualViewport,h=v?.height||innerHeight,w=v?.width||innerWidth;menu.style.left=Math.max(8,Math.min(r.left,w-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min((current==='train'?r.bottom:r.top-8)-menu.offsetHeight,h-menu.offsetHeight-8))+'px';};
 document.addEventListener('pointerdown',e=>{if(menu.matches(':popover-open')&&!wrap.contains(e.target))menu.hidePopover();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.matches(':popover-open'))menu.hidePopover();});
 menu.addEventListener('toggle',()=>toggle.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));wrap.append(toggle,menu);return wrap;
};
})();
