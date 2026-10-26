/* Shared display policy: installed apps launch fullscreen; browser tabs use a trusted gesture. */
(function(){
'use strict';
let automatic=true,pending=false,nativeActive=!!(window.BilliardsWindowsFullscreen||window.BilliardsBundledAndroid);
const fullscreen=()=>document.fullscreenElement||document.webkitFullscreenElement;
const installed=()=>navigator.standalone||matchMedia('(display-mode:standalone), (display-mode:fullscreen)').matches;
const android=()=>!!window.BilliardsAndroid?.setFullscreen;
const native=()=>android()||!!window.BilliardsWindowsHostAvailable&&!!window.chrome?.webview;
function nativeFullscreen(value){if(android())window.BilliardsAndroid.setFullscreen(value);else window.chrome.webview.postMessage({type:'set-fullscreen',active:value});}
let menu,hint,control,viewHint,nativeHelp=false,hintDismissed=false;
const installer=()=>/\/install\/(?:index\.html)?$/.test(location.pathname);
const phone=()=>{const ua=navigator.userAgent;if(/Android/i.test(ua))return /Mobile/i.test(ua);if(/iPad/i.test(ua))return false;return /iPhone|iPod/i.test(ua)||navigator.userAgentData?.mobile===true||matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<600;};
let orientationPage=location.href,viewFrame=null;
const parentDisplay=(()=>{try{return window.parent!==window&&window.parent.BilliardsDisplay?.navigate?window.parent.BilliardsDisplay:null;}catch(_){return null;}})();
function desiredOrientation(){const path=new URL(orientationPage).pathname;return /\/install\/(?:index\.html)?$/.test(path)?null:'landscape';}
async function orient(){
 if(parentDisplay)return parentDisplay.orient();
 try{const desired=desiredOrientation();if(!desired){screen.orientation?.unlock();return;}if(screen.orientation?.lock&&(active()||installed()))await screen.orientation.lock(desired);}catch(_){}
}
async function navigate(href){
 const url=new URL(href,location.href);
 if(url.origin!==location.origin){location.assign(url.href);return;}
 if(parentDisplay)return parentDisplay.navigate(url.href);
 window.dispatchEvent(new Event('billiards:before-reload'));
 orientationPage=url.href;
 if(native()){await enter(true);location.assign(url.href);return;}
 await enter(true);
 if(!active()){location.assign(url.href);return;}
 // Keep the fullscreen document alive while same-origin experiences change.
 if(!viewFrame){window.dispatchEvent(new Event('pagehide'));viewFrame=document.createElement('iframe');viewFrame.id='appExperienceFrame';viewFrame.name='appExperienceFrame';viewFrame.title='Billiards app';viewFrame.allow='fullscreen; camera; microphone; screen-wake-lock';viewFrame.setAttribute('allowfullscreen','');viewFrame.onload=()=>{try{document.title=viewFrame.contentDocument.title;viewFrame.contentWindow.focus();}catch(_){}};document.body.append(viewFrame);document.body.classList.add('app-experience-host');}
 viewFrame.src=url.href;history.pushState({billiardsView:url.href},'',url.href);await orient();
}

const zen=()=>new URLSearchParams(location.search).get('zen')==='1'||document.body?.classList.contains('zen-mode');
function active(){if(parentDisplay)return parentDisplay.active();return native()?nativeActive:!!fullscreen()||matchMedia('(display-mode:fullscreen)').matches;}
function updateViewHint(){
 if(!viewHint||!control)return;
 const appView=!installer()&&!viewFrame;
 const portrait=innerHeight>innerWidth&&(phone()||matchMedia('(pointer:coarse)').matches);
 const needsFullscreen=!active()&&!installed()&&!native()&&automatic;
 const show=appView&&!hintDismissed&&(portrait||needsFullscreen);
 viewHint.hidden=!show;for(const button of [control,document.getElementById('btg-fullscreen'),document.getElementById('welcomeFullscreen')])button?.classList.toggle('display-needs-attention',!active()&&!hintDismissed);
 if(!show)return;
 const unsupported=!document.documentElement.requestFullscreen&&!document.documentElement.webkitRequestFullscreen;
 const text=portrait?'Turn your device sideways for the best table view. ':'';
 viewHint.querySelector('p').textContent=text+(needsFullscreen?(unsupported?'For a view without browser bars, open this app from your Home Screen.':'Tap Fullscreen to give the app the whole screen.'):'');
 const button=viewHint.querySelector('[data-display-enter]');button.hidden=!needsFullscreen;button.textContent=unsupported?'Fullscreen help':'Fullscreen';
}
function sync(){
 if(control){control.hidden=!!document.getElementById('welcomeFullscreen')||!!document.getElementById('btg-fullscreen')&&!zen();const label=active()?'Exit fullscreen':'Enter fullscreen';control.setAttribute('aria-label',label);control.setAttribute('aria-pressed',String(active()));if(zen())control.removeAttribute('title');else control.title=label;}
 updateViewHint();
 try{viewFrame?.contentWindow.BilliardsDisplay?.refresh();}catch(_){}
 document.dispatchEvent(new Event('billiards:display-change'));
 window.dispatchEvent(new Event('resize'));
}
function explain(){
 if(zen())return;
 hint.textContent=installed()?'Use your system’s window or edge-swipe controls to leave the app.':'For a view without browser bars, install the app and open its icon. On iPhone or iPad, use Safari → Share → Add to Home Screen.';
 if(nativeHelp)menu.showPopover();else menu.classList.add('display-help-open');
}
async function enter(quiet=false){
 if(!quiet)automatic=false;if(parentDisplay)return parentDisplay.enter(quiet);if(pending)return;if(active()){await orient();return;}pending=true;
 try{
  if(native()){nativeFullscreen(true);return;}
  const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
  if(!request)throw Error('Fullscreen unavailable');
  await request.call(root,{navigationUI:'hide'});
 }catch(_){if(!quiet)explain();}finally{pending=false;await orient();sync();}
}
async function exit(){
 if(parentDisplay)return parentDisplay.exit();
 automatic=false;try{screen.orientation?.unlock();}catch(_){}
 if(native()){nativeFullscreen(false);return;}
 const leave=document.exitFullscreen||document.webkitExitFullscreen;
 if(fullscreen()&&leave){try{await leave.call(document);}catch(_){explain();}}else explain();
 sync();
}
async function toggle(){if(active())await exit();else await enter();}
window.BilliardsDisplay={active,enter,exit,toggle,navigate,orient,refresh:sync};
function init(){
 control=document.createElement('button');control.id='appDisplayControl';control.type='button';control.innerHTML='<span class="display-dot" aria-hidden="true"></span>';
 control.onclick=()=>toggle();
 menu=document.createElement('div');menu.id='appDisplayMenu';menu.setAttribute('popover','auto');nativeHelp=typeof menu.showPopover==='function';if(!nativeHelp)menu.removeAttribute('popover');
 if(!nativeHelp){document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!control.contains(event.target))menu.classList.remove('display-help-open');});document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.classList.remove('display-help-open');});}
 viewHint=document.createElement('aside');viewHint.id='appViewHint';viewHint.hidden=true;viewHint.setAttribute('aria-label','Best view');
 viewHint.innerHTML='<strong>Best view</strong><p></p><button type="button" data-display-enter>Fullscreen</button><button type="button" data-display-dismiss aria-label="Dismiss view tip">×</button>';
 viewHint.querySelector('[data-display-enter]').onclick=()=>enter();viewHint.querySelector('[data-display-dismiss]').onclick=()=>{hintDismissed=true;updateViewHint()};document.body.append(viewHint);
 window.addEventListener('resize',updateViewHint);
 hint=document.createElement('p');hint.setAttribute('role','status');menu.append(hint);document.body.append(control,menu);
 // Keep the control reachable above the Games modal, without a permanent toolbar.
 const moveControl=()=>{const dialog=document.querySelector('#playDialog[open]');const parent=dialog||document.body;if(control.parentNode!==parent)parent.append(control);if(menu.parentNode!==parent)parent.append(menu);if(viewHint&&viewHint.parentNode!==parent)parent.append(viewHint);};
 new MutationObserver(moveControl).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open'],childList:true});moveControl();
 // A click occurs after a drag ends; do not resize the table during an aiming gesture.
 document.addEventListener('click',event=>{
  if(!automatic||!event.isTrusted||active()||installed()||native())return;
  if(event.target.closest('a,input,select,textarea,#appDisplayControl,#appDisplayMenu,#btg-fullscreen,#fullscreenPresenterBtn,#installPresenterBtn,#appViewHint'))return;
  enter(true);
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){automatic=false;if(native()&&nativeActive)exit();}
  if(event.key==='F11'&&native()){event.preventDefault();toggle();}
 });
 if(installer()){
  document.body.classList.toggle('installer-phone',phone());

 }
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||a.download||a.target&&a.target!=='_self')return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||url.hash||!/(?:\/welcome\.html|\/play\.html|\/index\.html|\/)$/.test(url.pathname)||/\/install\//.test(url.pathname))return;
  event.preventDefault();navigate(url.href);
 });
 window.addEventListener('popstate',event=>{if(!viewFrame)return;if(event.state?.billiardsView){orientationPage=event.state.billiardsView;viewFrame.src=orientationPage;}else{location.reload();return;}orient();});
 // Retry automatic startup on a trusted tap when the browser rejects a load-time request.
 if(!parentDisplay){enter(true);if(installed())orient();}
 sync();
}
document.addEventListener('fullscreenchange',()=>{if(!fullscreen())automatic=false;else orient();sync();});
document.addEventListener('webkitfullscreenchange',sync);
window.addEventListener('billiards:native-fullscreen',event=>{nativeActive=!!event.detail;sync();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
