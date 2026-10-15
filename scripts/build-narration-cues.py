"""Build playback-time cues by forced-aligning approved transcripts to actual MP3s.

Build-only dependency: pocketsphinx==5.0.4, plus ffmpeg/ffprobe. The browser
consumes the generated JSON offline; it does not perform speech recognition.
Alignment cache is keyed by audio SHA and normalized transcript.
"""
import json,re,hashlib,subprocess,unicodedata,argparse,concurrent.futures,os
from pathlib import Path
from pocketsphinx import Decoder
ROOT=Path(__file__).resolve().parents[1];G=ROOT/'guide'
B={}
def dom(key,label,*selectors):B[key]=dict(label=label,selectors=list(selectors))
def region(key,label):B[key]=dict(label=label,region=key)
for key,label,selectors in [
 ('speed','Shot speed',['#tableSpeed1','#speed']),('follow','Follow / draw',['#bottomFollow1','#tableFollow1','#follow']),('english','Left / right English',['#bottomSide1','#tableSpin1','#sideSpin']),('elevation','Cue elevation',['#tableElevation1','#cueElevation']),
 ('execute','Execute Shot',['#phoneActions [data-trainer-action="animate"]','#animate']),('reset','Reset layout',['#phoneActions [data-trainer-action="resetLayoutQuick"]','#resetLayoutQuick','#resetLayout']),('undo','Undo Last Shot',['#phoneActions [data-trainer-action="undoShot"]','#undoShot']),('shot2','Shot 2',['#toggleShot2']),('aim-control','Fine aim',['#tableAimRoller','#aimRoller']),('tip','Cue-tip contact',['#phoneTip1','#tipCanvas']),
 ('auto','Auto On / Off',['@guide .btg-autoplay']),('read','Read narration',['@guide [data-action="Read"]']),('more','More resources',['@guide [data-action="More"]']),('play','Play / Pause',['@guide [data-action="play-pause"]']),('explorer','Explorer',['#btg-pool-explore','#btg-analyze-explore']),('guide','Guide',['#btg-pool-guide']),
 ('stats','Live Stats',['#liveStatsSection .sectionToggle']),('save','Save current layout',['#saveLayoutBtn']),('recall','Load saved layout',['#loadLayoutBtn']),('file','Save table file',['#trainerSaveFile']),('rack','Full rack',['#fullRackSelect']),('marker-control','Add Next Marker',['#addNextMarker']),('compass','Teaching compass',['#teachingCompassToggle']),('bank-tool','Bank tool',['#bankToolToggle']),('kick-tool','Kick tool',['#kickToolToggle']),
 ('rolling-friction','Rolling friction',['#muRoll']),('sliding-friction','Sliding friction',['#muSlide']),('cushion-response','Cushion restitution',['#railRest']),('ball-response','Ball restitution',['#ballRest']),('units','Measurement units',['#jumpUnits']),('jump','Jump / Massé controls',['#jumpMasseFeatures']),('features','Features & Options',['#showPaths']),('physics','Physics & Calibration',['#muRoll'])]:dom(key,label,*selectors)
