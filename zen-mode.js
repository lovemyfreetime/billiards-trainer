(function(){
"use strict";
if(new URLSearchParams(location.search).get("zen")!=="1")return;
const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"44\" height=\"44\" aria-hidden=\"true\"><defs><filter id=\"stonegrain\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".42\" numOctaves=\"3\" seed=\"8\" result=\"noise\"/><feComposite in=\"noise\" in2=\"SourceGraphic\" operator=\"in\" result=\"texture\"/><feBlend in=\"SourceGraphic\" in2=\"texture\" mode=\"multiply\"/></filter><linearGradient id=\"stonefill\" x1=\"0\" y1=\"0\" x2=\".2\" y2=\"1\"><stop stop-color=\"#9b9b91\"/><stop offset=\".5\" stop-color=\"#5b6058\"/><stop offset=\"1\" stop-color=\"#343c35\"/></linearGradient></defs><ellipse cx=\"32\" cy=\"56\" rx=\"25\" ry=\"5\" fill=\"#746d62\" opacity=\".16\"/><g fill=\"url(#stonefill)\" stroke=\"#545c50\" stroke-width=\".6\" filter=\"url(#stonegrain)\"><ellipse cx=\"32\" cy=\"47\" rx=\"24\" ry=\"11\"/><ellipse cx=\"32\" cy=\"34\" rx=\"19\" ry=\"9\"/><ellipse cx=\"33\" cy=\"21\" rx=\"13\" ry=\"7\"/></g></svg>";

// Simple, rounded line symbols traced from Jeff's control sketch.
const paths={
 aim:'<path d="M7 39Q24 23 41 39M6 26Q4 17 5 14Q6 12 9 14l9 5q2 2 0 3l-8-3 2 7q0 3-3 2ZM18 22l4-13q2-4 4 0l4 13q0 3-3 2l-3-9-3 9q-3 1-3-2ZM32 19l9-5q3-2 3 1l-2 11q-1 3-3 1l1-8-7 4q-3 0-1-4Z"/>',
 speed:'<path d="M5 12Q3 10 2 12Q1 13 3 15L14 24 3 33Q1 35 3 36Q4 37 6 35L19 26Q21 24 19 22ZM29 12q-2-2-3 0q-1 1 1 3l11 9-11 9q-2 2 0 3q1 1 3-1l13-9q2-2 0-4ZM53 12q-2-2-3 0q-1 1 1 3l11 9-11 9q-2 2 0 3q1 1 3-1l13-9q2-2 0-4Z"/>',
 follow:'<path d="M25 7v34M3 18l7 10 7-10q3-1 2 2l-7 12q-2 3-4 0L1 20q-1-3 2-2ZM32 30l7-10 7 10q3 1 2-2l-7-12q-2-3-4 0l-7 12q-1 3 2 2Z"/>',
 spin:'<path d="M24 7v34M16 13 4 22q-2 2 0 4l12 9q3 1 2-2L8 24l10-9q1-3-2-2ZM32 13l12 9q2 2 0 4l-12 9q-3 1-2-2l10-9-10-9q-1-3 2-2Z"/>',
 undo:'<path d="M12 19h17a12 12 0 0 1 0 24M12 19l9-9M12 19l9 9"/>',
 shot:'<path d="m19 12 20 12-20 12Z" fill="currentColor" stroke="none"/>'
};
const icon=key=>`<svg viewBox="${key==='speed'?'-2 0 76 48':'-4 0 58 48'}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round">${paths[key]}</svg>`;
const style=document.createElement('style');style.textContent=`
body.zen-mode{--zen-footer:148px;background:#d6c8ad url('./icons/zen-garden-v1.webp') center/cover fixed!important;overflow:hidden}
body.zen-mode #app{display:block!important;height:100dvh!important;background:transparent!important}
body.zen-mode #stageWrap{position:absolute!important;inset:0 0 calc(var(--zen-footer) + 25px)!important;background:transparent!important}
body.zen-mode #canvas{filter:none!important}
body.zen-mode #panel,body.zen-mode #scoreBoard,body.zen-mode #cameraCaptureBtn,body.zen-mode #analyzePhotoBtn,body.zen-mode #quickLayoutRecall,body.zen-mode #kickToolToggle,body.zen-mode #bankToolToggle,body.zen-mode #teachingCompassToggle,body.zen-mode #compassSizeWrap,body.zen-mode #compassRotateWrap,body.zen-mode #bottomSpeedControls,body.zen-mode #bottomSpin1,body.zen-mode #bottomSpin2,body.zen-mode #cueRailBtn,body.zen-mode #cuePopup,body.zen-mode #aimControls,body.zen-mode #aimControls2,body.zen-mode #angleLock,body.zen-mode #practiceCounter,body.zen-mode #markerRailControls,body.zen-mode #pocketTray,body.zen-mode #bt-guide-pool-root,body.zen-mode .phone-controls{display:none!important}
#zenBar{position:fixed;z-index:100;bottom:14px;left:50%;transform:translateX(-50%);width:min(1080px,92vw);box-sizing:border-box;height:92px;display:flex;gap:18px;align-items:center;justify-content:center;padding:12px 20px;background:linear-gradient(120deg,#f6edd5a6,#dfd3b967);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);border:1px solid #fff4d877;border-radius:29px;box-shadow:0 4px 22px #54482c24,inset 0 1px 14px #fff3d433;font-family:system-ui;color:#6d705c}
#zenBar .zen-group{min-width:0;flex:1;max-width:164px;text-align:center;position:relative;padding:0 9px;border-right:1px solid #fff4}
#zenBar .zen-symbol{display:block;width:54px;height:32px;margin:4px auto 0;color:#696e59;opacity:.85}
#zenBar .zen-group[data-kind=speed] .zen-symbol{width:66px}
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
#zenRack{position:fixed;z-index:101;bottom:118px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 12px;max-width:94vw;background:#dfd1b322;border-radius:30px;overflow-x:auto;scrollbar-width:none}
#zenRack button{position:relative;flex:0 0 auto;width:clamp(22px,2.9vw,40px);height:clamp(22px,2.9vw,40px);border:0;border-radius:50%;cursor:grab;padding:0;touch-action:none;background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),var(--ball);box-shadow:inset -5px -6px 9px #131e1644,inset 2px 2px 5px #fff5,0 5px 7px #56492e44;transition:opacity .2s}
#zenRack button.stripe{background:radial-gradient(circle at 30% 23%,#fff9,transparent 48%),linear-gradient(#f3e8ce 22%,var(--ball) 23% 77%,#f3e8ce 78%)}
#zenRack button span{display:grid;place-items:center;margin:auto;width:43%;height:43%;border-radius:50%;background:#f9edcf;color:#373c30;font:600 clamp(8px,.8vw,12px) system-ui}
#zenRack button:disabled{opacity:.22;cursor:default;box-shadow:inset 0 1px 5px #655f3822}
#zenModeMenu{position:fixed;z-index:120;bottom:calc(var(--zen-footer) - 10px);left:18px;padding:9px;background:#eee5d3f5;border:1px solid #fff3d1;border-radius:18px;box-shadow:0 9px 22px #4443;display:flex;gap:7px}
#zenModeMenu[hidden]{display:none}
#zenModeMenu button{background:#dad2bb;border:0;border-radius:12px;padding:12px 18px;color:#555b48;cursor:pointer;font:500 14px system-ui}
#zenModeMenu button:disabled{opacity:.5;cursor:default}
.zen-drag-preview{position:fixed;z-index:200;pointer-events:none;width:32px;height:32px;border-radius:50%;background:var(--ball);box-shadow:0 4px 10px #0004;transform:translate(-50%,-50%)}
#zenCueRest{position:fixed;bottom:136px;left:5vw;width:145px;height:16px;display:flex;align-items:center;gap:5px;pointer-events:none;opacity:.75}
#zenCueRest span{height:4px;flex:1;background:linear-gradient(#f8e8c8,#a37e57);border-radius:3px;box-shadow:0 1px 5px #66532a33}
#zenCueRest i{width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff7df,#d7c8a7);box-shadow:0 0 6px #fff4d455}
@media(max-width:1000px){#zenCueRest{display:none}#zenBar{gap:10px}#zenBar .zen-group{padding:0 5px}}
@media(max-width:700px){body.zen-mode{--zen-footer:136px}#zenBar{width:96vw;height:84px;gap:5px;padding:8px;bottom:8px;border-radius:22px}#zenBar .zen-group{padding:0 2px}#zenModeBtn{width:40px;height:40px}#zenModeBtn svg{width:32px;height:32px}#zenBar .zen-action{width:32px;height:32px;padding:5px}#zenBar .zen-shoot{width:40px;height:40px}#zenBar .zen-symbol{width:36px;height:27px;margin-top:2px}#zenRack{gap:4px;bottom:98px}#zenBar .zen-group[data-kind=speed] .zen-symbol{width:42px}#zenBar input[type=range]::-webkit-slider-thumb{width:16px;height:16px;margin-top:-5px}}
@media(max-height:550px){body.zen-mode{--zen-footer:110px}#zenBar{height:70px;padding:6px;bottom:6px}#zenRack{bottom:79px}#zenBar .zen-symbol{width:36px;height:25px;margin-top:0}#zenModeBtn{width:45px;height:45px}#zenBar .zen-shoot{width:45px;height:45px}#zenCueRest{display:none}}

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
 const cueRest=document.createElement('div');cueRest.id='zenCueRest';cueRest.setAttribute('aria-hidden','true');
 cueRest.innerHTML='<span></span><i></i>';document.body.append(bar,menu,rack,cueRest);
 function sync(){const status=engine.status();bindings.forEach(f=>f());bar.querySelectorAll('input').forEach(el=>el.disabled=status.busy);undo.disabled=status.busy||!status.undo;shot.disabled=status.busy;balls.forEach((b,i)=>{b.disabled=status.busy||status.balls.includes(i+1);b.title=status.balls.includes(i+1)?`Ball ${i+1} is on the table`:`Drag or tap to add ball ${i+1}`})}
 sync();setInterval(sync,180);window.dispatchEvent(new Event('resize'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
