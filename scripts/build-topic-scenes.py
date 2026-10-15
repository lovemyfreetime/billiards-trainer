"""Topic-specific Guide scenes. Coordinates are meters on a 100 x 50 inch cloth.

Preserve coordinate-drill narration and Get Started snapshots. Other lessons
receive authored families of arrangements with a documented topic variation.
Geometry fingerprints exclude titles, metadata, and marker labels.
"""
import json, math, copy, hashlib, collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];G=ROOT/'guide';OUT=G/'layouts/topics';OUT.mkdir(parents=True,exist_ok=True)
L,W,R=2.54,1.27,.028575
def read(p):return json.loads((G/p).read_text())
def write(p,d):(G/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
pool=read('pool-audio-map.json');topics={t['id']:dict(t) for t in pool['topics']}
for r in read('recorded-audio.json')['records']:
 if r['page'] in ['Main','Shared']:topics[r['topic']['id']]={**topics.get(r['topic']['id'],{}),**r['topic']}
catalog=read('learning-catalog.json')
for t in catalog['newTopics']:topics[t['id']]=t
selected=[(id,t,catalog['topics'][id]) for id,t in topics.items() if catalog['topics'][id]['visible']]
counts=collections.Counter();scenes={};fingerprints={}
route_controls=read('topic-route-controls.json')
defaults=read('layouts/get-started-01.billiards.json')['state']
def ball(id,x,y):return dict(id=id,n='CB' if id==0 else str(id),x=x*L,y=y*W,active=True)
def marker(x,y,color='white',size=6,shape='circle'):
 return dict(id=1000,n='MARKER',marker=True,markerType=color,markerShape=shape,markerDiameterIn=size,markerWidthIn=size,markerHeightIn=size,markerAngle=0,markerLocked=False,x=x*L,y=y*W,active=True)
def ghost(b,pocket):
 px,py=pocket[0]*L,pocket[1]*W;dx,dy=px-b['x'],py-b['y'];n=math.hypot(dx,dy)
 return dict(x=b['x']-2*R*dx/n,y=b['y']-2*R*dy/n)
def direct(k,straight=False):
 # A deliberate change of approach distance, cut, or pocket between topics.
 families={'meters':(.50,.33,.60,15),'swerve':(.48,.25,.65,20),'aim':(.48,.26,.45,18),'cut':(.52,.32,.55,32),'collision':(.47,.36,.42,24),'stun':(.50,.38,.38,28),'roll':(.51,.40,.50,25),'stats':(.49,.35,.52,22),'compass':(.53,.33,.40,30),'stop':(.50,.30,.40,0),'follow':(.50,.40,.44,0),'draw':(.50,.28,.50,0),'squirt':(.50,.24,.65,0),'routine':(.50,.45,.38,0),'stance':(.50,.42,.41,0),'bridge':(.50,.36,.35,0),'stroke':(.50,.34,.55,0),'position':(.46,.34,.47,23),'pattern':(.54,.29,.46,26),'safety':(.48,.39,.48,21),'layout':(.52,.25,.43,19),'review':(.49,.31,.39,27),'markers':(.54,.37,.46,20)}
 ox,oy,distance,angle=families.get(profile,(.47,.27,.35,16))
 pocket=[.5,0];ob=ball(1,ox+.012*(k%6),oy+.025*(k%4));g=ghost(ob,pocket)
 dx,dy=pocket[0]*L-ob['x'],pocket[1]*W-ob['y'];n=math.hypot(dx,dy);dx/=n;dy/=n
 phi=0 if straight else math.radians(angle+3*(k%8));d=distance+.035*k
 incoming=(dx*math.cos(phi)-dy*math.sin(phi),dx*math.sin(phi)+dy*math.cos(phi))
 cue=dict(id=0,n='CB',x=g['x']-incoming[0]*d,y=g['y']-incoming[1]*d,active=True)
 return [cue,ob],g,pocket
def fingerprint(file):
 a=file['history'][0] if file.get('history') and len(file['history'])>1 else file['layout']
 # Actual physical balls and target geometry, independent of filename/title.
 data=[{k:b.get(k) for k in ['id','x','y','marker','markerShape','markerWidthIn','markerHeightIn','markerAngle']} for b in a['balls']]
 return hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()
for id,t,card in selected:
 category=card['category'];profile=card['profile'];k=counts[profile];counts[profile]+=1
 controls=dict(speed=1.45,follow=0,sideSpin=0,cueElevationDeg=0,airbornePhysics=False,showPaths=True,showImpact=True,showDiamonds=True,shot2Enabled=False,shot2Initialized=False,activeShot=1)
 objective=card['purpose'];reason='Approach distance and contact geometry selected for '+t['title']+'.';target=1;pocket=None
 base=card['setups'][0] if card['setups'] else None
 if category=='start':
  # Existing adapter remains responsible for responsive size, prepared Shot 2,
  # and real Undo history. Its downloadable snapshot is kept byte-for-byte.
  f=read(base['url'].removeprefix('./guide/'));setup=copy.deepcopy(base);controls={};reason='Original Get Started scene and execution behavior retained.'
 elif id.startswith('drill-'):
  f=read('layouts/'+id+'.billiards.json');setup=dict(title=t['title'],url='./guide/layouts/topics/'+id+'.billiards.json',note='Exact existing narrated drill coordinates retained.')
  pocket=base.get('pocket') if base else None
  if profile in ['stop','stun']:controls.update(speed=1.65,follow=-.25)
  if id=='drill-speed-ladder':controls.update(speed=.45)
  if id in ['drill-mirror-kick','drill-two-rail-kick']:controls.update(speed=1.1)
  reason='The original narration specifies these ball and target coordinates; they are preserved.'
 else:
  balls,aim,pocket=direct(k,profile in ['stop','follow','draw','routine','stance','bridge','stroke','access','squirt'])
  if profile in ['speed','calibration']:
   lane=.38 if profile=='speed' else .48
   balls=[ball(0,.16+.012*k,lane+.012*(k%5)),marker(.48+.014*k,lane+.012*(k%5),size=6)];aim=dict(x=.88*L,y=balls[0]['y']);pocket=None;target=None;controls['speed']=.45+.012*(k%5);reason='Clear rolling lane and a named stopping target; no collision hides the travel comparison.'
  elif profile=='english':
   balls=[ball(0,.20+.027*k,.26+.018*(k%4)),marker(.70+.018*k,.975,'yellow',3)];aim=dict(x=balls[1]['x'],y=W-R);pocket=None;target=None;controls['speed']=1.25;reason='One-cushion lane with a marked first rail reference, for no/left/right English comparisons.'
  elif profile in ['jump','masse']:
   y=(.42 if profile=='jump' else .62)+.02*(k%6);balls=[ball(0,.19+.009*k,y),ball(8,.39+.009*k,y),ball(1,.66+.009*k,y),marker(.55+.009*k,y,'yellow',6)];pocket=None;aim=dict(x=balls[2]['x'],y=balls[2]['y']);controls.update(speed=2.25,cueElevationDeg=52,airbornePhysics=True)
   reason='Distinct obstacle spacing and an open landing area; compare clearance at the blocker and landing separately.'
   if profile=='masse':controls.update(speed=1.15,cueElevationDeg=62,sideSpin=.55);aim=dict(x=.51*L,y=(y-.22)*W);reason='Blocked direct lane plus room for lateral curvature; compare with a cushion escape.'
  elif profile in ['bank','kick','multi-rail']:
   if profile=='bank':
    # Reflect the foot-right corner across the top cushion. Aim the object ball
    # at that reflected target and derive its first cushion contact.
    pocket=[1,1];ob=ball(1,.48+.012*k,.40+.012*(k%4));virtual=(L,-W);v=(virtual[0]-ob['x'],virtual[1]-ob['y']);n=math.hypot(*v);aim=dict(x=ob['x']-2*R*v[0]/n,y=ob['y']-2*R*v[1]/n);cue=dict(id=0,n='CB',x=aim['x']-v[0]/n*.38,y=aim['y']-v[1]/n*.38,active=True);q=-ob['y']/v[1];balls=[cue,ob,marker((ob['x']+q*v[0])/L,R/W,'yellow',3)];reason='Object-ball bank to a named corner, with a geometric first-rail reference; rebounds need observed adjustment.'
   else:
    cue=ball(0,.18+.025*k,.56);ob=ball(1,.72,.56-.012*k);block=ball(8,(cue['x']+ob['x'])/(2*L),(cue['y']+ob['y'])/(2*W));virtual=(ob['x'],-ob['y']);q=(R-cue['y'])/(virtual[1]-cue['y']);rx=cue['x']+q*(virtual[0]-cue['x']);balls=[cue,ob,block,marker(rx/L,R/W,'yellow',3)];aim=dict(x=rx,y=R);pocket=None;controls['speed']=1.35;reason='Target behind a blocker; a geometric cushion reference starts the escape comparison.'
    if profile=='multi-rail':
     # Two cushion image: reflect the object ball across top and foot cushions.
     virtual=(2*L-ob['x'],-ob['y']);q=(R-cue['y'])/(virtual[1]-cue['y']);rx=cue['x']+q*(virtual[0]-cue['x']);balls[-1]=marker(rx/L,R/W,'yellow',3);aim=dict(x=rx,y=R);controls['speed']=1.7;reason='Two-cushion image route around the blocker; check each rail contact before the final target.'
  elif profile in ['position','pattern','safety','layout','review'] or category=='more' or t.get('categoryWelcome'):
   balls,aim,pocket=direct(k)
   balls.extend([ball(2,.76-.009*(k%5),.65-.025*(k%4)),marker(.57+.009*k,.66,'white',6)])
   reason='Current pot plus a next-ball angle and a visible position zone.'
   if profile=='pattern' or category=='more' or t.get('categoryWelcome'):
    balls.extend([ball(3,.72,.25+.012*(k%3)),ball(4,.33+.009*k,.32)]);reason='A distinct open pattern for comparing order, next angles, and route complexity.'
   if id=='problem-balls-quick':
    balls[-1]=ball(4,(balls[-2]['x']+2*R+.009)/L,balls[-2]['y']/W);reason='Two close object balls explicitly create the problem-ball decision described in the lesson.'
   if profile=='safety':
    balls.append(ball(8,.66,.44+.015*k));balls[3]=marker(.78,.36+.015*k,'yellow',7);reason='An attacking ball, screening ball, and candidate hiding area for inspecting the opponent reply.'
   if id=='cue-ball-traffic-quick':
    balls.extend([ball(5,.59,.55),ball(6,.64,.71)]);reason='Extra balls occupy the cue-ball travel corridor, making traffic avoidance visible.'
  elif profile=='rack':
   f0=read('layouts/rack-'+('8ball' if k%2==0 else '9ball')+'.billiards.json');balls=f0['layout']['balls'];balls[0]=ball(0,.18+.008*k,.30+.045*(k%5));aim=dict(x=balls[1]['x'],y=balls[1]['y']);pocket=None;controls['speed']=5;reason='Correct full rack with a distinct break starting point; continue planning from the resulting spread.'
  if profile=='follow':controls.update(follow=.35,speed=1.15)
  if profile=='draw':controls.update(follow=-.5,speed=2.0)
  if profile=='stop':controls.update(follow=-.22,speed=1.65)
  if profile=='stun':controls.update(follow=-.28,speed=1.6)
  if profile=='roll':controls.update(follow=.3,speed=1.05)
  if profile=='swerve':controls.update(cueElevationDeg=10,sideSpin=.35,speed=.95)
  if profile=='squirt':controls.update(sideSpin=.3,speed=1.8)
  if profile=='access':
   balls,aim,pocket=direct(k,True);balls[0]=ball(0,R/L+.006,.62);aim=ghost(balls[1],pocket);reason='Rail-adjacent cue ball makes bridge support and physical cue access the central observation.'
  if profile in ['position','pattern','review','markers'] and not any(b.get('marker') for b in balls):balls.append(marker(.65,.65,size=6))
  if profile=='compass':controls['teachingCompass']=dict(enabled=True,x=balls[1]['x'],y=balls[1]['y'],sizePct=45,angle=0,linkedBallId=None)
  if id=='rail-speed-loss-advanced':
   balls=[ball(0,.24,.35),marker(.78,.65,'yellow',6)];aim=dict(x=.73*L,y=W-R);pocket=None;target=None;controls.update(speed=1.35);reason='An actual cushion route makes rebound speed loss observable.'
  if id in ['exercise-sliding-friction']:
   balls,aim,pocket=direct(k,True);controls.update(speed=1.4,follow=-.25);reason='Straight collision exposes slide-to-roll changes instead of only free rolling distance.'
  if id in ['practice-shot-two-quick','practice-position-play-quick']:
   controls['planNextBall']=2;controls['nextPocket']=[1,1]
  tuned=route_controls.get(id)
  if tuned:
   aim=tuned['aim'];controls['speed']=tuned['speed'];reason+=' Prepared aim is adjusted from the geometric reference for the default simulator cushion response; recalibrate on your table.'
  layout=dict(name=t['title'][:60],tableL=L,tableW=W,ballR=R,setupMode='custom',allowMissingCueBall=False,balls=balls,freeAim=aim)
  f=dict(format='billiards-trainer',version=1,kind='layout',name=t['title'][:60],layout=layout)
  setup=dict(title=t['title'],url='./guide/layouts/topics/'+id+'.billiards.json',note=reason)
 if category!='start':
  # A portable session also carries the designed stroke. Live Guide loading
  # explicitly preserves the student's calibration while applying shot controls.
  state=copy.deepcopy(defaults);state.update(f['layout']);state.update({k:v for k,v in controls.items() if k not in ['planNextBall','nextPocket']});state['lastLayoutName']=f['name'];state['preview']=None
  f.update(kind='session',state=state,history=[],lesson=dict(topic=id,purpose=objective,variation=reason,pocket=pocket,target=target,controls=controls))
  (OUT/(id+'.billiards.json')).write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
  if pocket:setup.update(pocket=pocket,target=target)
 fp=fingerprint(f)
 if fp in fingerprints:raise ValueError('Duplicate physical layout: '+id+' and '+fingerprints[fp])
 fingerprints[fp]=id
 # Check actual ball placement and physical ball separation, excluding target markers.
 physical=[b for b in f['layout']['balls'] if not b.get('marker')]
 for b in physical:
  if not (R-1e-7<=b['x']<=L-R+1e-7 and R-1e-7<=b['y']<=W-R+1e-7):raise ValueError('Off cloth '+id+' '+str(b))
 for i,b in enumerate(physical):
  for a in physical[:i]:
   if math.hypot(a['x']-b['x'],a['y']-b['y'])<2*R-1e-6:raise ValueError('Overlapping balls '+id)
 scene=dict(id=id,title=t['title'],category=category,profile=profile,setup=setup,controls=controls,objective=objective,variation=reason,geometryHash=fp,file=f)
 scenes[id]=scene;card['setups']=[setup];card['sceneId']=id
write('topic-scenes.json',dict(version=1,count=len(scenes),scope='Every selectable Main Guide item, category welcome, and Get Started lesson. Explorer-only control narration is inventoried separately and never auto-loads a scene.',topics=scenes))
write('learning-catalog.json',catalog)
print(json.dumps(dict(scenes=len(scenes),uniquePhysicalGeometries=len(fingerprints),preservedGetStarted=8,byCategory=dict(collections.Counter(s['category'] for s in scenes.values()))),indent=2))
