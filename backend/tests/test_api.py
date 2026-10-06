import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import DATA_DIR
from backend.app.main import app
from backend.app.db.session import Base, get_db

REAL_DB = DATA_DIR / "steamtrades.db"
TEST_DB = DATA_DIR / "test_steamtrades_isolated.db"

def create_isolated_test_db():
    if TEST_DB.exists():
        try:
            os.remove(TEST_DB)
        except Exception:
            pass
    if REAL_DB.exists():
        src = sqlite3.connect(str(REAL_DB))
        src.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        dst = sqlite3.connect(str(TEST_DB))
        src.backup(dst)
        src.close()
        dst.close()

create_isolated_test_db()

TEST_DATABASE_URL = f"sqlite:///{TEST_DB}"
test_engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    yield
    test_engine.dispose()
    if TEST_DB.exists():
        try:
            os.remove(TEST_DB)
        except Exception:
            pass

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

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
        assert isinstance(first["id"], int)
        assert "name" in first
        assert "tf2_keys_offered" in first
        assert "buyer_name" in first

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

def test_sold_with_real_money_and_note(client):
    # Añadir un juego de test exclusivo
    res_add = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/220/Half_Life_2/",
        "tf2_keys_offered": 2.0,
        "buyer_name": "TestBuyerSold"
    })
    assert res_add.status_code == 200
    target_id = res_add.json()["game"]["id"]
    
    payload = {
        "is_sold": True,
        "sold_currency": "EUR",
        "sold_price": 4.50,
        "sold_note": "Pago Paypal"
    }
    res_update = client.post(f"/api/games/{target_id}", json=payload)
    assert res_update.status_code == 200
    
    # Verificar detalle
    res_detail = client.get(f"/api/games/{target_id}")
    assert res_detail.status_code == 200
    game = res_detail.json()
    assert game["is_sold"] is True
    assert game["sold_currency"] == "EUR"
    assert game["sold_price"] == 4.50
    assert game["sold_note"] == "Pago Paypal"
    
    # Limpiar juego de test
    client.delete(f"/api/games/{target_id}")

def test_bulk_state_update(client):
    # Añadir juego de test exclusivo
    res_add = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/280/Half_Life_Source/",
        "tf2_keys_offered": 1.0,
        "buyer_name": "TestBuyerBulk"
    })
    assert res_add.status_code == 200
    target_id = res_add.json()["game"]["id"]
    
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
    
    # Limpiar juego de test
    client.delete(f"/api/games/{target_id}")

