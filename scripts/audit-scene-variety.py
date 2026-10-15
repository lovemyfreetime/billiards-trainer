"""Visual diversity checks complement exact coordinate uniqueness."""
import json,math,collections
from pathlib import Path
G=Path(__file__).resolve().parents[1]/'guide';scenes=json.loads((G/'topic-scenes.json').read_text())['topics'];pockets=collections.Counter();directions=collections.Counter();balls=collections.Counter();cuts=collections.Counter();rows=[]
for s in scenes.values():
 if s['category']=='start' or s['id'].startswith('drill-'):continue
 f=s['file']['layout'];cue=next(b for b in f['balls'] if b['id']==0);aim=f['freeAim'];a=(math.degrees(math.atan2(aim['y']-cue['y'],aim['x']-cue['x']))+360)%360;sector=int(a//45);directions[sector]+=1
 if s.get('pocketNumber'):pockets[s['pocketNumber']]+=1
 balls.update(b['id'] for b in f['balls'] if not b.get('marker') and b['id'])
 side=None
 if s.get('pocketNumber') and not s.get('railContacts'):
  ob=next(b for b in f['balls'] if b['id']==s['file']['lesson']['target']);pk=s['setup']['pocket'];cross=(aim['x']-cue['x'])*(pk[1]*f['tableW']-ob['y'])-(aim['y']-cue['y'])*(pk[0]*f['tableL']-ob['x']);side='left' if cross>.0001 else 'right' if cross<-.0001 else 'straight';cuts[side]+=1
 rows.append(dict(id=s['id'],pocket=s.get('pocketNumber'),approachDegrees=round(a,1),cutSide=side,railSequence=[h['rail'] for h in s.get('railContacts',[])],ballIds=[b['id'] for b in f['balls'] if not b.get('marker')]))
assert set(pockets)==set(range(1,7));assert min(pockets.values())>=8;assert set(directions)==set(range(8));assert set(balls)==set(range(1,16));assert cuts['left']>=20 and cuts['right']>=20
summary=dict(redesigned=len(rows),preservedCoordinateDrills=10,preservedLinkedGetStarted=8,pockets=dict(sorted(pockets.items())),approachSectors45Degrees=dict(sorted(directions.items())),ballPalette=dict(sorted(balls.items())),cutSides=dict(cuts),nativeVerifiedRailScenes=11)
(G/'SCENE_VARIETY.json').write_text(json.dumps(dict(summary=summary,topics=rows),indent=2)+'\n');print(json.dumps(summary,indent=2))