for k,label in [('diamonds','Rail diamonds'),('cue','Cue ball'),('object','Object ball'),('cut','Cut angle / overlap'),('ghost','Ghost ball'),('markers','Position target / markers'),('rolling','30-degree natural-roll path'),('tangent','Tangent line'),('aim','Aim line'),('path','Cue-ball path'),('rail','Cushion / rail'),('pockets','Pockets'),('table','Playing surface'),('grid','Diamond grid')]:region(k,label)
RULES=[
 ('auto',r'auto(?:play)?(?: on| off)?'),('execute',r'execute (?:the active )?shot|execute shot [12]|shoot the shot'),('reset',r'reset (?:the )?(?:layout|table)|restore (?:the )?(?:arrangement|layout|starting layout)|reset layout'),('undo',r'undo(?: last shot)?'),
 ('english',r'(?:left|right|side|left and right) english|english|side spin|sidespin'),('follow',r'follow(?: and draw)?|draw|backspin|forward rotation|forward spin'),('speed',r'shot speed|speed (?:control|adjustment|slider)|stroke speeds?|speed|slower|faster|power setting'),('elevation',r'cue elevation|elevation angle|raise (?:the )?cue|steepen (?:the )?cue'),
 ('tip',r'cue.ball (?:contact )?diagram|cue.tip contact|tip location|contact disk'),('aim-control',r'aim roller|micro.aim|roller|fine.aim'),('shot2',r'shot (?:two|2)|second cue ball'),
 ('read',r'(?:tap|open|choose) read|read button'),('more',r'(?:open|tap|choose) more|more button'),('play',r'play and pause|play or pause|pause (?:the )?narration'),('explorer',r'explorer'),('guide',r'(?:open|choose|tap) (?:the )?guide'),
 ('rolling',r'thirty.degrees?|30.degrees?|natural.angle|natural.roll reference'),('tangent',r'tangent line|ninety.degree|90.degree'),('ghost',r'ghost ball|ghost.ball'),('cut',r'cut angles?|cut shots?|overlap|contact point|contact geometry|fractional hit|thickness of (?:the )?hit'),('diamonds',r'(?:rail )?diamonds?|diamond (?:points|marks)'),('grid',r'diamond grid|half.diamond grid'),('aim',r'aiming line|aim line|line of aim'),('path',r'cue.ball path|cue.ball route|predicted path|trajectory|travel line'),('markers',r'target zone|position zone|stopping area|landing area|target markers?|markers?|finish zone'),('cue',r'cue ball'),('object',r'object ball'),('rail',r'cushions?|rail contacts?'),('pockets',r'(?:selected|target|corner|side) pocket'),
 ('stats',r'live stats'),('save',r'save current layout|save (?:the|your) layout'),('recall',r'load (?:a|the|your) saved layout|recall (?:the|a) layout'),('rack',r'full rack'),('marker-control',r'add next marker|add (?:a )?marker'),('compass',r'teaching compass|compass'),('bank-tool',r'bank tool'),('kick-tool',r'kick tool'),('rolling-friction',r'rolling friction'),('sliding-friction',r'sliding friction'),('cushion-response',r'cushion restitution|rail restitution'),('ball-response',r'ball restitution|collision restitution'),('units',r'inches|millimeters|measurement units'),('jump',r'jump and masse|jump.mass[eé] controls'),('physics',r'physics and calibration|physics calibration')]
# Normalize exactly once so cue offsets and forced-alignment words stay identical.
NUM={'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine','10':'ten','15':'fifteen','30':'thirty','90':'ninety'}
def normalize(text):
 text=text.replace('’',"'")
 text=unicodedata.normalize('NFKD',text).encode('ascii','ignore').decode().lower()
 text=re.sub(r'<[^>]+>',' ',text).replace('&',' and ').replace('%',' percent ')
 text=re.sub(r'\d+',lambda m:NUM.get(m[0],' '.join(NUM[c] for c in m[0])),text)
 text=re.sub(r'\bmasse\b','mass say',text)
 return ' '.join(re.findall(r"[a-z]+(?:'[a-z]+)?",text))
def read(name):return json.loads((G/name).read_text())
def audio_name(url):return url.split('/')[-1].split('?')[0]
tracks={};topics={}
learning=read('learning-catalog.json')
for t in read('pool-audio-map.json')['topics']:
 if learning['topics'].get(t['id'],{}).get('visible') or t.get('categoryWelcome'):topics[t['id']]=t
records=read('recorded-audio.json')['records']
for r in records:topics[r['topic']['id']]=r['topic']
for t in read('learning-catalog.json')['newTopics']:topics[t['id']]=t
for step in read('get-started-tour.json')['steps']:
 tracks[audio_name(step['audio'])]=dict(text=step['text'],page='Main',selfTargets=[])
for t in topics.values():
 audio=t.get('audio');text=t.get('text','')
 if isinstance(audio,list) and len(audio)==1:audio=audio[0]
 if isinstance(audio,str) and text:tracks[audio_name(audio)]=dict(text=text,page='Main',selfTargets=[])
