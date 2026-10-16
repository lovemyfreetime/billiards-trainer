(function(){
"use strict";
if(new URLSearchParams(location.search).get("zen")!=="1")return;
const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"44\" height=\"44\" aria-hidden=\"true\"><defs><filter id=\"stonegrain\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".42\" numOctaves=\"3\" seed=\"8\" result=\"noise\"/><feComposite in=\"noise\" in2=\"SourceGraphic\" operator=\"in\" result=\"texture\"/><feBlend in=\"SourceGraphic\" in2=\"texture\" mode=\"multiply\"/></filter><linearGradient id=\"stonefill\" x1=\"0\" y1=\"0\" x2=\".2\" y2=\"1\"><stop stop-color=\"#e4dfd4\"/><stop offset=\".5\" stop-color=\"#ada99d\"/><stop offset=\"1\" stop-color=\"#77766f\"/></linearGradient></defs><ellipse cx=\"32\" cy=\"56\" rx=\"25\" ry=\"5\" fill=\"#746d62\" opacity=\".16\"/><g fill=\"url(#stonefill)\" stroke=\"#969085\" stroke-width=\".6\" filter=\"url(#stonegrain)\"><ellipse cx=\"32\" cy=\"47\" rx=\"24\" ry=\"11\"/><ellipse cx=\"32\" cy=\"34\" rx=\"19\" ry=\"9\"/><ellipse cx=\"33\" cy=\"21\" rx=\"13\" ry=\"7\"/></g></svg>";

// Simple, rounded line symbols traced from Jeff's control sketch.
const paths={
 aim:'<path d="M7 36Q24 19 41 36M8 25 5 14l12 4M19 21l5-14 5 14M31 18l12-4-3 11"/>',
 speed:'<path d="m5 12 10 12L5 36m14-24 10 12-10 12m14-24 10 12-10 12"/>',
 follow:'<path d="M24 6v36M5 19l8 12 8-12M29 29l8-12 8 12"/>',
 spin:'<path d="M24 6v36M17 14 5 24l12 10M31 14l12 10-12 10"/>',
 undo:'<path d="M12 19h17a12 12 0 0 1 0 24M12 19l9-9M12 19l9 9"/>',
 shot:'<path d="m19 12 20 12-20 12Z" fill="currentColor" stroke="none"/>'
};
const icon=key=>`<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[key]}</svg>`;
const style=document.createElement('style');style.textContent=`
body.zen-mode{--zen-footer:140px;background:#d6c8ad!important;overflow:hidden}
body.zen-mode #app{display:block!important;height:100dvh!important}
body.zen-mode #stageWrap{position:absolute!important;inset:0 0 var(--zen-footer)!important;background:transparent!important}
body.zen-mode #canvas{filter:none!important}
body.zen-mode #panel,body.zen-mode #scoreBoard,body.zen-mode #cameraCaptureBtn,body.zen-mode #analyzePhotoBtn,body.zen-mode #quickLayoutRecall,body.zen-mode #kickToolToggle,body.zen-mode #bankToolToggle,body.zen-mode #teachingCompassToggle,body.zen-mode #compassSizeWrap,body.zen-mode #compassRotateWrap,body.zen-mode #bottomSpeedControls,body.zen-mode #bottomSpin1,body.zen-mode #bottomSpin2,body.zen-mode #cueRailBtn,body.zen-mode #cuePopup,body.zen-mode #aimControls,body.zen-mode #aimControls2,body.zen-mode #angleLock,body.zen-mode #practiceCounter,body.zen-mode #markerRailControls,body.zen-mode #pocketTray,body.zen-mode #bt-guide-pool-root,body.zen-mode .phone-controls{display:none!important}
#zenBar{position:fixed;z-index:100;bottom:0;left:0;right:0;box-sizing:border-box;height:var(--zen-footer);display:flex;gap:24px;align-items:center;padding:36px 28px 10px;background:radial-gradient(ellipse at 45% 0,#eee2cb,#c6b79f);font-family:system-ui;color:#6d705c}
#zenBar .zen-group{min-width:0;flex:1;text-align:center;position:relative;padding:0 14px;border-right:1px solid #fff5}
#zenBar .zen-symbol{display:block;width:44px;height:34px;margin:8px auto 0;color:#696e59;opacity:.85}
#zenBar .zen-symbol svg{width:100%;height:100%}
#zenBar input[type=range]{appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;width:100%;height:26px;margin:0;padding:0;background:transparent;cursor:pointer;touch-action:pan-y}
#zenBar input[type=range]::-webkit-slider-runnable-track{height:5px;background:linear-gradient(90deg,#8ca38b,#d9cdb7);border-radius:10px;box-shadow:0 1px 0 #fffa}
#zenBar .zen-group[data-kind=speed] input::-webkit-slider-runnable-track{background:linear-gradient(90deg,#b68b5c,#d9cdb7)}
#zenBar input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:19px;height:19px;margin-top:-7px;border:2px solid #fff2d8;border-radius:50%;background:#d8c6a9;box-shadow:0 2px 7px #66553d44,0 0 8px #fff4d744}
#zenBar input[type=range]::-moz-range-track{height:5px;background:#a6ad93;border-radius:10px}
#zenBar input[type=range]::-moz-range-thumb{height:17px;width:17px;background:#d8c6a9;border:2px solid #fff2d8;border-radius:50%}
#zenBar input:focus-visible,#zenBar button:focus-visible,#zenRack button:focus-visible{outline:2px solid #727e61;outline-offset:5px}
#zenBar .zen-action{border:1px solid #fff0cb99;background:#e9dfca88;color:#737b62;border-radius:50%;width:48px;height:48px;flex-shrink:0;cursor:pointer;box-shadow:0 3px 10px #655b3c14;display:grid;place-items:center;padding:8px}
#zenBar .zen-action svg{width:100%;height:100%}
#zenBar .zen-shoot{width:62px;height:62px;background:linear-gradient(145deg,#97a282,#6d795e);color:#fff1d6;box-shadow:0 0 14px #fff1d644,0 3px 12px #5d614733}
#zenBar button:disabled{opacity:.35;cursor:default}
#zenModeBtn{border:1px solid #eadebd;background:radial-gradient(circle at 35% 25%,#eee5d2,#c5b69a);border-radius:50%;height:64px;width:64px;display:grid;place-items:center;box-shadow:0 0 15px #fff2d944,0 3px 13px #675e5622;cursor:pointer;padding:0;flex-shrink:0}
#zenModeBtn svg{width:46px;height:46px;filter:drop-shadow(0 3px 2px #6b63544a)}
#zenRack{position:fixed;z-index:101;bottom:calc(var(--zen-footer) - 30px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 12px;max-width:94vw;overflow-x:auto;scrollbar-width:none}
#zenRack button{position:relative;flex:0 0 auto;width:clamp(22px,2.9vw,40px);height:clamp(22px,2.9vw,40px);border:0;border-radius:50%;cursor:grab;padding:0;touch-action:none;background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),var(--ball);box-shadow:inset -5px -6px 9px #131e1644,inset 2px 2px 5px #fff5,0 5px 7px #56492e44;transition:opacity .2s}
#zenRack button.stripe{background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),linear-gradient(#f3e8ce 22%,var(--ball) 23% 77%,#f3e8ce 78%)}
#zenRack button span{display:grid;place-items:center;margin:auto;width:43%;height:43%;border-radius:50%;background:#f9edcf;color:#373c30;font:600 clamp(8px,.8vw,12px) system-ui}
#zenRack button:disabled{opacity:.22;cursor:default;box-shadow:inset 0 1px 5px #655f3822}
#zenModeMenu{position:fixed;z-index:120;bottom:calc(var(--zen-footer) - 10px);left:18px;padding:9px;background:#eee5d3f5;border:1px solid #fff3d1;border-radius:18px;box-shadow:0 9px 22px #4443;display:flex;gap:7px}
#zenModeMenu[hidden]{display:none}
#zenModeMenu button{background:#dad2bb;border:0;border-radius:12px;padding:12px 18px;color:#555b48;cursor:pointer;font:500 14px system-ui}
#zenModeMenu button:disabled{opacity:.5;cursor:default}
.zen-drag-preview{position:fixed;z-index:200;pointer-events:none;width:32px;height:32px;border-radius:50%;background:var(--ball);box-shadow:0 4px 10px #0004;transform:translate(-50%,-50%)}
@media(max-width:700px){body.zen-mode{--zen-footer:118px}#zenBar{gap:6px;padding:33px 10px 4px}#zenBar .zen-group{padding:0 4px}#zenModeBtn{width:44px;height:44px}#zenModeBtn svg{width:34px;height:34px}#zenBar .zen-action{width:36px;height:36px;padding:6px}#zenBar .zen-shoot{width:44px;height:44px}#zenBar .zen-symbol{width:30px;height:26px;margin-top:5px}#zenRack{gap:4px}#zenBar input[type=range]::-webkit-slider-thumb{width:16px;height:16px;margin-top:-5px}}
@media(max-height:550px){body.zen-mode{--zen-footer:100px}#zenBar{padding-top:29px}#zenBar .zen-symbol{width:32px;height:26px;margin-top:3px}}
`;
function init(){
 document.body.classList.add('zen-mode');document.head.appendChild(style);
 const engine=window.billiardsZenControls;engine.enter();
 const bar=document.createElement('div');bar.id='zenBar';bar.setAttribute('aria-label','Zen shot controls');
 const stones=document.createElement('button');stones.id='zenModeBtn';stones.type='button';stones.setAttribute('aria-label','Change experience');stones.setAttribute('aria-expanded','false');stones.title='Change experience';stones.innerHTML=svg;
 const menu=document.createElement('div');menu.id='zenModeMenu';menu.hidden=true;
 const train=document.createElement('button');train.textContent='Train';train.onclick=()=>{const url=new URL(location.href);url.searchParams.delete('zen');location.href=url.toString()};
 const play=document.createElement('button');play.textContent='Play · coming soon';play.disabled=true;
 menu.append(train,play);const closeMenu=()=>{menu.hidden=true;stones.setAttribute('aria-expanded','false')};stones.onclick=()=>{menu.hidden=!menu.hidden;stones.setAttribute('aria-expanded',String(!menu.hidden))};
 document.addEventListener('pointerdown',e=>{if(!stones.contains(e.target)&&!menu.contains(e.target))closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});bar.append(stones);
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
 const action=(name,kind,id)=>{const b=document.createElement('button');b.type='button';b.className='zen-action zen-'+kind;b.title=name;b.setAttribute('aria-label',name);b.innerHTML=icon(kind);b.onclick=()=>document.getElementById(id).click();bar.append(b);return b};
 const undo=action('Undo last shot','undo','undoShot'),shot=action('Execute Shot','shot','animate');shot.classList.add('zen-shoot');
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
 document.body.append(bar,menu,rack);
 function sync(){const status=engine.status();bindings.forEach(f=>f());bar.querySelectorAll('input').forEach(el=>el.disabled=status.busy);undo.disabled=status.busy||!status.undo;shot.disabled=status.busy;balls.forEach((b,i)=>{b.disabled=status.busy||status.balls.includes(i+1);b.title=status.balls.includes(i+1)?`Ball ${i+1} is on the table`:`Drag or tap to add ball ${i+1}`})}
 sync();setInterval(sync,180);window.dispatchEvent(new Event('resize'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
