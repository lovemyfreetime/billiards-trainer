"""Build portable lesson starters. Coordinates: x across 0..4, y head-to-foot 0..8."""
from pathlib import Path
import json,math,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'guide/layouts';OUT.mkdir(exist_ok=True)
L=2.54;W=1.27;R=.028575
layouts={};bindings={}
def add(id,title,balls,markers=[],pocket=None,aim=None,note='Trainer practice starter; adjust the shot controls as directed by the lesson.'):
 layouts[id]={'title':title,'balls':balls,'markers':markers,'pocket':pocket,'aim':aim,'note':note}
def bind(ids,keys):
 for id in ids.split():bindings[id]=keys.split()
exact=json.loads((ROOT/'guide/Practice-Drill-Layouts.json').read_text())['drills']
for d in exact:
 add(d['id'],d['title'],{0 if k=='Cue' else int(k):v for k,v in d['balls'].items()},d['markers'],d.get('target_pocket'),note='Matches the narrated diamond coordinates on a 100 × 50-inch playing surface.')
 bind(d['id'],d['id'])
add('first-shot','First shot — straight-in',{0:[1,2],1:[2,4]},pocket=[4,8])
add('cut-shot','Cut shot — right side pocket',{0:[2,4.5],1:[3,4]},pocket=[4,4])
add('position-two-balls','First shot and next-ball position',{0:[2,2],1:[3,4],2:[2,6]},[{'label':'White circle','xy':[2,5.5],'size_inches':6}],pocket=[4,4])
add('clear-speed','Cue-ball speed — clear table',{0:[2,1.5]},[{'label':'White circle','xy':[2,4],'size_inches':6}],aim=[2,7.5])
add('rail-spin','Rail rebound and English',{0:[2,2]},aim=[.09,4.5])
add('jump-obstacle','Jump clearance and landing',{0:[2,2],8:[2,4],1:[2,6]},[{'label':'Yellow circle','xy':[2,5.2],'size_inches':6}],aim=[2,6])
add('blocked-route','Blocked route — kick, jump, or massé',{0:[3,2],8:[3,3.5],1:[3,5]},aim=[.09,3.5])
add('bank-shot','One-rail bank starter',{0:[3,2],1:[2,4]},[{'label':'Yellow circle','xy':[.09,5.333],'size_inches':3}],aim=[2.146,3.903])
add('three-ball','Three-ball runout starter',{0:[2,2],1:[3,4],2:[1,5.5],3:[3,6.5]},pocket=[4,4])
add('three-zones','Three cue-ball position zones',{0:[2,2],1:[3.5,4]},[{'label':'White circle','xy':[2.5,3],'size_inches':6},{'label':'Red circle','xy':[2,5],'size_inches':6},{'label':'Yellow circle','xy':[3,6.5],'size_inches':6}],pocket=[4,4])
add('three-rail','Three-rail escape starter',{0:[3,2],8:[2.5,3.5],1:[2,5]},[{'label':'Yellow circle A','xy':[.09,5],'size_inches':3},{'label':'Yellow circle B','xy':[3,7.91],'size_inches':3},{'label':'Yellow circle C','xy':[3.91,7],'size_inches':3}],aim=[.09,5],note='Trainer three-rail example. Use the linked Corner-5 video for the creator’s number scales and exact starting references.')
clock={0:[2,4]}
for i in range(8):a=2*math.pi*i/8;clock[i+1]=[2+1.2*math.cos(a),4+2.4*math.sin(a)]
add('pattern-clock','Pattern rotation — Trainer starter',clock,note='Trainer rotation adaptation. Use the linked Niels Feijen video to match his demonstrated layout and sequence.')
add('progressive-target','Progressive target — Trainer starter',{0:[2,4.5],1:[3,4]},[{'label':'White circle','xy':[2.82,2.5],'size_inches':6}],pocket=[4,4],note='Trainer progression starter; shrink the target or move the cue ball. The linked Sharivari video supplies the creator’s demonstrated drill.')
add('defense-starter','Attack or safety — comparison starter',{0:[1,2],1:[2,4],8:[2.8,5.5],2:[1,6]},pocket=[4,8])
# Rack files are portable full ball arrangements, with a first-shot aim at the apex.
for kind,count in [('8ball',15),('9ball',9)]:
 balls={0:[2,2]};n=0
 rows=[1,2,3,4,5] if count==15 else [1,2,3,2,1]
 ids=[1,9,2,3,8,10,11,4,12,5,6,13,14,7,15] if count==15 else [1,2,3,4,9,5,6,7,8]
 for row,c in enumerate(rows):
  for col in range(c):balls[ids[n]]=[2+(col-(c-1)/2)*2*R/(W/4),6+row*math.sqrt(3)*R/(L/8)];n+=1
 add('rack-'+kind,kind[0]+'-ball full rack',balls,aim=[2,6])
