import re
import requests
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
from backend.app.core.config import BROWSER_HEADERS
from backend.app.models.game import Game
from backend.app.models.settings import MarketSettingsModel
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

def recalculate_game_offer(game: Game, settings: MarketSettingsModel):
    """Calcula el valor neto de la oferta recibida, suelo de mercado y margen de arbitraje."""
    tf2_steam = settings.tf2_key_steam_price if settings else 2.02
    tf2_cash = settings.tf2_key_cash_price if settings else 1.62
    
    # 1. Valor neto recibido en TF2
    game.offer_value_steam_eur = round(game.tf2_keys_offered * tf2_steam, 2)
    game.offer_value_cash_eur = round(game.tf2_keys_offered * tf2_cash, 2)
    
    # 2. Determinar Suelo Mínimo de Mercado (Floor Price)
    floor_candidates = []
    
    # Candidato 1: Keyshop actual
    if game.ggdeals_current_keyshop and game.ggdeals_current_keyshop > 0.05:
        floor_candidates.append((game.ggdeals_current_keyshop, "Keyshops (Actual)"))
    elif game.best_keyshop_price_eur and game.best_keyshop_price_eur > 0.05:
        floor_candidates.append((game.best_keyshop_price_eur, "Keyshops (Actual)"))
        
    # Candidato 2: Mínimo histórico en Keyshops
    if game.ggdeals_historical_keyshop_low and game.ggdeals_historical_keyshop_low > 0.05:
        floor_candidates.append((game.ggdeals_historical_keyshop_low, "Mín. Histórico Keyshops"))
        
    # Candidato 3: Mínimo histórico en tiendas Oficiales (si no es gratuito)
    if game.ggdeals_historical_official_low and game.ggdeals_historical_official_low > 0.10:
        floor_candidates.append((game.ggdeals_historical_official_low, "Mín. Histórico Oficial"))
        
    # Candidato 4: Precio oficial actual (solo si no hay ningún precio de keyshops)
    if not floor_candidates and game.ggdeals_current_official and game.ggdeals_current_official > 0.05:
        floor_candidates.append((game.ggdeals_current_official, "Oficial (Actual)"))
    elif not floor_candidates and game.steam_store_price and game.steam_store_price > 0.05 and not game.is_delisted_steam:
        floor_candidates.append((game.steam_store_price, "Steam Store"))
        
    if floor_candidates:
        min_floor_price, min_floor_source = min(floor_candidates, key=lambda x: x[0])
        game.floor_price_eur = round(min_floor_price, 2)
        game.floor_price_source = min_floor_source
        
        # 3. Cálculo de pérdida / ganancia para el vendedor
        loss = round(game.floor_price_eur - game.offer_value_cash_eur, 2)
        game.seller_loss_eur = loss
        
        if game.floor_price_eur > 0:
            loss_pct = round((loss / game.floor_price_eur) * 100, 1)
            game.seller_loss_percent = loss_pct
        else:
            game.seller_loss_percent = 0.0
            
        game.reseller_profit_eur = loss
        game.reseller_profit_percent = game.seller_loss_percent
        
        if game.seller_loss_percent >= 50:
            game.deal_rating = "Gran Pérdida (>50% bajo suelo)"
        elif game.seller_loss_percent >= 25:
            game.deal_rating = "Favorable al Comprador (25-50% bajo suelo)"
        elif game.seller_loss_percent > 0:
            game.deal_rating = "Cerca del Suelo (0-25%)"
        else:
            game.deal_rating = "¡Oferta Superior al Suelo!"
    else:
        game.floor_price_eur = None
        game.floor_price_source = "Pendiente"
        game.seller_loss_eur = None
        game.seller_loss_percent = None
        game.reseller_profit_eur = None
        game.reseller_profit_percent = None
        game.deal_rating = "Normal"

def scrape_ggdeals_game_data(game_name: str) -> Dict[str, Any]:
    """Scrapea la ficha de GG.deals para obtener precios actuales y mínimos históricos."""
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
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=8)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            
            # Precios actuales (Oficial vs Keyshop)
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
                            
            # Mínimos históricos
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

def sync_single_game(game: Game, settings: MarketSettingsModel):
    """Sincroniza un juego consultando Steam Store API, SteamDB y GG.deals."""
    # 1. Steam Store y Jugadores 24h
    if game.steam_app_id:
        details = fetch_steam_app_details(game.steam_app_id)
        if details.get("is_delisted") or game.is_delisted_steam:
            game.is_delisted_steam = True
            if details.get("reason") and not game.delisted_reason:
                game.delisted_reason = details.get("reason")
        if details.get("price") is not None:
            game.steam_store_price = details["price"]
        if details.get("header_image"):
            game.steam_header_image = details["header_image"]
        game.steam_is_free = details.get("is_free", False)
        
        players = fetch_steam_players_count(game.steam_app_id)
        if players is not None:
            game.steam_players_24h = players
            
    # 2. GG.deals Scraping
    gg_data = scrape_ggdeals_game_data(game.name)
    if gg_data.get("current_official"):
        game.ggdeals_current_official = gg_data["current_official"]
    if gg_data.get("current_keyshop"):
        game.ggdeals_current_keyshop = gg_data["current_keyshop"]
        game.best_keyshop_price_eur = gg_data["current_keyshop"]
    if gg_data.get("hist_official_low"):
        game.ggdeals_historical_official_low = gg_data["hist_official_low"]
    if gg_data.get("hist_keyshop_low"):
        game.ggdeals_historical_keyshop_low = gg_data["hist_keyshop_low"]
        
    # 3. Recalcular valoración y arbitraje
    recalculate_game_offer(game, settings)