def test_game_status_and_deletion(client):
    # Añadir un juego de prueba
    res_add = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/400/Portal/",
        "tf2_keys_offered": 1.25,
        "buyer_name": "TestBuyer"
    })
    assert res_add.status_code == 200
    added_game = res_add.json().get("game")
    game_id = added_game["id"]
    
    # 1. Cambiar a 'listed'
    res_listed = client.post(f"/api/games/{game_id}", json={"status": "listed"})
    assert res_listed.status_code == 200
    assert res_listed.json()["game"]["status"] == "listed"
    assert res_listed.json()["game"]["is_sold"] is False
    
    # 2. Cambiar a 'sold'
    res_sold = client.post(f"/api/games/{game_id}", json={"status": "sold", "sold_currency": "TF2", "sold_price": 1.5})
    assert res_sold.status_code == 200
    assert res_sold.json()["game"]["status"] == "sold"
    assert res_sold.json()["game"]["is_sold"] is True
    
    # 3. Eliminar juego
    res_del = client.delete(f"/api/games/{game_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "ok"
    
    # 4. Verificar 404 al consultar
    res_check = client.get(f"/api/games/{game_id}")
    assert res_check.status_code == 404

def test_games_display_and_fields_completeness(client):
    """Verifica que todos los juegos se muestren y devuelvan con la estructura de campos correcta."""
    response = client.get("/api/games")
    assert response.status_code == 200
    games = response.json()
    assert isinstance(games, list)
    assert len(games) > 0, "Debe haber al menos un juego en la base de datos"
    
    for game in games:
        # Validación de tipo de clave primaria (AppID entero de Steam)
        assert isinstance(game["id"], int), f"El ID del juego debe ser un entero (AppID): {game.get('name')}"
        assert game["id"] > 0, f"AppID debe ser positivo: {game['id']}"
        
        # Campos obligatorios de presentación
        assert "name" in game and isinstance(game["name"], str) and len(game["name"]) > 0
        assert "tf2_keys_offered" in game and isinstance(game["tf2_keys_offered"], (int, float))
        assert "buyer_name" in game and (game["buyer_name"] is None or isinstance(game["buyer_name"], str))
        assert "status" in game and game["status"] in ("pending", "listed", "sold", "issue", "archived")
        assert "is_delisted_steam" in game and isinstance(game["is_delisted_steam"], bool)
        assert "is_reviewed" in game and isinstance(game["is_reviewed"], bool)
        assert "counter_increase_tf2" in game and isinstance(game["counter_increase_tf2"], (int, float))

def test_multiple_offers_for_same_game(client):
    """Verifica que se pueden tener múltiples ofertas para el mismo AppID de Steam."""
    # Oferta 1
    res1 = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/620/Portal_2/",
        "offer_price": 1.5,
        "buyer_name": "BuyerOne"
    })
    assert res1.status_code == 200
    id1 = res1.json()["game"]["id"]
    
    # Oferta 2 (mismo juego, distinto comprador y oferta)
    res2 = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/620/Portal_2/",
        "offer_price": 2.0,
        "buyer_name": "BuyerTwo"
    })
    assert res2.status_code == 200
    id2 = res2.json()["game"]["id"]
    
    try:
        assert id1 != id2, "Las dos ofertas deben tener IDs únicos"
        
        detail1 = client.get(f"/api/games/{id1}").json()
        detail2 = client.get(f"/api/games/{id2}").json()
        
        assert detail1["buyer_name"] == "BuyerOne"
        assert detail1["offer_price"] == 1.5
        assert detail2["buyer_name"] == "BuyerTwo"
        assert detail2["offer_price"] == 2.0
    finally:
        client.delete(f"/api/games/{id1}")
        client.delete(f"/api/games/{id2}")

def test_issue_status_and_filtering(client):
    """Verifica el flujo completo de registro y filtrado de incidencias."""
    # 1. Crear juego temporal para prueba de incidencia
    res_add = client.post("/api/games/add", json={
        "steam_url": "https://store.steampowered.com/app/550/Left_4_Dead_2/",
        "tf2_keys_offered": 1.5,
        "buyer_name": "TestBuyerIssue"
    })
    assert res_add.status_code == 200
    game_id = res_add.json()["game"]["id"]
    
    try:
        # 2. Asignar estado Incidencia con nota explicativa
        payload_issue = {
            "status": "issue",
            "issue_note": "Clave duplicada / Error al canjear en cuenta de destino"
        }
        res_update = client.post(f"/api/games/{game_id}", json=payload_issue)
        assert res_update.status_code == 200
        game_data = res_update.json()["game"]
        assert game_data["status"] == "issue"
        assert game_data["issue_note"] == "Clave duplicada / Error al canjear en cuenta de destino"
        
        # 3. Comprobar que aparece en el filtro de incidencias
        res_filter = client.get("/api/games?status=issue")
        assert res_filter.status_code == 200
        issues_list = res_filter.json()
        matching = [g for g in issues_list if g["id"] == game_id]
        assert len(matching) == 1
        assert matching[0]["issue_note"] == "Clave duplicada / Error al canjear en cuenta de destino"
        
        # 4. Comprobar que el resumen /api/summary contabiliza la incidencia
        res_summary = client.get("/api/summary")
        assert res_summary.status_code == 200
        assert res_summary.json()["issue_count"] >= 1
    finally:
        # Limpieza: eliminar juego de prueba
        client.delete(f"/api/games/{game_id}")

