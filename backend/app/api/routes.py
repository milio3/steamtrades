import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.game import Game
from backend.app.models.offer import Offer
from backend.app.models.settings import MarketSettingsModel
from backend.app.schemas.game import (
    GameOut,
    OfferOut,
    GameUpdatePayload,
    MarketSummary,
    BulkStatePayload,
    AddGamePayload,
    CsvImportPayload,
    CsvImportRow
)
from backend.app.services.steam_service import (
    fetch_steam_app_details,
    fetch_live_tf2_key_price,
    extract_app_id_from_url
)
from backend.app.services.price_service import (
    calculate_offer_metrics,
    sync_single_game
)

router = APIRouter(prefix="/api", tags=["Steam Keys"])

@router.get("/health", tags=["Health"])
def api_health_check():
    return {"status": "ok"}

sync_status = {
    "is_syncing": False,
    "current": 0,
    "total": 0,
    "message": "Inactivo"
}

def build_offer_out(offer: Offer, settings: Optional[MarketSettingsModel]) -> GameOut:
    """Combina la oferta con los metadatos de su juego y calcula las métricas al vuelo."""
    game = offer.game
    metrics = calculate_offer_metrics(offer, game, settings)
    
    app_id = offer.app_id
    game_name = game.name if game else f"App {app_id}"
    
    return GameOut(
        id=offer.id,
        app_id=app_id,
        name=game_name,
        buyer_name=offer.buyer_name,
        offer_price=offer.offer_price,
        offer_currency=offer.offer_currency or "TF2",
        tf2_keys_offered=offer.offer_price,
        counter_price=offer.counter_price or 0.0,
        counter_currency=offer.counter_currency or "TF2",
        counter_increase_tf2=offer.counter_price or 0.0,
        steam_app_id=app_id,
        steam_header_image=game.header_image if game else None,
        is_delisted_steam=bool(game.is_delisted) if game else False,
        delisted_reason=game.delisted_reason if game else None,
        steam_store_price=game.steam_price if game else None,
        steam_players_24h=game.steam_players_24h if game else None,
        offer_value_steam_eur=metrics["offer_value_steam_eur"],
        offer_value_cash_eur=metrics["offer_value_cash_eur"],
        ggdeals_current_official=game.ggdeals_official_current if game else None,
        ggdeals_current_keyshop=game.ggdeals_keyshop_current if game else None,
        ggdeals_current_keyshop_discount=game.ggdeals_keyshop_discount if game else None,
        ggdeals_best_deal=None,
        ggdeals_historical_official_low=game.ggdeals_official_hist_low if game else None,
        ggdeals_historical_official_time=game.ggdeals_official_hist_time if game else None,
        ggdeals_historical_keyshop_low=game.ggdeals_keyshop_hist_low if game else None,
        ggdeals_historical_keyshop_time=game.ggdeals_keyshop_hist_time if game else None,
        best_keyshop_price_eur=game.ggdeals_keyshop_current if game else None,
        best_keyshop_name=game.best_keyshop_name if game else None,
        floor_price_eur=metrics["floor_price_eur"],
        floor_price_source=metrics["floor_price_source"],
        seller_loss_eur=metrics["seller_loss_eur"],
        seller_loss_percent=metrics["seller_loss_percent"],
        reseller_profit_eur=metrics["reseller_profit_eur"],
        reseller_profit_percent=metrics["reseller_profit_percent"],
        deal_rating=metrics["deal_rating"],
        status=offer.status or "pending",
        is_reviewed=bool(offer.is_reviewed),
        is_sold=(offer.status == "sold"),
        sold_currency=offer.sold_currency or "TF2",
        sold_price=offer.sold_price,
        sold_note=offer.sold_note,
        issue_note=offer.issue_note
    )

