"""Extend the preserved, authored topic-scene catalog for new selectable lessons. Coordinates are meters on a 100 x 50 inch cloth.

Preserve coordinate-drill narration and Get Started snapshots. Other lessons
receive authored families of arrangements with a documented topic variation.
Geometry fingerprints exclude titles, metadata, and marker labels.
"""
import json, math, copy, hashlib, collections, random, itertools, re
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
scenes=read('topic-scenes.json')['topics']
required={id for groups in pool['curriculum'].values() for group in groups for id in group['topics']}
selected=[(id,t,catalog['topics'][id]) for id,t in topics.items() if id in required and id not in scenes]
counts=collections.Counter(s['profile'] for s in scenes.values());fingerprints={s['geometryHash']:id for id,s in scenes.items()}
route_controls=read('topic-route-controls.json')
masse_scenes=read('topic-masse-scenes.json') if (G/'topic-masse-scenes.json').exists() else {}
shot_controls=read('topic-shot-controls.json') if (G/'topic-shot-controls.json').exists() else {}
defaults=read('layouts/get-started-01.billiards.json')['state']
def ball(id,x,y):return dict(id=id,n='CB' if id==0 else str(id),x=x*L,y=y*W,active=True)
def marker(x,y,color='white',size=6,shape='circle'):
 return dict(id=1000,n='MARKER',marker=True,markerType=color,markerShape=shape,markerDiameterIn=size,markerWidthIn=size,markerHeightIn=size,markerAngle=0,markerLocked=False,x=x*L,y=y*W,active=True)
def ghost(b,pocket):
 px,py=pocket[0]*L,pocket[1]*W;dx,dy=px-b['x'],py-b['y'];n=math.hypot(dx,dy)
 return dict(x=b['x']-2*R*dx/n,y=b['y']-2*R*dy/n)
