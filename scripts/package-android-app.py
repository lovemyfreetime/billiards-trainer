#!/usr/bin/env python3
"""Bundle the standard Android app, retaining its public HTTPS save-data origin."""
from pathlib import Path
import argparse,hashlib,json,re,runpy,shutil
ROOT=Path(__file__).resolve().parents[1]
def build(out):
 files=runpy.run_path(str(ROOT/'scripts/package-windows-app.py'))['assets']()
 if out.exists():shutil.rmtree(out)
 out.mkdir(parents=True)
 manifest={}
 for name,src in files.items():
  data=src.read_bytes()
  if name.endswith('.html'):
   text=data.decode('utf-8');flag='<script>window.BilliardsBundledAndroid=true;</script>'
   if re.search(r'<head(?:\s[^>]*)?>',text,re.I):text=re.sub(r'(<head(?:\s[^>]*)?>)',lambda m:m[0]+flag,text,count=1,flags=re.I)
   elif re.search(r'<!doctype[^>]*>',text,re.I):text=re.sub(r'(<!doctype[^>]*>)',lambda m:m[0]+flag,text,count=1,flags=re.I)
   else:text=flag+text
   data=text.encode('utf-8')
  target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  manifest[name]={'sha256':hashlib.sha256(data).hexdigest(),'length':len(data)}
 # A real HTTPS document can unregister an older worker; data documents cannot.
 bootstrap=b'<!doctype html><html><head><script>window.BilliardsBundledAndroid=true;</script><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{background:#090b0e;color:#eee;font:18px system-ui}body{display:grid;place-items:center;height:90vh}</style></head><body>Opening Billiards Trainer...</body></html>'
 (out/'__android_start__.html').write_bytes(bootstrap)
 manifest['__android_start__.html']={'sha256':hashlib.sha256(bootstrap).hexdigest(),'length':len(bootstrap)}
 (out/'app-manifest.json').write_text(json.dumps({'files':manifest},indent=2)+'\n',encoding='utf-8')
 print(f'Android app: {len(manifest)} files, {sum(v["length"] for v in manifest.values())/1048576:.1f} MiB; Zen, Trainer, Play, recordings and analysis included.')
 return manifest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'android-wrapper/app/build/generated/appAssets/app');build(p.parse_args().output)
