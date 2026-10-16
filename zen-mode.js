(function(){
"use strict";
const mode = new URLSearchParams(location.search).get("zen")==="1";
const svg = '<svg viewBox="0 0 64 64" width="42" height="42" aria-hidden="true"><ellipse cx="32" cy="49" rx="23" ry="9" fill="#827b70"/><ellipse cx="32" cy="36" rx="18" ry="8" fill="#a29b8b"/><ellipse cx="32" cy="24" rx="13" ry="7" fill="#bbb4a4"/></svg>';
const style = document.createElement("style");
style.textContent = `
body.zen-mode{background:#d8d0bd!important;overflow:hidden}
body.zen-mode #app{display:block!important;height:100dvh!important}
body.zen-mode #stageWrap{position:absolute!important;inset:0 0 130px!important;background:#b0b9a8!important}
body.zen-mode #canvas{filter:saturate(.68) brightness(1.13) contrast(.90)}
body.zen-mode #panel,body.zen-mode #scoreBoard,body.zen-mode #cameraCaptureBtn,body.zen-mode #analyzePhotoBtn,body.zen-mode #quickLayoutRecall,body.zen-mode #kickToolToggle,body.zen-mode #bankToolToggle,body.zen-mode #teachingCompassToggle,body.zen-mode #compassSizeWrap,body.zen-mode #compassRotateWrap,body.zen-mode #bottomSpeedControls,body.zen-mode #bottomSpin1,body.zen-mode #bottomSpin2,body.zen-mode #cueRailBtn,body.zen-mode #cuePopup,body.zen-mode #aimControls,body.zen-mode #aimControls2,body.zen-mode #angleLock,body.zen-mode #practiceCounter,body.zen-mode #markerRailControls{display:none!important}
body.zen-mode #pocketTray{bottom:4px!important;opacity:1!important;max-width:96%!important;background:transparent!important;filter:saturate(.8) brightness(1.1)}
body.zen-mode #pocketTray:not(.visible){pointer-events:auto!important}
#zenBar{position:fixed;z-index:100;bottom:0;left:0;right:0;box-sizing:border-box;height:130px;background:linear-gradient(180deg,#c3b6a9,#aa998b);display:flex;gap:20px;align-items:end;padding:22px 25px 26px;box-shadow:0 -6px 22px #6a64534f;font-family:system-ui,sans-serif;color:#eee8dd}
#zenBar .zen-group{min-width:0;flex:1;text-align:center}
#zenBar label{display:block;font-size:12px;color:#f3ece2;margin-top:6px;white-space:nowrap}
#zenBar input[type=range]{display:block;width:100%;height:5px;accent-color:#797f6d;cursor:pointer;touch-action:pan-x}
#zenBar input[type=range]::-webkit-slider-thumb{width:13px;height:13px}
#zenBar .zen-action{border:1px solid #f4eee5a1;background:#f4eee532;color:#faf4ea;border-radius:50%;width:48px;height:48px;flex-shrink:0;cursor:pointer;font-size:20px}
#zenModeBtn{border:1px solid #9b93855c;background:linear-gradient(140deg,#e0d7c6aa,#a99d8ab0);border-radius:50%;height:65px;width:65px;display:grid;place-items:center;box-shadow:0 2px 13px #675e5640;cursor:pointer;padding:0;flex-shrink:0}
#zenModeBtn svg{width:44px;height:44px;filter:drop-shadow(0 3px 2px #6b63545e)}
#zenModeMenu{position:fixed;z-index:120;bottom:144px;left:17px;padding:8px;background:#ede6d9f5;border:1px solid #bcb1a2;border-radius:15px;box-shadow:0 9px 22px #4445;display:flex;gap:5px}
#zenModeMenu[hidden]{display:none}
#zenModeMenu button{background:#d3c6b5;border:0;border-radius:10px;padding:12px 18px;color:#423e37;cursor:pointer;font-weight:600}
@media(max-width:650px){#zenBar{gap:7px;padding:15px 8px 20px;height:119px}#zenBar .zen-action{width:38px;height:38px}#zenModeBtn{height:49px;width:49px}#zenModeBtn svg{width:34px;height:34px}#zenBar label{font-size:10px}body.zen-mode #stageWrap{bottom:119px!important}}
`;
function inputGroup(label,originalId){
const box=document.createElement("div");box.className="zen-group";
const control=document.getElementById(originalId);
const inp=document.createElement("input");inp.type="range";inp.min=control?.min||"-1";inp.max=control?.max||"1";inp.step=control?.step||".01";inp.value=control?.value||"0";inp.setAttribute("aria-label",label);
inp.addEventListener("input",()=>{if(!control)return;control.value=inp.value;control.dispatchEvent(new Event("input",{bubbles:true}));});
inp.addEventListener("change",()=>{if(!control)return;control.dispatchEvent(new Event("change",{bubbles:true}));});
control?.addEventListener("input",()=>{inp.value=control.value});
const lab=document.createElement("label");lab.textContent=label;box.append(inp,lab);return box;
}
function init(){
if(!mode)return;
document.body.classList.add("zen-mode");document.head.appendChild(style);
const bar=document.createElement("div");bar.id="zenBar";
const stones=document.createElement("button");stones.id="zenModeBtn";stones.type="button";stones.setAttribute("aria-label","Change experience");stones.title="Change experience";stones.innerHTML=svg;
const menu=document.createElement("div");menu.id="zenModeMenu";menu.hidden=true;
const train=document.createElement("button");train.textContent="Train";train.onclick=()=>{const url=new URL(location.href);url.searchParams.delete("zen");location.href=url.toString()};
const play=document.createElement("button");play.textContent="Play (soon)";play.disabled=true;play.title="Social play is in development";
menu.append(train,play);stones.onclick=()=>{menu.hidden=!menu.hidden;};document.addEventListener("pointerdown",e=>{if(!stones.contains(e.target)&&!menu.contains(e.target))menu.hidden=true});
bar.append(stones);
const aimBox=document.createElement("div");aimBox.className="zen-group";
const aim=document.createElement("input");aim.type="range";aim.min="-10";aim.max="10";aim.step=".1";aim.value="0";aim.setAttribute("aria-label","Aim adjustment");
const aimLabel=document.createElement("label");aimLabel.textContent="Aim";aimBox.append(aim,aimLabel);
aim.addEventListener("input",()=>{const roller=document.getElementById("aimRoller");if(!roller)return;const d=Number(aim.value); if(!d)return;roller.dispatchEvent(new WheelEvent("wheel",{deltaY:-d, bubbles:true,cancelable:true}));aim.value="0";});
bar.append(aimBox,inputGroup("Speed","speed"),inputGroup("Forward / Draw","follow"),inputGroup("Left / Right Spin","sideSpin"));
const undo=document.createElement("button");undo.className="zen-action";undo.type="button";undo.textContent="↶";undo.title="Undo last shot";undo.onclick=()=>document.getElementById("undoShot")?.click();bar.append(undo);
const shot=document.createElement("button");shot.className="zen-action";shot.type="button";shot.textContent="▶";shot.title="Execute Shot";shot.onclick=()=>document.getElementById("animate")?.click();bar.append(shot);
document.body.append(bar,menu);setTimeout(()=>window.dispatchEvent(new Event("resize")),80);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();