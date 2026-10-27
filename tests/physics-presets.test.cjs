const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
const code=source.slice(source.indexOf('    const PHYSICS_PRESETS_KEY'),source.indexOf('    function applyUI()'));
const defaults={tableL:88*.0254,tableW:44*.0254,ballR:2.25*.0254/2,muSlide:.2,muRoll:.01,muBall:.05,ballRest:.96,railRest:.9,railTang:.9,cuePreset:'low',cueEndmassRatio:30,airbornePhysics:false,tableRest:.4,bedImpactMu:.2,jumpUnits:'in'};
const elements={};function $(id){return elements[id]??= {hidden:true,value:'',textContent:'',focus(){},addEventListener(){},replaceChildren(...children){this.children=children;this.value=children[0]?.value||'';},click(){this.onclick();}};}
const storage=new Map();let undo=0,saved=0,confirmation=true,failWrite=false;
const ctx={S:{...defaults,balls:[{id:0,x:1,y:.5}],speed:2,follow:.5,cueElevationDeg:3,shot2:{cueElevationDeg:3}},animation:null,$,defaultState:()=>({...defaults}),clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),cueElevationMax:()=>ctx.S.airbornePhysics?70:15,beginActionUndo(){undo++;},updateUI(){},refreshPreview(){},saveState(){saved++;},syncProjector(){},toast(){},confirm:()=>confirmation,document:{createElement:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(failWrite)throw Error('full');storage.set(k,v);}}};
vm.createContext(ctx);vm.runInContext(code+';setupPhysicsPresets();',ctx);
const keys=Object.keys(defaults),layout=JSON.stringify(ctx.S.balls);
Object.assign(ctx.S,{muRoll:.025,railRest:.8,cuePreset:'custom',cueEndmassRatio:42,tableL:100*.0254,airbornePhysics:true,jumpUnits:'mm'});
const expected=JSON.parse(vm.runInContext('JSON.stringify(capturePhysicsSettings())',ctx));
$('physicsSave').click();$('physicsPresetName').value='Tournament table / carbon cue';$('physicsPresetApply').click();
assert.equal(JSON.parse([...storage.values()][0])[0].name,'Tournament table / carbon cue');
$('physicsDefaults').click();for(const key of keys)assert.equal(ctx.S[key],key==='tableL'?80*.0254:key==='tableW'?40*.0254:defaults[key]);assert.equal(JSON.stringify(ctx.S.balls),layout);assert.equal(ctx.S.speed,2);assert.equal(ctx.S.follow,.5);
$('physicsLoad').click();$('physicsPresetApply').click();for(const key of keys)assert.equal(ctx.S[key],expected[key]);assert.equal(JSON.stringify(ctx.S.balls),layout);assert.equal(undo,2);assert.equal(saved,2);
// A fresh session reads the named preset from storage.
vm.runInContext('setupPhysicsPresets()',ctx);$('physicsLoad').click();assert.equal($('physicsPresetList').children.length,1);
confirmation=false;ctx.S.muRoll=.04;$('physicsSave').click();$('physicsPresetApply').click();assert.equal(JSON.parse([...storage.values()][0])[0].settings.muRoll,.025);
confirmation=true;$('physicsPresetApply').click();assert.equal(JSON.parse([...storage.values()][0])[0].settings.muRoll,.04);
failWrite=true;$('physicsSave').click();$('physicsPresetName').value='Another';$('physicsPresetApply').click();assert.match($('physicsPresetStatus').textContent,/could not be saved/);failWrite=false;
const before=JSON.stringify(ctx.S);assert.equal(vm.runInContext("applyPhysicsSettings({muRoll:'bad'})",ctx),false);assert.equal(JSON.stringify(ctx.S),before);
ctx.animation={};$('physicsDefaults').click();assert.equal(JSON.stringify(ctx.S),before);
console.log('Physics presets: every advanced setting round-trips, defaults retain layouts and presets, restart persistence, undo hooks, overwrite cancellation and storage failure passed.');
