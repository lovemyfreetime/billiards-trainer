"""Reproducible Guide coverage and duration screening; never modifies audio.

WPM uses catalog text / full clip duration. It is a review signal, not a
listening/transcription assessment. ffprobe must be installed.
"""
import json,re,statistics,subprocess,concurrent.futures,hashlib,collections,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];G=ROOT/'guide'
def read(p):return json.loads((G/p).read_text())
def save(p,x):(G/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
recorded=read('recorded-audio.json')['records'];main={t['id']:t for t in read('pool-audio-map.json')['topics']}
source=(G/'analyze-integration.js').read_text();initial=source.split(' const topics=',1)[1].split('\n];',1)[0]+ '\n]';analyze={t['id']:t for t in json.loads(initial)}
analyze['image-ai-mode']=dict(id='image-ai-mode',title='AI detection mode',category='explore',audio=['./guide/audio/analyze-ai-detector-mode-and-readiness.mp3'],text='The AI button enables or disables the trained ball detector. Ready means the models are loaded. Auto or Loading means they are preparing. Retry restarts a failed load. With AI off, Analyze Balls uses the original detector. Review the detected identities and positions before applying your layout.')
analyze['image-corners']['audio']=analyze['image-corners']['audio'][:1];analyze['image-corners']['text']=analyze['image-corners']['text'].split('\n\n')[0]
for page,ts in [('Main',main),('Analyze',analyze)]:
 for r in recorded:
  if r['page'] in [page,'Shared']:ts[r['topic']['id']]={**ts.get(r['topic']['id'],{}),**r['topic']}
catalog=read('learning-catalog.json');scenes=read('topic-scenes.json')['topics']
for t in catalog['newTopics']:main[t['id']]=t
starts=json.loads(source.split(' topics.push(...',1)[1].split('\n]);',1)[0]+'\n]')
step_text=source.split('const steps={',1)[1].split('};',1)[0]
for t in starts:
 ids=re.search("'"+t['id']+r"':\[([^\]]+)\]",step_text).group(1);selected=[analyze[k] for k in re.findall("'([^']+)'",ids) if k in analyze];t['audio']=[x['audio'] for x in selected];t['text']='\n\n'.join(x['text'] for x in selected);analyze[t['id']]=t
def flatten(a):
 if isinstance(a,list):return [s for x in a for s in flatten(x)]
 return [a] if a else []
files=sorted({a.split('?')[0] for ts in [main,analyze] for t in ts.values() for a in flatten(t.get('audio'))})
referenced_files=set(files)
files=sorted(referenced_files|{'./'+str(p.relative_to(ROOT)) for p in (G/'audio').glob('*.mp3')})
def probe(f):
 p=ROOT/f
 if not p.exists():return f,dict(exists=False)
 seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True).strip())
 return f,dict(exists=True,seconds=round(seconds,4),sha256=hashlib.sha256(p.read_bytes()).hexdigest())
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:media=dict(executor.map(probe,files))
rows=[]
for page,ts in [('Main',main),('Analyze',analyze)]:
 for id,t in ts.items():
  audio=flatten(t.get('audio'));duration=sum(media[a.split('?')[0]].get('seconds',0) for a in audio);words=len(re.findall(r"\b[\w]+(?:[’'-][\w]+)*\b",t.get('text','')));scene=scenes.get(id) if page=='Main' else None
  rows.append(dict(page=page,id=id,title=t['title'],category=scene['category'] if scene else t.get('category'),visible=bool(scene) if page=='Main' else t.get('category')=='start',welcome=bool(t.get('categoryWelcome')),audio=audio,audioStatus='missing' if not audio else 'file-missing' if any(not media[a.split('?')[0]]['exists'] for a in audio) else 'present',words=words,seconds=round(duration,3),wpm=round(words*60/duration,1) if duration else None,text=t.get('text',''),sceneUrl=scene['setup']['url'] if scene else None,geometryHash=scene['geometryHash'] if scene else None,layoutReason=scene['variation'] if scene else 'Contextual control explanation; preserve current table.'))
