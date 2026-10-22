/* A drawing-only camera. Never reads or changes the simulation or saved layout. */
(() => {
  'use strict';
  let enabled=false, scale=1, x=0, y=0, redraw=()=>{}, canvas, button;
  const pointers=new Map();
  let previous=null, mouse=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const size=()=>({w:canvas.clientWidth,h:canvas.clientHeight});
  function bounds(){const {w,h}=size();x=clamp(x,w*(1-scale),0);y=clamp(y,h*(1-scale),0);}
  function paint(){bounds();button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Restore full table view':'Inspect table: tap for pinch / pan, or hover and scroll to zoom';button.textContent=enabled?scale.toFixed(1)+'×':'Zoom';canvas.style.cursor=enabled?'move':'';redraw();}
  function reset(){enabled=false;scale=1;x=y=0;previous=mouse=null;pointers.clear();paint();}
  function zoom(factor,point){const next=clamp(scale*factor,1,6),ratio=next/scale;x=point.x-(point.x-x)*ratio;y=point.y-(point.y-y)*ratio;scale=next;paint();}
  function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*canvas.clientWidth/r.width,y:(event.clientY-r.top)*canvas.clientHeight/r.height};}
  function gesture(){const ps=[...pointers.values()];if(!ps.length)return null;if(ps.length===1)return {...ps[0],distance:0};return {x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2,distance:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)};}
  function consume(e){e.preventDefault();e.stopImmediatePropagation();}
  window.BilliardsTableZoom={
    // The engine continues drawing in its original coordinate system. Only the
    // canvas context changes; hit-testing, controls and physics keep their units.
    begin(ctx){ctx.save();if(enabled){ctx.translate(x,y);ctx.scale(scale,scale);}},
    end(ctx){ctx.restore();},
    reset,
    attach(options){
      ({canvas,button,redraw}=options);
      button.addEventListener('click',()=>{if(enabled)reset();else{enabled=true;paint();}});
      const wheel=e=>{if(!enabled&&e.currentTarget!==button)return;consume(e);enabled=true;mouse=null;const {w,h}=size();zoom(Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?h:1),-120,120)*.0025),e.currentTarget===button?{x:w/2,y:h/2}:point(e));};
      button.addEventListener('wheel',wheel,{passive:false});
      canvas.addEventListener('wheel',wheel,{passive:false,capture:true});
      canvas.addEventListener('pointerdown',e=>{if(!enabled)return;consume(e);pointers.set(e.pointerId,point(e));previous=gesture();canvas.setPointerCapture(e.pointerId);},{capture:true});
      canvas.addEventListener('pointermove',e=>{
        if(!enabled)return;consume(e);const p=point(e);
        if(pointers.has(e.pointerId)){
          pointers.set(e.pointerId,p);const now=gesture();
          if(previous){const next=previous.distance&&now.distance?clamp(scale*now.distance/previous.distance,1,6):scale,ratio=next/scale;x=now.x-(previous.x-x)*ratio;y=now.y-(previous.y-y)*ratio;scale=next;paint();}
          previous=now;
        }else if(e.pointerType==='mouse'){
          if(mouse){x-=(p.x-mouse.x)*(scale-1);y-=(p.y-mouse.y)*(scale-1);paint();}mouse=p;
        }
      },{capture:true});
      const end=e=>{if(!enabled)return;consume(e);pointers.delete(e.pointerId);previous=gesture();mouse=null;};
      for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end,{capture:true});
      canvas.addEventListener('pointerleave',()=>{mouse=null;});
      for(const type of ['click','dblclick','contextmenu','touchstart','touchmove','touchend'])canvas.addEventListener(type,e=>{if(enabled)consume(e);},{capture:true,passive:false});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&enabled)reset();});
      window.addEventListener('blur',()=>{pointers.clear();previous=mouse=null;});
      new ResizeObserver(()=>{if(enabled)paint();}).observe(canvas);
      paint();
    }
  };
})();