def test_import_csv_endpoint(client):
    """Verifica el endpoint de importación CSV con la lógica de los 3 casos de estados."""
    # 1. Crear 3 juegos temporales
    res1 = client.post("/api/games/add", json={"steam_url": "https://store.steampowered.com/app/10/Counter-Strike/", "offer_price": 1.0, "buyer_name": "Buyer1"})
    res2 = client.post("/api/games/add", json={"steam_url": "https://store.steampowered.com/app/20/Team_Fortress_Classic/", "offer_price": 0.5, "buyer_name": "Buyer2"})
    res3 = client.post("/api/games/add", json={"steam_url": "https://store.steampowered.com/app/30/Day_of_Defeat/", "offer_price": 0.75, "buyer_name": "Buyer3"})
    
    id1 = res1.json()["game"]["id"]
    id2 = res2.json()["game"]["id"]
    id3 = res3.json()["game"]["id"]

    try:
        # 2. Simular importación de datos CSV
        import_payload = {
            "rows": [
                # Caso 1: Accepted = 1 -> Vendido
                {
                    "game_id": id1,
                    "game_name": "Counter-Strike",
                    "buyer": "Buyer1",
                    "offer": 1.0,
                    "counter_offer": 1.5,
                    "increment": 0.5,
                    "revised": True,
                    "accepted": True,
                    "sold_currency": "TF2",
                    "sold_price": 1.5
                },
                # Caso 2: Accepted = 0, Revised = 1 -> Tramitado con aumento
                {
                    "game_id": id2,
                    "game_name": "Team Fortress Classic",
                    "buyer": "Buyer2",
                    "offer": 0.5,
                    "counter_offer": 0.75,
                    "increment": 0.25,
                    "revised": True,
                    "accepted": False,
                    "sold_currency": "TF2",
                    "sold_price": None
                },
                # Caso 3: Accepted = 0, Revised = 0 -> Listado
                {
                    "game_id": id3,
                    "game_name": "Day of Defeat",
                    "buyer": "Buyer3",
                    "offer": 0.75,
                    "counter_offer": 0.75,
                    "increment": 0.0,
                    "revised": False,
                    "accepted": False,
                    "sold_currency": "TF2",
                    "sold_price": None
                }
            ]
        }
        res_import = client.post("/api/games/import-csv", json=import_payload)
        assert res_import.status_code == 200
        assert res_import.json()["status"] == "ok"
        assert res_import.json()["updated_count"] == 3

        # 3. Verificar Caso 1 (Vendido)
        d1 = client.get(f"/api/games/{id1}").json()
        assert d1["status"] == "sold"
        assert d1["is_sold"] is True
        assert d1["sold_price"] == 1.5
        assert d1["sold_note"] == "Importado CSV"
        assert d1["is_reviewed"] is True

        # 4. Verificar Caso 2 (Tramitado)
        d2 = client.get(f"/api/games/{id2}").json()
        assert d2["status"] == "pending"
        assert d2["is_sold"] is False
        assert d2["counter_increase_tf2"] == 0.25
        assert d2["is_reviewed"] is True

        # 5. Verificar Caso 3 (Listado)
        d3 = client.get(f"/api/games/{id3}").json()
        assert d3["status"] == "listed"
        assert d3["is_sold"] is False
        assert d3["counter_increase_tf2"] == 0.0
        assert d3["is_reviewed"] is False
    finally:
        # Limpieza
        client.delete(f"/api/games/{id1}")
        client.delete(f"/api/games/{id2}")
        client.delete(f"/api/games/{id3}")

def test_search_games_endpoint(client):
    response = client.get("/api/games/search?query=portal")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    if len(results) > 0:
        first = results[0]
        assert "app_id" in first
        assert "name" in first
        assert "tiny_image" in first

def test_inspect_game_endpoint(client):
    # Probar con AppID conocido (ej: 677160 We Were Here Too)
    response = client.get("/api/games/inspect?query=677160")
    assert response.status_code == 200
    data = response.json()
    assert data["app_id"] == 677160
    assert "name" in data
    assert "kinguin_url" in data
    assert "links" in data
    assert "steam" in data["links"]

