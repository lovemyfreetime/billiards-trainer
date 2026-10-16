(function(){
"use strict";
const mode = new URLSearchParams(location.search).get("zen")==="1";
const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"44\" height=\"44\" aria-hidden=\"true\"><defs><filter id=\"stonegrain\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".42\" numOctaves=\"3\" seed=\"8\" result=\"noise\"/><feComposite in=\"noise\" in2=\"SourceGraphic\" operator=\"in\" result=\"texture\"/><feBlend in=\"SourceGraphic\" in2=\"texture\" mode=\"multiply\"/></filter><linearGradient id=\"stonefill\" x1=\"0\" y1=\"0\" x2=\".2\" y2=\"1\"><stop stop-color=\"#e4dfd4\"/><stop offset=\".5\" stop-color=\"#ada99d\"/><stop offset=\"1\" stop-color=\"#77766f\"/></linearGradient></defs><ellipse cx=\"32\" cy=\"56\" rx=\"25\" ry=\"5\" fill=\"#746d62\" opacity=\".16\"/><g fill=\"url(#stonefill)\" stroke=\"#969085\" stroke-width=\".6\" filter=\"url(#stonegrain)\"><ellipse cx=\"32\" cy=\"47\" rx=\"24\" ry=\"11\"/><ellipse cx=\"32\" cy=\"34\" rx=\"19\" ry=\"9\"/><ellipse cx=\"33\" cy=\"21\" rx=\"13\" ry=\"7\"/></g></svg>";
const style = document.createElement("style");
style.textContent = `
body.zen-mode{background:#d8d0bd!important;overflow:hidden}
body.zen-mode #app{display:block!important;height:100dvh!important}
body.zen-mode #stageWrap{position:absolute!important;inset:0 0 156px!important;background:#b0b9a8!important}
body.zen-mode #canvas{filter:saturate(.68) brightness(1.13) contrast(.90)}
body.zen-mode #panel,body.zen-mode #scoreBoard,body.zen-mode #cameraCaptureBtn,body.zen-mode #analyzePhotoBtn,body.zen-mode #quickLayoutRecall,body.zen-mode #kickToolToggle,body.zen-mode #bankToolToggle,body.zen-mode #teachingCompassToggle,body.zen-mode #compassSizeWrap,body.zen-mode #compassRotateWrap,body.zen-mode #bottomSpeedControls,body.zen-mode #bottomSpin1,body.zen-mode #bottomSpin2,body.zen-mode #cueRailBtn,body.zen-mode #cuePopup,body.zen-mode #aimControls,body.zen-mode #aimControls2,body.zen-mode #angleLock,body.zen-mode #practiceCounter,body.zen-mode #markerRailControls{display:none!important}
body.zen-mode #pocketTray{bottom:4px!important;opacity:1!important;max-width:96%!important;background:transparent!important;filter:saturate(.8) brightness(1.1)}
body.zen-mode #pocketTray:not(.visible){pointer-events:auto!important}
#zenBar{position:fixed;z-index:100;bottom:0;left:0;right:0;box-sizing:border-box;height:140px;background:linear-gradient(180deg,#e7ded1,#c3b3a4);display:flex;gap:20px;align-items:end;padding:22px 25px 28px;box-shadow:0 -6px 22px #6a64534f;font-family:system-ui,sans-serif;color:#625a51}
#zenBar .zen-group{min-width:0;flex:1;text-align:center}
#zenBar label{display:block;font-size:12px;color:#70665e;margin-top:6px;white-space:nowrap}
#zenBar input[type=range]{display:block;width:100%;height:5px;accent-color:#797f6d;cursor:pointer;touch-action:pan-x}
#zenBar input[type=range]::-webkit-slider-thumb{width:13px;height:13px}
#zenBar .zen-action{border:1px solid #f4eee5a1;background:#e6dfd8;color:#504b43;border-radius:50%;width:48px;height:48px;flex-shrink:0;cursor:pointer;font-size:20px}
#zenModeBtn{border:1px solid #9b93855c;background:linear-gradient(140deg,#e0d7c6aa,#a99d8ab0);border-radius:50%;height:65px;width:65px;display:grid;place-items:center;box-shadow:0 2px 13px #675e5640;cursor:pointer;padding:0;flex-shrink:0}
#zenModeBtn svg{width:44px;height:44px;filter:drop-shadow(0 3px 2px #6b63545e)}

#zenRack{position:fixed;z-index:101;bottom:140px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:4px;padding:3px 12px;max-width:95vw;overflow-x:auto;scrollbar-width:none}
#zenRack button{flex:0 0 auto;width:clamp(21px,2.9vw,39px);height:clamp(21px,2.9vw,39px);border:1px solid #b7ada0aa;border-radius:50%;font-size:clamp(9px,1vw,13px);font-weight:700;color:#fff;text-shadow:0 1px 2px #333;cursor:pointer;box-shadow:inset -5px -5px 10px #0002,inset 3px 3px 7px #fff7,0 3px 7px #4435}
#zenRack button:nth-child(n+9){background-image:linear-gradient(transparent 25%,#faf6e8 26%,#faf6e8 70%,transparent 71%)!important;color:#34302a;text-shadow:none}
#zenModeMenu{position:fixed;z-index:120;bottom:144px;left:17px;padding:8px;background:#ede6d9f5;border:1px solid #bcb1a2;border-radius:15px;box-shadow:0 9px 22px #4445;display:flex;gap:5px}
#zenModeMenu[hidden]{display:none}
#zenModeMenu button{background:#d3c6b5;border:0;border-radius:10px;padding:12px 18px;color:#423e37;cursor:pointer;font-weight:600}
@media(max-width:650px){#zenBar{gap:7px;padding:15px 8px 20px;height:140px}#zenBar .zen-action{width:38px;height:38px}#zenModeBtn{height:49px;width:49px}#zenModeBtn svg{width:34px;height:34px}#zenBar label{font-size:10px}body.zen-mode #stageWrap{bottom:156px!important}}
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
const tray=document.createElement("div");tray.id="zenRack";tray.setAttribute("aria-label","Balls available to add to the table");const shades=["#dfad38","#39638b","#b94942","#5d497b","#d68c44","#43765e","#82433b","#30302e","#e3b13c","#3c6390","#b64747","#664a7c","#ca8a4b","#447159","#824c49"];
shades.forEach((color,i)=>{const ball=document.createElement("button");ball.type="button";ball.textContent=String(i+1);ball.title="Add ball "+(i+1);ball.style.backgroundColor=color;ball.addEventListener("click",()=>{const select=document.getElementById("ballSelect");const add=document.getElementById("addBall");if(select&&add){select.value=String(i+1);select.dispatchEvent(new Event("change",{bubbles:true}));add.click();}});tray.appendChild(ball)});
document.body.append(bar,menu,tray);setTimeout(()=>window.dispatchEvent(new Event("resize")),80);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();