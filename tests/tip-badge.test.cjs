const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8');
const listeners={};const canvas={addEventListener(t,f){(listeners[t]??=[]).push(f)},setPointerCapture(){}};
const S={showTipBadge:true,shot2Enabled:true,sideSpin:.4,follow:.2,shot2:{x:200,y:200,sideSpin:0,follow:0}};
let active=1,saves=0,refreshes=0;
const context={window:{},document:{body:{classList:{contains:()=>false}}},S,canvas,isProjector:false,PHYSICS_MODEL:{maxTipOffsetR:.5},cueVisualsVisible:()=>true,cueBall:()=>({x:50,y:100}),ensureShot2:()=>S.shot2,controlMap:()=>({map:p=>p}),pointerPos:e=>({x:e.clientX,y:e.clientY}),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),setActiveShot:n=>active=n,updateUI(){},refreshPreview(){refreshes++},saveState(){saves++},syncProjector(){}};
const geom=source.slice(source.indexOf('    function tipBadgeGeometry('),source.indexOf('    function drawTipBadge('));
const handler=source.slice(source.indexOf('    // The on-table tip disks'),source.indexOf('    // Touch-only marker manipulation'));
vm.runInNewContext(geom+handler,context);
function emit(type,x,y){let stopped=false;const e={clientX:x,clientY:y,pointerId:1,button:0,preventDefault(){},stopImmediatePropagation(){stopped=true}};for(const f of listeners[type]||[])f(e);return stopped}
assert(!emit('pointerdown',10,10),'Normal table taps pass through');
assert(emit('pointerdown',102,52));assert.equal(S.sideSpin,0);assert.equal(S.follow,0);assert.equal(active,1);
emit('pointermove',113,52);assert.equal(S.sideSpin,1);assert.equal(S.follow,0);
emit('pointermove',124,30);assert(Math.abs(S.sideSpin-Math.SQRT1_2)<.01);assert(Math.abs(S.follow-Math.SQRT1_2)<.01);
emit('pointerup',124,30);assert.equal(saves,1);const prior=S.sideSpin;emit('pointermove',102,52);assert.equal(S.sideSpin,prior,'Release ends tip dragging');
emit('pointerdown',252,141);assert.equal(active,2);assert.equal(S.shot2.follow,1);assert.equal(S.shot2.sideSpin,0);emit('pointercancel',252,141);
assert.equal(saves,2);assert(refreshes>=4);
S.showTipBadge=false;assert(!emit('pointerdown',102,52),'Hidden badge cannot steal table touches');
console.log('Live tip badges: center, spin signs, shared physical limits, Shot 2 targeting, release/cancel, persistence and ordinary table taps passed.');

// Fixed phone controls use their own viewport position, never the cue-ball position.
const disk={hidden:false,getBoundingClientRect:()=>({left:300,top:600,width:60,height:64})};
context.$=()=>disk;canvas.getBoundingClientRect=()=>({left:10,top:50});
context.pointerPos=e=>({x:e.clientX-10,y:e.clientY-50});
context.document.body.classList.contains=()=>true;S.showTipBadge=true;
context.window.billiardsFixedTipInput({clientX:330,clientY:627},1,'move');
assert.equal(S.sideSpin,0);assert.equal(S.follow,0);
context.window.billiardsFixedTipInput({clientX:340,clientY:627},1,'move');assert.equal(S.sideSpin,1);
context.window.billiardsFixedTipInput({clientX:330,clientY:617},2,'move');assert.equal(S.shot2.follow,1);assert.equal(active,2);
const finalFollow=S.shot2.follow;disk.hidden=true;
context.window.billiardsFixedTipInput({clientX:330,clientY:637},2,'move');assert.equal(S.shot2.follow,finalFollow);
assert(!emit('pointerdown',102,52),'Phone floating badges do not intercept table touches');
context.window.billiardsFixedTipInput({},1,'end');assert.equal(saves,3);
console.log('Fixed phone controls: viewport coordinates, center/spin, separate shot state, hidden controls and persistence passed.');

// Startup hides floating badges by default; fixed phone controls must still render.
const renderSource=source.slice(source.indexOf('    function drawTipBadge(map)'),source.indexOf('    function drawPreview(map)'));
const paint={setTransform(){}};const disks={1:{getContext:()=>paint},2:{getContext:()=>paint}};
let rendered=[];const renderContext={S:{showTipBadge:false,shot2Enabled:true},DPR:2,isProjector:false,document:{body:{classList:{contains:()=>true}}},$:id=>disks[id.endsWith('1')?1:2],cueBall:()=>({x:1,y:1}),ensureShot2:()=>({}),drawTipBadgeDisk:(ctx,badge,values,label)=>rendered.push(label),tipBadgeGeometry:()=>{throw Error('Phone controls must not depend on floating badge preference')}};
vm.runInNewContext(renderSource+';drawTipBadge(p=>p)',renderContext);
assert.equal(disks[1].hidden,false);assert.equal(disks[2].hidden,false);assert.deepEqual(rendered,['CB 1','CB 2']);
rendered=[];renderContext.S.shot2Enabled=false;vm.runInNewContext('drawTipBadge(p=>p)',renderContext);
assert.equal(disks[1].hidden,false);assert.equal(disks[2].hidden,true);assert.deepEqual(rendered,['CB 1']);
console.log('Default startup renders fixed CB1 with badge setting off; CB2 appears only when Shot 2 is enabled.');