POCKETS=[[0,0],[.5,0],[1,0],[1,1],[.5,1],[0,1]]
def direct(k,straight=False):
 rng=random.Random('direct:'+id);pocket=POCKETS[scene_index%6];px,py=pocket[0]*L,pocket[1]*W
 for attempt in range(600):
  ob=ball(1,rng.uniform(.13,.87),rng.uniform(.16,.84));g=ghost(ob,pocket)
  dx,dy=px-ob['x'],py-ob['y'];n=math.hypot(dx,dy);dx/=n;dy/=n
  phi=0 if straight else math.radians((1 if (scene_index//6)%2 else -1)*rng.uniform(12,57))
  if id=='thirty-degree-rule-quick':phi=math.radians(30)
  d=.68 if id=='thirty-degree-rule-quick' else rng.uniform(.28,1.15);vx=dx*math.cos(phi)-dy*math.sin(phi);vy=dx*math.sin(phi)+dy*math.cos(phi)
  cue=dict(id=0,n='CB',x=g['x']-vx*d,y=g['y']-vy*d,active=True)
  if R+.035<cue['x']<L-R-.035 and R+.035<cue['y']<W-R-.035:return [cue,ob],g,pocket
 raise ValueError('Could not place cut '+id)
def route(start,end,sequence):
 # Reflect the endpoint, then trace on the ball-center rectangle. Reject paths
 # that hit a different cushion first or cross a pocket mouth en route.
 bounds={'left':R,'right':L-R,'top':R,'bottom':W-R};v=list(end)
 for rail in reversed(sequence):
  axis=0 if rail in ['left','right'] else 1;v[axis]=2*bounds[rail]-v[axis]
 dx,dy=v[0]-start[0],v[1]-start[1];length=math.hypot(dx,dy);dx/=length;dy/=length;x,y=start;hits=[]
 for rail in sequence:
  candidates=[]
  if dx>1e-9:candidates.append(((L-R-x)/dx,'right'))
  if dx< -1e-9:candidates.append(((R-x)/dx,'left'))
  if dy>1e-9:candidates.append(((W-R-y)/dy,'bottom'))
  if dy< -1e-9:candidates.append(((R-y)/dy,'top'))
  candidates=[c for c in candidates if c[0]>1e-7]
  t,actual=min(candidates)
  if actual!=rail:return None
  x+=dx*t;y+=dy*t
  if min(math.hypot(x-p[0]*L,y-p[1]*W) for p in POCKETS)<.13:return None
  hits.append(dict(rail=rail,x=x,y=y))
  if rail in ['left','right']:dx=-dx
  else:dy=-dy
 if (end[0]-x)*dx+(end[1]-y)*dy<=0:return None
 if abs((end[0]-x)*dy-(end[1]-y)*dx)>.001:return None
 return hits

def rail_scene():
 rng=random.Random('rails:'+id);pocket=POCKETS[(scene_index+2)%6]
 rails=['top','right','bottom','left'];sequences=[seq for n in ([1] if id=='practice-one-rail-kick' else [2] if id in ['mirror-aiming-quick','practice-two-rail-kick'] else [2,3]) for seq in itertools.product(rails,repeat=n) if all((a in ['top','bottom'])!=(b in ['top','bottom']) for a,b in zip(seq,seq[1:]))];rng.shuffle(sequences);sequences.sort(key=lambda seq:seq[0]!=rails[scene_index%4])
 for attempt in range(300):
  ob=ball(1,rng.uniform(.30,.70),rng.uniform(.26,.74));cue=ball(0,rng.uniform(.12,.88),rng.uniform(.17,.83))
  start=(ob['x'],ob['y']) if profile=='bank' else (cue['x'],cue['y'])
  end=(pocket[0]*L,pocket[1]*W) if profile=='bank' else (ob['x'],ob['y'])
  for seq in sequences:
   hits=route(start,end,seq)
   if not hits:continue
   if profile=='bank':
    dx,dy=hits[0]['x']-ob['x'],hits[0]['y']-ob['y'];d=math.hypot(dx,dy);dx/=d;dy/=d
    aim=dict(x=ob['x']-2*R*dx,y=ob['y']-2*R*dy);cue=dict(id=0,n='CB',x=aim['x']-dx*.32,y=aim['y']-dy*.32,active=True)
    if not R+.01<cue['x']<L-R-.01 or not R+.01<cue['y']<W-R-.01:continue
    balls=[cue,ob]
   else:
    aim=dict(x=hits[0]['x'],y=hits[0]['y']);block=ball(8,(cue['x']+ob['x'])/(2*L),(cue['y']+ob['y'])/(2*W))
    if math.hypot(cue['x']-ob['x'],cue['y']-ob['y'])<.5:continue
    # Keep the blocker clear of the selected escape segments.
    nodes=[dict(x=cue['x'],y=cue['y'])]+hits+[dict(x=ob['x'],y=ob['y'])]
    def segment_distance(a,b):
     vx,vy=b['x']-a['x'],b['y']-a['y'];t=max(0,min(1,((block['x']-a['x'])*vx+(block['y']-a['y'])*vy)/(vx*vx+vy*vy)));return math.hypot(block['x']-a['x']-t*vx,block['y']-a['y']-t*vy)
    if min(segment_distance(a,b) for a,b in zip(nodes,nodes[1:]))<.09:continue
    balls=[cue,ob,block]
   for j,h in enumerate(hits):
    m=marker(h['x']/L,h['y']/W,'yellow',2.4);m['id']=1000+j;balls.append(m)
   distance=sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip([start]+[(h['x'],h['y']) for h in hits],[(h['x'],h['y']) for h in hits]+[end]))
   return balls,aim,pocket if profile=='bank' else None,hits,min(4.8,1.4+distance*.48)
 raise ValueError('No multi-cushion route '+id)

def fingerprint(file):
 a=file['history'][0] if file.get('history') and len(file['history'])>1 else file['layout']
 # Actual physical balls and target geometry, independent of filename/title.
 data=[{k:b.get(k) for k in ['id','x','y','marker','markerShape','markerWidthIn','markerHeightIn','markerAngle']} for b in a['balls']]
 return hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()
for scene_index,(id,t,card) in enumerate(selected,start=len(scenes)):
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
  if profile=='roll':controls.update(follow=.3,speed=.85 if id=='thirty-degree-rule-quick' else 1.05)
  if profile=='swerve':controls.update(cueElevationDeg=10,sideSpin=.35,speed=.95)
  if profile=='squirt':controls.update(sideSpin=.3,speed=1.8)
  if profile=='access':
   balls,aim,pocket=direct(k,True);balls[0]=ball(0,R/L+.006,.62);aim=ghost(balls[1],pocket);reason='Rail-adjacent cue ball makes bridge support and physical cue access the central observation.'
  if profile in ['position','pattern','review','markers'] and not any(b.get('marker') for b in balls):balls.append(marker(.65,.65,size=6))
  if profile=='compass':controls['teachingCompass']=dict(enabled=True,x=balls[1]['x'],y=balls[1]['y'],sizePct=45,angle=0,linkedBallId=None)
  if id=='rail-speed-loss-advanced':
   balls=[ball(0,.24,.35),marker(.78,.65,'yellow',6)];aim=dict(x=.73*L,y=W-R);pocket=None;target=None;controls.update(speed=1.35);reason='An actual cushion route makes rebound speed loss observable.'
  if id in ['exercise-sliding-friction']:
   balls,aim,pocket=direct(k,True);target=1;controls.update(speed=1.4,follow=-.25);reason='Straight collision exposes slide-to-roll changes instead of only free rolling distance.'
  if id in ['practice-shot-two-quick','practice-position-play-quick']:
   controls['planNextBall']=2;controls['nextPocket']=[1,1]
  tuned=None # Prior tuning applied to the superseded arrangements.
  if tuned:
   aim=tuned['aim'];controls['speed']=tuned['speed'];reason+=' Prepared aim is adjusted from the geometric reference for the default simulator cushion response; recalibrate on your table.'
  rail_hits=[]
  if profile in ['bank','kick','multi-rail']:
   balls,aim,pocket,rail_hits,route_speed=rail_scene();controls.update(speed=route_speed,follow=0,sideSpin=0)
   reason='A '+str(len(rail_hits))+'-cushion '+('object-ball bank' if profile=='bank' else 'cue-ball escape')+' via '+', '.join(h['rail'] for h in rail_hits)+'. Yellow references mark the intended rail contacts.'
  elif profile in ['speed','calibration','english','jump','masse','rack']:
   # Reflect entire physical arrangements, including aiming and markers. This
   # changes approach direction without distorting angles on the 2:1 cloth.
   flip_x=scene_index%4 in [1,3];flip_y=scene_index%4 in [2,3]
   for b in balls:
    if flip_x:b['x']=L-b['x']
    if flip_y:b['y']=W-b['y']
   if flip_x:aim['x']=L-aim['x']
   if flip_y:aim['y']=W-aim['y']
   if pocket:pocket=[1-pocket[0] if flip_x else pocket[0],1-pocket[1] if flip_y else pocket[1]]
   if flip_x!=flip_y:controls['sideSpin']=-controls['sideSpin']
  if profile in ['speed','calibration'] and id!='exercise-sliding-friction':
   rng=random.Random('rolling:'+id)
   for attempt in range(300):
    cue=ball(0,rng.uniform(.12,.88),rng.uniform(.15,.85));a=rng.uniform(0,2*math.pi);d=rng.uniform(.30,.85);tx=cue['x']+math.cos(a)*d;ty=cue['y']+math.sin(a)*d
    if .10<tx<L-.10 and .10<ty<W-.10:break
   balls=[cue,marker(tx/L,ty/W,'yellow' if scene_index%2 else 'white',5+scene_index%3)];aim=dict(x=tx,y=ty);pocket=None;target=None
   controls['speed']=round(math.sqrt(2*.012*9.81*d),3);reason='An open rolling lane in a new direction, with a stopping zone at a distinct distance.'
  if profile in ['jump','masse']:
   rng=random.Random('elevated:'+id)
   for attempt in range(500):
    cue=ball(0,rng.uniform(.13,.87),rng.uniform(.15,.85));a=rng.uniform(0,2*math.pi);distance=rng.uniform(.75,1.18)
    end=(cue['x']+math.cos(a)*distance,cue['y']+math.sin(a)*distance)
    if .12<end[0]<L-.12 and .12<end[1]<W-.12:break
   def along(t):return ((cue['x']+(end[0]-cue['x'])*t)/L,(cue['y']+(end[1]-cue['y'])*t)/W)
   balls=[cue,ball(8,*along(.43)),ball(1,*along(1)),marker(*along(.72),'yellow',5)];aim=dict(x=end[0],y=end[1]);pocket=None
   if profile=='masse':aim=dict(x=cue['x']+math.cos(a-.35)*distance,y=cue['y']+math.sin(a-.35)*distance)
  if profile=='rack':
   # A legal rack stays at the foot end. Vary the break lane, not its end.
   f0=read('layouts/rack-'+('8ball' if k%2==0 else '9ball')+'.billiards.json');balls=f0['layout']['balls'];balls[0]=ball(0,.13+.025*(scene_index%4),.22+.10*(scene_index%6));aim=dict(x=balls[1]['x'],y=balls[1]['y'])
  # Keep primary geometry, reposition any incidental supporting ball that
  # overlaps it. Linked problem balls retain their intentional close pair.
  rng=random.Random('support:'+id)
  placed=[]
  def clear_opener(b):
   if len(placed)<2 or id not in ['recommend-zero-x-defense-recovery','welcome-more'] or not pocket:return True
   ob=balls[1];start=balls[0]
   def distance(a,c):
    vx,vy=c['x']-a['x'],c['y']-a['y'];t=max(0,min(1,((b['x']-a['x'])*vx+(b['y']-a['y'])*vy)/(vx*vx+vy*vy)));return math.hypot(b['x']-a['x']-t*vx,b['y']-a['y']-t*vy)
   return min(distance(start,aim),distance(ob,dict(x=pocket[0]*L,y=pocket[1]*W)))>2*R+.025
  for b in balls:
   if b.get('marker'):continue
   for attempt in range(200):
    if all(math.hypot(b['x']-a['x'],b['y']-a['y'])>=2*R+.002 for a in placed) and clear_opener(b):break
    b['x']=rng.uniform(.12,.88)*L;b['y']=rng.uniform(.13,.87)*W
   placed.append(b)
  # Use the full ball palette, but retain explicit spoken ball identities and
  # legal full-rack numbering when the narration depends on them.
  explicit=bool(re.search(r'\b(?:[1-9]|1[0-5])[- ]ball\b',t.get('text',''),re.I))
  palette={n:1+(n-1+scene_index*7)%15 for n in range(1,16)} if profile!='rack' and not explicit else {n:n for n in range(1,16)}
  for b in balls:
   if b['id'] in palette:b['id']=palette[b['id']];b['n']=str(b['id'])
  if target in palette:target=palette[target]
  if controls.get('planNextBall') in palette:controls['planNextBall']=palette[controls['planNextBall']]
  tuned=route_controls.get(id) if rail_hits else None
  cue=next(b for b in balls if b['id']==0)
  if tuned and tuned.get('success') and all(abs(cue[k]-tuned.get('sourceCue',{}).get(k,-99))<1e-8 for k in ['x','y']) and all(abs(aim[k]-tuned.get('sourceAim',{}).get(k,-99))<1e-8 for k in ['x','y']):
   aim=tuned['aim'];controls['speed']=tuned['speed']
   if tuned.get('cue'):cue.update(tuned['cue'])
   rail_hits=[dict(rail=h['rail'].replace(' rail',''),x=h['x'],y=h['y']) for h in tuned['rails']]
   balls=[b for b in balls if not b.get('marker')]
   for j,h in enumerate(rail_hits):
    m=marker(h['x']/L,h['y']/W,'yellow',2.4);m['id']=1000+j;balls.append(m)
   reason='Prepared '+str(len(rail_hits))+'-cushion '+('object-ball bank to pocket '+str(POCKETS.index(pocket)+1) if profile=='bank' else 'cue-ball escape to the target ball')+' via '+', '.join(h['rail'] for h in rail_hits)+'. Aim and speed verified in the native solver; yellow references show the contacts.'
  shot=shot_controls.get(id) if not rail_hits else None
  if shot and shot.get('success') and all(abs(cue[k]-shot.get('sourceCue',{}).get(k,-99))<1e-8 for k in ['x','y']) and all(abs(aim[k]-shot.get('sourceAim',{}).get(k,-99))<1e-8 for k in ['x','y']):aim=shot['aim'];controls['speed']=shot['speed']
  if profile=='masse' and id in masse_scenes:
   authored=masse_scenes[id];balls=copy.deepcopy(authored['balls']);aim=copy.deepcopy(authored['aim']);controls.update(authored['controls']);target=authored['target'];pocket=None
   reason='Native curved escape around a ball blocking the direct route. The cue ball reaches its target without any cushion contact; vary elevation, draw and side spin to compare the curve.'
  reason+=' Approach, pocket and ball palette vary by topic; preserve this setup for within-lesson comparisons.'
  layout=dict(name=t['title'][:60],tableL=L,tableW=W,ballR=R,setupMode='custom',allowMissingCueBall=False,balls=balls,freeAim=aim)
  f=dict(format='billiards-trainer',version=1,kind='layout',name=t['title'][:60],layout=layout)
  setup=dict(title=t['title'],url='./guide/layouts/topics/'+id+'.billiards.json',note=reason)
 if category!='start':
  # A portable session also carries the designed stroke. Live Guide loading
  # explicitly preserves the student's calibration while applying shot controls.
  state=copy.deepcopy(defaults);state.update(f['layout']);state.update({k:v for k,v in controls.items() if k not in ['planNextBall','nextPocket']});state['lastLayoutName']=f['name'];state['preview']=None
  f.update(kind='session',state=state,history=[],lesson=dict(topic=id,purpose=objective,variation=reason,pocket=pocket,target=target,controls=controls,railContacts=rail_hits if not id.startswith('drill-') else []))
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
 if category!='start' and not id.startswith('drill-'):scene['railContacts']=rail_hits;scene['pocketNumber']=POCKETS.index(pocket)+1 if pocket in POCKETS else None
 scenes[id]=scene;card['setups']=[setup];card['sceneId']=id
write('topic-scenes.json',dict(version=2,count=len(scenes),scope='Every selectable Main Guide item, category welcome, and Get Started lesson. Explorer-only control narration is inventoried separately and never auto-loads a scene.',topics=scenes))
# Attach pointers without changing the current lesson curriculum or practice copy.
for id,scene in scenes.items():
 if id in catalog['topics']:
  catalog['topics'][id]['setups']=[scene['setup']];catalog['topics'][id]['sceneId']=id
write('learning-catalog.json',catalog)
print(json.dumps(dict(scenes=len(scenes),uniquePhysicalGeometries=len(fingerprints),preservedGetStarted=8,byCategory=dict(collections.Counter(s['category'] for s in scenes.values()))),indent=2))
