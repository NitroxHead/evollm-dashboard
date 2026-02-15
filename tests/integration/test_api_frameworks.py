"""Integration tests for backend.main — REST endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_frameworks_endpoint():
    """GET /api/frameworks returns list of registered framework metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/api/frameworks")

    assert resp.status_code == 200
    body = resp.json()
    assert "frameworks" in body
    frameworks = body["frameworks"]
    assert isinstance(frameworks, list)

    # Each entry should have the expected keys
    for fw in frameworks:
        assert "name" in fw
        assert "display_name" in fw
        assert "description" in fw
        assert "badge_color" in fw
        assert "badge_bg" in fw
        assert "change_detection" in fw


@pytest.mark.asyncio
async def test_health_endpoint():
    """GET /api/health returns status=ok and framework is a plain string."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/api/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "experiments_count" in body
    assert isinstance(body["experiments_count"], int)
    assert "experiments" in body
    assert isinstance(body["experiments"], list)

    # Each experiment's framework should be a plain string
    for exp in body["experiments"]:
        assert isinstance(exp["framework"], str)
        assert isinstance(exp["id"], str)
        assert isinstance(exp["name"], str)
