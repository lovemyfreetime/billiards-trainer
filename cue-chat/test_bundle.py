from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.request import urlopen

APP = Path(os.environ.get('CUE_CHAT_TEST_APP', Path(__file__).resolve().parent/'app')).resolve()
sys.path.insert(0,str(APP))
from dashboard import BUILD, android_address, configuration, has_listener, probe
from private_settings import read_settings, save_settings
from server import make_server

class BundleTests(unittest.TestCase):
    def test_configuration_keeps_credentials_out_of_command(self):
        cli, env = configuration(True,True,'fixture-one','fixture-two',inherited={})
        self.assertEqual(env['SPEECHIFY_API_KEY'],'fixture-one')
        self.assertEqual(env['OPENAI_API_KEY'],'fixture-two')
        self.assertIn('--coach-openai',cli)
        self.assertIn('--coach-speechify',cli)
        self.assertTrue(all('fixture' not in arg for arg in cli))
        with self.assertRaises(ValueError):
            configuration(cloud=True,inherited={})
        default, _=configuration(inherited={})
        self.assertNotIn('--coach-openai',default)

    def test_android_address_is_private_https(self):
        self.assertEqual(android_address('https://example.team.ts.net:9443'),'https://example.team.ts.net:9443/')
        self.assertEqual(android_address('HTTPS://EXAMPLE.TEAM.TS.NET:443/'),'https://example.team.ts.net/')
        for value in ['https://wrong.ts.net','http://example.team.ts.net','https://someone@host.team.ts.net','https://public.example','https://host.team.ts.net/api/','https://host.team.ts.net?token=x']:
            self.assertEqual(android_address(value),'')

    def test_other_copy_status(self):
        class OldHost(BaseHTTPRequestHandler):
            def do_GET(self):
                body=b'{"transport":"local-network","archive":"sqlite"}'
                self.send_response(200)
                self.end_headers()
                self.wfile.write(body)
        with ThreadingHTTPServer(('127.0.0.1',0), OldHost) as host:
            http=threading.Thread(target=host.serve_forever,daemon=True)
            http.start()
            try:
                self.assertEqual(probe(f'http://127.0.0.1:{host.server_port}/'),'Old Cue Chat copy')
            finally:
                host.shutdown()
                http.join(4)

    @unittest.skipUnless((APP/'public/trainer/guide/learning-catalog.json').is_file(),'run against the assembled bundle')
    def test_fresh_host_and_cache(self):
        with tempfile.TemporaryDirectory() as d:
            host = make_server(0,Path(d),'127.0.0.1')
            http=threading.Thread(target=host.serve_forever,daemon=True)
            http.start()
            base=f'http://127.0.0.1:{host.server_port}/'
            try:
                self.assertTrue(has_listener('127.0.0.1',host.server_port))
                self.assertEqual(probe(base),'Ready')
                with urlopen(base+'?bundle='+BUILD) as res:
                    html=res.read().decode()
                    self.assertEqual(res.headers['Cache-Control'],'no-store')
                    self.assertNotIn('Bring your people',html)
                    self.assertIn('data-no-room',html)
                    self.assertIn('?v=complete-20261126',html)
                with urlopen(base+'trainer/guide/learning-catalog.json') as res:
                    self.assertTrue(json.load(res))
                store=host.RequestHandlerClass.store
                with store.lock:
                    self.assertEqual(store.db.execute('select count(*) from profiles').fetchone()[0],0)
                    self.assertEqual(store.db.execute('select count(*) from messages').fetchone()[0],0)
            finally:
                host.shutdown()
                http.join(4)
                host.server_close()
                host.RequestHandlerClass.store.db.close()

    @unittest.skipUnless(os.name=='nt','requires Windows DPAPI')
    def test_real_user_scoped_encryption_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            file=Path(d)/'settings.bin'
            sample={'openai_key':'test-local-secret','android':'https://example.team.ts.net:9443/'}
            save_settings(file,sample)
            self.assertNotIn(b'test-local-secret',file.read_bytes())
            self.assertNotIn(b'example.team.ts.net',file.read_bytes())
            self.assertEqual(read_settings(file),sample)

if __name__=='__main__':
    unittest.main(verbosity=2)
