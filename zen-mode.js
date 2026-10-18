(function(){
"use strict";
if(new URLSearchParams(location.search).get("zen")!=="1")return;

// Simple, rounded line symbols traced from Jeff's control sketch.
// Each directional arrow is its own closed shape, with clear physical spacing.
const upChevron='<g transform="translate(5.12 7.68) scale(.68)"><path d="M2 34Q0 32 2 29L13 9Q16 4 19 9L30 29Q32 33 29 35Q26 37 24 33L16 19 8 33Q5 38 2 34Z"/></g>';
const rightChevron='<g transform="translate(5.12 7.68) scale(.68)"><path d="M5 6Q2 4 1 7Q0 9 3 11L18 24 3 37Q0 40 2 42Q4 44 7 41L28 28Q33 24 28 20L7 7Q6 6 5 6Z"/></g>';
const paths={
 aim:`<g transform="translate(8 0) rotate(-22 16 24)">${upChevron}</g><g transform="translate(56 0)">${upChevron}</g><g transform="translate(104 0) rotate(22 16 24)">${upChevron}</g>`,
 speed:`<g transform="translate(4 0)">${rightChevron}</g><g transform="translate(56 0)">${rightChevron}</g><g transform="translate(108 0)">${rightChevron}</g>`,
 follow:`<path d="M72 3v42"/><g transform="translate(10 48) scale(1 -1)">${upChevron}</g><g transform="translate(102 0)">${upChevron}</g>`,
 spin:`<path d="M72 3v42"/><g transform="translate(38 0) scale(-1 1)">${rightChevron}</g><g transform="translate(106 0)">${rightChevron}</g>`,
 undo:'<circle cx="25" cy="25" r="7" fill="#E2DFD8" fill-opacity=".85" stroke="none"/><path d="M13 13a17 17 0 1 1-3 18M13 5v8h8" stroke-width="1.8"/>',
 actionUndo:'<path d="M9 13v22M38 24H17m10-9-10 9 10 9" stroke-width="1.8"/>',
 shot:'<path d="m19 12 20 12-20 12Z" fill="currentColor" stroke="none"/>'
};
const icon=key=>`<svg viewBox="${['aim','speed','follow','spin'].includes(key)?'0 0 144 48':'-4 0 58 48'}" aria-hidden="true" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${paths[key]}</svg>`;
const style=document.createElement('style');style.textContent=`
body.zen-mode{--zen-footer:148px;--zen-cloth:#2A382E;--zen-rail:#181B20;background:radial-gradient(ellipse at 50% 42%,#252C34 0%,#191D23 65%,#14171C 100%)!important;overflow:hidden;isolation:isolate}

body.zen-mode #app{display:block!important;height:100dvh!important;background:transparent!important}
body.zen-mode #stageWrap{position:absolute!important;inset:0 0 calc(var(--zen-footer) + 25px)!important;background:transparent!important}
body.zen-mode #canvas{filter:none!important}
body.zen-mode #panel,body.zen-mode #scoreBoard,body.zen-mode #cameraCaptureBtn,body.zen-mode #analyzePhotoBtn,body.zen-mode #quickLayoutRecall,body.zen-mode #kickToolToggle,body.zen-mode #bankToolToggle,body.zen-mode #teachingCompassToggle,body.zen-mode #compassSizeWrap,body.zen-mode #compassRotateWrap,body.zen-mode #bottomSpeedControls,body.zen-mode #bottomSpin1,body.zen-mode #bottomSpin2,body.zen-mode #cueRailBtn,body.zen-mode #cuePopup,body.zen-mode #aimControls,body.zen-mode #aimControls2,body.zen-mode #angleLock,body.zen-mode #practiceCounter,body.zen-mode #markerRailControls,body.zen-mode #pocketTray,body.zen-mode #bt-guide-pool-root,body.zen-mode .phone-controls{display:none!important}
#zenBar{position:fixed;z-index:100;bottom:14px;left:50%;transform:translateX(-50%);width:min(1240px,96vw);box-sizing:border-box;height:92px;display:flex;gap:18px;align-items:center;justify-content:center;padding:12px 20px;background:rgba(18,22,28,.60);backdrop-filter:blur(16px) saturate(120%);-webkit-backdrop-filter:blur(16px) saturate(120%);border:1px solid rgba(255,255,255,.07);border-radius:16px;font-family:system-ui;color:#C5A880}
#zenBar .zen-group{min-width:0;flex:1;max-width:none;text-align:center;position:relative;padding:0 9px;border-right:1px solid rgba(255,255,255,.07)}
#zenBar .zen-symbol{display:block;width:136px;height:42px;margin:0 auto;color:rgba(226,223,216,.45)}
#zenBar .zen-group[data-kind=speed] .zen-symbol{width:136px}
#zenBar .zen-symbol svg{width:100%;height:100%}
#zenBar input[type=range]{appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;width:100%;height:26px;margin:0;padding:0;background:transparent;cursor:pointer;touch-action:pan-y}
#zenBar input[type=range]::-webkit-slider-runnable-track{height:5px;background:linear-gradient(90deg,#C5A88066,#ffffff0e);border-radius:10px}
#zenBar .zen-group[data-kind=speed] input::-webkit-slider-runnable-track{background:linear-gradient(90deg,#C5A88066,#ffffff0e)}
#zenBar input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:19px;height:19px;margin-top:-7px;border:1px solid #C5A880;border-radius:50%;background:#181B20}
#zenBar input[type=range]::-moz-range-track{height:5px;background:#C5A88066;border-radius:10px}
#zenBar input[type=range]::-moz-range-thumb{height:17px;width:17px;background:#181B20;border:1px solid #C5A880;border-radius:50%}
#zenBar input:focus-visible,#zenBar button:focus-visible,#zenRack button:focus-visible{outline:2px solid #C5A880;outline-offset:5px}
#zenBar .zen-action{border:1px solid #ffffff18;background:#181B20;color:rgba(226,223,216,.45);border-radius:50%;width:48px;height:48px;flex-shrink:0;cursor:pointer;display:grid;place-items:center;padding:8px}
#zenBar .zen-action svg{width:100%;height:100%}
#zenBar .zen-shoot{width:48px;height:48px;background:#34382F;color:#C5A880}
#zenBar button:disabled{opacity:.35;cursor:default}
#zenActions{display:flex;align-items:center;gap:18px;margin-left:0;flex-shrink:0}
#zenBar .zen-undo{background:#352D30;color:rgba(226,223,216,.45)}
#zenRackSection{border-left:1px solid rgba(255,255,255,.07);padding-left:22px;display:flex;align-items:center;min-height:58px}
#zenBar .zen-rack-toggle{position:relative;background:#28343C;color:#C5A880}
#zenBar .zen-rack-toggle::before{content:'';position:absolute;inset:13px;border-radius:50%;border:1px solid #C5A88066}
#zenRackMenu{position:fixed;z-index:130;width:264px;height:264px;border-radius:50%;background:radial-gradient(circle,#12161cee 0,#12161c99 50%,transparent 72%);isolation:isolate}
#zenRackMenu[hidden]{display:none}
#zenRackMenu button{position:absolute;width:43px;height:43px;border-radius:50%;display:grid;place-items:center;transform:translate(-50%,-50%);border:1px solid #C5A88066;background:#181B20;color:#E2DFD8;font:500 16px system-ui;cursor:pointer;touch-action:manipulation}
#zenRackMenu button:hover,#zenRackMenu button:focus-visible{outline:2px solid #C5A880;outline-offset:3px;filter:brightness(1.12)}
#zenRackMenu .zen-radial-center{width:55px;height:55px;left:50%;top:50%;background:#2A382E;color:#C5A880;font-size:20px}
#zenRackMenu button:disabled{opacity:.35;cursor:default}
@media(max-width:1000px){#zenActions{gap:10px}#zenRackSection{padding-left:12px}}
@media(max-width:700px){#zenActions{gap:6px}#zenRackSection{padding-left:7px;min-height:48px}#zenBar .zen-rack-toggle::before{inset:9px}#zenBar .zen-group{max-width:140px}#zenBar .zen-symbol{max-width:100%}#zenRackMenu{width:248px;height:248px}#zenRackMenu button{width:40px;height:40px}}

#zenModeBtn{border:1px solid #C5A88055;background:#181B20;color:#C5A880;border-radius:50%;height:64px;width:64px;display:grid;place-items:center;cursor:pointer;padding:0;flex-shrink:0}
#zenModeBtn svg{width:46px;height:46px}
#zenRack{position:fixed;z-index:101;bottom:118px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 12px;max-width:94vw;background:transparent;opacity:.70;border-radius:30px;overflow-x:auto;scrollbar-width:none}
#zenRack button{position:relative;flex:0 0 auto;width:24px;height:24px;border:0;border-radius:50%;cursor:grab;padding:0;touch-action:none;background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),var(--ball);box-shadow:inset -5px -6px 9px #131e1644,inset 2px 2px 5px #fff5,0 5px 7px #56492e44;transition:opacity .2s}
#zenRack button.stripe{background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),linear-gradient(#f3e8ce 22%,var(--ball) 23% 77%,#f3e8ce 78%)}
#zenRack button span{display:grid;place-items:center;margin:auto;width:43%;height:43%;border-radius:50%;background:#f9edcf;color:#373c30;font:600 8px system-ui}
#zenRack button:disabled{opacity:.22;cursor:default;box-shadow:inset 0 1px 5px #655f3822}
#zenModeMenu{position:fixed;z-index:120;bottom:calc(var(--zen-footer) - 10px);left:18px;padding:9px;background:rgba(18,22,28,.9);backdrop-filter:blur(16px) saturate(120%);border:1px solid #ffffff12;border-radius:18px;box-shadow:0 9px 22px #4443;display:flex;gap:7px}
#zenModeMenu[hidden]{display:none}
#zenModeMenu button{background:#181B20;border:0;border-radius:12px;padding:12px 18px;color:#C5A880;cursor:pointer;font:500 14px system-ui}
#zenModeMenu button:disabled{opacity:.5;cursor:default}
.zen-drag-preview{position:fixed;z-index:200;pointer-events:none;width:32px;height:32px;border-radius:50%;background:var(--ball);box-shadow:0 4px 10px #0004;transform:translate(-50%,-50%)}
#zenCueRest{position:fixed;bottom:136px;left:5vw;width:145px;height:16px;display:flex;align-items:center;gap:5px;pointer-events:none;opacity:.75}
#zenCueRest span{height:4px;flex:1;background:#C5A88088;border-radius:3px;box-shadow:0 1px 5px #66532a33}
#zenCueRest i{width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff7df,#d7c8a7);box-shadow:0 0 6px #fff4d455}
@media(max-width:1000px){#zenCueRest{display:none}#zenBar{gap:10px}#zenBar .zen-group{padding:0 5px}}
@media(max-width:700px){body.zen-mode{--zen-footer:136px}#zenBar{width:96vw;height:84px;gap:5px;padding:8px;bottom:8px;border-radius:16px}#zenBar .zen-group{padding:0 2px}#zenModeBtn{width:40px;height:40px}#zenModeBtn svg{width:32px;height:32px}#zenBar .zen-action{width:32px;height:32px;padding:5px}#zenBar .zen-shoot{width:32px;height:32px}#zenBar .zen-symbol{width:44px;height:32px;margin-top:0}#zenRack{gap:4px;bottom:98px}#zenBar .zen-group[data-kind=speed] .zen-symbol{width:56px}#zenBar input[type=range]::-webkit-slider-thumb{width:16px;height:16px;margin-top:-5px}}
@media(max-height:550px){body.zen-mode{--zen-footer:110px}#zenBar{height:70px;padding:6px;bottom:6px}#zenRack{bottom:79px}#zenBar .zen-symbol{width:48px;height:32px;margin-top:0}#zenModeBtn{width:45px;height:45px}#zenBar .zen-action{width:40px;height:40px}#zenBar .zen-shoot{width:40px;height:40px}#zenCueRest{display:none}}

@media(min-width:900px){
 body.zen-mode #stageWrap{inset:0!important}
 #zenBar{top:calc(var(--zen-y) + 1022 * var(--zu));bottom:auto;width:calc(1564 * var(--zu));height:calc(114 * var(--zu));padding:calc(12 * var(--zu)) calc(27 * var(--zu));gap:calc(18 * var(--zu));border-radius:calc(36 * var(--zu));background:linear-gradient(115deg,rgba(57,58,60,.68),rgba(37,39,43,.72));border-color:rgba(218,204,173,.30);box-shadow:inset 0 1px 1px #ffffff09,0 8px 22px #0002}
 #zenModeBtn{width:calc(80 * var(--zu));height:calc(80 * var(--zu));background:linear-gradient(145deg,#514D43,#343637);border-color:#C5A88055;box-shadow:inset 0 1px 1px #ffffff12}
 #zenModeBtn svg{width:calc(61 * var(--zu));height:calc(61 * var(--zu))}
 #zenBar .zen-group{padding:0 calc(12 * var(--zu));border-color:rgba(216,202,173,.24)}
 #zenBar .zen-symbol,#zenBar .zen-group[data-kind=speed] .zen-symbol{width:calc(172 * var(--zu));height:calc(48 * var(--zu));color:rgba(198,179,146,.61)}
 #zenBar input[type=range]{height:calc(34 * var(--zu))}
 #zenBar input[type=range]::-webkit-slider-runnable-track{height:calc(6 * var(--zu));background:linear-gradient(90deg,#A8ADA36B,#1B1E23);box-shadow:0 1px 1px #ffffff0d}
 #zenBar .zen-group[data-kind=speed] input::-webkit-slider-runnable-track{background:linear-gradient(90deg,#8F72566B,#1B1E23)}
 #zenBar input[type=range]::-webkit-slider-thumb{width:calc(23 * var(--zu));height:calc(23 * var(--zu));margin-top:calc(-8.5 * var(--zu));border:calc(2 * var(--zu)) solid #D0B891;background:linear-gradient(#383B3C,#202326);box-shadow:0 2px 5px #0007}
 #zenBar input[type=range]::-moz-range-track{height:calc(6 * var(--zu));background:linear-gradient(90deg,#A8ADA36B,#1B1E23)}
 #zenBar input[type=range]::-moz-range-thumb{width:calc(20 * var(--zu));height:calc(20 * var(--zu));border:calc(2 * var(--zu)) solid #D0B891;background:#292D30}
 #zenActions{gap:calc(22 * var(--zu))}
 #zenBar .zen-action,#zenBar .zen-shoot{width:calc(60 * var(--zu));height:calc(60 * var(--zu));padding:calc(11 * var(--zu));border-color:#D1C3A64A;box-shadow:inset 0 1px 2px #ffffff0b}
 #zenBar .zen-shoot{background:linear-gradient(145deg,#454D3E,#343B31);color:#D4BE98}
 #zenBar .zen-undo{background:linear-gradient(145deg,#544649,#3A3236);color:#BEA590}
 #zenBar .zen-rack-toggle{background:linear-gradient(145deg,#3E5058,#2C3C45)}
 #zenBar .zen-rack-toggle::before{inset:calc(17 * var(--zu));border-color:#AEAA9466}
 #zenBar button:disabled{opacity:.65}
 #zenRackSection{padding-left:calc(24 * var(--zu));min-height:calc(68 * var(--zu));border-color:rgba(216,202,173,.24)}
 #zenRack{top:calc(var(--zen-y) + 942 * var(--zu));bottom:auto;gap:calc(7 * var(--zu));padding:calc(7 * var(--zu)) calc(12 * var(--zu));opacity:.95}
 #zenRack button{width:calc(50 * var(--zu));height:calc(50 * var(--zu));box-shadow:inset -5px -6px 9px #131e1644,inset 2px 2px 5px #fff3,0 5px 7px #0004}
 #zenRack button span{font-size:calc(15 * var(--zu))}
 #zenRack button:disabled{opacity:.70}
 #zenCueRest{display:none}
 #zenModeMenu{bottom:auto;top:calc(var(--zen-y) + 906 * var(--zu));left:calc(50% - 840 * var(--zu));padding:calc(10 * var(--zu));gap:calc(9 * var(--zu));border-radius:calc(25 * var(--zu));background:linear-gradient(120deg,#383A3BCC,#303437DD);border-color:#C5A88055}
 #zenModeMenu button{font-size:calc(17 * var(--zu));padding:calc(18 * var(--zu)) calc(22 * var(--zu));border-radius:calc(16 * var(--zu))}
}

.zen-hover-anchor{display:flex;flex-shrink:0;align-items:center;border-radius:50%;outline:none}
.zen-hover-anchor:focus-visible{outline:1px solid #C5A880;outline-offset:4px}
.zen-hover-anchor .zen-action:disabled{pointer-events:none}
.zen-hover-panel{position:fixed;z-index:135;box-sizing:border-box;width:55px;height:55px;padding:0;border:0;border-radius:50%;background:transparent;color:#D4C3A8}
.zen-hover-panel[hidden]{display:none}
#zenUndoAction{display:grid;place-items:center;box-sizing:border-box;width:100%;height:100%;padding:10px;border:1px solid #C5A88055;border-radius:50%;background:linear-gradient(145deg,#494044,#302B30);color:#D4C3A8;box-shadow:0 3px 9px #0003;cursor:pointer}
#zenUndoAction svg{width:30px;height:30px}
#zenUndoAction:disabled{opacity:.38;cursor:default}
#zenUndoAction:focus-visible,#zenTipPoint:focus-visible{outline:1px solid #C5A880;outline-offset:3px}
#zenContactPanel{box-shadow:0 3px 9px #0003}
#zenTipPoint{display:block;width:100%;height:100%;touch-action:none;cursor:crosshair;border-radius:50%;overflow:visible}
#zenContactReadout{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}


`;
function init(){
 const layout=()=>{const u=Math.min(innerWidth/2048,innerHeight/1143);document.documentElement.style.setProperty('--zu',u+'px');document.documentElement.style.setProperty('--zen-y',(innerHeight-1143*u)/2+'px')};
 layout();window.addEventListener('resize',layout);
 document.body.classList.add('zen-mode');document.head.appendChild(style);
 const engine=window.billiardsZenControls;engine.enter();
 const bar=document.createElement('div');bar.id='zenBar';bar.setAttribute('aria-label','Zen shot controls');
 const switcher=window.BilliardsExperienceMenu({current:'zen',beforeNavigate:()=>{window.billiardsPlayBridge.save();return true;}});switcher.querySelector('.experience-toggle').id='zenModeBtn';switcher.querySelector('.experience-menu').classList.add('experience-menu--zen');bar.append(switcher);
 const closeMenu=()=>{const menu=switcher.querySelector('.experience-menu');if(menu.matches(':popover-open'))menu.hidePopover();};
 const bindings=[];
 function group(name,kind,originalId){
  const box=document.createElement('div');box.className='zen-group';box.dataset.kind=kind;box.title=name;
  const control=originalId&&document.getElementById(originalId),input=document.createElement('input');input.type='range';input.id='zen-'+kind;input.min=control?.min||'-12';input.max=control?.max||'12';input.step=control?.step||'.1';input.value=control?.value||'0';input.setAttribute('aria-label',name);
  const symbol=document.createElement('label');symbol.htmlFor=input.id;symbol.className='zen-symbol';symbol.innerHTML=icon(kind);symbol.title=name;
  box.append(input,symbol);bar.append(box);
  if(control){
   const sync=()=>{input.value=control.value;input.setAttribute('aria-valuetext',kind==='speed'?Number(input.value).toFixed(2):`${Math.round(Number(input.value)*100)}%`)};
   input.addEventListener('input',()=>{control.value=input.value;control.dispatchEvent(new Event('input',{bubbles:true}));sync()});input.addEventListener('change',()=>control.dispatchEvent(new Event('change',{bubbles:true})));bindings.push(sync);sync();
   input.addEventListener('wheel',e=>{e.preventDefault();if(input.disabled)return;input.value=String(Math.max(+input.min,Math.min(+input.max,+input.value+(e.deltaY<0?1:-1)*+input.step)));input.dispatchEvent(new Event('input',{bubbles:true}));},{passive:false});
  }else{
   let previous=0;input.addEventListener('input',()=>{const current=+input.value;engine.aim(current-previous);previous=current});const reset=()=>{input.value='0';previous=0};input.addEventListener('change',reset);input.addEventListener('blur',reset);input.addEventListener('pointercancel',reset);
   input.addEventListener('wheel',e=>{e.preventDefault();if(!input.disabled)engine.aim(e.deltaY<0?-.15:.15)},{passive:false});
  }
  return input;
 }
 group('Aim adjustment','aim');group('Speed','speed','speed');group('Forward / Draw','follow','follow');group('Left / Right Spin','spin','sideSpin');
 const actions=document.createElement('div');actions.id='zenActions';bar.append(actions);
 const action=(name,kind,id)=>{const b=document.createElement('button');b.type='button';b.className='zen-action zen-'+kind;b.title=name;b.setAttribute('aria-label',name);b.innerHTML=icon(kind);b.onclick=()=>{closeRackMenu();document.getElementById(id).click()};actions.append(b);return b};
 const shot=action('Execute Shot','shot','animate'),undo=action('Undo last shot','undo','undoShot');shot.classList.add('zen-shoot');

 // Popovers are outside the dock so its glass blur never clips the hover content.
 const hoverTools=[];
 function hoverPanel(trigger,id,label){
  const anchor=document.createElement('span');anchor.className='zen-hover-anchor';anchor.tabIndex=0;anchor.setAttribute('role','group');anchor.setAttribute('aria-label',label);trigger.replaceWith(anchor);anchor.append(trigger);
  const panel=document.createElement('div');panel.id=id;panel.className='zen-hover-panel';panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label',label);anchor.setAttribute('aria-controls',id);anchor.setAttribute('aria-expanded','false');document.body.append(panel);
  let timer=0,hold=0,touchOpened=false,suppressFocus=false;
  const position=()=>{const r=anchor.getBoundingClientRect(),p=panel.getBoundingClientRect(),ball=document.querySelector('#zenRack button')?.getBoundingClientRect();
   const centerY=ball?ball.top+ball.height/2:r.top-p.height/2-12;
   panel.style.left=Math.max(8,Math.min(innerWidth-p.width-8,r.left+r.width/2-p.width/2))+'px';panel.style.top=Math.max(8,centerY-p.height/2)+'px'};
  const close=()=>{clearTimeout(timer);panel.hidden=true;anchor.setAttribute('aria-expanded','false')};
  const open=()=>{if(engine.status().busy)return;hoverTools.forEach(tool=>{if(tool.panel!==panel)tool.close()});closeRackMenu();closeMenu();clearTimeout(timer);panel.hidden=false;anchor.setAttribute('aria-expanded','true');position();syncContact();};
  const leave=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!panel.matches(':hover')&&!anchor.matches(':hover')&&!panel.contains(document.activeElement))close()},350)};
  anchor.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')open()});anchor.addEventListener('pointerleave',leave);panel.addEventListener('pointerenter',()=>clearTimeout(timer));panel.addEventListener('pointerleave',leave);
  anchor.addEventListener('focusin',()=>{if(!suppressFocus)open()});
  anchor.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();open();panel.querySelector('button,[tabindex]')?.focus()}});
  anchor.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;touchOpened=false;hold=setTimeout(()=>{touchOpened=true;open()},500)});
  for(const type of ['pointerup','pointercancel','pointerleave'])anchor.addEventListener(type,()=>clearTimeout(hold));
  anchor.addEventListener('click',e=>{if(touchOpened){e.preventDefault();e.stopImmediatePropagation();touchOpened=false}},true);
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();suppressFocus=true;anchor.focus();suppressFocus=false;}if(e.key===' '||e.key==='Enter')e.stopPropagation()});
  document.addEventListener('pointerdown',e=>{if(!anchor.contains(e.target)&&!panel.contains(e.target))close()});
  document.addEventListener('focusin',e=>{if(!anchor.contains(e.target)&&!panel.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});window.addEventListener('resize',()=>{if(!panel.hidden)position()});
  const tool={anchor,panel,open,close};hoverTools.push(tool);return tool;
 }
 const recovery=hoverPanel(undo,'zenActionPanel','Action recovery');
 const undoAction=document.createElement('button');undoAction.id='zenUndoAction';undoAction.type='button';undoAction.setAttribute('aria-label','Undo last action');undoAction.innerHTML=icon('actionUndo');undoAction.onclick=()=>{engine.undoAction();sync()};recovery.panel.append(undoAction);
 const contactTool=hoverPanel(shot,'zenContactPanel','Cue-ball contact');
 contactTool.panel.innerHTML='<svg id="zenTipPoint" viewBox="24 24 152 152" tabindex="0" role="group" aria-label="Adjust cue-ball contact point" aria-describedby="zenContactHelp"><defs><radialGradient id="zenCueFace" cx="32%" cy="25%" r="78%"><stop stop-color="#FFF9E9"/><stop offset=".65" stop-color="#E2DCCB"/><stop offset="1" stop-color="#A5A89D"/></radialGradient></defs><circle cx="100" cy="100" r="76" fill="url(#zenCueFace)" stroke="#E2DFD855"/><path d="M24 100h152M100 24v152" fill="none" stroke="#5F696A55" stroke-width=".8"/><circle id="zenTipLimit" cx="100" cy="100" r="38" fill="none" stroke="#5F696A77" stroke-dasharray="2 4" stroke-width=".8"/><circle id="zenTipDot" cx="100" cy="100" r="7" fill="#C84B43" stroke="#FFF5DF" stroke-width="1.5"/></svg><div id="zenContactReadout" aria-live="polite"></div><span id="zenContactHelp" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">Click or drag the red dot. Arrow keys adjust the contact point; Home returns to center. Escape closes.</span>';
 const tipPoint=contactTool.panel.querySelector('#zenTipPoint'),tipDot=contactTool.panel.querySelector('#zenTipDot');let tipDragging=false;
 function syncContact(){
  const tip=engine.status().tip;if(!tip)return;
  tipDot.setAttribute('cx',100+76*tip.sideR);tipDot.setAttribute('cy',100-76*tip.followR);contactTool.panel.querySelector('#zenTipLimit').setAttribute('r',76*tip.limit);
  const side=Math.round(tip.side*100),follow=Math.round(tip.follow*100);
  contactTool.panel.querySelector('#zenContactReadout').textContent=`${side===0?'Center':side<0?'Left '+-side+'%':'Right '+side+'%'} · ${follow===0?'Level':follow<0?'Draw '+-follow+'%':'Follow '+follow+'%'}`;
 }
 const setContact=e=>{const r=tipPoint.getBoundingClientRect(),x=((e.clientX-r.left)/r.width-.5)*152,y=(.5-(e.clientY-r.top)/r.height)*152;if(!tipDragging&&Math.hypot(x,y)>76)return false;engine.tip(x/(76*engine.status().tip.limit),y/(76*engine.status().tip.limit));sync();return true;};
 tipPoint.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(setContact(e)){e.preventDefault();tipDragging=true;tipPoint.setPointerCapture(e.pointerId)}});
 tipPoint.addEventListener('pointermove',e=>{if(tipDragging)setContact(e)});for(const type of ['pointerup','pointercancel','lostpointercapture'])tipPoint.addEventListener(type,()=>{tipDragging=false});
 tipPoint.addEventListener('keydown',e=>{const d={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,.02],ArrowDown:[0,-.02]}[e.key],tip=engine.status().tip;if(d||e.key==='Home'){e.preventDefault();e.stopPropagation();engine.tip(e.key==='Home'?0:tip.side+d[0],e.key==='Home'?0:tip.follow+d[1]);sync()}});
 window.addEventListener('billiards:action-history',()=>sync());
 const rackSection=document.createElement('div');rackSection.id='zenRackSection';
 const rackToggle=document.createElement('button');rackToggle.type='button';rackToggle.id='zenRackToggle';rackToggle.className='zen-action zen-rack-toggle';rackToggle.setAttribute('aria-label','Choose a rack or randomize');rackToggle.setAttribute('aria-expanded','false');rackToggle.setAttribute('aria-controls','zenRackMenu');rackToggle.title='Choose a rack or randomize';rackSection.append(rackToggle);actions.append(rackSection);
 const rackMenu=document.createElement('div');rackMenu.id='zenRackMenu';rackMenu.hidden=true;rackMenu.setAttribute('role','dialog');rackMenu.setAttribute('aria-label','Full racks and randomize');
 let hideRackTimer=0,randomHoverTimer=0,randomHoverDone=false;
 const stopRandomHover=()=>{clearTimeout(randomHoverTimer);randomHoverTimer=0};
 const closeRackMenu=()=>{clearTimeout(hideRackTimer);stopRandomHover();rackMenu.hidden=true;rackToggle.setAttribute('aria-expanded','false')};
 const positionRackMenu=()=>{const r=rackToggle.getBoundingClientRect(),size=rackMenu.getBoundingClientRect().width||264;const x=Math.max(size/2+8,Math.min(innerWidth-size/2-8,r.left+r.width/2));const y=Math.max(size/2+8,r.top-size/2+10);rackMenu.style.left=(x-size/2)+'px';rackMenu.style.top=(y-size/2)+'px'};
 const openRackMenu=()=>{if(engine.status().busy)return;clearTimeout(hideRackTimer);hoverTools.forEach(tool=>tool.close());closeMenu();rackMenu.hidden=false;rackToggle.setAttribute('aria-expanded','true');positionRackMenu()};
 const scheduleRackClose=()=>{clearTimeout(hideRackTimer);hideRackTimer=setTimeout(()=>{if(!rackMenu.contains(document.activeElement))closeRackMenu()},350)};
 rackToggle.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')openRackMenu()});rackToggle.addEventListener('pointerleave',scheduleRackClose);
 rackToggle.addEventListener('click',()=>{if(rackMenu.hidden)openRackMenu();else if(matchMedia('(hover: none)').matches)closeRackMenu()});
 rackToggle.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();openRackMenu();rackMenu.querySelector('button')?.focus()}});
 rackMenu.addEventListener('pointerenter',()=>clearTimeout(hideRackTimer));rackMenu.addEventListener('pointerleave',scheduleRackClose);
 const center=document.createElement('button');center.type='button';center.className='zen-radial-center';center.textContent='R';center.title='Randomize the balls currently on the table';center.setAttribute('aria-label','Randomize current balls');
 const randomize=()=>{stopRandomHover();if(engine.status().busy)return;document.getElementById('shuffleTableLayout').click();randomHoverDone=true;sync()};
 center.addEventListener('click',e=>{if(!randomHoverDone||e.detail===0)randomize();randomHoverDone=false});center.addEventListener('pointerenter',e=>{randomHoverDone=false;if(e.pointerType==='mouse')randomHoverTimer=setTimeout(randomize,550)});center.addEventListener('pointerleave',()=>{stopRandomHover();randomHoverDone=false});center.addEventListener('blur',()=>randomHoverDone=false);rackMenu.append(center);
 const labels={rack3:'3',rack6:'6',rack7:'7',rack8:'8',rack9:'9',rack10:'10',straight14:'S',ultimate8:'U'};
 const order=['rack6','rack7','rack8','rack9','rack10','straight14','ultimate8','rack3'];
 const rackChoices=order.map((value,i)=>{const option=Array.from(document.getElementById('fullRackSelect').options).find(o=>o.value===value);const b=document.createElement('button');b.type='button';b.textContent=labels[value];b.dataset.rack=value;b.title=option.textContent;b.setAttribute('aria-label','Set up '+option.textContent);const angle=(-90+i*45)*Math.PI/180;b.style.left=(50+38*Math.cos(angle))+'%';b.style.top=(50+38*Math.sin(angle))+'%';b.addEventListener('click',()=>{if(engine.status().busy)return;const select=document.getElementById('fullRackSelect');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('startFullRack').click();closeRackMenu();sync()});rackMenu.append(b);return b});
 rackMenu.addEventListener('keydown',e=>{const buttons=Array.from(rackMenu.querySelectorAll('button'));const i=buttons.indexOf(document.activeElement);if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();buttons[(i+1)%buttons.length].focus()}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+buttons.length-1)%buttons.length].focus()}});
 document.addEventListener('pointerdown',e=>{if(!rackToggle.contains(e.target)&&!rackMenu.contains(e.target))closeRackMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!rackMenu.hidden){closeRackMenu();rackToggle.focus()}});
 document.addEventListener('focusin',e=>{if(!rackToggle.contains(e.target)&&!rackMenu.contains(e.target))closeRackMenu()});
 window.addEventListener('resize',()=>{if(!rackMenu.hidden)positionRackMenu()});

 const rack=document.createElement('div');rack.id='zenRack';rack.setAttribute('aria-label','Drag or tap a ball to add it to the table');
 const colors=['#ddb040','#386480','#b74035','#624377','#d98938','#397255','#71382f','#292c24','#ddb040','#386480','#b74035','#624377','#d98938','#397255','#71382f'];
 const balls=colors.map((color,i)=>{
  const b=document.createElement('button');b.type='button';b.innerHTML=`<span>${i+1}</span>`;b.className=i>=8?'stripe':'';b.style.setProperty('--ball',color);b.title=`Drag or tap to add ball ${i+1}`;b.setAttribute('aria-label',`Add ball ${i+1}`);
  let drag=null,suppress=false;
  b.addEventListener('pointerdown',e=>{if(b.disabled||e.button!==0)return;b.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,preview:null};suppress=false});
  b.addEventListener('pointermove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5&&!drag.preview){suppress=true;drag.preview=document.createElement('div');drag.preview.className='zen-drag-preview';drag.preview.style.setProperty('--ball',color);document.body.append(drag.preview)}if(drag.preview){drag.preview.style.left=e.clientX+'px';drag.preview.style.top=e.clientY+'px'}});
  b.addEventListener('pointerup',e=>{if(!drag)return;if(drag.preview){engine.place(i+1,e.clientX,e.clientY);drag.preview.remove()}drag=null;sync()});
  b.addEventListener('pointercancel',()=>{drag?.preview?.remove();drag=null;suppress=true});
  b.addEventListener('click',()=>{if(!suppress){engine.place(i+1);sync()}suppress=false});rack.append(b);return b;
 });
 const cueRest=document.createElement('div');cueRest.id='zenCueRest';cueRest.setAttribute('aria-hidden','true');
 cueRest.innerHTML='<span></span><i></i>';document.body.append(bar,rack,cueRest,rackMenu);
 function sync(){const status=engine.status();bindings.forEach(f=>f());bar.querySelectorAll('input').forEach(el=>el.disabled=status.busy);undo.disabled=status.busy||!status.undo;undoAction.disabled=status.busy||!status.undoAction;syncContact();if(status.busy)hoverTools.forEach(tool=>tool.close());shot.disabled=status.busy;rackToggle.disabled=status.busy;center.disabled=status.busy;rackChoices.forEach(b=>b.disabled=status.busy);if(status.busy&&!rackMenu.hidden)closeRackMenu();balls.forEach((b,i)=>{b.disabled=status.busy||status.balls.includes(i+1);b.title=status.balls.includes(i+1)?`Ball ${i+1} is on the table`:`Drag or tap to add ball ${i+1}`})}
 sync();setInterval(sync,180);window.dispatchEvent(new Event('resize'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();