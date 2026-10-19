"""Install only browser-exported Chase clips whose narration script hash still matches."""
from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
records=json.loads((root/'play-audio/scripts.json').read_text())['records']
rows=json.loads((root/'play-audio/recording-downloads.json').read_text())
seen={};completed=[];missing=[];stale=[]
for row in rows:
 if row['textHash']!=records[row['id']]['textHash']:stale.append(row['id']);continue
 source=Path('/workspace/scratch')/Path(row['path']).relative_to('/home/oai/share')
 if not source.is_file() or not source.stat().st_size:missing.append(row['id']);continue
 digest=hashlib.sha256(source.read_bytes()).hexdigest()
 if digest in seen and seen[digest]!=row['id']:raise ValueError('Duplicate recording: '+row['id']+' and '+seen[digest])
 seen[digest]=row['id']
 output=root/'play-audio'/(row['id']+'.mp3')
 receipt=output.with_suffix('.json')
 if output.exists() and receipt.exists() and json.loads(receipt.read_text()).get('sourceHash')==digest:continue
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-vn','-codec:a','libmp3lame','-q:a','3',str(output)],check=True)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(output)],text=True))
 if duration<1:raise ValueError('Audio too short '+row['id'])
 subprocess.run(['ffmpeg','-v','error','-i',str(output),'-f','null','-'],check=True)
 data={'voice':'chase','rate':'+30%','model':'simba-3.2','textHash':row['textHash'],'sourceHash':digest,'duration':duration,'source':'Speechify Playground export'}
 receipt.write_text(json.dumps(data,indent=2)+'\n');completed.append({'id':row['id'],'seconds':round(duration,1)})
print(json.dumps({'installed':completed,'total':len(rows),'missing':missing,'stale':stale}))
