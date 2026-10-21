#!/usr/bin/env python3
"""Install approved Resources scripts and original, unprocessed Chase exports."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/audio-quality/resources-scripts.json'
def read(path): return json.loads(path.read_text())
def write(path, value): path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
def sha(value): return hashlib.sha256(value).hexdigest()

def metadata():
    source = read(SOURCE)
    records = read(ROOT / 'guide/recorded-audio.json')
    old = {r['topic']['id']: r for r in records['records']}
    channel = 'https://www.youtube.com/channel/UCYuUos0iwnvdBL8URuNvrNA'
    jasmin = 'https://www.youtube.com/@jasminouschanbilliards'
    urls = [None, channel, 'https://www.youtube.com/watch?v=5_mC1ZePXpA', 'https://www.youtube.com/watch?v=Cya-0vjQ_7Y', 'https://www.youtube.com/watch?v=V0dAZInUiTE', 'https://www.youtube.com/watch?v=UcTAFFQOHm0', jasmin,
            'https://www.youtube.com/playlist?list=PL8jlzslqlw23IBD-3aEHjGGSR4Y5dDVu0', 'https://www.youtube.com/playlist?list=PL8jlzslqlw20WTSk5e08eq1YmKC-bnv7l', 'https://www.youtube.com/playlist?list=PL8jlzslqlw2352xBeHGrzzKmbJkYGe5A4']
    summaries = ['Two recommended instructors, with practical ways to connect their teaching to your own practice.', 'Browse the broader lesson collection by the part of your game you want to develop.', 'Study cue-ball control before adding side spin.', 'Plan the angle and position needed for the following shot.', 'Examine shot order and the connections through a pattern.', 'Compare offensive choices with useful defensive leaves.', 'Browse instruction, training ideas, and equipment discussions.', 'Develop the physical delivery behind a repeatable shot.', 'Explore shot choices and practical skills for different situations.', 'Understand equipment choices and the questions worth asking.']
    for i, item in enumerate(source['records']):
        record = old.get(item['id'])
        if record is None:
            record = dict(page='Main', kind='Recommendation', targets=['Guide > Resources > Jasmin Ouschan'], topic={})
            records['records'].append(record)
        topic = record['topic']
        topic.update(id=item['id'], title=item['title'], text=item['text'], summary=summaries[i], category='more', level=0, recordingStatus='recorded', explorerOnly=False)
        audio = ROOT / 'guide/audio' / (item['id'] + '.mp3')
        version = sha(audio.read_bytes())[:12] if audio.exists() else source['version']
        topic['audio'] = './guide/audio/' + item['id'] + '.mp3?v=' + version
        if i:
            topic['group'] = 'Tor Lowry · Zero-X Billiards' if i < 6 else 'Jasmin Ouschan · Billiards Explained'
            topic['guideOrder'] = i - 1
            topic['resourceKind'] = 'Channel' if i in (1, 6) else 'Playlist' if i > 6 else 'Video'
            topic['resourceUrl'] = urls[i]
            topic['resources'] = [dict(title=item['title'], url=urls[i])]
            if i == 1:
                topic['resources'].append(dict(title='Zero-X official free lessons', url='https://www.zerox-billiards.com/free-pool-lessons', action='Free Lessons'))
        else:
            topic['categoryWelcome'] = True
    write(ROOT / 'guide/recorded-audio.json', records)
    pool = read(ROOT / 'guide/pool-audio-map.json')
    pool['curriculum']['more'] = [dict(title='Tor Lowry · Zero-X Billiards', topics=[r['id'] for r in source['records'][1:6]]), dict(title='Jasmin Ouschan · Billiards Explained', topics=[r['id'] for r in source['records'][6:]])]
    write(ROOT / 'guide/pool-audio-map.json', pool)

def install(exports_path):
    source = read(SOURCE)
    exports = {r['id']: Path(r['path'].replace('/home/oai/share/', '/workspace/scratch/', 1)) for r in read(exports_path)}
    assert set(exports) == {r['id'] for r in source['records']}, 'All ten original exports are required'
    manifest_path = ROOT / 'docs/audio-quality/narration-release.json'
    manifest = read(manifest_path)
    pinned = {r['path']: r for r in manifest['files']}
    receipts = []
    for item in source['records']:
        original = exports[item['id']]
        assert original.is_file() and original.stat().st_size > 1000, str(original)
        path = 'guide/audio/' + item['id'] + '.mp3'
        prior = pinned.get(path, {})
        receipt = dict(path=path, sha256=sha(original.read_bytes()), status='fresh export; listening review pending', provider='Speechify Speech playground', voice='chase', model='simba-3.2', native_prosody_rate_percent=0, playback_rate=1, post_processing='none', script_sha256=sha(item['text'].encode()))
        if prior.get('rejected_sha256'): receipt['rejected_sha256'] = prior['rejected_sha256']
        shutil.copyfile(original, ROOT / path)
        assert sha((ROOT / path).read_bytes()) == receipt['sha256'], 'Export bytes changed'
        pinned[path] = receipt
        receipts.append(receipt)
    manifest['files'] = sorted(pinned.values(), key=lambda r: r['path'])
    manifest['counts'] = {'fresh': sum(r['status'] == 'fresh export; listening review pending' for r in pinned.values()), 'approved_replacements': sum(r['status'] == 'user-approved pre-stretch original' for r in pinned.values()), 'unchanged': sum(r['status'] != 'fresh export; listening review pending' and r['status'] != 'user-approved pre-stretch original' for r in pinned.values())}
    write(manifest_path, manifest)
    write(ROOT / 'docs/audio-quality/resources-recordings.json', dict(voice='chase', model='simba-3.2', native_prosody_rate_percent=0, playback_rate=1, post_processing='none', records=receipts))
    metadata()
    cues_path = ROOT / 'guide/narration-cues.json'
    cues = read(cues_path)
    for item in source['records']: cues['tracks'].pop(item['id'] + '.mp3', None)
    write(cues_path, cues)
    print('Installed ten original Chase exports, matching scripts, Resources metadata and provenance.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('exports', type=Path)
    install(parser.parse_args().exports)
