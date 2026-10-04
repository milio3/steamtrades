import re
import urllib.parse
import requests
from datetime import datetime, UTC
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
from backend.app.core.config import BROWSER_HEADERS
from backend.app.models.game import Game
from backend.app.models.offer import Offer
from backend.app.models.settings import MarketSettingsModel
from backend.app.models.market_price import MarketPrice
from backend.app.services.kinguin_service import fetch_kinguin_row_price
from backend.app.services.steam_service import (
    fetch_steam_app_details,
    fetch_steam_players_count,
    extract_app_id_from_url
)

def clean_game_slug(name: str) -> str:
    """Convierte el nombre del juego en un slug compatible con URLs de GG.deals."""
    slug = name.lower()
    slug = re.sub(r'\(.*?\)', '', slug)
    slug = re.sub(r'\[.*?\]', '', slug)
    slug = slug.replace(":", " ").replace("'", "").replace("&", "and").replace(".", "")
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    return slug

def fetch_cheapshark_game_data(app_id: Optional[int], game_name: str) -> Dict[str, Any]:
    """
    Consulta CheapShark API para obtener referencias de mercado:
    - official_current: precio más bajo actual en tiendas autorizadas (en EUR)
    - official_retail: precio base oficial / retail (en EUR)
    - official_hist_low: mínimo histórico registrado en tiendas autorizadas (en EUR)
    - official_hist_time: fecha del mínimo histórico oficial
    - official_discount: porcentaje de descuento oficial actual
    """
    result = {
        "official_current": None,
        "official_retail": None,
        "official_hist_low": None,
        "official_hist_time": None,
        "official_discount": None
    }
    headers = {"User-Agent": "SteamTradesPortfolioManager/1.0"}
    try:
        url = None
        if app_id:
            url = f"https://www.cheapshark.com/api/1.0/games?steamAppID={app_id}"
        elif game_name:
            safe_title = urllib.parse.quote(game_name.strip())
            url = f"https://www.cheapshark.com/api/1.0/games?title={safe_title}"

        if url:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data and isinstance(data, list) and len(data) > 0:
                    game_id = data[0].get("gameID")
                    if game_id:
                        r2 = requests.get(f"https://www.cheapshark.com/api/1.0/games?id={game_id}", headers=headers, timeout=5)
                        if r2.status_code == 200:
                            d2 = r2.json()
                            ever = d2.get("cheapestPriceEver", {})
                            if ever.get("price"):
                                result["official_hist_low"] = round(float(ever["price"]) * 0.93, 2)
                                if ever.get("date"):
                                    result["official_hist_time"] = datetime.fromtimestamp(ever["date"]).strftime("%d/%m/%Y")
                            
                            deals = d2.get("deals", [])
                            if deals:
                                best_deal = deals[0]
                                if best_deal.get("price"):
                                    result["official_current"] = round(float(best_deal["price"]) * 0.93, 2)
                                if best_deal.get("retailPrice"):
                                    result["official_retail"] = round(float(best_deal["retailPrice"]) * 0.93, 2)
                                if best_deal.get("savings"):
                                    savings = round(float(best_deal["savings"]))
                                    if savings > 0:
                                        result["official_discount"] = str(savings)
    except Exception:
        pass
    return result