for i,y in enumerate([2,3,3.5]):add('straight-distance-'+str(i+1),'Straight-shot ladder — distance '+str(i+1),{0:[1+(y-2)*.5,y],1:[2,4]},pocket=[4,8])
bind('practice-layout-quick practice-position-play-quick practice-shot-two-quick first-session-shot-two first-session-two-shot-execution first-session-position-play first-session-extend-runout first-session-undo','position-two-balls')
bind('practice-aiming-quick practice-stop-shot-quick practice-follow-shot-quick practice-draw-shot-quick practice-speed-contact-baseline exercise-cue-pocket-threshold exercise-save-recall-layout exercise-sliding-friction exercise-physics-stop-follow-draw exercise-stop-follow-draw exercise-squirt-comparison exercise-live-stats-cut-overlap exercise-live-stats-speed-spin first-session-table first-session-aiming first-session-ghost-ball first-session-speed first-session-execute first-session-experiment first-session-follow-draw ghost-ball-quick ghost-ball-geometry-quick cue-ball-placement-quick pocket-targeting-quick collision-line-quick exercise-calibration-real-table','first-shot')
bind('practice-cut-angles-quick practice-tangent-line-quick exercise-change-one-ball','cut-shot')
bind('practice-speed-control-quick exercise-table-speed exercise-table-speed-calibration-variation exercise-speed-ladder','clear-speed')
bind('practice-english-quick rail-english-geometry-quick exercise-rail-english','rail-spin')
bind('physics-jump-clearance-quick exercise-jump-clearance exercise-jump-landing','jump-obstacle')
bind('exercise-masse-route exercise-jump-kick-masse','blocked-route')
bind('practice-bank-shots-quick','bank-shot')
bind('practice-kick-shots-quick practice-one-rail-kick','drill-mirror-kick')
bind('practice-two-rail-kick','drill-two-rail-kick')
bind('practice-corner-five','three-rail')
bind('practice-rock-around-clock','pattern-clock')
bind('practice-progressive-benchmark','progressive-target')
bind('practice-target-landing','drill-stop-shot')
bind('practice-session-introduction exercise-focused-practice-session','drill-stop-shot pattern-clock drill-mirror-kick drill-two-rail-kick three-rail')
bind('exercise-practice-review','progressive-target')
bind('exercise-three-ball-runout','three-ball')
bind('exercise-layout-runout-review exercise-full-rack-review exercise-full-rack-training exercise-runout-improvement practice-undo-history-quick','rack-8ball rack-9ball three-ball')
bind('exercise-straight-shot-ladder','straight-distance-1 straight-distance-2 straight-distance-3')
bind('exercise-three-position-zones','three-zones')
bind('exercise-geometry-route-comparison','first-shot bank-shot drill-mirror-kick')
bind('defensive-cue-ball-route-quick recommend-zero-x-defense-recovery','defense-starter')
bind('recommend-zero-x-center-ball','first-shot')
bind('recommend-zero-x-position-play','position-two-balls')
bind('recommend-zero-x-eight-ball-patterns','rack-8ball')
bind('recommend-zero-x-overview','first-shot three-ball')
# Every portable file is accepted by the existing native table-file loader.
def xy(p):return {'x':p[1]*L/8,'y':p[0]*W/4}
manifest={'layouts':{},'topics':{}}
for id,d in layouts.items():
 balls=[{'id':i,'n':'CB' if i==0 else str(i),**xy(pos),'active':True} for i,pos in d['balls'].items()]
 for j,m in enumerate(d['markers']):
  color=next((c for c in ['white','red','yellow','pink'] if c in m['label'].lower()),'white');shape='square' if 'square' in m['label'].lower() else 'circle';size=m.get('size_inches',m.get('size_diamonds',.5)*12.5)
  balls.append({'id':1000+j,'n':'MARKER','marker':True,'markerType':color,'markerShape':shape,'markerDiameterIn':size,'markerWidthIn':size,'markerHeightIn':size,'markerAngle':0,'markerLocked':False,**xy(m['xy']),'active':True})
 aim=d['aim']
 if aim is None and d['pocket']:
  ob=next((b for b in balls if b['id']==1),None);pocket=xy(d['pocket'])
  if ob:
   dx=pocket['x']-ob['x'];dy=pocket['y']-ob['y'];n=math.hypot(dx,dy);aim={'x':ob['x']-2*R*dx/n,'y':ob['y']-2*R*dy/n}
 if isinstance(aim,list):aim=xy(aim)
 if aim is None:aim=xy(d['markers'][0]['xy']) if d['markers'] else {'x':L*.75,'y':W*.5}
 payload={'format':'billiards-trainer','version':1,'kind':'layout','name':d['title'],'layout':{'name':d['title'],'tableL':L,'tableW':W,'ballR':R,'setupMode':'custom','allowMissingCueBall':False,'balls':balls,'freeAim':aim},'practiceNote':d['note'],'diamondOrientation':'x across 0–4; y head-to-foot 0–8. App coordinates x=head-to-foot, y=across.'}
 f=id+'.billiards.json';(OUT/f).write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n');manifest['layouts'][id]={'title':d['title'],'url':'./guide/layouts/'+f,'note':d['note']}
for id,keys in bindings.items():manifest['topics'][id]=[manifest['layouts'][key] for key in keys]
(ROOT/'guide/practice-layouts.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
# Human-review inventory covers every topic in the table dropdowns and recorded resources.
topics={t['id']:t for t in json.loads((ROOT/'guide/pool-audio-map.json').read_text())['topics']}
for r in json.loads((ROOT/'guide/recorded-audio.json').read_text())['records']:
 if r['page'] in ['Main','Shared']:topics[r['topic']['id']]={**topics.get(r['topic']['id'],{}),**r['topic']}
rows=[]
for t in topics.values():
 if t.get('category') in ['explore','reference'] or t.get('categoryWelcome'):continue
 rows.append({'id':t['id'],'title':t['title'],'category':t['category'],'setup_files':[x['url'] for x in manifest['topics'].get(t['id'],[])],'decision':'Reusable practice setup supplied' if t['id'] in bindings else 'Concept, interface explanation, or session guidance; no prescribed starting ball arrangement','text':t.get('text','')})
(ROOT/'guide/SETUP_AUDIT.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'files':len(layouts),'topics_with_shortcuts':len(bindings),'topics_reviewed':len(rows)}))