visible=[r for r in rows if r['page']=='Main' and r['visible']];reference=statistics.median(r['wpm'] for r in visible if r['wpm'] and r['category'] not in ['start','more'] and not r['id'].startswith('drill-') and not r['welcome']);reference=read('NARRATION_RECORDINGS.json').get('referenceMedianWpm',reference) if (G/'NARRATION_RECORDINGS.json').exists() else reference;lo,hi=reference*.85,reference*1.15
for r in rows:r['pacingScreen']='no audio' if r['wpm'] is None else 'below band' if r['wpm']<lo else 'above band' if r['wpm']>hi else 'within band'
prior_pacing=read('AUDIO_PACING.json')
queue=[]
for r in visible:
 reason='No recording' if r['audioStatus']!='present' else 'Duration screen: slower than reference band' if r['wpm']<lo else 'Duration screen: faster than reference band' if r['wpm']>hi else None
 if reason:
  text=r['text'];spoken=re.sub(r'(?i)mass[eé]', 'mass-ay',text);spoken=re.sub(r'(?i)\bresume\b','ree-ZOOM',spoken)
  queue.append({**r,'priority':'record' if r['audioStatus']!='present' else 'listen-before-re-record','reason':reason,'voice':'Speechify Chase (US)','ssml':f'<speak><prosody rate="+30%">{html.escape(spoken)}</prosody></speak>','status':'pending; no audio replaced','instruction':'Compare at normal playback speed with the same Chase reference; keep instructional pauses. Re-record in Chase only after listening confirms an issue. For multi-clip topics compare each component before replacing.'})
# Keep the authorized recording batch and its before/after evidence reviewable.
completed=read('NARRATION_RECORDINGS.json')['items'] if (G/'NARRATION_RECORDINGS.json').exists() else []
previous={x['id']:x for x in read('NARRATION_REFINEMENT_QUEUE.json')['items']}
by_id={x['id']:x for x in visible}
completed_ids={x['id'] for x in completed}
queue=[q for q in queue if q['id'] not in completed_ids]
for recording in completed:
 r=by_id[recording['id']];old=previous.get(r['id'],{})
 queue.append({**old,**r,'priority':old.get('priority','record' if recording['previousSha256'] is None else 'listen-before-re-record'),'reason':old.get('reason','Authorized narration replacement'),'voice':'Speechify Chase (US)','ssml':recording['ssml'],'status':'recorded with Speechify; listening review pending','beforeSeconds':recording['previousSeconds'],'beforeWpm':recording['previousWpm'],'instruction':'Fresh Chase synthesis at +30% prosody; decode verified. Compare natural pauses and pronunciation at normal playback speed.'})
# Original shared geometry evidence from the pre-change catalog maintained in git.
base=json.loads(subprocess.check_output(['git','show','4d49a1251a21613da6bfb3dacf8b483dda84c786:guide/learning-catalog.json'],cwd=ROOT,text=True));old=collections.defaultdict(list)
for r in visible:
 for setup in base['topics'][r['id']]['setups']:old[setup['url']].append(r['id'])
duplicates={k:v for k,v in old.items() if len(v)>1};missing=[r['id'] for r in rows if r['audioStatus']!='present'];summary=dict(mainEntries=len(main),analyzeEntries=len(analyze),selectableMain=len(visible),uniqueMainGeometry=len(set(r['geometryHash'] for r in visible)),mainWithAudio=sum(r['audioStatus']=='present' for r in visible),missingAudio=missing,physicalAudioFiles=len(media),referencedAudioFiles=len(referenced_files),referenceMedianWpm=round(reference,1),screeningBandWpm=[round(lo,1),round(hi,1)],pacingReview=sum(r['pacingScreen']!='within band' for r in visible if r['wpm']),newRecordings=sum(r['audioStatus']!='present' for r in visible),completedRecordings=len(completed))
notice='Duration-based screening only. Text is the declared catalog transcript; actual speech/transcript match, natural pauses, and perceived pacing require listening. This audit never changes MP3s. NARRATION_RECORDINGS.json records fresh Speechify replacements separately.'
save('GUIDE_MEDIA_INVENTORY.json',dict(summary=summary,method=notice,topics=rows,files=media,previousSharedLayoutGroups=duplicates,unreferencedAudioFiles=sorted(set(files)-referenced_files),priorPacingTransform=prior_pacing));save('NARRATION_REFINEMENT_QUEUE.json',dict(summary=summary,method=notice,voice='Speechify Chase (US)',defaultProsody='+30%',priorPacingTransform=prior_pacing,referenceTopic='practice-speed-control-quick',items=queue))
lines=['# Guide media and layout inventory','',notice,'',f"{len(main)} Main entries and {len(analyze)} Analyze entries inventoried. All {len(visible)} selectable Main items now have different physical geometry. {summary['mainWithAudio']} have audio; {summary['newRecordings']} need a first recording.",'','| Category | Items | With audio | Unique layouts |','|---|---:|---:|---:|']
for cat in ['start','fundamentals','physics','drills','exercises','more']:
 rs=[r for r in visible if r['category']==cat];lines.append(f"| {cat} | {len(rs)} | {sum(r['audioStatus']=='present' for r in rs)} | {len(set(r['geometryHash'] for r in rs))} |")