@router.get("/summary", response_model=MarketSummary)
def get_summary(db: Session = Depends(get_db)):
    offers = db.query(Offer).all()
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    if not settings:
        settings = MarketSettingsModel()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    # Si nunca se ha guardado la fecha de cotización de TF2 o está vacía, la obtenemos y persistimos
    if not getattr(settings, "last_tf2_update", None):
        try:
            live_steam, live_cash = fetch_live_tf2_key_price()
            if live_steam:
                settings.tf2_key_steam_price = live_steam
                settings.tf2_key_cash_price = live_cash or round(live_steam * 0.80, 2)
                settings.last_tf2_update = datetime.now().strftime("%d/%m/%Y %H:%M")
                db.commit()
                db.refresh(settings)
            else:
                settings.last_tf2_update = datetime.now().strftime("%d/%m/%Y %H:%M")
                db.commit()
                db.refresh(settings)
        except Exception:
            pass
        
    cash_rate = settings.tf2_key_cash_price or 1.60
    
    total_games = len(offers)
    listed_count = sum(1 for o in offers if o.status == "listed")
    sold_count = sum(1 for o in offers if o.status == "sold")
    issue_count = sum(1 for o in offers if o.status == "issue")
    pending_count = sum(1 for o in offers if o.status == "pending" or not o.status)
    available_count = listed_count + pending_count
    
    # 1. Métricas Activas (excluyendo Vendidos e Incidencias)
    active_keys_tf2 = 0.0
    active_offer_cash = 0.0
    potential_profit_eur = 0.0
    
    # 2. Saldo Realizado de Ventas
    realized_sales_eur = 0.0
    
    # 3. Totales globales
    total_keys = 0.0
    total_offer_steam = 0.0
    total_offer_cash = 0.0
    total_floor_value = 0.0
    total_reseller_profit = 0.0
    delisted_count = 0
    
    for o in offers:
        m = calculate_offer_metrics(o, o.game, settings)
        curr = o.offer_currency or "TF2"
        is_active = o.status in ("pending", "listed") or not o.status
        
        # Oferta en TF2 global
        if curr == "TF2":
            total_keys += (o.offer_price or 0.0)
            
        total_offer_steam += (m["offer_value_steam_eur"] or 0.0)
        total_offer_cash += (m["offer_value_cash_eur"] or 0.0)
        total_floor_value += (m["floor_price_eur"] or 0.0)
        if m["reseller_profit_eur"] and m["reseller_profit_eur"] > 0:
            total_reseller_profit += m["reseller_profit_eur"]
            
        if o.game and o.game.is_delisted and o.status not in ("sold", "issue"):
            delisted_count += 1
            
        # Cálculo de Activos
        if is_active:
            if curr == "TF2":
                active_keys_tf2 += (o.offer_price or 0.0)
                active_offer_cash += ((o.offer_price or 0.0) * cash_rate)
            else:
                active_offer_cash += (o.offer_price or 0.0)
                
            # Beneficio potencial sobre suelo
            cost_cash = (o.offer_price * cash_rate) if curr == "TF2" else o.offer_price
            floor = m["floor_price_eur"]
            if floor is not None and floor > cost_cash:
                potential_profit_eur += (floor - cost_cash)
                
        # Cálculo de Ventas Realizadas
        if o.status == "sold":
            sold_curr = o.sold_currency or "TF2"
            price_val = o.sold_price if o.sold_price is not None else o.offer_price
            if sold_curr == "EUR":
                realized_sales_eur += (price_val or 0.0)
            else:
                realized_sales_eur += ((price_val or 0.0) * cash_rate)
            
    return {
        "total_games": total_games,
        "available_count": available_count,
        "sold_count": sold_count,
        "listed_count": listed_count,
        "pending_count": pending_count,
        "issue_count": issue_count,
        "active_keys_tf2": round(active_keys_tf2, 2),
        "active_offer_cash_eur": round(active_offer_cash, 2),
        "realized_sales_eur": round(realized_sales_eur, 2),
        "potential_profit_eur": round(potential_profit_eur, 2),
        "total_keys": round(total_keys, 2),
        "total_offer_steam_eur": round(total_offer_steam, 2),
        "total_offer_cash_eur": round(total_offer_cash, 2),
        "total_market_value_eur": round(total_floor_value, 2),
        "total_reseller_profit_eur": round(total_reseller_profit, 2),
        "delisted_count": delisted_count,
        "tf2_steam_price": settings.tf2_key_steam_price,
        "tf2_cash_price": settings.tf2_key_cash_price,
        "last_tf2_update": getattr(settings, "last_tf2_update", None)
    }

