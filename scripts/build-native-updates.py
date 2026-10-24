#!/usr/bin/env python3
"""Publish the HTTPS content-update inventory used by the native offline shells."""
import argparse, hashlib, json, runpy, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PROTOCOL = 1

def generate(check=False):
    files = runpy.run_path(str(ROOT/'scripts/package-windows-app.py'))['assets']()
    files.pop('native-updates.json', None)
    entries = {name: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'length': p.stat().st_size}
               for name, p in files.items()}
    payload = {'format': 1, 'minimumProtocol': PROTOCOL, 'files': entries}
    version = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    path = ROOT/'native-updates.json'
    old = json.loads(path.read_text()) if path.exists() else {}
    sequence = old.get('sequence') if old.get('version') == version else max(int(time.time()), old.get('sequence', 0)+1)
    manifest = {'format': 1, 'minimumProtocol': PROTOCOL, 'version': version, 'sequence': sequence, 'files': entries}
    text = json.dumps(manifest, indent=2)+'\n'
    if check:
        assert path.exists() and path.read_text() == text, 'Native update inventory is stale. Run scripts/build-offline-assets.py.'
    else:
        path.write_text(text, encoding='utf-8', newline='\n')
    print(f'Native updates: {len(entries)} files; release {version[:16]}, protocol {PROTOCOL}.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
