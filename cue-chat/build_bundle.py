"""Assemble the clean Cue Chat bundle from tracked files and a validated Trainer APK."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tempfile
import zipfile

SRC = Path(__file__).resolve().parent
TRAINER = 'd4f2d21c7674bd97354adce276889c4ea89ea160'

def build(output, apk=None, fixture=None):
    with tempfile.TemporaryDirectory(prefix='cue-chat-release-') as scratch:
        root = Path(scratch)/'Cue-Chat'
        root.mkdir()
        inputs=['START-HERE.txt','Start-Cue-Chat.cmd']
        for name in inputs:
            shutil.copyfile(SRC/name,root/name)
        shutil.copytree(SRC/'app',root/'app',ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
        dest=root/'app/public/trainer'
        dest.mkdir()
        assets = json.loads((SRC/'trainer-assets.json').read_text())
        (root/'app/TRAINER-SOURCE.json').write_text(json.dumps({
            'trainer_commit': TRAINER, 'bundled_files': len(assets),
            'note': 'Local coaching table renderer with its updater disabled.'}, indent=2)+'\n', encoding='utf-8')
        if len(assets)!=len(set(assets)):
            raise ValueError('Duplicate Trainer asset')
        fixture_root = 'Cue-Chat-Coaching-Speechify/public/trainer/'
        with zipfile.ZipFile(fixture) if fixture else tempfile.TemporaryFile() as pilot:
            for name in assets:
                path=PurePosixPath(name)
                if path.is_absolute() or '..' in path.parts or '\\' in name:
                    raise ValueError('Invalid Trainer asset path')
                target=dest/path
                target.parent.mkdir(parents=True,exist_ok=True)
                if fixture:
                    target.write_bytes(pilot.read(fixture_root+name))
                elif name=='app-updates.js':
                    target.write_text('/* Cue Chat local test copy: production/native updater intentionally disabled. */\n',encoding='utf-8')
                else:
                    target.write_bytes(subprocess.check_output(['git','show',f'{TRAINER}:{name}'],cwd=SRC))
        if not fixture:
            subprocess.run(['patch','--batch','--forward','-p0','-i',str(SRC/'trainer-index.patch')],cwd=dest,check=True)
        if apk:
            with zipfile.ZipFile(apk) as signed:
                assert 'AndroidManifest.xml' in signed.namelist()
                assert 'classes.dex' in signed.namelist()
            android=root/'Android'
            android.mkdir()
            target=android/'Billiards-Trainer-Cue-Chat.apk'
            shutil.copyfile(apk,target)
            sha=hashlib.sha256()
            with target.open('rb') as binary:
                for block in iter(lambda:binary.read(2**20),b''):
                    sha.update(block)
            (android/'SHA256.txt').write_text(sha.hexdigest()+'  '+target.name+'\n',encoding='ascii')
        (root/'Start-Cue-Chat.cmd').write_bytes((root/'Start-Cue-Chat.cmd').read_text().replace('\n','\r\n').encode('ascii'))
        output.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(output,'w') as archive:
            for f in sorted(root.rglob('*')):
                if f.is_file():
                    archive.write(f,f.relative_to(root.parent).as_posix(),compress_type=zipfile.ZIP_STORED if f.suffix=='.apk' else zipfile.ZIP_DEFLATED)
        with zipfile.ZipFile(output) as archive:
            assert archive.testzip() is None
            assert not any('/pilot-data/' in i or 'private-settings.bin' in i for i in archive.namelist())
        print(f'{output} ({output.stat().st_size:,} bytes)')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--android',type=Path)
    parser.add_argument('--fixture',type=Path,help='Existing pilot ZIP for offline validation only')
    args=parser.parse_args()
    if not args.android and not args.fixture:
        parser.error('The public bundle needs the validated Android APK.')
    build(args.output,args.android,args.fixture)
