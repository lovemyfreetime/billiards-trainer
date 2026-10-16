const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math};vm.createContext(c);vm.runInContext(extract('tintZenPocketFelt'),c);
const w=100,h=100,pixels=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++)pixels.set([50+(i%3),80+(i%3),79+(i%3),255],i*4);
pixels.set([1,1,1,255],(40*w+50)*4);pixels.set([65,65,65,255],(40*w+49)*4);
c.tintZenPocketFelt(pixels,w,h,{x:839,y:112,rx:58,ry:78,dx:0,dy:1},789,72);
assert(pixels[(40*w+50)*4+3]>0,'Light connects through the dark opening');assert(pixels[(40*w+49)*4+3]>0,'Curved lip receives a soft continuous spill');
assert.equal(pixels[3],0,'Light fades completely at its outside edge');assert(pixels[(50*w+51)*4+3]>pixels[(90*w+80)*4+3],'Light feathers into nearby felt');
assert(pixels[(50*w+51)*4]>50,'Existing cloth brightens');assert.notEqual(pixels[(50*w+51)*4],pixels[(50*w+52)*4],'Cloth texture is preserved');
const center=(40*w+50)*4;assert.equal(pixels[center],pixels[center+1]);assert.equal(pixels[center+1],pixels[center+2],'Neutral white illuminates neutral black without a warm tint');
function alphaAt(ax,ay){const pixel=new Uint8ClampedArray([50,80,79,255]);c.tintZenPocketFelt(pixel,1,1,{x:298,y:119,dx:Math.SQRT1_2,dy:Math.SQRT1_2},ax,ay);return pixel[3];}
for(const [a,b]of [[[303,135],[305,135]],[[320,127],[320,129]]]){assert(alphaAt(...a)>0&&alphaAt(...b)>0,'No cutoff at the former rectangular cloth bounds');assert(Math.abs(alphaAt(...a)-alphaAt(...b))<15,'No abrupt seam across former bounds');}
vm.runInContext(html.slice(html.indexOf('    const ZEN_POCKET_FELT='),html.indexOf('    function tintZenPocketFelt')),c);vm.runInContext(extract('zenPocketFeltMasks'),c);
let reads=0,created=0;const art={};c.zenRecoloredTable=()=>art;c.document={createElement(){created++;return {getContext(){return {drawImage(){},getImageData(x,y,w,h){reads++;return {data:new Uint8ClampedArray(w*h*4)}},putImageData(){}}}}}};
c.zenPocketFeltMasks();c.zenPocketFeltMasks();assert.equal(created,6);assert.equal(reads,6,'Felt masks are sampled once, never per live aim frame');
console.log('Pocket white glow: continuous opening-to-cloth spill, neutral white, no rectangular seams, textured falloff and cached masks pass.');
