const assert=require('node:assert/strict'),{guided}=require('../photo-corner-sensing');
const quad=[{x:30,y:30},{x:770,y:30},{x:770,y:430},{x:30,y:430}];
function image(sides=4){const w=800,h=460,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
const outside=x<30||x>770||y<30||y>430;const rail=sides===4?(x<45||x>755||y<45||y>415):sides===1?y<45:false;
const c=outside?[0,0,0]:rail?[35,55,40]:[35,145,85];data.set([...c,255],(y*w+x)*4);
}return {width:w,height:h,data};}
const all=guided(image(),quad);assert(all);assert.equal(all.edges.filter(e=>e.refined).length,4);assert.equal(all.confidence,null);assert(all.approximate);
for(const [i,p]of all.corners.entries()){const target=[{x:45,y:45},{x:755,y:45},{x:755,y:415},{x:45,y:415}][i];assert(Math.hypot(p.x-target.x,p.y-target.y)<6);}
assert.equal(guided(image(0),quad),null,'Mask border alone is not a detected rail');
const partial=guided(image(1),quad);assert(partial);assert.equal(partial.edges.filter(e=>e.refined).length,1);assert.deepEqual(partial.corners.slice(2),quad.slice(2),'weak edges remain at the frame');
const reversed=[quad[2],quad[3],quad[0],quad[1]],swapped=guided(image(),reversed);assert(swapped.corners[0].x>700&&swapped.corners[0].y>400,'head/foot orientation survives guided sensing');
console.log('Guided parallel rails: 4/4 edges refined, one-edge partial recovery, mask-only rejection, weak-edge preservation and swapped-end orientation passed.');
