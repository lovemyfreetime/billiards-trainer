"""Optional Speechify audio for a player's own saved coaching replies."""
from collections import OrderedDict
from datetime import date
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener

from model_adapters import NoRedirect

BASE = 'https://api.speechify.ai'
MAX_AUDIO = 4 * 1024 * 1024
MAX_CATALOG = 3 * 1024 * 1024
VOICE_ID = re.compile(r'[A-Za-z0-9_-]{1,120}')
TURN_ID = re.compile(r'[A-Za-z0-9_-]{1,80}')


class VoiceProblem(Exception):
    def __init__(self, message, status=503):
        self.message, self.status = message, status


def speechify_request(key, path, payload=None, accept='application/json'):
    headers = {'Authorization':'Bearer '+key, 'Accept':accept}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    request = Request(BASE + path, None if payload is None else json.dumps(payload).encode(), headers)
    try:
        with build_opener(NoRedirect()).open(request, timeout=18) as response:
            limit = MAX_AUDIO if accept == 'audio/mpeg' else MAX_CATALOG
            data = response.read(limit + 1)
            if not data or len(data) > limit or response.headers.get_content_type() != accept:
                raise VoiceProblem('Speechify returned an empty, oversized, or unexpected response.')
    except HTTPError as error:
        messages = {401:'Speechify rejected this API key.',403:'This API key cannot use that Speechify resource.',
                    402:'Speechify audio usage is not available on this account.',
                    429:'Speechify is limiting requests. Try again later.'}
        raise VoiceProblem(messages.get(error.code,'Speechify could not complete the request.')) from None
    except (TimeoutError, OSError, URLError):
        raise VoiceProblem('Speechify did not respond. Your reply is still visible in chat.') from None
    if accept == 'audio/mpeg':
        return data
    try:
        return json.loads(data)
    except (UnicodeError, ValueError):
        raise VoiceProblem('Speechify returned an unreadable voice list.') from None


def speechify_voices(key, request=speechify_request):
    voices = {}
    cursor = None
    cursors = set()
    for _ in range(40):
        query = {'limit':100}
        if cursor:
            query['cursor'] = cursor
        reply = request(key, '/v1/voices?' + urlencode(query))
        items = reply.get('voices') if isinstance(reply,dict) else reply
        if not isinstance(items,list):
            raise VoiceProblem('Speechify returned an unreadable voice list.')
        for item in items:
            if not isinstance(item,dict):
                continue
            vid, name = item.get('id'), item.get('display_name')
            if isinstance(vid,str) and VOICE_ID.fullmatch(vid) and isinstance(name,str) and name.strip():
                voices[vid] = ' '.join(name.split())[:100]
        if isinstance(reply,list) or not reply.get('has_more'):
            return voices
        cursor = reply.get('next_cursor')
        if not isinstance(cursor,str) or not cursor or len(cursor)>1024 or cursor in cursors:
            break
        cursors.add(cursor)
    raise VoiceProblem('The Speechify catalogue did not finish. No voice was selected.')


def map_voice(voices, requested_id=''):
    if requested_id:
        if requested_id not in voices:
            raise VoiceProblem('The requested voice ID is not available to this Speechify API key.')
        return requested_id, voices[requested_id]
    matches = [vid for vid,name in voices.items() if name.casefold() == 'chase']
    if not matches:
        raise VoiceProblem('This API key does not list a voice named Chase. No other voice was selected.')
    if len(matches) > 1:
        raise VoiceProblem('This API key lists more than one Chase. Choose the exact voice ID.')
    return matches[0],voices[matches[0]]


class SpeechifyVoice:
    def __init__(self, key, voice_id, name, request=speechify_request):
        self.key, self.voice_id, self.name, self.request = key,voice_id,name,request

    def render(self, reply):
        return self.request(self.key, '/v1/audio/stream', {
            'input':reply, 'voice_id':self.voice_id, 'model':'simba-3.5'
        }, 'audio/mpeg')


class CoachAudio:
    def __init__(self, store, voice=None, daily_limit=20):
        self.store, self.voice, self.daily_limit = store,voice,daily_limit
        self.cache = OrderedDict()
        self.inflight = set()
        if voice:
            with store.lock, store.db:
                store.db.execute('CREATE TABLE IF NOT EXISTS private_coach_audio_budget(day TEXT PRIMARY KEY, used INTEGER NOT NULL)')

    def status(self):
        return {'provider':'Speechify','name':self.voice.name} if self.voice else None

    def play(self, profile, data):
        if set(data) != {'request_id'} or not isinstance(data.get('request_id'),str) or not TURN_ID.fullmatch(data['request_id']):
            raise VoiceProblem('Choose a saved coaching reply to play.',400)
        if not self.voice:
            raise VoiceProblem('Speechify is not connected. Playback is off.',409)
        key = (profile,data['request_id'])
        with self.store.lock:
            row = self.store.db.execute('SELECT reply FROM private_coach_turns WHERE profile=? AND request_id=?', key).fetchone()
            if not row:
                raise VoiceProblem('That coaching reply was not found.',404)
            if key in self.cache:
                self.cache.move_to_end(key)
                return self.cache[key]
            if key in self.inflight:
                raise VoiceProblem('That reply is already being prepared.',409)
            day = date.today().isoformat()
            used = self.store.db.execute('SELECT used FROM private_coach_audio_budget WHERE day=?',(day,)).fetchone()
            if used and used['used'] >= self.daily_limit:
                raise VoiceProblem('The pilot reached today’s Speechify limit. Previously prepared replies can still play.',429)
            with self.store.db:
                self.store.db.execute('''INSERT INTO private_coach_audio_budget VALUES(?,1)
                  ON CONFLICT(day) DO UPDATE SET used=used+1''',(day,))
            self.inflight.add(key)
        try:
            audio = self.voice.render(row['reply'])
            if not isinstance(audio,bytes) or not 0 < len(audio) <= MAX_AUDIO:
                raise VoiceProblem('Speechify returned unusable audio.')
            with self.store.lock:
                self.cache[key] = audio
                if len(self.cache) > 12:
                    self.cache.popitem(last=False)
            return audio
        finally:
            with self.store.lock:
                self.inflight.discard(key)
