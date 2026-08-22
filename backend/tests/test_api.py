import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.init_db import init_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_database()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_api_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_summary(client):
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_games" in data
    assert "total_keys" in data
    assert "tf2_steam_price" in data
    assert data["total_games"] >= 0

def test_get_games(client):
    response = client.get("/api/games")
    assert response.status_code == 200
    games = response.json()
    assert isinstance(games, list)
    if len(games) > 0:
        first = games[0]
        assert "id" in first
        assert "name" in first
        assert "tf2_keys_offered" in first
        assert "lot_name" in first

def test_filter_delisted(client):
    response = client.get("/api/games?delisted_only=true")
    assert response.status_code == 200
    games = response.json()
    for g in games:
        assert g["is_delisted_steam"] is True

def test_filter_sold(client):
    response = client.get("/api/games?sold_only=true")
    assert response.status_code == 200
    games = response.json()
    for g in games:
        assert g["is_sold"] is True

def test_get_game_not_found(client):
    response = client.get("/api/games/non_existent_game_12345")
    assert response.status_code == 404

def test_bulk_state_update(client):
    res_games = client.get("/api/games")
    games = res_games.json()
    if len(games) > 0:
        target_id = games[0]["id"]
        payload = {
            "increases": {target_id: 0.50},
            "reviewed": {target_id: True}
        }
        res_bulk = client.post("/api/games/bulk-state", json=payload)
        assert res_bulk.status_code == 200
        
        # Verificar actualización
        res_detail = client.get(f"/api/games/{target_id}")
        assert res_detail.status_code == 200
        game = res_detail.json()
        assert game["counter_increase_tf2"] == 0.50
        assert game["is_reviewed"] is True
