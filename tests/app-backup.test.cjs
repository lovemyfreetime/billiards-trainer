const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb');
function setup(){
 const map=new Map(),localStorage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const ctx={window:{},localStorage,indexedDB:new IDBFactory(),Blob,Uint8Array,btoa,atob,console};vm.runInNewContext(fs.readFileSync('app-backup.js','utf8'),ctx);return {api:ctx.window.BilliardsBackup,map};
}
test('backup restores layouts, game settings, session files and binary archived images on a new device',async()=>{
 const a=setup();a.map.set('layouts',JSON.stringify([{name:'Draw to position'}]));a.map.set('billiards-play','saved game');
 const source={format:'billiards-device-backup',version:1,storage:[],databases:[{name:'billiards-saved-files',rows:[{key:'session',name:'rack.json',content:'saved rack'}]},{name:'BilliardsTrainerPhotoArchiveV1',rows:[{id:'photo-1',createdAt:42,blob:{$blob:btoa('image bytes\u0000\u00ff'),mime:'image/jpeg'}}]}]};
 await a.api.restore(JSON.stringify(source));const text=await a.api.create(),b=setup();await b.api.restore(text);
 assert.equal(b.map.get('billiards-play'),'saved game');assert.equal(b.map.get('layouts'),a.map.get('layouts'));
 const round=JSON.parse(await b.api.create());assert.equal(round.databases[0].rows[0].content,'saved rack');assert.equal(round.databases[1].rows[0].blob.$blob,source.databases[1].rows[0].blob.$blob);assert.equal(round.databases[1].rows[0].blob.mime,'image/jpeg');
});
test('invalid backup is rejected before settings change and never clears unrelated saves',async()=>{
 const a=setup();a.map.set('keep','original');
 await assert.rejects(a.api.restore(JSON.stringify({format:'billiards-device-backup',version:1,storage:[['keep','changed']],databases:[{name:'unrelated',rows:[]}]})),/Invalid saved database/);assert.equal(a.map.get('keep'),'original');
 await assert.rejects(a.api.restore('{bad json'));
 await a.api.restore(JSON.stringify({format:'billiards-device-backup',version:1,storage:[['new','value']],databases:[]}));assert.equal(a.map.get('keep'),'original');assert.equal(a.map.get('new'),'value');
});
