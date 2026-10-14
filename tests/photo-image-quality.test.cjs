// Regression checks for native-resolution import, rotation and shared source pixels.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf('\n    function ',start+10));}
function canvas(){const c={width:1,height:1};const ctx={setTransform(){},clearRect(){},save(){},restore(){},translate(){},rotate(){},drawImage(src){this.lastSource=src;}};c.getContext=()=>ctx;return c;}
const raw=canvas(),analysis=canvas(),display=canvas();
const state={rawCanvas:raw,rawCtx:raw.getContext(),analysisCanvas:analysis,analysisCtx:analysis.getContext(),sourceCanvas:display,sourceCtx:display.getContext(),rotation:0,fineRotation:0,sharpen:false};
let sharpenCount=0;
const env={photoVision:state,document:{createElement:()=>canvas()},pvRefreshControls(){},pvSharpenCanvas(){sharpenCount++;}};
vm.createContext(env);for(const name of ['pvImportScale','pvRebuildSourceFromRaw'])vm.runInContext(source(name),env);
// These same native pixels must be retained in either orientation.
for(const [w,h] of [[2324,4128],[4128,2324],[4000,3000],[3000,4000]]){
 assert.equal(env.pvImportScale(w,h),1);raw.width=w;raw.height=h;
 for(const rotation of [0,90,180,270,0]){
  state.rotation=rotation;env.pvRebuildSourceFromRaw();
  assert.equal(analysis.width,rotation%180?h:w);assert.equal(analysis.height,rotation%180?w:h);
  assert.equal(state.analysisCtx.lastSource,raw);assert.equal(state.sourceCanvas,analysis);
  assert.equal(raw.width,w);assert.equal(raw.height,h);
 }
 state.sharpen=true;env.pvRebuildSourceFromRaw();assert.notEqual(state.sourceCanvas,analysis);
 assert.equal(state.sourceCanvas.width,w);assert.equal(state.sharpenCtx.lastSource,analysis);
 state.sharpen=false;env.pvRebuildSourceFromRaw();assert.equal(state.sourceCanvas,analysis);
 assert.equal(state.sharpenCanvas.width,1);assert.equal(state.sharpenCanvas.height,1);
}
assert.equal(sharpenCount,4);
const bigScale=env.pvImportScale(8000,6000);assert.ok(bigScale<1);assert.ok(8000*6000*bigScale**2<=16000001);
assert.equal(env.pvImportScale(6000,8000),bigScale);
// Photo canvas must override every dimension/position in the global stage rule.
const css=html.match(/#photoAnalyzerCanvas\s*\{([^}]+)\}/)[1];
for(const declaration of ['position:relative','inset:auto','width:auto','height:auto','flex:none'])assert.ok(css.includes(declaration));
console.log('Photo quality passed: both orientations retain native pixels, rotations use the original, sharpening is isolated, large imports retain aspect ratio, and photo CSS overrides the stage stretch.');
