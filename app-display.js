/* Shared display policy: installed apps launch fullscreen; browser tabs use a trusted gesture. */
(function(){
'use strict';
let automatic=true,pending=false,nativeActive=!!(window.BilliardsWindowsFullscreen||window.BilliardsBundledAndroid);
const fullscreen=()=>document.fullscreenElement||document.webkitFullscreenElement;
const installed=()=>navigator.standalone||matchMedia('(display-mode:standalone), (display-mode:fullscreen)').matches;
const android=()=>!!window.BilliardsAndroid?.setFullscreen;
const native=()=>android()||!!window.BilliardsWindowsHostAvailable&&!!window.chrome?.webview;
function nativeFullscreen(value){if(android())window.BilliardsAndroid.setFullscreen(value);else window.chrome.webview.postMessage({type:'set-fullscreen',active:value});}
let menu,action,hint,control;
function active(){return native()?nativeActive:!!fullscreen()||matchMedia('(display-mode:fullscreen)').matches;}
function sync(){
 if(action)action.textContent=active()?'Exit fullscreen':'Enter fullscreen';
 document.dispatchEvent(new Event('billiards:display-change'));
 window.dispatchEvent(new Event('resize'));
}
function explain(){
 hint.textContent=installed()?'Use your system’s window or edge-swipe controls to leave the app.':'For a view without browser bars, install the app and open its icon. On iPhone or iPad, use Safari → Share → Add to Home Screen.';
 menu.showPopover();
}
async function enter(quiet=false){
 automatic=false;if(pending||active())return;pending=true;
 try{
  if(native()){nativeFullscreen(true);return;}
  const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
  if(!request)throw Error('Fullscreen unavailable');
  await request.call(root,{navigationUI:'hide'});
 }catch(_){if(!quiet)explain();}finally{pending=false;sync();}
}
async function exit(){
 automatic=false;
 if(native()){nativeFullscreen(false);return;}
 const leave=document.exitFullscreen||document.webkitExitFullscreen;
 if(fullscreen()&&leave){try{await leave.call(document);}catch(_){explain();}}else explain();
 sync();
}
async function toggle(){if(active())await exit();else await enter();}
window.BilliardsDisplay={active,enter,exit,toggle};
function init(){
 control=document.createElement('button');control.id='appDisplayControl';control.type='button';control.textContent='⌄';control.title='Screen options';control.setAttribute('aria-label','Screen options');control.setAttribute('aria-expanded','false');
 menu=document.createElement('div');menu.id='appDisplayMenu';menu.setAttribute('popover','auto');control.setAttribute('popovertarget',menu.id);
 action=document.createElement('button');action.type='button';action.textContent=active()?'Exit fullscreen':'Enter fullscreen';
 hint=document.createElement('p');hint.setAttribute('role','status');menu.append(action,hint);document.body.append(control,menu);
 action.onclick=()=>{menu.hidePopover();toggle();};
 menu.addEventListener('toggle',()=>control.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 // Keep the control reachable above the Games modal, without a permanent toolbar.
 const moveControl=()=>{const dialog=document.querySelector('#playDialog[open]');const parent=dialog||document.body;if(control.parentNode!==parent)parent.append(control);if(menu.parentNode!==parent)parent.append(menu);};
 new MutationObserver(moveControl).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open'],childList:true});moveControl();
 // A click occurs after a drag ends; do not resize the table during an aiming gesture.
 document.addEventListener('click',event=>{
  if(!automatic||!event.isTrusted||active()||installed()||native())return;
  if(event.target.closest('a,input,select,textarea,#appDisplayControl,#appDisplayMenu,#btg-fullscreen'))return;
  enter(true);
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){automatic=false;if(native()&&nativeActive)exit();}
  if(event.key==='F11'&&native()){event.preventDefault();toggle();}
 });
 sync();
}
document.addEventListener('fullscreenchange',()=>{if(!fullscreen())automatic=false;sync();});
document.addEventListener('webkitfullscreenchange',sync);
window.addEventListener('billiards:native-fullscreen',event=>{nativeActive=!!event.detail;sync();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
