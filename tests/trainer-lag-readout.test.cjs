const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const start=html.indexOf('function '+name+'('),open=html.indexOf('{',start);let depth=0;for(let i=open;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&!--depth)return html.slice(start,i+1);}throw Error(name);}
const c={S:{speed:2,tableL:2.54},rollingPowerReferenceDistance:()=>2.54*3};vm.createContext(c);vm.runInContext(extract('powerFeel')+'\n'+extract('formatLagFraction'),c);
assert.equal(c.powerFeel().diamonds,24);assert.equal(c.powerFeel().lagFraction,1.5);assert.equal(c.formatLagFraction(c.powerFeel().lagFraction),'1½ lag');
assert.equal(c.formatLagFraction(.25),'¼ lag');assert.equal(c.formatLagFraction(.5),'½ lag');assert.equal(c.formatLagFraction(1),'1 lag');assert.equal(c.formatLagFraction(.62),'0.62 lag','Do not pretend an intermediate value is exactly half a lag');
console.log('Lag readout shares the calibrated 16-diamond reference and honest fractional labels.');
