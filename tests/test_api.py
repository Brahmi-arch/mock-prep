"""API integration tests. Gemini is stubbed so tests never send API credentials."""
import io
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    import pytest
except ImportError:
    pytest = None
from fastapi.testclient import TestClient
import server

if pytest:
    @pytest.fixture
    def client(tmp_path,monkeypatch):
        monkeypatch.setattr(server, "DB_PATH", tmp_path / 'qa.sqlite3')
        monkeypatch.setattr(server, "STORAGE", tmp_path)
        monkeypatch.setattr(server, "GEMINI_KEY", "")
        server.init_db()
        with TestClient(server.app) as c:
            yield c

def register(client,email='student@example.test'):
    r=client.post('/api/auth/register',json={'name':'UI UX Student','email':email,'password':'secure-password-123'})
    assert r.status_code==200,r.text


def start(client,**extra):
    payload={'mode':'interview','topic':'UI/UX internship','difficulty':'Beginner','question_count':3,
             'consent':{'camera':True,'microphone':True,'screen':False,'record':True,'secondary':True},
             'checkin':{'energy':'High','feeling':'Nervous'}}
    payload.update(extra)
    r=client.post('/api/interviews',json=payload)
    assert r.status_code==200,r.text
    return r.json()['id']


def test_auth_session_report_export_delete(client):
    register(client)
    session=start(client)
    assert client.get('/api/me').json()['name']=='UI UX Student'
    assert client.get(f'/api/interviews/{session}').json()['checkin']=={'energy':'High','feeling':'Nervous'}
    assert client.post(f'/api/interviews/{session}/answer',json={'idx':0,'text':'First I conduct interviews and usability tests','duration':18}).status_code==200
    assert client.post(f'/api/interviews/{session}/event',json={'kind':'tab-hidden','detail':'Window hidden','elapsed':19}).status_code==200
    r=client.post(f'/api/interviews/{session}/report')
    assert r.status_code==200 and r.json()['origin']=='rule-based'
    detail=client.get(f'/api/interviews/{session}').json()
    assert detail['state']=='complete'
    assert len(detail['events'])==1
    assert len(detail['answers'])==1
    assert client.get(f'/api/interviews/{session}/export').headers['content-disposition'].startswith('attachment')
    assert client.delete(f'/api/interviews/{session}').status_code==200
    assert client.get(f'/api/interviews/{session}').status_code==404

def test_permissions_and_owner(client):
    register(client)
    session=start(client,consent={'camera':False,'microphone':False,'screen':False,'record':False,'secondary':False})
    assert client.post(f'/api/interviews/{session}/recording',files={'file':('x.webm',b'data','video/webm')}).status_code==403
    assert client.post(f'/api/interviews/{session}/checkin',files={'file':('p.jpg',b'fake','image/jpeg')}).status_code==403
    assert client.post(f'/api/interviews/{session}/invite').status_code==403
    client.post('/api/auth/logout')
    assert client.get(f'/api/interviews/{session}').status_code==401
    register(client,'different@example.test')
    assert client.get(f'/api/interviews/{session}').status_code==404

def test_recording_and_photo_and_invite(client):
    register(client)
    session=start(client)
    assert client.post(f'/api/interviews/{session}/recording',files={'file':('video.webm',b'fake-video-data','video/webm')}).status_code==200
    assert client.post(f'/api/interviews/{session}/checkin',files={'file':('photo.jpg',b'fake-photo','image/jpeg')}).status_code==200
    assert client.get(f'/api/interviews/{session}/media/recording').content==b'fake-video-data'
    assert client.get(f'/api/interviews/{session}/media/checkin').content==b'fake-photo'
    link=client.post(f'/api/interviews/{session}/invite')
    assert link.status_code==200 and '/second-camera?' in link.json()['url']
    assert client.delete(f'/api/interviews/{session}/recording').status_code==200
    assert client.get(f'/api/interviews/{session}').json()['has_recording'] is False

def test_mocked_gemini_generation_transcription_report(client,monkeypatch):
    async def fake_gemini(prompt,*,audio=None,mime='audio/webm'):
        if 'Transcribe ONLY' in prompt: return {'transcript':'I test with real people','audio_observations':['Possible background voice, uncertain']}
        if 'ONE concise relevant follow-up' in prompt: return {'question':'How did you recruit participants for usability testing?'}
        if 'Evaluate ONLY' in prompt: return {'overall':82,'scores':{'UX process':85},'summary':'Good explanation of testing.',
             'strengths':['Explained usability testing'],'improvements':['Use specific evidence'],'next_steps':['Practice one more case'],
             'question_feedback':[{'question':'Q','feedback':'Specific case needed'}],
             'disclaimer':'Transcript limited.'}
        return {'questions':['Tell me about your experience','Explain research','Describe a usability test']}
    monkeypatch.setattr(server,'GEMINI_KEY','fake-test-key')
    monkeypatch.setattr(server,'gemini',fake_gemini)
    register(client)
    session=start(client)
    data=client.get(f'/api/interviews/{session}').json()
    assert len(data['questions'])==3
    transcript=client.post(f'/api/interviews/{session}/transcribe/0',files={'file':('answer.webm',b'fake-audio','audio/webm')})
    assert transcript.status_code==200 and transcript.json()['transcript']=='I test with real people'
    assert 'audio_observations' in transcript.json()
    assert client.post(f'/api/interviews/{session}/answer',json={'idx':0,'text':transcript.json()['transcript'],'duration':18}).status_code==200
    q=client.post(f'/api/interviews/{session}/next/0')
    assert q.status_code==200 and 'participants' in q.json()['question']
    result=client.post(f'/api/interviews/{session}/report')
    assert result.status_code==200 and result.json()['report']['overall']==82
    assert client.get(f'/api/interviews/{session}').json()['report_origin']=='gemini'


if __name__ == "__main__":
    import tempfile, shutil
    from pathlib import Path

    class SimpleMonkeyPatch:
        def __init__(self):
            self.undo = []
        def setattr(self, obj, name, value):
            old = getattr(obj, name)
            self.undo.append((obj, name, old))
            setattr(obj, name, value)
        def cleanup(self):
            for obj, name, old in reversed(self.undo):
                setattr(obj, name, old)

    tests = [
        test_auth_session_report_export_delete,
        test_permissions_and_owner,
        test_recording_and_photo_and_invite,
        test_mocked_gemini_generation_transcription_report,
    ]
    for fn in tests:
        tmp_dir = Path(tempfile.mkdtemp())
        mp = SimpleMonkeyPatch()
        mp.setattr(server, 'DB_PATH', tmp_dir / 'qa.sqlite3')
        mp.setattr(server, 'STORAGE', tmp_dir)
        mp.setattr(server, 'GEMINI_KEY', '')
        server.init_db()
        with TestClient(server.app) as c:
            try:
                import inspect
                sig = inspect.signature(fn)
                if 'monkeypatch' in sig.parameters:
                    fn(c, mp)
                else:
                    fn(c)
                print(f"PASS: {fn.__name__}")
            finally:
                mp.cleanup()
                shutil.rmtree(tmp_dir, ignore_errors=True)
    print("All tests passed!")