@router.get("/games", response_model=List[GameOut])
def get_games(
    search: Optional[str] = None,
    status: Optional[str] = None,
    delisted_only: bool = False,
    sold_only: bool = False,
    buyer: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    query = db.query(Offer).join(Game)
    
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(Game.name.ilike(s))
        
    if status:
        query = query.filter(Offer.status == status)
    elif sold_only:
        query = query.filter(Offer.status == "sold")
        
    if delisted_only:
        query = query.filter(Game.is_delisted == True)
        
    if buyer:
        query = query.filter(Offer.buyer_name == buyer)
        
    raw_offers = query.all()
    results = [build_offer_out(o, settings) for o in raw_offers]
    
    # Ordenación en memoria
    if sort_by == "name_asc":
        results.sort(key=lambda x: x.name.lower())
    elif sort_by == "tf2_desc":
        results.sort(key=lambda x: x.offer_price, reverse=True)
    elif sort_by == "tf2_asc":
        results.sort(key=lambda x: x.offer_price)
    elif sort_by == "loss_desc":
        results.sort(key=lambda x: (x.reseller_profit_eur or 0), reverse=True)
    elif sort_by == "loss_asc":
        results.sort(key=lambda x: (x.reseller_profit_eur or 0))
    elif sort_by == "floor_desc":
        results.sort(key=lambda x: (x.floor_price_eur or 0), reverse=True)
        
    return results

@router.post("/games/add", response_model=Dict[str, Any])
def add_game(payload: AddGamePayload, db: Session = Depends(get_db)):
    app_id = extract_app_id_from_url(payload.steam_url)
    if not app_id:
        raise HTTPException(status_code=400, detail="Debe proporcionar una URL o AppID válido de Steam.")
        
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    details = fetch_steam_app_details(app_id)
    name = details.get("name") or f"Steam App {app_id}"
    buyer = payload.buyer_name
    offer_val = float(payload.offer_price if payload.offer_price is not None else (payload.tf2_keys_offered or 1.0))
    offer_curr = payload.offer_currency or "TF2"
    
    # 1. Obtener o crear ficha en catálogo games
    game = db.query(Game).filter(Game.app_id == app_id).first()
    if not game:
        game = Game(
            app_id=app_id,
            name=name,
            header_image=details.get("header_image") or f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg",
            steam_price=details.get("price"),
            is_delisted=bool(details.get("is_delisted", False)),
            delisted_reason=details.get("reason"),
            steam_players_24h=details.get("players_24h")
        )
        db.add(game)
        sync_single_game(game, settings)
        db.commit()
        db.refresh(game)
        
    # 2. Crear nueva oferta
    offer = Offer(
        app_id=app_id,
        buyer_name=buyer,
        offer_price=offer_val,
        offer_currency=offer_curr,
        status="pending"
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    
    return {"status": "ok", "game": build_offer_out(offer, settings).model_dump()}

@router.post("/games/bulk-state")
def bulk_update_state(payload: BulkStatePayload, db: Session = Depends(get_db)):
    for offer_id_raw, inc_val in payload.increases.items():
        try:
            oid = int(offer_id_raw)
            o = db.query(Offer).filter(Offer.id == oid).first()
            if not o:
                # Intento por app_id para compatibilidad
                o = db.query(Offer).filter(Offer.app_id == oid).first()
            if o:
                o.counter_price = float(inc_val) if inc_val is not None else 0.0
        except Exception:
            pass
            
    for offer_id_raw, rev_val in payload.reviewed.items():
        try:
            oid = int(offer_id_raw)
            o = db.query(Offer).filter(Offer.id == oid).first()
            if not o:
                o = db.query(Offer).filter(Offer.app_id == oid).first()
            if o:
                o.is_reviewed = bool(rev_val)
        except Exception:
            pass
            
    db.commit()
    return {"status": "ok"}

@router.post("/games/import-csv")
def import_csv_games(payload: CsvImportPayload, db: Session = Depends(get_db)):
    updated_count = 0
    for row in payload.rows:
        try:
            offer = db.query(Offer).filter(Offer.id == row.game_id).first()
            if not offer:
                offer = db.query(Offer).filter(Offer.app_id == row.game_id).first()
            if not offer and row.game_name:
                offer = db.query(Offer).join(Game).filter(Game.name.ilike(row.game_name.strip())).first()
            
            if offer:
                if row.buyer is not None and row.buyer.strip():
                    offer.buyer_name = row.buyer.strip()
                if row.offer is not None and row.offer >= 0:
                    offer.offer_price = float(row.offer)

                # Caso 1: Accepted = 1 (Vendido)
                if row.accepted is True:
                    offer.status = "sold"
                    offer.sold_currency = row.sold_currency or "TF2"
                    inc_val = float(row.increment) if row.increment is not None else 0.0
                    offer.counter_price = inc_val
                    offer.sold_price = float(row.sold_price) if row.sold_price is not None else float(offer.offer_price + inc_val)
                    offer.sold_note = "Importado CSV"
                    offer.is_reviewed = True
                # Caso 2: Accepted = 0 y Revised = 1 (Tramitado / Pending)
                elif row.revised is True:
                    offer.status = "pending"
                    offer.is_reviewed = True
                    offer.sold_price = None
                    offer.sold_note = None
                    if row.increment is not None and row.increment >= 0:
                        offer.counter_price = float(row.increment)
                    elif row.counter_offer is not None and row.offer is not None:
                        offer.counter_price = max(0.0, float(row.counter_offer) - float(row.offer))
                # Caso 3: Accepted = 0 y Revised = 0 (Listado)
                else:
                    offer.status = "listed"
                    offer.is_reviewed = False
                    offer.counter_price = 0.0
                    offer.sold_price = None
                    offer.sold_note = None
                
                updated_count += 1
        except Exception as e:
            print(f"Error in import_csv row {row}: {e}")
            
    db.commit()
    return {"status": "ok", "updated_count": updated_count}

@router.get("/games/{game_id}", response_model=GameOut)
def get_game_detail(game_id: str, db: Session = Depends(get_db)):
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    try:
        gid = int(game_id)
        offer = db.query(Offer).filter(Offer.id == gid).first()
        if not offer:
            offer = db.query(Offer).filter(Offer.app_id == gid).first()
    except ValueError:
        offer = None
        
    if not offer:
        raise HTTPException(status_code=404, detail="Juego / Oferta no encontrada")
        
    return build_offer_out(offer, settings)

@router.delete("/games/{game_id}", response_model=Dict[str, Any])
def delete_game(game_id: str, db: Session = Depends(get_db)):
    try:
        gid = int(game_id)
        offer = db.query(Offer).filter(Offer.id == gid).first()
        if not offer:
            offer = db.query(Offer).filter(Offer.app_id == gid).first()
    except ValueError:
        offer = None
        
    if not offer:
        raise HTTPException(status_code=404, detail="Juego / Oferta no encontrada")
        
    db.delete(offer)
    db.commit()
    return {"status": "ok", "message": f"Oferta {game_id} eliminada con éxito"}

@router.put("/games/{game_id}", response_model=Dict[str, Any])
@router.post("/games/{game_id}", response_model=Dict[str, Any])
@router.post("/games/{game_id}/update", response_model=Dict[str, Any])
def update_game(game_id: str, payload: GameUpdatePayload, db: Session = Depends(get_db)):
    settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
    try:
        gid = int(game_id)
        offer = db.query(Offer).filter(Offer.id == gid).first()
        if not offer:
            offer = db.query(Offer).filter(Offer.app_id == gid).first()
    except ValueError:
        offer = None
        
    if not offer:
        raise HTTPException(status_code=404, detail="Juego / Oferta no encontrada")
        
    if payload.offer_price is not None:
        offer.offer_price = float(payload.offer_price)
    elif payload.tf2_keys_offered is not None:
        offer.offer_price = float(payload.tf2_keys_offered)
        
    if payload.offer_currency is not None:
        offer.offer_currency = payload.offer_currency
    if payload.counter_price is not None:
        offer.counter_price = float(payload.counter_price)
    elif payload.counter_increase_tf2 is not None:
        offer.counter_price = float(payload.counter_increase_tf2)
    if payload.counter_currency is not None:
        offer.counter_currency = payload.counter_currency
        
    if payload.status is not None:
        offer.status = payload.status
    elif payload.is_sold is not None:
        offer.status = "sold" if payload.is_sold else "pending"
        
    if payload.is_reviewed is not None:
        offer.is_reviewed = payload.is_reviewed
        
    if payload.sold_currency is not None:
        offer.sold_currency = payload.sold_currency
    if payload.sold_price is not None:
        offer.sold_price = payload.sold_price
    elif payload.sold_tf2_keys is not None:
        offer.sold_price = payload.sold_tf2_keys
        
    if payload.sold_note is not None:
        offer.sold_note = payload.sold_note.strip() if payload.sold_note else None
    if payload.issue_note is not None:
        offer.issue_note = payload.issue_note.strip() if payload.issue_note else None
    if payload.buyer_name is not None:
        offer.buyer_name = payload.buyer_name.strip() if payload.buyer_name.strip() else None
        
    # Actualizar cotizaciones manuales si se proveen
    if offer.game:
        if payload.best_keyshop_price_eur is not None:
            offer.game.ggdeals_keyshop_current = payload.best_keyshop_price_eur
        if payload.ggdeals_current_official is not None:
            offer.game.ggdeals_official_current = payload.ggdeals_current_official
        if payload.ggdeals_current_keyshop is not None:
            offer.game.ggdeals_keyshop_current = payload.ggdeals_current_keyshop
        if payload.ggdeals_historical_official_low is not None:
            offer.game.ggdeals_official_hist_low = payload.ggdeals_historical_official_low
        if payload.ggdeals_historical_keyshop_low is not None:
            offer.game.ggdeals_keyshop_hist_low = payload.ggdeals_historical_keyshop_low
            
    db.commit()
    db.refresh(offer)
    return {"status": "ok", "game": build_offer_out(offer, settings).model_dump()}

async def run_sync_background():
    global sync_status
    sync_status["is_syncing"] = True
    sync_status["message"] = "Actualizando cotización de TF2 Keys y juegos activos..."
    
    from backend.app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
        live_key_price, live_cash_price = fetch_live_tf2_key_price()
        if live_key_price and settings:
            settings.tf2_key_steam_price = live_key_price
            settings.tf2_key_cash_price = live_cash_price or round(live_key_price * 0.80, 2)
            settings.last_tf2_update = datetime.now().strftime("%d/%m/%Y %H:%M")
            db.commit()
            
        # OPTIMIZACIÓN: Solo sincronizar juegos con ofertas activas ('pending' o 'listed')
        active_games = (
            db.query(Game)
            .join(Offer)
            .filter(Offer.status.in_(["pending", "listed"]))
            .distinct()
            .all()
        )
        
        total = len(active_games)
        processed = 0
        sync_status["total"] = total
        sync_status["message"] = f"Iniciando escaneo de {total} juegos activos..."
        
        def worker(game_item: Game):
            nonlocal processed
            sync_single_game(game_item, settings)
            processed += 1
            sync_status["current"] = processed
            sync_status["message"] = f"Escaneando {processed} de {total}: {game_item.name}..."
            
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=5) as executor:
            tasks = [loop.run_in_executor(executor, worker, g) for g in active_games]
            await asyncio.gather(*tasks)
            
        db.commit()
        sync_status["message"] = f"Sincronización completada: {total} juegos activos actualizados."
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