for r in records:
 t=r['topic'];a=t.get('audio')
 if isinstance(a,str):
  selectors=[re.sub(r' \([^)]*\)','',s) for s in r.get('targets',[]) if s.startswith(('#','.','['))]
  if not t.get('categoryWelcome'):selectors.insert(0,'[data-guide-topic=\"'+t['id']+'\"]')
  tracks[audio_name(a)]=dict(text=t.get('text',''),page=r['page'],selfTargets=selectors)
# Semantic canvas descriptions are documentary strings, not CSS selectors.
# Bind them to live canvas geometry; use numbered pocket anchors individually.
canvas_self={'main-object-ball-move':'object','main-cue-ball-move':'cue','main-second-cue-ball-move':'cue','main-aim-drag-wheel':'aim','main-free-aim-target':'aim','main-empty-cloth':'table','main-ghost-ball':'ghost','main-tangent-line':'tangent','main-aiming-line':'aim','main-predicted-path':'path','main-rail-cushion':'rail'}
for r in records:
 t=r['topic'];a=t.get('audio');id=t['id']
 if not isinstance(a,str) or audio_name(a) not in tracks:continue
 track=tracks[audio_name(a)]
 if id.startswith('main-marker-') and r['kind']=='Canvas region':canvas_self[id]='markers'
 if id in canvas_self:track['selfRegion']=canvas_self[id];track['selfTargets']=[]
 m=re.fullmatch('main-pocket-([1-6])',id)
 if m:
  key='pocket'+m[1];region(key,'Pocket '+m[1]);track['selfRegion']=key;track['selfTargets']=[]
 m=re.fullmatch('analyze-pocket-([1-6])',id)
 if m:track['selfTargets']=['#photoCalibrationDiagram [data-pocket="'+m[1]+'"]']
 if id.startswith('analyze-photo-') or id in ['analyze-drag-ball-position','analyze-place-missed-ball','analyze-place-diamond-reference']:
  track['selfTargets']=['#photoAnalyzerCanvas']
 shared={'shared-autoplay':'.btg-autoplay','shared-read':'[data-action="Read"]','shared-more':'[data-action="More"]','shared-play-pause':'[data-action="play-pause"]','shared-stop':'[data-action="■"]','shared-previous-file':'[data-action="⏮"]','shared-next-file':'[data-action="⏭"]','shared-rewind-ten-seconds':'[data-action="◀◀"]','shared-forward-ten-seconds':'[data-action="▶▶"]','shared-reset-guide':'[data-action="Reset"]','shared-open-close-details':'.btg-expansion-tab','shared-choose-lesson':'.btg-lesson-select'}
 if id in shared:track['selfTargets']=['@guide '+shared[id]]
# The introduction is separate from the existing welcome so every later opening
# can start with the explicit Auto On / experiment guidance.
intro='The Guide starts with Auto on, so lessons continue automatically. Turn Auto off whenever you want to experiment at your own pace. Tap the table to try the current layout, or choose Explorer to discover the controls on your own.'
tracks['guide-autoplay-intro.mp3']=dict(text=intro,page='Main',selfTargets=[])
cache_path=Path(os.environ.get('BILLIARDS_ALIGNMENT_CACHE','/workspace/scratch/guide-word-alignment-cache.json'))
cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
work=[]
for name,t in tracks.items():
 p=G/'audio'/name
 if not p.exists() or not t['text']:continue
 n=normalize(t['text']);sha=hashlib.sha256(p.read_bytes()).hexdigest();key=hashlib.sha256((sha+n).encode()).hexdigest()
 t.update(normalized=n,sha256=sha,key=key)
 if key not in cache:work.append((name,n,key))
