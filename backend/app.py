import os
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any

from backend.models import GameItem, MarketSettings
from backend.price_service import db
from backend.steam_service import fetch_live_tf2_key_price

app = FastAPI(title="Steam Keys Valuation & Arbitrage Dashboard", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

sync_status = {
    "is_syncing": False,
    "current": 0,
    "total": 0,
    "message": "Inactivo"
}

@app.get("/api/settings")
def get_settings():
    return db.settings

@app.get("/", response_class=FileResponse)
def get_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Steam Keys API is running. Coloca tu index.html en /frontend"}

@app.get("/table", response_class=FileResponse)
def get_table_view():
    table_path = os.path.join(FRONTEND_DIR, "table.html")
    if os.path.exists(table_path):
        return FileResponse(table_path)
    return {"message": "Vista de tabla no encontrada."}

@app.post("/api/settings")
def update_settings(settings: MarketSettings):
    db.update_settings(settings)
    return {"status": "ok", "settings": db.settings}

@app.post("/api/refresh-tf2")
def refresh_tf2_price():
    live_price, raw = fetch_live_tf2_key_price()
    db.settings.tf2_key_steam_price = live_price
    db.settings.tf2_key_cash_price = round(live_price * 0.80, 2)
    db._save_settings(db.settings)
    db.recalculate_all_offers()
    db.save_to_disk()
    return {
        "status": "ok",
        "live_price": live_price,
        "raw_text": raw,
        "settings": db.settings
    }

@app.get("/api/summary")
def get_summary():
    db.reload_from_disk()
    games = list(db.games.values())
    total_games = len(games)
    total_keys = sum(g.tf2_keys_offered for g in games)
    total_offer_steam = sum(g.offer_value_steam_eur or 0 for g in games)
    total_offer_cash = sum(g.offer_value_cash_eur or 0 for g in games)
    
    # Suma de valor suelo mínimo de todos los juegos
    total_floor_value = sum(g.floor_price_eur or g.ggdeals_current_keyshop or g.best_keyshop_price_eur or 0 for g in games)
    # Total dejado de ganar respecto al suelo
    total_loss = sum(g.seller_loss_eur for g in games if g.seller_loss_eur is not None and g.seller_loss_eur > 0)
    
    delisted_count = sum(1 for g in games if g.is_delisted_steam and not g.is_sold)
    sold_count = sum(1 for g in games if g.is_sold)
    available_count = total_games - sold_count
    massive_loss_count = sum(1 for g in games if (g.seller_loss_percent or 0) >= 40 and not g.is_sold)
    
    return {
        "total_games": total_games,
        "available_count": available_count,
        "sold_count": sold_count,
        "total_keys": round(total_keys, 2),
        "total_offer_steam_eur": round(total_offer_steam, 2),
        "total_offer_cash_eur": round(total_offer_cash, 2),
        "total_market_value_eur": round(total_floor_value, 2),
        "total_reseller_profit_eur": round(total_loss, 2),
        "delisted_count": delisted_count,
        "massive_margin_count": massive_loss_count,
        "tf2_steam_price": db.settings.tf2_key_steam_price,
        "tf2_cash_price": db.settings.tf2_key_cash_price
    }

@app.get("/api/games")
def get_games(
    search: Optional[str] = None,
    delisted_only: bool = False,
    min_tf2: Optional[float] = None,
    max_tf2: Optional[float] = None,
    sort_by: Optional[str] = Query("profit_desc", enum=["name_asc", "tf2_desc", "tf2_asc", "profit_desc", "profit_pct_desc", "market_price_desc", "steam_price_desc"])
):
    db.reload_from_disk()
    results = list(db.games.values())
    
    if search:
        s = search.lower()
        results = [g for g in results if s in g.name.lower()]
        
    if delisted_only:
        results = [g for g in results if g.is_delisted_steam]
        
    if min_tf2 is not None:
        results = [g for g in results if g.tf2_keys_offered >= min_tf2]
        
    if max_tf2 is not None:
        results = [g for g in results if g.tf2_keys_offered <= max_tf2]
        
    # Ordenación orientada al vendedor
    if sort_by == "name_asc":
        results.sort(key=lambda x: x.name.lower())
    elif sort_by == "tf2_desc":
        results.sort(key=lambda x: x.tf2_keys_offered, reverse=True)
    elif sort_by == "tf2_asc":
        results.sort(key=lambda x: x.tf2_keys_offered)
    elif sort_by in ["loss_desc", "profit_desc"]:
        # Mayor dinero dejado de ganar por el vendedor (€)
        results.sort(key=lambda x: (x.seller_loss_eur if x.seller_loss_eur is not None else -9999), reverse=True)
    elif sort_by in ["loss_pct_desc", "profit_pct_desc"]:
        # Mayor % de pérdida bajo el suelo de mercado
        results.sort(key=lambda x: (x.seller_loss_percent if x.seller_loss_percent is not None else -9999), reverse=True)
    elif sort_by == "loss_asc":
        # Tratos más favorables para el vendedor (menor pérdida o pago sobre suelo)
        results.sort(key=lambda x: (x.seller_loss_eur if x.seller_loss_eur is not None else 9999))
    elif sort_by == "floor_desc":
        # Suelo de mercado más alto
        results.sort(key=lambda x: (x.floor_price_eur or 0), reverse=True)
    elif sort_by == "steam_price_desc":
        results.sort(key=lambda x: (x.steam_store_price or x.ggdeals_current_official or 0), reverse=True)
        
    return results

@app.get("/api/games/{game_id}")
def get_game_detail(game_id: str):
    db.reload_from_disk()
    if game_id not in db.games:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return db.games[game_id]

@app.put("/api/games/{game_id}")
@app.post("/api/games/{game_id}")
@app.post("/api/games/{game_id}/update")
def update_game(game_id: str, payload: Dict[str, Any]):
    if game_id not in db.games:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    game = db.games[game_id]
    
    if "ggdeals_current_official" in payload:
        game.ggdeals_current_official = payload["ggdeals_current_official"]
    if "ggdeals_current_keyshop" in payload:
        game.ggdeals_current_keyshop = payload["ggdeals_current_keyshop"]
        game.best_keyshop_price_eur = payload["ggdeals_current_keyshop"]
    if "best_keyshop_price_eur" in payload:
        game.best_keyshop_price_eur = payload["best_keyshop_price_eur"]
    if "ggdeals_historical_official_low" in payload:
        game.ggdeals_historical_official_low = payload["ggdeals_historical_official_low"]
    if "ggdeals_historical_keyshop_low" in payload:
        game.ggdeals_historical_keyshop_low = payload["ggdeals_historical_keyshop_low"]
    if "steam_store_price" in payload:
        game.steam_store_price = payload["steam_store_price"]
    if "is_delisted_steam" in payload:
        game.is_delisted_steam = payload["is_delisted_steam"]
    if "delisted_reason" in payload:
        game.delisted_reason = payload["delisted_reason"]
    if "tf2_keys_offered" in payload and payload["tf2_keys_offered"] is not None:
        game.tf2_keys_offered = float(payload["tf2_keys_offered"])
        
    if "is_reviewed" in payload:
        game.is_reviewed = bool(payload["is_reviewed"])
    if "counter_increase_tf2" in payload and payload["counter_increase_tf2"] is not None:
        game.counter_increase_tf2 = float(payload["counter_increase_tf2"])
    if "is_sold" in payload:
        game.is_sold = bool(payload["is_sold"])
    if "sold_tf2_keys" in payload:
        game.sold_tf2_keys = float(payload["sold_tf2_keys"]) if payload["sold_tf2_keys"] is not None else None
    if "lot_name" in payload and payload["lot_name"] is not None:
        game.lot_name = str(payload["lot_name"]).strip() or "xMjalino"
    if "steam_app_id" in payload and payload["steam_app_id"]:
        game.steam_app_id = int(payload["steam_app_id"])
        game.steam_header_image = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{game.steam_app_id}/header.jpg"
        
    db.recalculate_game_offer(game)
    db.save_to_disk()
    return {"status": "ok", "game": game}

@app.post("/api/games/bulk-state")
def bulk_update_state(payload: Dict[str, Any]):
    """Permite guardar en masa aumentos de contraoferta y estados de revisado."""
    increases = payload.get("increases", {})
    reviewed = payload.get("reviewed", {})
    
    for game_id, game in db.games.items():
        if game_id in increases:
            val = increases[game_id]
            game.counter_increase_tf2 = float(val) if val is not None else 0.0
        if game_id in reviewed:
            game.is_reviewed = bool(reviewed[game_id])
            
    db.save_to_disk()
    return {"status": "ok", "count": len(db.games)}

async def background_sync_task():
    global sync_status
    sync_status["is_syncing"] = True
    sync_status["message"] = "Consultando Steam Store y GG.deals..."
    
    def on_progress(cur, tot):
        global sync_status
        sync_status["current"] = cur
        sync_status["total"] = tot
        sync_status["message"] = f"Escaneando juego {cur} de {tot} (Steam & GG.deals)..."
        
    try:
        await db.scan_all_games(on_progress=on_progress)
        sync_status["message"] = "Sincronización completada con éxito."
    except Exception as e:
        sync_status["message"] = f"Error en sincronización: {e}"
    finally:
        sync_status["is_syncing"] = False

@app.post("/api/games/add")
def add_game_by_url(payload: Dict[str, Any]):
    steam_url = payload.get("steam_url")
    if not steam_url:
        raise HTTPException(status_code=400, detail="Debe proporcionar la URL de Steam del juego.")
    tf2_keys = float(payload.get("tf2_keys_offered", 1.0))
    lot_name = str(payload.get("lot_name", "xMjalino")).strip() or "xMjalino"
    try:
        game = db.add_game_from_steam(steam_url=steam_url, tf2_keys_offered=tf2_keys, lot_name=lot_name)
        return {"status": "ok", "game": game}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al añadir juego: {str(e)}")

@app.post("/api/sync-steam")
def trigger_sync(background_tasks: BackgroundTasks):
    global sync_status
    if sync_status["is_syncing"]:
        return {"status": "already_running", "progress": sync_status}
    background_tasks.add_task(background_sync_task)
    return {"status": "started", "progress": sync_status}

@app.get("/api/sync-status")
def get_sync_status():
    return sync_status

# Servir archivos estáticos del frontend
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
