const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');const start=html.indexOf("if ('serviceWorker' in navigator");const end=html.indexOf('</script>',start);
let reloads=0,registered=0,updated=0;const pageEvents={},workerEvents={};
const context={navigator:{serviceWorker:{controller:{},addEventListener(name,fn){workerEvents[name]=fn},register:async path=>{assert.equal(path,'./service-worker.js');registered++;return {update:async()=>{updated++}}}}},window:{location:{reload(){reloads++}},addEventListener(name,fn){pageEvents[name]=fn}},console};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
(async()=>{pageEvents.load();await new Promise(resolve=>setImmediate(resolve));for(let i=0;i<3;i++)workerEvents.controllerchange?.();assert.equal(registered,1);assert.equal(updated,1,'Background updates remain enabled');assert.equal(reloads,0,'Taking control after a delayed update cannot reload or reset an active table');console.log('Background updates: worker registration and update remain enabled; delayed controller changes never reload the current session.');})();