def align(job):
 name,text,key=job;d=Decoder(loglevel='ERROR',beam=1e-80,wbeam=1e-60,bestpath=False);unknown=[]
 for w in set(text.split()):
  if not d.lookup_word(w):
   # Rare app terms get a transparent approximate pronunciation; cue timing
   # still comes from the acoustic alignment, never character percentages.
   known={'runout':'R AH N AW T','runouts':'R AH N AW T S','autoplay':'AO T OW P L EY','sidespin':'S AY D S P IH N','backspin':'B AE K S P IH N','billiards':'B IH L Y ER D Z','micro':'M AY K R OW'}
   d.add_word(w,known.get(w,'AH'),False);unknown.append(w)
 d.set_align_text(text)
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(G/'audio'/name),'-f','s16le','-ar','16000','-ac','1','-'])
 d.start_utt();d.process_raw(pcm,False,True);d.end_utt()
 segments=d.seg()
 if segments is None:raise ValueError('No alignment: '+name)
 words=[dict(word=re.sub(r'\(\d+\)$','',s.word),start=round(s.start_frame/100,2),end=round((s.end_frame+1)/100,2)) for s in segments if not s.word.startswith('<')]
 if [x['word'] for x in words]!=text.split():raise ValueError('Alignment word mismatch: '+name)
 return key,dict(words=words,seconds=round(len(pcm)/32000,3),approximatePronunciations=unknown)
def safe_align(job):
 try:return align(job)
 except Exception as e:return job[2],dict(error=str(e),file=job[0])
if work:
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for i,(key,value) in enumerate(pool.map(safe_align,work)):
   if 'error' not in value:cache[key]=value
   else:print(value,flush=True)
   cache_path.write_text(json.dumps(cache))
   if i%25==0:cache_path.write_text(json.dumps(cache));print('Aligned',i+1,'/',len(work),flush=True)
 cache_path.write_text(json.dumps(cache))
output={};unmapped=[]
for name,t in tracks.items():
 if 'key' not in t:continue
 if t['key'] not in cache:
  unmapped.append(name);continue
 a=cache[t['key']];words=a['words'];n=t['normalized'];candidates=[]
 for priority,(target,pattern) in enumerate(RULES):
  # Run rules over the original text normalized in the same way as alignment.
  # Dashes become spaces, so accept their normalized spelling.
  pattern=pattern.replace('.','[ -]')
  for m in re.finditer(r'\b(?:'+pattern+r')\b',n):
   i=len(n[:m.start()].split());j=i+len(m[0].split())-1
   if i<len(words) and j<len(words):candidates.append(dict(start=max(0,round(words[i]['start']-.12,2)),spokenEnd=words[j]['end'],target=target,quote=m[0],priority=priority))
 # Specific multiword phrases beat the generic cue/object-ball mention.
 chosen=[]
 for c in sorted(candidates,key=lambda c:(c['start'],c['priority'])):
  overlaps=[x for x in chosen if c['start']<x['spokenEnd'] and c['spokenEnd']>x['start']]
  if overlaps:
   if any(x['priority']<=c['priority'] for x in overlaps):continue
   chosen=[x for x in chosen if x not in overlaps]
  chosen.append(c)
 if t['selfTargets'] or t.get('selfRegion'):
  key='self:'+name;B[key]=dict(label=name.removesuffix('.mp3').replace('-',' '),selectors=t['selfTargets'])
  if t.get('selfRegion'):B[key]['region']=t['selfRegion']
  # Explorer focuses the actual item being described first, before any related
  # feature mentioned later. A topic without spoken feature names keeps it lit.
  chosen=[c for c in chosen if c['start']>=1.5]
  chosen.append(dict(start=0,spokenEnd=min(2.5,a['seconds']),target=key,quote='This item',priority=-1))
 chosen.sort(key=lambda c:c['start'])
 for i,c in enumerate(chosen):
  following=chosen[i+1]['start'] if i+1<len(chosen) else a['seconds']
  c['end']=round(min(following,max(c['spokenEnd']+.65,c['start']+1.6)),2)
  del c['priority'];del c['spokenEnd']
 chosen=[c for c in chosen if c['end']>c['start']+.05]
 if not chosen:unmapped.append(name)
 output[name]=dict(sha256=t['sha256'],seconds=a['seconds'],page=t['page'],method='PocketSphinx transcript-constrained word alignment',approximatePronunciations=a['approximatePronunciations'],cues=chosen)
result=dict(version=1,clock='Media currentTime; seeking and playbackRate use the same MP3 clock.',bindings=B,tracks=output,audit=dict(tracks=len(output),cues=sum(len(t['cues']) for t in output.values()),withoutVisualReferences=unmapped))
(G/'narration-cues.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result['audit'],indent=2))
