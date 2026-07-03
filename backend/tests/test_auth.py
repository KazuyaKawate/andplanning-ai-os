import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register
    reg_data = {
        "email": "test@example.com",
        "password": "securepassword",
        "display_name": "Test User"
    }
    response = await client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "test@example.com"
    assert "access_token" in data

    # Login
    login_data = {
        "email": "test@example.com",
        "password": "securepassword"
    }
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    token = data["access_token"]

    # Me (Protected)
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    response = await client.get("/api/dashboard")
    assert response.status_code == 401
