#!/usr/bin/env python3
"""Cue Chat 0.1: local-network test host. Python standard library only."""
import argparse
import base64
import hashlib
import io
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
import uuid
import zipfile
from companion import Companion, configured_gateway
from coach_audio import CoachAudio, SpeechifyVoice, VoiceProblem, map_voice, speechify_voices
from private_coach import CoachProblem, PrivateCoach, local_ollama_coach, openai_coach

ROOT = Path(__file__).resolve().parent
MAX_FILE = 30 * 1024 * 1024
MAX_BODY = 43 * 1024 * 1024
ALLOWED_MEDIA = {'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4',
                 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
                 'audio/ogg', 'application/json'}


class Problem(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def uid():
    return uuid.uuid4().hex


def text(value, length=4000):
    if not isinstance(value, str) or len(value) > length:
        raise Problem('This text is too long or has an invalid format.')
    return value.strip()


def validate_layout(value):
    if not isinstance(value, dict) or value.get('format') != 'billiards-trainer' or value.get('version') != 1:
        raise Problem('Choose a version 1 Billiards Trainer layout or session file.')
    layout = value.get('layout', {})
    balls = layout.get('balls')
    if not isinstance(balls, list) or len(balls) > 100:
        raise Problem('The table has an invalid ball list.')
    try:
        length, width, radius = (float(layout[k]) for k in ('tableL', 'tableW', 'ballR'))
        if not (.2 < length < 20 and .2 < width < 20 and .005 < radius < min(length, width) / 4):
            raise ValueError()
        ids = set()
        for b in balls:
            n = b['id']
            if type(n) is not int or n in ids or not (n >= 1000 if b.get('marker') else 0 <= n <= 15):
                raise ValueError()
            ids.add(n)
            for axis in ('x', 'y'):
                f = float(b[axis])
                if not (-20 < f < 20):
                    raise ValueError()
        json.dumps(value, allow_nan=False)
    except (ValueError, TypeError, KeyError, OverflowError):
        raise Problem('The layout contains invalid table or ball coordinates.')
    return value


class Store:
    def __init__(self, path, companion_model=None, *, private_coaching=False, coach_provider=None, speechify_voice=None):
        self.path = Path(path)
        self.path.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(self.path / 'cue-chat.sqlite3', check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY, name TEXT NOT NULL, invite TEXT UNIQUE NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS members(room TEXT REFERENCES rooms(id), profile TEXT REFERENCES profiles(id), PRIMARY KEY(room,profile));
        CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL, sha256 TEXT NOT NULL, layout TEXT);
        CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, room TEXT NOT NULL REFERENCES rooms(id), profile TEXT, author TEXT NOT NULL, body TEXT NOT NULL, created REAL NOT NULL, attachment TEXT REFERENCES attachments(id), reply_to TEXT, client_id TEXT);
        CREATE UNIQUE INDEX IF NOT EXISTS message_dedupe ON messages(profile,client_id) WHERE client_id IS NOT NULL;
        ''')
        self.db.commit()
        self.companion = Companion(self, companion_model)
        self.private_coach = PrivateCoach(self, ROOT, coach_provider) if private_coaching else None
        self.coach_audio = CoachAudio(self, speechify_voice) if private_coaching else None

    def profile(self, token):
        p = self.db.execute('SELECT id,name FROM profiles WHERE token=?', (token,)).fetchone()
        if not p:
            raise Problem('Choose your player profile to continue.', 401)
        return dict(p)

    def member(self, room, profile):
        r = self.db.execute('SELECT r.* FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.profile=?', (room, profile)).fetchone()
        if not r:
            raise Problem('Join this conversation before opening it.', 403)
        return dict(r)

    def create_profile(self, name):
        name = text(name, 40)
        if not name:
            raise Problem('Enter a name for your player profile.')
        p = {'id': uid(), 'token': secrets.token_urlsafe(32), 'name': name}
        with self.lock, self.db:
            self.db.execute('INSERT INTO profiles VALUES(:id,:token,:name)', p)
        return p

    def create_room(self, profile, name):
        r = {'id': uid(), 'name': text(name, 70) or 'Practice together', 'invite': secrets.token_urlsafe(7), 'created': time.time()}
        with self.lock, self.db:
            self.db.execute('INSERT INTO rooms VALUES(:id,:name,:invite,:created)', r)
            self.db.execute('INSERT INTO members VALUES(?,?)', (r['id'], profile))
        return r

    def join(self, profile, invite):
        invite = text(invite, 200).split('join=')[-1].split('&')[0].strip()
        with self.lock, self.db:
            r = self.db.execute('SELECT * FROM rooms WHERE invite=?', (invite,)).fetchone()
            if not r:
                raise Problem('That invitation was not found. Check the code or link.')
            self.db.execute('INSERT OR IGNORE INTO members VALUES(?,?)', (r['id'], profile))
        return dict(r)

    def rooms(self, profile):
        return [dict(r) for r in self.db.execute('''SELECT r.*,
          (SELECT body FROM messages WHERE room=r.id ORDER BY rowid DESC LIMIT 1) AS last_body,
          (SELECT COUNT(*) FROM messages WHERE room=r.id) AS message_count
          FROM rooms r JOIN members m ON m.room=r.id WHERE m.profile=? ORDER BY r.created DESC''', (profile,))]

    def state(self, room, profile, after=0):
        r = self.member(room, profile)
        members = [dict(x) for x in self.db.execute('SELECT p.id,p.name FROM profiles p JOIN members m ON p.id=m.profile WHERE m.room=? ORDER BY p.rowid', (room,))]
        messages = []
        for row in self.db.execute('''SELECT m.rowid AS seq,m.*,a.name AS file_name,a.mime,a.layout,a.sha256,
          EXISTS(SELECT 1 FROM companion_messages c WHERE c.message_id=m.id) AS is_companion,
          length(a.data) AS size FROM messages m LEFT JOIN attachments a ON a.id=m.attachment
          WHERE m.room=? AND m.rowid>? ORDER BY m.rowid LIMIT 100''', (room, after)):
            m = dict(row)
            if m['layout']:
                m['layout'] = json.loads(m['layout'])
            messages.append(m)
        return {'room': r, 'members': members, 'messages': messages,
                'companion': self.companion.status(room),
                'shared_lessons': self.companion.memories(room)[-20:]}

    def prepare_attachment(self, a):
        if not a:
            return None
        if not isinstance(a, dict):
            raise Problem('Invalid attachment.')
        name = text(a.get('name', ''), 180)
        mime = a.get('mime', '')
        if not name or mime not in ALLOWED_MEDIA:
            raise Problem('Attach a Trainer JSON file, picture, audio file or MP4/WebM video.')
        try:
            data = base64.b64decode(a.get('base64', ''), validate=True)
        except (ValueError, TypeError):
            raise Problem('The attachment could not be read.')
        if not data or len(data) > MAX_FILE:
            raise Problem('Choose a nonempty attachment smaller than 30 MB.')
        layout = None
        if mime == 'application/json':
            if len(data) > 2000000:
                raise Problem('Trainer layout files must be smaller than 2 MB.')
            try:
                layout = validate_layout(json.loads(data))
            except (ValueError, UnicodeDecodeError):
                raise Problem('The Trainer file is not valid JSON.')
        return {'id': uid(), 'name': name, 'mime': mime, 'data': data,
                'sha256': hashlib.sha256(data).hexdigest(), 'layout': json.dumps(layout) if layout else None}

    def send(self, room, profile, body, attachment=None, reply_to=None, client_id=None):
        self.member(room, profile['id'])
        body = text(body)
        if not body and not attachment:
            raise Problem('Write a message or add an attachment.')
        client_id = text(client_id or uid(), 100)
        with self.lock:
            old = self.db.execute('SELECT id,room FROM messages WHERE profile=? AND client_id=?', (profile['id'], client_id)).fetchone()
            if old:
                if old['room'] != room:
                    raise Problem('This send request belongs to another conversation.')
                return {'id': old['id'], 'saved': True, 'duplicate': True}
            if reply_to and not self.db.execute('SELECT 1 FROM messages WHERE id=? AND room=?', (reply_to, room)).fetchone():
                raise Problem('The message you are replying to is not in this conversation.')
            a = self.prepare_attachment(attachment)
            m = {'id': uid(), 'room': room, 'profile': profile['id'], 'author': profile['name'], 'body': body,
                 'created': time.time(), 'attachment': a['id'] if a else None, 'reply_to': reply_to, 'client_id': client_id}
            with self.db:
                if a:
                    self.db.execute('INSERT INTO attachments VALUES(:id,:name,:mime,:data,:sha256,:layout)', a)
                self.db.execute('INSERT INTO messages VALUES(:id,:room,:profile,:author,:body,:created,:attachment,:reply_to,:client_id)', m)
            return {'id': m['id'], 'saved': True, 'duplicate': False}

    def attachment(self, attachment_id, profile):
        row = self.db.execute('''SELECT a.* FROM attachments a JOIN messages m ON m.attachment=a.id
          JOIN members mem ON mem.room=m.room WHERE a.id=? AND mem.profile=? LIMIT 1''', (attachment_id, profile)).fetchone()
        if not row:
            raise Problem('Attachment not found in your conversations.', 404)
        return dict(row)

    def export(self, room, profile):
        r = self.member(room, profile)
        rows = [dict(m) for m in self.db.execute('''SELECT m.*,
          EXISTS(SELECT 1 FROM companion_messages c WHERE c.message_id=m.id) AS is_companion
          FROM messages m WHERE room=? ORDER BY m.rowid''', (room,))]
        manifest = {'format': 'cue-chat-archive', 'version': 1, 'room': r['name'], 'exported_at': time.time(), 'messages': rows, 'attachments': [],
                    'shared_lessons': self.companion.memories(room, all_versions=True),
                    'conversation_kind': self.companion.kind(room)}
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for aid in dict.fromkeys(m['attachment'] for m in rows if m['attachment']):
                a = dict(self.db.execute('SELECT * FROM attachments WHERE id=?', (aid,)).fetchone())
                data = a.pop('data')
                a['path'] = 'attachments/' + aid
                z.writestr(a['path'], data)
                manifest['attachments'].append(a)
            z.writestr('conversation.json', json.dumps(manifest, ensure_ascii=False, allow_nan=False, indent=2))
        return out.getvalue()

    def restore_archive(self, profile, encoded):
        try:
            raw = base64.b64decode(encoded, validate=True)
            if len(raw) > MAX_BODY:
                raise Problem('This archive is too large for this test build.')
            z = zipfile.ZipFile(io.BytesIO(raw))
            if sum(x.file_size for x in z.infolist()) > 250 * 1024 * 1024:
                raise Problem('This archive expands beyond the test build limit.')
            v = json.loads(z.read('conversation.json'))
            if v.get('format') != 'cue-chat-archive' or v.get('version') != 1:
                raise Problem('Choose a Cue Chat version 1 conversation archive.')
            ms, ats = v['messages'], v['attachments']
            if len(ms) > 10000 or len(ats) > 1000:
                raise Problem('This archive exceeds the test build limit.')
            prepared, idmap = {}, {m['id']: uid() for m in ms}
            for a in ats:
                data = z.read(a['path'])
                if hashlib.sha256(data).hexdigest() != a['sha256']:
                    raise Problem('An attachment failed its archive integrity check.')
                prepared[a['id']] = self.prepare_attachment({'name': a['name'], 'mime': a['mime'], 'base64': base64.b64encode(data).decode()})
            for m in ms:
                text(m['body']); text(m['author'], 40)
                if m.get('attachment') and m['attachment'] not in prepared:
                    raise Problem('An archive attachment is missing.')
                stamp = float(m['created'])
                if not 0 < stamp < 1e12:
                    raise Problem('Invalid archived message date.')
            kind = v.get('conversation_kind', 'group')
            if kind not in ('group', 'direct'):
                raise Problem('Invalid archived conversation scope.')
            # Optional v1 extension: restore memory provenance and companion identity.
            lessons = v.get('shared_lessons', [])
            if not isinstance(lessons, list) or len(lessons) > 10000:
                raise Problem('Invalid shared lesson archive.')
            memory_ids, prepared_lessons = {}, []
            sources = {m['id']: m for m in ms}
            for lesson in lessons:
                old_id = lesson['id']
                if not isinstance(old_id, str) or old_id in memory_ids:
                    raise Problem('Invalid shared lesson identity.')
                topic, note = text(lesson['topic'], 120), text(lesson['note'], 1000)
                if not topic or not note:
                    raise Problem('A shared lesson is empty.')
                evidence = lesson['evidence']
                if not isinstance(evidence, list) or not 1 <= len(evidence) <= 5:
                    raise Problem('Invalid shared lesson evidence.')
                remapped = []
                for cite in evidence:
                    source = sources.get(cite['message_id'])
                    quote = text(cite['quote'], 4000)
                    if not source or source.get('is_companion') or not quote or quote not in source['body']:
                        raise Problem('A shared lesson has no matching human quotation.')
                    remapped.append({'message_id': idmap[cite['message_id']], 'quote': quote})
                supersedes = lesson.get('supersedes')
                if supersedes is not None and supersedes not in memory_ids:
                    raise Problem('A shared lesson correction is missing its earlier record.')
                stamp = float(lesson['created'])
                if not 0 < stamp < 1e12:
                    raise Problem('Invalid shared lesson date.')
                new_id = uid()
                prepared_lessons.append((new_id, topic, note, json.dumps(remapped), stamp, memory_ids.get(supersedes)))
                memory_ids[old_id] = new_id
            with self.lock, self.db:
                room = {'id': uid(), 'name': text(v['room'], 55) + ' · restored', 'invite': secrets.token_urlsafe(7), 'created': time.time()}
                self.db.execute('INSERT INTO rooms VALUES(:id,:name,:invite,:created)', room)
                self.db.execute('INSERT INTO members VALUES(?,?)', (room['id'], profile))
                self.db.execute('INSERT INTO conversation_scopes VALUES(?,?)', (room['id'], kind))
                for a in prepared.values():
                    self.db.execute('INSERT INTO attachments VALUES(:id,:name,:mime,:data,:sha256,:layout)', a)
                for m in ms:
                    self.db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,NULL)', (idmap[m['id']], room['id'], None, m['author'], m['body'], m['created'], prepared[m['attachment']]['id'] if m.get('attachment') else None, idmap.get(m.get('reply_to')),))
                    if m.get('is_companion'):
                        self.db.execute('INSERT INTO companion_messages VALUES(?)', (idmap[m['id']],))
                for lesson in prepared_lessons:
                    self.db.execute('INSERT INTO lesson_memories VALUES(?,?,?,?,?,?,?)', (lesson[0], room['id'], *lesson[1:]))
            return room
        except Problem:
            raise
        except (ValueError, KeyError, TypeError, zipfile.BadZipFile, UnicodeDecodeError):
            raise Problem('This is not a complete, valid Cue Chat archive.')


class Handler(SimpleHTTPRequestHandler):
    store = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)

    def log_message(self, fmt, *args):
        # Do not log invitation codes, bearer tokens, message bodies or attachment URLs.
        pass  # The dashboard log never records URL query parameters or app data.

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        if urlsplit(self.path).path in {'/', '/index.html', '/app.js', '/style.css', '/private-coach.js', '/private-coach.css'}:
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, value, status=200):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def auth(self):
        token = self.headers.get('Authorization', '').removeprefix('Bearer ')
        return self.store.profile(token)

    def body(self, max_body=MAX_BODY):
        n = int(self.headers.get('Content-Length', 0))
        if n < 0 or n > max_body:
            raise Problem('The upload is too large for this test build.', 413)
        try:
            value = json.loads(self.rfile.read(n))
            if not isinstance(value, dict):
                raise ValueError()
            return value
        except (ValueError, UnicodeDecodeError):
            raise Problem('The request is not valid JSON.')

    def do_GET(self):
        u = urlsplit(self.path)
        if not u.path.startswith('/api/'):
            return super().do_GET()
        try:
            with self.store.lock:
                if u.path == '/api/health':
                    return self.reply({'version': '0.5.2-dev', 'transport': 'local-network', 'email': False,
                                       'ai': self.store.companion.model is not None, 'archive': 'sqlite', 'bundle': 'cue-chat-complete-20261126', 'companion': self.store.companion.status()})
                p = self.auth()
                if u.path == '/api/me':
                    return self.reply({'profile': p, 'rooms': self.store.rooms(p['id'])})
                if u.path == '/api/private-coach':
                    return self.reply({**self.store.private_coach.state(p['id']), 'voice':self.store.coach_audio.status()})
                m = re.fullmatch(r'/api/rooms/([a-f0-9]{32})(/export)?', u.path)
                if m:
                    if m[2]:
                        data = self.store.export(m[1], p['id'])
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/zip')
                        self.send_header('Content-Disposition', 'attachment; filename="Cue-Chat-conversation.zip"')
                        self.send_header('Cache-Control', 'no-store')
                        self.send_header('Content-Length', str(len(data)))
                        self.end_headers(); self.wfile.write(data); return
                    return self.reply(self.store.state(m[1], p['id'], int(parse_qs(u.query).get('after', ['0'])[0])))
                m = re.fullmatch(r'/api/files/([a-f0-9]{32})', u.path)
                if m:
                    # Media elements cannot set Authorization; short-lived in-memory object URLs are used by the client.
                    a = self.store.attachment(m[1], p['id'])
                    self.send_response(200)
                    self.send_header('Content-Type', a['mime'])
                    self.send_header('Content-Length', str(len(a['data'])))
                    self.send_header('Content-Disposition', "attachment; filename*=UTF-8''" + __import__('urllib.parse', fromlist=['quote']).quote(a['name']))
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers(); self.wfile.write(a['data']); return
                raise Problem('Not found.', 404)
        except Problem as e:
            self.reply({'error': e.message}, e.status)
        except (ValueError, OverflowError):
            self.reply({'error': 'Invalid request.'}, 400)

    def do_POST(self):
        u = urlsplit(self.path)
        try:
            # Block cross-origin browser posts; this test host is for a trusted local network.
            origin = self.headers.get('Origin')
            if origin and urlsplit(origin).netloc != self.headers.get('Host'):
                raise Problem('Open Cue Chat directly on this test host.', 403)
            if u.path == '/api/private-coach':
                with self.store.lock:
                    p = self.auth()
                return self.reply(self.store.private_coach.ask(p['id'], self.body(262144)), 201)
            if u.path == '/api/private-coach/audio':
                with self.store.lock:
                    p = self.auth()
                audio = self.store.coach_audio.play(p['id'],self.body(4096))
                self.send_response(200)
                self.send_header('Content-Type','audio/mpeg')
                self.send_header('Content-Length',str(len(audio)))
                self.send_header('Cache-Control','no-store')
                self.end_headers()
                self.wfile.write(audio)
                return
            data = self.body()
            with self.store.lock:
                if u.path == '/api/profiles':
                    return self.reply(self.store.create_profile(data.get('name')), 201)
                p = self.auth()
                if u.path == '/api/rooms':
                    return self.reply(self.store.create_room(p['id'], data.get('name', '')), 201)
                if u.path == '/api/join':
                    return self.reply(self.store.join(p['id'], data.get('invite', '')))
                if u.path == '/api/restore':
                    return self.reply(self.store.restore_archive(p['id'], data.get('base64', '')), 201)
                m = re.fullmatch(r'/api/rooms/([a-f0-9]{32})/messages', u.path)
                if m:
                    saved = self.store.send(m[1], p, data.get('body', ''), data.get('attachment'), data.get('reply_to'), data.get('client_id'))
                    self.store.companion.schedule(m[1], saved['id'])
                    return self.reply(saved, 201)
                raise Problem('Not found.', 404)
        except (Problem, CoachProblem, VoiceProblem) as e:
            self.reply({'error': e.message}, e.status)
        except (ValueError, TypeError, OverflowError):
            self.reply({'error': 'Invalid request.'}, 400)


class CueChatServer(ThreadingHTTPServer):
    def server_close(self):
        super().server_close()
        self.RequestHandlerClass.store.companion.close()


def make_server(port=3000, data_dir=None, host='0.0.0.0', companion_model=None, *, coach_provider=None, speechify_voice=None):
    handler = type('CueChatHandler', (Handler,), {'store': Store(data_dir or ROOT / 'data', companion_model,
        private_coaching=True, coach_provider=coach_provider,speechify_voice=speechify_voice)})
    return CueChatServer((host, port), handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Cue Chat local test host')
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '3000')))
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--strictPort', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--open', action='store_true', help='Open Cue Chat in the default browser')
    parser.add_argument('--data', default=str(ROOT / 'data'))
    coach_options = parser.add_mutually_exclusive_group()
    coach_options.add_argument('--coach-ollama', action='store_true',
                        help='Use the already installed local Ollama model for private coaching')
    coach_options.add_argument('--coach-openai', action='store_true',
                        help='Explicitly enable OpenAI API for non-simulation coaching answers')
    parser.add_argument('--coach-speechify',action='store_true',help='Use Speechify instead of any browser voice')
    parser.add_argument('--speechify-voice-id',default=os.environ.get('SPEECHIFY_COACH_VOICE_ID',''),
                        help='Select an exact voice ID available to your Speechify API key')
    parser.add_argument('--list-speechify-voices',action='store_true',
                        help='List voice names and IDs without synthesizing speech')
    args = parser.parse_args()
    provider = local_ollama_coach() if args.coach_ollama else None
    if args.coach_openai:
        import getpass
        key = os.environ.get('OPENAI_API_KEY', '').strip()
        if not key and sys.stdin.isatty():
            key = getpass.getpass('OpenAI API key (hidden; kept only for this run): ').strip()
        if not key:
            parser.error('OpenAI mode needs an API key. Start without --coach-openai for preview mode.')
        provider = openai_coach(key, os.environ.get('CUECHAT_COACH_OPENAI_MODEL', 'gpt-6.2-sol'))
    speechify_voice = None
    if args.coach_speechify or args.list_speechify_voices:
        import getpass
        speechify_key = os.environ.get('SPEECHIFY_API_KEY','').strip()
        if not speechify_key and sys.stdin.isatty():
            speechify_key = getpass.getpass('Speechify API key (hidden; kept for this run): ').strip()
        if not speechify_key:
            parser.error('Enter a Speechify API key to check your available voices, or start the text-only pilot.')
        try:
            voices = speechify_voices(speechify_key)
            if args.list_speechify_voices:
                for voice_id, name in sorted(voices.items(),key=lambda item:item[1].casefold()):
                    print(f'{name}  |  {voice_id}')
                print(f'{len(voices)} available voice IDs. No speech was generated.')
                sys.exit(0)
            voice_id, voice_name = map_voice(voices,args.speechify_voice_id)
            speechify_voice = SpeechifyVoice(speechify_key,voice_id,voice_name)
            print(f'Speechify voice selected: {voice_name} ({voice_id}). No speech is generated until you play a reply.')
        except VoiceProblem as error:
            parser.error(error.message + ' Use the text-only launcher if you want to continue without voice.')
    server = make_server(args.port, args.data, args.host, configured_gateway(),
                         coach_provider=provider,speechify_voice=speechify_voice)
    print(f'Cue Chat 0.5.2-dev | http://localhost:{server.server_port}', flush=True)
    print('Local-network test. Companion gateway: ' + server.RequestHandlerClass.store.companion.status()['connection'] + '. Keep this window open.', flush=True)
    if args.open:
        import webbrowser
        threading.Timer(.5, lambda: webbrowser.open(f'http://localhost:{server.server_port}')).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        server.RequestHandlerClass.store.db.close()
