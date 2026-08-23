"""
Shared test fixtures for Nevika Cura backend tests.
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from server import app

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def staff_token(client):
    """Get a staff auth token for tests."""
    response = await client.post("/api/staff/login", json={
        "username": "staff_diagyn",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None

@pytest.fixture
async def doctor_token(client):
    """Get a doctor auth token for tests."""
    response = await client.post("/api/staff/login", json={
        "username": "dr_vikas",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None
