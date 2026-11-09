const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elements=new Map(),listeners=new Map(),storage=new Map(),clips=new Map();
function element(id){if(!elements.has(id))elements.set(id,{
 id,disabled:false,hidden:false,textContent:'',value:'',placeholder:'Shot 01',attributes:{},
 setAttribute(name,value){this.attributes[name]=value},click(){this.onclick?.()}
});return elements.get(id)}
const db={createObjectStore(){},close(){},transaction(){const transaction={
 objectStore(){return {put(blob,id){clips.set(id,blob);queueMicrotask(()=>transaction.oncomplete?.())},
 get(id){const request={};queueMicrotask(()=>{request.result=clips.get(id);request.onsuccess?.()});return request}}}
 };return transaction}};
const indexedDB={open(){const request={result:db};queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.()});return request}};
const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const bridge={snapshot:()=>({busy:false}),capture:()=>({state:{balls:[{id:0,x:.2,y:.4}]}}),exportFile:()=>({kind:'session',state:{balls:[0]}})};
const win={BilliardsAndroid:{saveTrainerClip(){}},billiardsTourBridge:bridge,
 BilliardsClipView:{captureView:()=>({three:false})},
 addEventListener:(name,fn)=>listeners.set(name,fn)};
const context={window:win,document:{getElementById:element},localStorage,indexedDB,Blob,console,confirm:()=>true};
vm.runInNewContext(fs.readFileSync('trainer-shot-recorder.js','utf8'),context);
(async()=>{
 element('trainerClipSession').click();
 assert.equal(win.BilliardsShotRecorder.collecting,true);
 await win.BilliardsShotRecorder.addCameraClip({
  blob:new Blob(['video'],{type:'video/mp4'}),stem:'Camera 01',frames:45,modes:['current'],
  capture:bridge.capture(),view:{three:false},file:bridge.exportFile()
 });
 assert.equal(clips.size,1,'Actual clip bytes kept in persistent browser storage');
 assert.match(element('trainerClipSessionStatus').textContent,/0 shots \+ 1 camera clip saved/);
 const saved=JSON.parse(storage.get('billiardsRecordingSessionV1'));
 assert.equal(saved.shots[0].kind,'camera');assert(saved.shots[0].clipId);
 assert.deepEqual(Array.from(saved.shots[0].modes),['current']);
 listeners.get('billiards:undo-complete')();
 assert.equal(JSON.parse(storage.get('billiardsRecordingSessionV1')).shots.length,1,'Undo does not erase camera footage');
 element('trainerClipSession').click();
 assert.equal(win.BilliardsShotRecorder.collecting,false);
 assert.equal(element('trainerClipReplay').disabled,false,'Combined session may be exported');
 console.log('PASS camera video session insertion, persistent clip storage, undo isolation, combined-session availability');
})().catch(error=>{console.error(error);process.exitCode=1});