lines+=['','## Coverage and behavior','','Each category introduction and lesson automatically loads its prepared scene before playback. Explorer control explanations preserve the current table. Get Started retains its existing responsive shots and Undo history. Original coordinate drill positions are unchanged.','', 'Autoplay offers a ten-second practice window after narration. The first table tap pauses playback and hands control to the player without changing aim. Next Lesson resumes the sequence. A written lesson without a recording stops for practice; it does not silently skip ahead.','',f"The retained pre-recording reference median is {reference:.1f} catalog words per minute. The review band is ±15% ({lo:.1f}–{hi:.1f}); {summary['pacingReview']} selectable items fall outside it. These are listening candidates, not verified audio defects.",'','## Missing recordings','']+[f"- {q['title']} (`{q['id']}`)" for q in queue if q['priority']=='record']
lines+=['','## Layout design and remaining review','','Each scene contains an objective and a reason for the arrangement in `topic-scenes.json`. Unique geometry includes the ball centers and target shapes, not names. Native loader, bounds, overlap, and uniqueness checks are automated. A distinct practice arrangement is not a guaranteed solution or a claim that the physical stroke is correct. Cushion, jump, and massé examples require observation and adjustment; the simulator does not assess stance or bridge mechanics.','','`NARRATION_REFINEMENT_QUEUE.json` contains exact scripts, existing audio paths, duration measurements, Chase settings, and SSML for every candidate. The authorized batch of 34 topics has fresh Speechify Chase recordings. See NARRATION_RECORDINGS.json for hashes and before/after measurements. Listening review remains open.','', '## Earlier pacing adjustment','','The existing `AUDIO_PACING.json` documents pitch-preserving slowing of ten coordinate drills to approximately 174 WPM. Their original measures were about 225–270 WPM. This is a concrete reason to listen to those clips first, while retaining pauses needed for coordinates. Those ten clips have now been replaced with fresh Chase synthesis; the old transforms are retained as history only.','','## Individual selectable items','','| Category | Topic | Audio | Catalog WPM | Unique layout |','|---|---|---|---:|---|']
for r in visible:lines.append(f"| {r['category']} | {r['title']} | {r['audioStatus']} | {r['wpm'] or '—'} | `{r['sceneUrl']}` |")
(G/'GUIDE_MEDIA_INVENTORY.md').write_text('\n'.join(lines)+'\n')
lines=['# Chase narration recording queue','',notice,'',f"Voice: Speechify Chase (US). Begin with +30% prosody, compare at normal playback speed, and preserve natural teaching pauses. Reference median: {reference:.1f} WPM. Do not force all scripts to an identical rate.",'','The authorized batch is recorded. Each item retains its original reason and current duration; perceived pacing and pronunciation still need listening review.','']
for q in sorted(queue,key=lambda q:q['priority']!='record'):
 lines += [f"## {q['title']}",'',f"`{q['id']}` — {q['reason']}. Catalog measure: {q['wpm'] or 'no audio'} WPM; {q['seconds']} seconds.",'',q['status'],'',q['text'],'','```xml',q['ssml'],'```','']
(G/'NARRATION_REFINEMENT_QUEUE.md').write_text('\n'.join(lines));print(json.dumps(summary,indent=2))