def calculate_offer_metrics(offer: Offer, game: Optional[Game], settings: Optional[MarketSettingsModel]) -> Dict[str, Any]:
    """Calcula dinámicamente en memoria las métricas de suelo, conversión de divisas y márgenes de arbitraje."""
    tf2_steam = settings.tf2_key_steam_price if settings else 2.02
    tf2_cash = settings.tf2_key_cash_price if settings else 1.62
    
    # 1. Valor al cambio de la oferta recibida
    offer_p = offer.offer_price or 0.0
    if offer.offer_currency == "EUR":
        offer_value_cash_eur = round(offer_p, 2)
        offer_value_steam_eur = round(offer_p, 2)
    else:
        offer_value_steam_eur = round(offer_p * tf2_steam, 2)
        offer_value_cash_eur = round(offer_p * tf2_cash, 2)
        
    # 2. Determinar Suelo Mínimo de Mercado (Floor Price) ignorando valores <= 0€
    floor_candidates = []
    
    if game:
        # Candidato 1: Kinguin actual (> 0.05€)
        k_price = getattr(game, "kinguin_price_eur", None)
        k_stock = getattr(game, "kinguin_in_stock", True)
        if k_price and k_price > 0.05 and k_stock:
            floor_candidates.append((k_price, "Kinguin (ROW)"))

        # Candidato 2: Keyshop actual (> 0.05€)
        if game.ggdeals_keyshop_current and game.ggdeals_keyshop_current > 0.05:
            source_lbl = game.best_keyshop_name or "Keyshops (Actual)"
            floor_candidates.append((game.ggdeals_keyshop_current, source_lbl))
            
        # Candidato 3: Mínimo histórico en Keyshops (> 0.05€)
        if game.ggdeals_keyshop_hist_low and game.ggdeals_keyshop_hist_low > 0.05:
            floor_candidates.append((game.ggdeals_keyshop_hist_low, "Mín. Histórico Keyshops"))
            
        # Candidato 4: Mínimo histórico en tiendas Oficiales (> 0.10€ para evitar juegos gratuitos)
        if game.ggdeals_official_hist_low and game.ggdeals_official_hist_low > 0.10:
            floor_candidates.append((game.ggdeals_official_hist_low, "Mín. Histórico Oficial"))
            
        # Candidato 5: Precio oficial actual (solo si no hay ningún precio de keyshop)
        if not floor_candidates and game.ggdeals_official_current and game.ggdeals_official_current > 0.05:
            floor_candidates.append((game.ggdeals_official_current, "Oficial (Actual)"))
        elif not floor_candidates and game.steam_price and game.steam_price > 0.05 and not game.is_delisted:
            floor_candidates.append((game.steam_price, "Steam Store"))
            
    if floor_candidates:
        min_floor_price, min_floor_source = min(floor_candidates, key=lambda x: x[0])
        floor_price_eur = round(min_floor_price, 2)
        floor_price_source = min_floor_source
        
        # 3. Margen de arbitraje / Pérdida del vendedor
        loss = round(floor_price_eur - offer_value_cash_eur, 2)
        seller_loss_eur = loss
        
        if floor_price_eur > 0:
            seller_loss_percent = round((loss / floor_price_eur) * 100, 1)
        else:
            seller_loss_percent = 0.0
            
        reseller_profit_eur = loss
        reseller_profit_percent = seller_loss_percent
        
        if seller_loss_percent >= 50:
            deal_rating = "Gran Pérdida (>50% bajo suelo)"
        elif seller_loss_percent >= 25:
            deal_rating = "Favorable al Comprador (25-50% bajo suelo)"
        elif seller_loss_percent > 0:
            deal_rating = "Cerca del Suelo (0-25%)"
        else:
            deal_rating = "¡Oferta Superior al Suelo!"
    else:
        floor_price_eur = None
        floor_price_source = "Pendiente"
        seller_loss_eur = None
        seller_loss_percent = None
        reseller_profit_eur = None
        reseller_profit_percent = None
        deal_rating = "Normal"
        
    return {
        "offer_value_steam_eur": offer_value_steam_eur,
        "offer_value_cash_eur": offer_value_cash_eur,
        "floor_price_eur": floor_price_eur,
        "floor_price_source": floor_price_source,
        "seller_loss_eur": seller_loss_eur,
        "seller_loss_percent": seller_loss_percent,
        "reseller_profit_eur": reseller_profit_eur,
        "reseller_profit_percent": reseller_profit_percent,
        "deal_rating": deal_rating,
        "kinguin_price_eur": getattr(game, "kinguin_price_eur", None),
        "kinguin_url": getattr(game, "kinguin_url", None),
        "kinguin_in_stock": getattr(game, "kinguin_in_stock", True)
    }


def scrape_ggdeals_game_data(game_name: str) -> Dict[str, Any]:
    """Scrapea la ficha de GG.deals para obtener precios actuales y mínimos históricos si está accesible."""
    slug = clean_game_slug(game_name)
    url = f"https://gg.deals/game/{slug}/"
    result = {
        "current_official": None,
        "current_keyshop": None,
        "keyshop_discount": None,
        "hist_official_low": None,
        "hist_official_time": None,
        "hist_keyshop_low": None,
        "hist_keyshop_time": None
    }
    
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=5)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            price_boxes = soup.find_all("div", class_=re.compile(r"game-heading-offer|price-widget|main-price"))
            for box in price_boxes:
                box_text = box.get_text()
                price_match = re.search(r"(\d+[\.,]\d+)\s*€", box_text)
                if price_match:
                    p = float(price_match.group(1).replace(",", "."))
                    if "keyshops" in box_text.lower() or "keyshop" in box_text.lower():
                        if result["current_keyshop"] is None or p < result["current_keyshop"]:
                            result["current_keyshop"] = p
                    else:
                        if result["current_official"] is None:
                            result["current_official"] = p
                            
            hist_items = soup.find_all("div", class_=re.compile(r"history-low|historical-low|item"))
            for item in hist_items:
                txt = item.get_text()
                p_match = re.search(r"(\d+[\.,]\d+)\s*€", txt)
                if p_match:
                    val = float(p_match.group(1).replace(",", "."))
                    if "keyshops" in txt.lower() or "keyshop" in txt.lower():
                        if result["hist_keyshop_low"] is None or val < result["hist_keyshop_low"]:
                            result["hist_keyshop_low"] = val
                    elif "official" in txt.lower() or "tiendas" in txt.lower():
                        if result["hist_official_low"] is None or val < result["hist_official_low"]:
                            result["hist_official_low"] = val
    except Exception:
        pass
        
    return result

