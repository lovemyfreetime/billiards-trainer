/* Shared spherical artwork from the Trainer's original 3D ball textures. */
(() => {
  'use strict';
  const palette = ['#fbfbf4','#f4cd22','#1763bd','#d12e2f','#7135ad','#f07a22','#198952','#a52132','#171b20'];
  const textures = new Map(), images = new Map(), urls = new Map();
  function texture(id, style = 'current', set = 'classic') {
    const key = set + ':' + id + ':' + style;
    const design = window.BilliardsInternational?.ball(set,id);
    if (textures.has(key)) return textures.get(key);
    if (id === 0 && style !== 'current' && (!design || set==='carom' || set==='carom4')) {
      const result = window.BilliardsTrainingBall.texture(style); textures.set(key, result); return result;
    }
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    if (design) {
      const color = design.color || palette[id > 8 ? id-8 : id];
      x.fillStyle = design.stripe ? design.ground : color; x.fillRect(0,0,512,256);
      if (design.stripe) { x.fillStyle = color; x.fillRect(0,78,512,100); }
      for (const u of [.25,.75]) {
        if (design.number) {
          if (design.badge) { x.fillStyle = design.badge; x.beginPath(); x.arc(512*u,128,37,0,Math.PI*2); x.fill(); }
          x.fillStyle = design.ink; x.font = '700 43px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(design.number),512*u,130);
        }
        if (design.dots) {
          x.fillStyle = '#a82532';
          for(const dy of [-44,0,44]) { x.beginPath(); x.arc(512*u+(dy===0?24:-14),128+dy,10,0,Math.PI*2); x.fill(); }
        }
      }
    } else if (id === 0) {
      x.fillStyle = '#f5f3e9'; x.fillRect(0,0,512,256); x.fillStyle = '#969b96';
      for (const u of [0,.25,.5,.75,1]) { x.beginPath(); x.arc(u*512,128,7,0,Math.PI*2); x.fill(); }
      x.fillRect(0,0,512,6); x.fillRect(0,250,512,6);
    } else {
      const color = palette[id > 8 ? id - 8 : id] || palette[0];
      x.fillStyle = id > 8 ? '#f5f3e9' : color; x.fillRect(0,0,512,256);
      if (id > 8) { x.fillStyle = color; x.fillRect(0,78,512,100); }
      for (const u of [.25,.75]) {
        x.fillStyle = '#faf8ee'; x.beginPath(); x.arc(512*u,128,37,0,Math.PI*2); x.fill();
        x.fillStyle = '#161c20'; x.font = '700 43px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(id),512*u,130);
      }
    }
    textures.set(key,c); return c;
  }
  function image(id, set = 'classic') {
    const key = set + ':' + id;
    if (images.has(key)) return images.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'), out = ctx.createImageData(128,128);
    const tex = texture(id,'current',set).getContext('2d').getImageData(0,0,512,256).data, r = 128*.46;
    for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
      const u=(x+.5-64)/r, v=(64-y-.5)/r, zz=1-u*u-v*v;
      if (zz<=0) continue;
      const z=Math.sqrt(zz), tx=Math.min(511,Math.floor(Math.atan2(z,-u)/(2*Math.PI)*512)), ty=Math.min(255,Math.floor(Math.acos(v)/Math.PI*256));
      const a=(ty*512+tx)*4, i=(y*128+x)*4;
      const light=.42+.58*Math.max(0,-u*.35+v*.5+z*.79);
      const reflection=Math.min(.86,.58*Math.exp(-Math.pow((u+.28)/.27,6)-Math.pow((v-.40)/.21,6))+.3*Math.exp(-Math.pow((u+.36)/.055,2)-Math.pow((v-.42)/.055,2)));
      for(let k=0;k<3;k++) out.data[i+k]=Math.round(tex[a+k]*light*(1-reflection)+250*reflection);
      out.data[i+3]=Math.min(255,Math.round(zz*r*255));
    }
    ctx.putImageData(out,0,0); images.set(key,c); return c;
  }
  function url(id, set = 'classic') { const key = set + ':' + id; if(!urls.has(key)) urls.set(key,image(id,set).toDataURL()); return urls.get(key); }
  window.BilliardsBallArt = {texture,image,url};
})();
