import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.game import Game
from backend.app.models.settings import MarketSettingsModel
from backend.app.schemas.game import (
    GameOut,
    GameUpdatePayload,
    MarketSummary,
    BulkStatePayload,
    AddGamePayload
)
from backend.app.services.steam_service import (
    fetch_steam_app_details,
    fetch_live_tf2_key_price,
    extract_app_id_from_url
)
from backend.app.services.price_service import (
    recalculate_game_offer,
    sync_single_game,
    clean_game_slug
)

router = APIRouter(prefix="/api", tags=["Steam Keys"])

sync_status = {
    "is_syncing": False,
    "current": 0,
    "total": 0,
    "message": "Inactivo"
}

@router.get("/summary", response_model=MarketSummary)
def get_summary(db: Session = Depends(get_db)):
    games = db.query(Game).all()
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    if not settings:
        settings = MarketSettingsModel()
        
    total_games = len(games)
    sold_count = sum(1 for g in games if g.is_sold)
    available_count = total_games - sold_count
    
    total_keys = sum(g.tf2_keys_offered for g in games)
    total_offer_steam = sum(g.offer_value_steam_eur or 0 for g in games)
    total_offer_cash = sum(g.offer_value_cash_eur or 0 for g in games)
    total_floor_value = sum(g.floor_price_eur or g.ggdeals_current_keyshop or g.best_keyshop_price_eur or 0 for g in games)
    total_loss = sum(g.seller_loss_eur for g in games if g.seller_loss_eur and g.seller_loss_eur > 0)
    
    delisted_count = sum(1 for g in games if g.is_delisted_steam and not g.is_sold)
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
        "tf2_steam_price": settings.tf2_key_steam_price,
        "tf2_cash_price": settings.tf2_key_cash_price
    }

@router.get("/games", response_model=List[GameOut])
def get_games(
    search: Optional[str] = None,
    delisted_only: bool = False,
    sold_only: bool = False,
    lot: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Game)
    
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(Game.name.ilike(s))
        
    if delisted_only:
        query = query.filter(Game.is_delisted_steam == True)
        
    if sold_only:
        query = query.filter(Game.is_sold == True)
        
    if lot:
        query = query.filter(Game.lot_name == lot)
        
    results = query.all()
    
    # Ordenación en memoria
    if sort_by == "name_asc":
        results.sort(key=lambda x: x.name.lower())
    elif sort_by == "tf2_desc":
        results.sort(key=lambda x: x.tf2_keys_offered, reverse=True)
    elif sort_by == "tf2_asc":
        results.sort(key=lambda x: x.tf2_keys_offered)
    elif sort_by == "loss_desc":
        results.sort(key=lambda x: (x.seller_loss_eur or 0), reverse=True)
    elif sort_by == "loss_asc":
        results.sort(key=lambda x: (x.seller_loss_eur or 0))
    elif sort_by == "floor_desc":
        results.sort(key=lambda x: (x.floor_price_eur or 0), reverse=True)
        
    return results

@router.post("/games/add", response_model=Dict[str, Any])
def add_game(payload: AddGamePayload, db: Session = Depends(get_db)):
    app_id = extract_app_id_from_url(payload.steam_url)
    if not app_id:
        raise HTTPException(status_code=400, detail="Debe proporcionar una URL o AppID válido de Steam.")
        
    details = fetch_steam_app_details(app_id)
    name = details.get("name") or f"Steam App {app_id}"
    game_id = clean_game_slug(name) or f"steam_{app_id}"
    
    # Verificar si ya existe
    existing = db.query(Game).filter(Game.id == game_id).first()
    if existing:
        existing.tf2_keys_offered = payload.tf2_keys_offered
        existing.lot_name = payload.lot_name or "xMjalino"
        game = existing
    else:
        game = Game(
            id=game_id,
            name=name,
            tf2_keys_offered=float(payload.tf2_keys_offered),
            steam_app_id=app_id,
            steam_header_image=details.get("header_image") or f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg",
            steam_store_price=details.get("price"),
            steam_is_free=details.get("is_free", False),
            is_delisted_steam=details.get("is_delisted", False),
            delisted_reason=details.get("reason"),
            steam_players_24h=details.get("players_24h"),
            lot_name=payload.lot_name or "xMjalino"
        )
        db.add(game)
        
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    sync_single_game(game, settings)
    db.commit()
    db.refresh(game)
    return {"status": "ok", "game": GameOut.model_validate(game).model_dump()}