def test_add_game_by_name_and_kinguin_presence(client):
    # Probar añadir juego pasando un nombre
    payload = {
        "query": "Portal 2",
        "offer_price": 1.5,
        "offer_currency": "TF2",
        "buyer_name": "KinguinTestBuyer"
    }
    response = client.post("/api/games/add", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    created = body["game"]
    offer_id = created["id"]
    try:
        assert created["buyer_name"] == "KinguinTestBuyer"
        assert "Portal 2" in created["name"]
        assert "kinguin_url" in created
        assert "kinguin_price_eur" in created
        assert created["kinguin_in_stock"] is not None
    finally:
        client.delete(f"/api/games/{offer_id}")


def test_sync_listed_status_endpoint(client):
    response = client.get("/api/games/sync-listed/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_syncing" in data
    assert "total" in data
    assert "current" in data
    assert "percent" in data
    assert "message" in data


def test_sync_listed_endpoint(client):
    response = client.post("/api/games/sync-listed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["started", "already_running", "ok"]
    if data["status"] == "started":
        assert "progress_url" in data
        assert "total_listed" in data

    res_alias = client.get("/api/sync/listed/status")
    assert res_alias.status_code == 200

def test_import_new_csv_offers_format(client):
    """Verifica la importación masiva de ofertas con el formato Game;Buyer;Offer;Currency cargándolas en 'En negociación'."""
    payload = {
        "rows": [
            {
                "game_name": "Wargame: Red Dragon",
                "buyer": "xMjalino",
                "offer": 3.33,
                "currency": "TF2"
            },
            {
                "game_name": "Passpartout: The Starving Artist",
                "buyer": "BuyerTest",
                "offer": 1.75,
                "currency": "EUR"
            }
        ]
    }
    res_import = client.post("/api/games/import-csv", json=payload)
    assert res_import.status_code == 200
    assert res_import.json()["status"] == "ok"
    assert res_import.json()["updated_count"] == 2

    # Consultar juegos en pending
    res_pending = client.get("/api/games?status=pending")
    assert res_pending.status_code == 200
    pending_list = res_pending.json()

    wargame = next((g for g in pending_list if "Wargame" in g["name"]), None)
    assert wargame is not None
    assert wargame["status"] == "pending"
    assert wargame["buyer_name"] == "xMjalino"
    assert wargame["offer_price"] == 3.33
    assert wargame["offer_currency"] == "TF2"

    passpartout = next((g for g in pending_list if "Passpartout" in g["name"]), None)
    assert passpartout is not None
    assert passpartout["status"] == "pending"
    assert passpartout["buyer_name"] == "BuyerTest"
    assert passpartout["offer_price"] == 1.75
    assert passpartout["offer_currency"] == "EUR"

    # Probar aceptar la oferta de Wargame (verde)
    res_accept = client.post(f"/api/games/{wargame['id']}", json={
        "status": "sold",
        "is_sold": True,
        "sold_price": wargame["offer_price"],
        "sold_currency": wargame["offer_currency"],
        "sold_note": "Oferta aceptada"
    })
    assert res_accept.status_code == 200
    assert res_accept.json()["game"]["status"] == "sold"
    assert res_accept.json()["game"]["is_sold"] is True

    # Probar descartar la oferta de Passpartout (rojo -> vuelve a listed)
    res_discard = client.post(f"/api/games/{passpartout['id']}", json={
        "status": "listed",
        "is_sold": False,
        "offer_price": 0.0,
        "counter_price": 0.0,
        "buyer_name": None
    })
    assert res_discard.status_code == 200
    assert res_discard.json()["game"]["status"] == "listed"
    assert res_discard.json()["game"]["buyer_name"] is None

    # Limpieza
    client.delete(f"/api/games/{wargame['id']}")
    client.delete(f"/api/games/{passpartout['id']}")

