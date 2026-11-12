// Generate the Companion illustration from the live Trainer physics engine.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function calculate(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 function extract(name){const match=new RegExp('    function\\s*\\*?\\s*'+name+'\\(').exec(html),a=match?.index??-1,b=html.indexOf('{',a);if(a<0)throw Error('Missing physics function: '+name);let d=0;for(let i=b;i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(a,i+1);}throw Error(name);}
 const c={Math,Map,Set,shotBudgetFeelCache:null,window:{BilliardsShotBudget:require('../trainer-shot-budget.js')}};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
 for(const name of ['defaultState','trainerDemoLayout','simulate'])vm.runInContext(extract(name),c);
 c.S=c.defaultState();Object.assign(c.S,c.trainerDemoLayout(c.S.tableL,c.S.tableW,c.S.ballR));
 c.S.balls[2].x=c.S.tableL*.38;c.S.balls[2].y=c.S.tableW*.8;
 let result;
 for(let i=0;i<100;i++){try{result=c.simulate();break;}catch(e){const m=/^(\w+) is not defined$/.exec(e.message);if(!m)throw e;vm.runInContext(extract(m[1]),c);}}
 if(!result)throw Error('Physics dependencies did not resolve.');
 return {state:c.S,result,engineHash:crypto.createHash('sha256').update(html).digest('hex')};
}
function svg({state:s,result:r}){
 const xy=p=>[300+p.x/s.tableL*1080,120+p.y/s.tableW*540].map(n=>n.toFixed(2));
 const radius=(s.ballR/s.tableL*1080).toFixed(2);
 const paths=[0,1].map(id=>`<path d="${r.paths[id].map((p,i)=>(i?'L':'M')+xy(p).join(' ')).join('')}" fill="none" stroke="${id?'#e9c56f':'#96dfc4'}" stroke-width="5" ${id?'':'stroke-dasharray="14 10"'} stroke-linejoin="round"/>`).join('');
 const balls=s.balls.map(b=>{const [x,y]=xy(b);return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${['#f6f0df','#e9c56f','#cb7968'][b.id]}" stroke="#162b2b" stroke-width="2"/>`;}).join('');
 const end=r.finalBalls.find(b=>b.id===0),[x,y]=xy(end);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1678 937"><title>Trainer-calculated position shot</title><desc>Gold object-ball path to the corner pocket; mint cue-ball path and final cue-ball position.</desc>${paths}<circle cx="${x}" cy="${y}" r="${radius}" fill="#96dfc4" fill-opacity=".25" stroke="#96dfc4" stroke-width="3"/>${balls}</svg>\n`;
}
if(require.main===module){const shot=calculate(),art=svg(shot),target=path.join(root,'icons/companion-shot-paths.svg');if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==art)throw Error('Companion shot must be regenerated from current physics.');}else{fs.writeFileSync(target,art);fs.mkdirSync(path.join(root,'docs/companion'),{recursive:true});fs.writeFileSync(path.join(root,'docs/companion/hero-shot.json'),JSON.stringify({engineHash:shot.engineHash,tableL:shot.state.tableL,tableW:shot.state.tableW,ballR:shot.state.ballR,speed:shot.state.speed,follow:shot.state.follow,sideSpin:shot.state.sideSpin,balls:shot.state.balls,freeAim:shot.state.freeAim,firstBallContact:shot.result.firstBallContact,railEvents:shot.result.railEvents,pocketEvents:shot.result.pocketEvents,finalBalls:shot.result.finalBalls},null,2)+'\n');}console.log(JSON.stringify({points:Object.fromEntries(Object.entries(shot.result.paths).map(([k,v])=>[k,v.length])),pocketEvents:shot.result.pocketEvents,railEvents:shot.result.railEvents,finalBalls:shot.result.finalBalls}));}
module.exports={calculate,svg};
