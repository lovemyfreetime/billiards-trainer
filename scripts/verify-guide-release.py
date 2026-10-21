#!/usr/bin/env python3
"""Reject releases whose Windows, Android, and browser Guide content differs."""
import json,runpy,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def verify():
 runpy.run_path(str(ROOT/'scripts/build-offline-assets.py'))['generate'](check=True)
 with tempfile.TemporaryDirectory(prefix='billiards-guide-parity-') as directory:
  base=Path(directory);windows=base/'windows';android=base/'android'
  runpy.run_path(str(ROOT/'scripts/package-windows-app.py'))['build'](windows)
  runpy.run_path(str(ROOT/'scripts/package-android-app.py'))['build'](android)
  files=json.loads((ROOT/'offline-assets.json').read_text())['files']
  guide=[name for name in files if name.startswith('guide/')]
  for name in guide:
   expected=(ROOT/name).read_bytes()
   assert (windows/name).read_bytes()==expected, f'Windows differs: {name}'
   actual=(android/name).read_bytes()
   if name.endswith('.html'):actual=actual.replace(b'<script>window.BilliardsBundledAndroid=true;</script>',b'')
   assert actual==expected, f'Android differs: {name}'
  assert (android/'index.html').read_bytes().replace(b'<script>window.BilliardsBundledAndroid=true;</script>',b'')==(ROOT/'index.html').read_bytes()
  assert (windows/'index.html').read_bytes()==(ROOT/'index.html').read_bytes()
  print(f'Shared release verified: {len(guide)} Guide assets and Trainer entry match across browser, Windows and Android.')
if __name__=='__main__':verify()
