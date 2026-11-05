const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const start=html.indexOf('    function '+name+'('),begin=html.indexOf('{',start);assert(start>=0);let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(start,i+1);}throw Error(name);}
const context={Math,S:{ballR:.028575}};vm.createContext(context);
for(const name of ['norm','dot','clamp','cueExitSample','cueExitAngle','railExitInfo'])vm.runInContext(extract(name),context);
const event={t:1},anchor={x:0,y:0},incoming={x:1,y:0};
const preview=points=>({paths:{0:points},railEvents:[]});
for(const [x,y,expected] of [[.04,0,0],[0,.04,90],[-.04,0,180],[.04,.04,45]]){
 assert(Math.abs(context.cueExitAngle(preview([{x,y,t:1.1}]),event,anchor,incoming)-expected)<1e-8);
}
const sample=context.cueExitSample(preview([{x:0,y:.04,t:1.1}]),event,anchor,incoming);assert.equal(sample.degrees,90);assert.equal(sample.point.y,.04,'Label anchor and angle share the same sample');
assert.equal(context.cueExitAngle(preview([{x:.001,y:0,t:1.1}]),event,anchor,incoming),null,'Stopped cue ball has no exit direction');
const interrupted=preview([{x:.04,y:0,t:1.2}]);interrupted.railEvents=[{id:0,t:1.1}];
assert.equal(context.cueExitAngle(interrupted,event,anchor,incoming),null,'Do not measure beyond another contact');
const rail={id:0,t:1,x:1,y:.5};
const rebound=preview([{x:.96,y:.5,t:.9},{x:1,y:.54,t:1.1}]);rebound.railEvents=[rail];
assert(Math.abs(context.railExitInfo(rebound).degrees-90)<1e-8,'Rebound measures change from incoming to outgoing');
console.log('Exit geometry: straight, cut, stun, draw, stopped ball, next-contact boundary and rail rebound passed.');