@router.post("/games/bulk-state")
def bulk_update_state(payload: BulkStatePayload, db: Session = Depends(get_db)):
    for game_id, inc_val in payload.increases.items():
        g = db.query(Game).filter(Game.id == game_id).first()
        if g:
            g.counter_increase_tf2 = float(inc_val) if inc_val is not None else 0.0
            
    for game_id, rev_val in payload.reviewed.items():
        g = db.query(Game).filter(Game.id == game_id).first()
        if g:
            g.is_reviewed = bool(rev_val)
            
    db.commit()
    return {"status": "ok"}

@router.get("/games/{game_id}", response_model=GameOut)
def get_game_detail(game_id: str, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return game

@router.put("/games/{game_id}", response_model=Dict[str, Any])
@router.post("/games/{game_id}", response_model=Dict[str, Any])
@router.post("/games/{game_id}/update", response_model=Dict[str, Any])
def update_game(game_id: str, payload: GameUpdatePayload, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
        
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    
    if payload.tf2_keys_offered is not None:
        game.tf2_keys_offered = float(payload.tf2_keys_offered)
    if payload.best_keyshop_price_eur is not None:
        game.best_keyshop_price_eur = payload.best_keyshop_price_eur
        game.ggdeals_current_keyshop = payload.best_keyshop_price_eur
    if payload.ggdeals_current_official is not None:
        game.ggdeals_current_official = payload.ggdeals_current_official
    if payload.ggdeals_current_keyshop is not None:
        game.ggdeals_current_keyshop = payload.ggdeals_current_keyshop
        game.best_keyshop_price_eur = payload.ggdeals_current_keyshop
    if payload.ggdeals_historical_official_low is not None:
        game.ggdeals_historical_official_low = payload.ggdeals_historical_official_low
    if payload.ggdeals_historical_keyshop_low is not None:
        game.ggdeals_historical_keyshop_low = payload.ggdeals_historical_keyshop_low
        
    if payload.is_reviewed is not None:
        game.is_reviewed = payload.is_reviewed
    if payload.counter_increase_tf2 is not None:
        game.counter_increase_tf2 = payload.counter_increase_tf2
    if payload.is_sold is not None:
        game.is_sold = payload.is_sold
    if payload.sold_tf2_keys is not None:
        game.sold_tf2_keys = payload.sold_tf2_keys
    if payload.lot_name is not None:
        game.lot_name = payload.lot_name.strip() or "xMjalino"
    if payload.steam_app_id is not None and payload.steam_app_id > 0:
        game.steam_app_id = payload.steam_app_id
        game.steam_header_image = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{game.steam_app_id}/header.jpg"
        
    recalculate_game_offer(game, settings)
    db.commit()
    db.refresh(game)
    return {"status": "ok", "game": GameOut.model_validate(game).model_dump()}

async def run_sync_background():
    global sync_status
    sync_status["is_syncing"] = True
    sync_status["message"] = "Actualizando precios y datos..."
    
    from backend.app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
        live_key_price, _ = fetch_live_tf2_key_price()
        if live_key_price and settings:
            settings.tf2_key_steam_price = live_key_price
            settings.tf2_key_cash_price = round(live_key_price * 0.80, 2)
            db.commit()
            
        games = db.query(Game).all()
        total = len(games)
        processed = 0
        sync_status["total"] = total
        
        def worker(game_item: Game):
            nonlocal processed
            sync_single_game(game_item, settings)
            processed += 1
            sync_status["current"] = processed
            sync_status["message"] = f"Escaneando juego {processed} de {total}..."
            
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=5) as executor:
            tasks = [loop.run_in_executor(executor, worker, g) for g in games]
            await asyncio.gather(*tasks)
            
        db.commit()
        sync_status["message"] = "Sincronización completada con éxito."
    except Exception as e:
        sync_status["message"] = f"Error en sincronización: {str(e)}"
    finally:
        db.close()
        sync_status["is_syncing"] = False

@router.post("/sync-steam")
def trigger_sync(background_tasks: BackgroundTasks):
    global sync_status
    if sync_status["is_syncing"]:
        return {"status": "already_running", "progress": sync_status}
    background_tasks.add_task(run_sync_background)
    return {"status": "started", "progress": sync_status}

@router.get("/sync-status")
def get_sync_status():
    return sync_status
