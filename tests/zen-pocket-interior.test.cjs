const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Uint8Array,Uint32Array,Uint8ClampedArray};vm.createContext(c);vm.runInContext(extract('tintZenPocketInterior'),c);
const w=9,h=9,pixels=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++)pixels.set([50,55,60,255],i*4);
for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)pixels.set([1,1,1,255],(y*w+x)*4);
pixels.set([0,0,0,255],0);pixels.set([15,15,15,255],(4*w+2)*4);const original=new Uint8ClampedArray(pixels);c.tintZenPocketInterior(pixels,w,h,4,4);
assert.equal(pixels[3],0,'Disconnected black outside the pocket stays transparent');assert.equal(pixels[(4*w+4)*4+3],255);assert(pixels[(4*w+2)*4+3]>0&&pixels[(4*w+2)*4+3]<255,'Dark edge feathers gently');
for(let i=0;i<w*h;i++)if(pixels[i*4+3])assert(Math.max(...original.slice(i*4,i*4+3))<18,'Only black pocket pixels receive light');
assert.deepEqual([...pixels.slice((4*w+4)*4,(4*w+4)*4+3)],[180,167,131]);
vm.runInContext(html.slice(html.indexOf('    const ZEN_POCKET_ART='),html.indexOf('    function tintZenPocketInterior')),c);vm.runInContext(extract('zenPocketInteriorMasks'),c);
let reads=0,created=0;const art={};c.zenRecoloredTable=()=>art;c.document={createElement(){created++;return {getContext(){return {drawImage(){},getImageData(x,y,w,h){reads++;return {data:new Uint8ClampedArray(w*h*4)}},putImageData(){}}}}}};
c.zenPocketInteriorMasks();c.zenPocketInteriorMasks();assert.equal(created,6);assert.equal(reads,6,'Pocket masks are read once per art asset, never per live aim frame');
console.log('Pocket interior glow: connected black-only mask, rail/background exclusion, soft internal shading, complementary color, and one-time cache pass.');
