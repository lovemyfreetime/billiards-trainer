#!/usr/bin/env python3
"""Create a hash-verified browser package and make worker updates track app content."""
import hashlib,json,re,runpy,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def generate(check=False):
 files=runpy.run_path(str(ROOT/'scripts/package-windows-app.py'))['assets']()
 files.pop('offline-assets.json',None);files.pop('service-worker.js',None)
 hashes={name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in files.items()}
 version=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()[:16]
 worker=ROOT/'service-worker.js';source=worker.read_text();source=re.sub(r"const CACHE_NAME = '[^']+';",f"const CACHE_NAME = 'billiards-trainer-4-12-offline-{version}';",source,count=1)
 manifest=json.dumps({'version':version,'files':hashes},indent=2)+'\n'
 if check:
  assert worker.read_text()==source,'Rebuild offline assets after changing app files.'
  assert (ROOT/'offline-assets.json').read_text()==manifest,'Offline manifest is stale.'
 else:worker.write_text(source);(ROOT/'offline-assets.json').write_text(manifest)
 print(f'Offline manifest: {len(hashes)} files, version {version}')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');generate(p.parse_args().check)
