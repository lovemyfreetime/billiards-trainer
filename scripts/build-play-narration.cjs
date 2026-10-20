/* Build recorded narration from the authored Play copy and matching receipts. */
const fs=require('node:fs'),crypto=require('node:crypto'),E=require('../play-engine');
const copy=JSON.parse(fs.readFileSync('play-narration-copy.json','utf8'));
if(copy.voice!=='chase'||copy.rate!=='+10%')throw Error('Expected the approved Chase +10% recording settings.');
const records={};
for(const [id,text] of Object.entries(copy.records)){
 const textHash=crypto.createHash('sha256').update(text).digest('hex'),file=`play-audio/${id}.mp3`;let receipt;
 try{receipt=JSON.parse(fs.readFileSync(`play-audio/${id}.json`));}catch{}
 const ready=fs.existsSync(file)&&receipt?.textHash===textHash&&receipt?.voice===copy.voice&&receipt?.rate===copy.rate;
 const version=(ready&&receipt.sourceHash?receipt.sourceHash:textHash).slice(0,12);
 records[id]={text,textHash,src:file+'?v='+version,voice:copy.voice,rate:copy.rate,recordingStatus:ready?'recorded':'pending'};
}
for(const [id,g] of Object.entries(E.games)){
 if(!records[`rules-${id}`]?.text.includes(g.rules.toLowerCase()))throw Error(`Narration rules differ from the displayed rules: ${id}`);
 if(!records[`setup-${id}`])throw Error(`Missing game setup: ${id}`);
}
if(Object.keys(records).length!==54)throw Error('Expected 54 narration clips.');
fs.mkdirSync('play-audio',{recursive:true});
fs.writeFileSync('play-audio/scripts.json',JSON.stringify({voice:copy.voice,rate:copy.rate,records},null,2)+'\n');
fs.writeFileSync('play-narration-data.js','/* Generated from authored Play copy by scripts/build-play-narration.cjs. */\nwindow.BilliardsPlayNarrationCatalog='+JSON.stringify(records)+';\n');
console.log(`${Object.keys(records).length} Chase clips: ${Object.values(records).filter(r=>r.recordingStatus==='recorded').length} recorded.`);
