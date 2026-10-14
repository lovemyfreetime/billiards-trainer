/* Explore Inspector: development preview only; no audio or editing side effects. */
(function(){
if(!location.hostname.endsWith('.vercel.app')&&!location.search.includes('exploreInspector=1'))return;
let active=false,last=null,focusEl=null;
const style=document.createElement('style');
style.textContent='#bt-inspect-switch{position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#074c51;color:white;border:2px solid #28d4d1;border-radius:10px;padding:8px;font:700 13px system-ui}#bt-inspect-info{position:fixed;z-index:2147483646;pointer-events:none;color:white;background:#0d3039;border:1px solid #31dfcb;border-radius:7px;padding:8px 11px;font:12px system-ui;max-width:380px;display:none;box-shadow:0 0 15px #27c9c98c}#bt-inspect-border{position:fixed;inset:0;z-index:2147483644;pointer-events:none;border:3px solid #2fd9cf;box-shadow:inset 0 0 12px #20e9cf88,0 0 12px #20e9cf88;display:none}.bt-inspected{outline:2px solid #38e6dc!important;outline-offset:1px}';
document.head.append(style);
const toggle=document.createElement('button');toggle.type='button';toggle.id='bt-inspect-switch';toggle.textContent='Inspect: OFF';document.body.append(toggle);
const info=document.createElement('div');info.id='bt-inspect-info';document.body.append(info);
const border=document.createElement('div');border.id='bt-inspect-border';document.body.append(border);
function identify(el,ev){
 const tag=el.tagName.toLowerCase(),id=el.id||el.getAttribute('name')||'',label=(el.getAttribute('aria-label')||el.getAttribute('title')||el.getAttribute('data-label')||el.innerText||el.getAttribute('alt')||'').trim().replace(/\s+/g,' ').slice(0,64);
 let path='',p=el,k=0;
 while(p&&p.nodeType===1&&k++<6){const t=p.tagName.toLowerCase(),similar=p.parentElement?[...p.parentElement.children].filter(x=>x.tagName===p.tagName):[p];path=t+(similar.length>1?':nth-of-type('+(similar.indexOf(p)+1)+')':'')+(path?' > '+path:'');if(p.id){path='#'+p.id;break;}p=p.parentElement;}
 if(tag==='canvas'){const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(100,Math.round((ev.clientX-r.left)/r.width*100))),y=Math.max(0,Math.min(100,Math.round((ev.clientY-r.top)/r.height*100)));return {name:'Canvas surface / unknown drawn object',id:(id||path)+' ['+x+'%, '+y+'%]',kind:'canvas (separate ball / pocket / line hit mapping still needed)'};}
 return {name:label||id||tag,id:id||path,kind:tag};
}
toggle.onclick=()=>{active=!active;toggle.textContent='Inspect: '+(active?'ON':'OFF');border.style.display=active?'block':'none';info.style.display='none';focusEl?.classList.remove('bt-inspected');focusEl=null;};
document.addEventListener('pointermove',ev=>{
 if(!active)return;
 const el=document.elementsFromPoint(ev.clientX,ev.clientY).find(x=>x!==toggle&&x!==info&&x!==border);
 if(!el||el===document.body||el===document.documentElement)return;
 const target=el.closest('button,input,select,textarea,a,[role="button"],[role="slider"],canvas,svg,[data-explore-id]')||el;
 const found=identify(target,ev);last=found;
 if(target!==focusEl){focusEl?.classList.remove('bt-inspected');focusEl=target;focusEl.classList.add('bt-inspected');}
 info.textContent=found.name+'  |  '+found.id+'  |  '+found.kind;
 info.style.display='block';info.style.left=Math.max(4,Math.min(innerWidth-390,ev.clientX+14))+'px';info.style.top=Math.max(4,Math.min(innerHeight-55,ev.clientY+15))+'px';
},true);
document.addEventListener('pointerdown',ev=>{
 if(!active||!ev.shiftKey||ev.target===toggle||!last)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 navigator.clipboard?.writeText(JSON.stringify(last)).catch(()=>{});
},true);
})();