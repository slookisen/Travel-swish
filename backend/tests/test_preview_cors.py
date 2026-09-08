import httpx
import pytest
from app.config import cors_config
from app.main import app


@pytest.mark.anyio
@pytest.mark.parametrize('origin', ['http://127.0.0.1:4173', 'http://localhost:4173'])
async def test_preview_preflight_and_request_allowed(origin):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        response = await client.options('/recs/personalized', headers={
            'Origin': origin, 'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
        })
        assert response.status_code == 200
        assert response.headers['access-control-allow-origin'] == origin
        # Invalid request stops at validation, never contacts real providers.
        response = await client.post('/recs/personalized', headers={'Origin': origin}, json={})
        assert response.status_code == 422
        assert response.headers['access-control-allow-origin'] == origin


def test_explicit_cors_override_is_not_broadened(monkeypatch):
    monkeypatch.setenv('TS_CORS_ORIGINS', 'https://slookisen.github.io')
    origins, credentials = cors_config()
    assert origins == ['https://slookisen.github.io']
    assert credentials is True