def sync_single_game(game: Game, settings: Optional[MarketSettingsModel] = None):
    """Sincroniza los metadatos de un juego consultando Steam Store API, CheapShark (histórico oficial), Kinguin (ROW) y GG.deals."""
    app_id = game.app_id
    steam_retail_price = None

    if app_id:
        details = fetch_steam_app_details(app_id)
        if details.get("is_delisted"):
            game.is_delisted = True
            game.delisted_reason = details.get("reason") or "Retirado de la tienda de Steam"
        else:
            game.is_delisted = False
            game.delisted_reason = None
        if details.get("price") is not None:
            game.steam_price = details["price"]
            steam_retail_price = details["price"]
        if details.get("header_image"):
            game.header_image = details["header_image"]
        
        players = fetch_steam_players_count(app_id)
        if players is not None:
            game.steam_players_24h = players

    # 1. Consulta de CheapShark (Precios Oficiales actuales y Mínimos Históricos)
    cs_data = fetch_cheapshark_game_data(app_id, game.name)
    
    # 2. Precios Oficiales Actuales
    cur_official_candidates = []
    if game.steam_price and game.steam_price > 0.05 and not game.is_delisted:
        cur_official_candidates.append(game.steam_price)
    if cs_data.get("official_current") and cs_data["official_current"] > 0.05:
        cur_official_candidates.append(cs_data["official_current"])
        
    if cur_official_candidates:
        game.ggdeals_official_current = min(cur_official_candidates)
        
    # Mínimo Histórico Oficial
    if cs_data.get("official_hist_low") and cs_data["official_hist_low"] > 0.05:
        game.ggdeals_official_hist_low = cs_data["official_hist_low"]
        if cs_data.get("official_hist_time"):
            game.ggdeals_official_hist_time = cs_data["official_hist_time"]
    elif not game.ggdeals_official_hist_low and game.ggdeals_official_current:
        game.ggdeals_official_hist_low = game.ggdeals_official_current

    # 3. Consulta de Kinguin (ROW / Global / EU)
    kinguin_data = fetch_kinguin_row_price(game.name)
    k_eur = kinguin_data.get("kinguin_price_eur")
    
    if k_eur is not None and k_eur > 0:
        game.ggdeals_keyshop_current = k_eur
        game.best_keyshop_name = "Kinguin (ROW)"
        
        # Mínimo Histórico de Keyshops
        if game.ggdeals_keyshop_hist_low and game.ggdeals_keyshop_hist_low > 0.05:
            game.ggdeals_keyshop_hist_low = min(game.ggdeals_keyshop_hist_low, k_eur)
        else:
            game.ggdeals_keyshop_hist_low = k_eur
            game.ggdeals_keyshop_hist_time = datetime.now().strftime("%d/%m/%Y")

    # 4. Cálculo de Descuento (Keyshop vs Oficial)
    if game.ggdeals_official_current and game.ggdeals_keyshop_current and game.ggdeals_official_current > game.ggdeals_keyshop_current:
        pct = round(((game.ggdeals_official_current - game.ggdeals_keyshop_current) / game.ggdeals_official_current) * 100)
        game.ggdeals_keyshop_discount = str(pct)
    elif cs_data.get("official_discount"):
        game.ggdeals_keyshop_discount = cs_data["official_discount"]

    # 5. Scraping GG.deals complementario (si responde)
    gg_data = scrape_ggdeals_game_data(game.name)
    if gg_data.get("current_official") is not None:
        game.ggdeals_official_current = gg_data["current_official"]
    if gg_data.get("current_keyshop") is not None:
        game.ggdeals_keyshop_current = gg_data["current_keyshop"]
    if gg_data.get("hist_official_low") is not None:
        game.ggdeals_official_hist_low = gg_data["hist_official_low"]
    if gg_data.get("hist_keyshop_low") is not None:
        game.ggdeals_keyshop_hist_low = gg_data["hist_keyshop_low"]

    # 6. Sincronización con la tabla dedicada market_prices
    if not game.market_price:
        game.market_price = MarketPrice(app_id=game.app_id, bundle=game.bundle or "")
        
    game.market_price.kinguin_price_eur = k_eur
    game.market_price.kinguin_url = kinguin_data.get("kinguin_url")
    game.market_price.kinguin_in_stock = kinguin_data.get("kinguin_in_stock", True)
    
    game.market_price.ggdeals_official_current = game.ggdeals_official_current
    game.market_price.ggdeals_keyshop_current = game.ggdeals_keyshop_current
    game.market_price.best_keyshop_name = game.best_keyshop_name or ("Kinguin (ROW)" if k_eur else None)
    game.market_price.ggdeals_keyshop_discount = game.ggdeals_keyshop_discount
    game.market_price.ggdeals_official_hist_low = game.ggdeals_official_hist_low
    game.market_price.ggdeals_official_hist_time = game.ggdeals_official_hist_time
    game.market_price.ggdeals_keyshop_hist_low = game.ggdeals_keyshop_hist_low
    game.market_price.ggdeals_keyshop_hist_time = game.ggdeals_keyshop_hist_time
    game.market_price.ggdeals_url = f"https://gg.deals/game/{clean_game_slug(game.name)}/"
    game.market_price.last_scraped_at = datetime.now(UTC)

    game.last_synced_at = datetime.now(UTC)
