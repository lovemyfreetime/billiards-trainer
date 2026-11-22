"""Install only browser-exported Chase clips whose narration script hash still matches."""
from pathlib import Path
import hashlib,json,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
records=json.loads((root/'play-audio/scripts.json').read_text())['records']
rows=json.loads((root/'play-audio/recording-downloads.json').read_text())
seen={};completed=[];missing=[];stale=[]
for row in rows:
 if row['textHash']!=records[row['id']]['textHash'] or row.get('rate')!=records[row['id']]['rate']:stale.append(row['id']);continue
 source=Path('/workspace/scratch')/Path(row['path']).relative_to('/home/oai/share')
 if not source.is_file() or not source.stat().st_size:missing.append(row['id']);continue
 original=source.read_bytes()
 digest=hashlib.sha256(original).hexdigest()
 if digest in seen and seen[digest]!=row['id']:raise ValueError('Duplicate recording: '+row['id']+' and '+seen[digest])
 seen[digest]=row['id']
 output=root/'play-audio'/(row['id']+'.mp3')
 receipt=output.with_suffix('.json')
 if output.is_file() and receipt.is_file() and output.read_bytes()==original and json.loads(receipt.read_text()).get('sourceHash')==digest:continue
 with tempfile.TemporaryDirectory(dir=output.parent) as temp_dir:
  staged=Path(temp_dir)/output.name
  staged.write_bytes(original)
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=format_name,duration','-of','json',str(staged)]))['format']
  if info['format_name']!='mp3':raise ValueError('Expected an original Speechify MP3 for '+row['id'])
  duration=float(info['duration'])
  if duration<1:raise ValueError('Audio too short '+row['id'])
  if row.get('durationHint') and abs(duration-row['durationHint'])>0.15:raise ValueError('Export duration differs from the generated player: '+row['id'])
  subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(staged),'-f','null','-'],check=True)
  staged.replace(output)
 data={'voice':'chase','rate':records[row['id']]['rate'],'model':'simba-3.2','textHash':row['textHash'],'sourceHash':digest,'duration':duration,'source':'Speechify Playground export'}
 receipt.write_text(json.dumps(data,indent=2)+'\n');completed.append({'id':row['id'],'seconds':round(duration,1)})
print(json.dumps({'installed':completed,'total':len(rows),'missing':missing,'stale':stale}))
