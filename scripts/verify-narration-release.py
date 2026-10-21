#!/usr/bin/env python3
"""Pin reviewed originals and fresh narration exports across future releases.

Hashes protect file identity; they do not substitute for listening approval.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify():
    manifest = json.loads((ROOT / 'docs/audio-quality/narration-release.json').read_text())
    seen = set()
    for item in manifest['files']:
        path = item['path']
        assert path not in seen, f'Duplicate narration path: {path}'
        seen.add(path)
        actual = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert actual == item['sha256'], f'Narration changed; review source and sound before updating hash: {path}'
        assert actual != item.get('rejected_sha256'), f'Rejected narration restored: {path}'
        if item['status'] == 'fresh export; listening review pending':
            assert item['post_processing'] == 'none', f'Unexpected audio processing: {path}'
            assert item['voice'] == 'chase' and item['model'] == 'simba-3.2', f'Unexpected voice: {path}'

    topics = {t['id']: t for t in json.loads((ROOT / 'guide/pool-audio-map.json').read_text())['topics']}
    for record in json.loads((ROOT / 'guide/recorded-audio.json').read_text())['records']:
        if record['page'] in ('Main', 'Shared'):
            topic = record['topic']
            topics[topic['id']] = {**topics.get(topic['id'], {}), **topic}
    tour = json.loads((ROOT / 'guide/get-started-tour.json').read_text())
    active = [*topics.values(), *tour['steps'], tour['completion']]
    for topic in active:
        audio = topic.get('audio', [])
        for url in [audio] if isinstance(audio, str) else audio:
            path = url.split('?')[0].removeprefix('./')
            assert path in seen, f'Active narration is missing provenance: {path}'
    print(f'Narration release verified: {len(seen)} pinned originals/exports; all active Main/Get Started clips covered.')


if __name__ == '__main__':
    verify()
