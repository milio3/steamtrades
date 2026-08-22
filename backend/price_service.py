import os
import json
import logging
import asyncio
import requests
import re
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any, Tuple
from backend.models import GameItem, MarketSettings, HistoricalLow
from backend.data_loader import get_initial_games
from backend.steam_service import fetch_live_tf2_key_price, fetch_steam_app_details, parse_price_str, extract_app_id_from_url, fetch_steam_players_count

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DATA_DIR, "games_db.json")
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
}

def parse_price_value(val_str: Optional[str]) -> Optional[float]:
    if not val_str:
        return None
    c = re.sub(r"[^\d,\.]", "", val_str).strip()
    if not c:
        return None
    if "," in c and "." not in c:
        c = c.replace(",", ".")
    elif "," in c and "." in c:
        if c.find(",") > c.find("."):
            c = c.replace(".", "").replace(",", ".")
        else:
            c = c.replace(",", "")
    try:
        return float(c)
    except:
        return None

def extract_ggdeals_from_html(html_content: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html_content, 'html.parser')
    res = {
        "current_official_price": None,
        "current_keyshop_price": None,
        "current_keyshop_discount": None,
        "current_best_deal": None,
        "historical_official_low": None,
        "historical_official_time": None,
        "historical_keyshop_low": None,
        "historical_keyshop_time": None,
        "is_delisted": False
    }
    
    delisted_tag = soup.find(string=lambda t: t and ("delisted" in t.lower() or "retirado" in t.lower() or "no longer available" in t.lower()))
    if delisted_tag:
        res["is_delisted"] = True

    cols = soup.select('.header-game-prices-wrapper .game-info-price-col')
    for col in cols:
        text = col.get_text(separator=' ', strip=True)
        price_elem = col.select_one('.price-inner, .numeric, .price')
        price_val = parse_price_value(price_elem.get_text() if price_elem else text)
        
        disc_elem = col.select_one('.discount, .discount-badge')
        disc_val = disc_elem.get_text(strip=True) if disc_elem else None
        if disc_val and "Discount:" in disc_val:
            disc_val = disc_val.replace("Discount:", "").strip()
        
        time_match = re.search(r'(Ended\s+[^0-9]*[0-9]+\s+[a-zA-Z\s]+ago|hace\s+[0-9]+\s+[a-zA-Z]+)', text, re.IGNORECASE)
        time_str = time_match.group(0).strip() if time_match else None
        
        if 'Official Stores low:' in text or ('Official Stores' in text and 'low:' in text):
            res['historical_official_low'] = price_val
            res['historical_official_time'] = time_str
        elif 'Keyshops low:' in text or ('Keyshops' in text and 'low:' in text):
            res['historical_keyshop_low'] = price_val
            res['historical_keyshop_time'] = time_str
        elif 'Official Stores:' in text or 'Official Stores' in text:
            res['current_official_price'] = price_val
        elif 'Keyshops:' in text or 'Keyshops' in text:
            res['current_keyshop_price'] = price_val
            res['current_keyshop_discount'] = disc_val
            if 'Best deal' in text or 'best-deal' in col.get('class', []):
                res['current_best_deal'] = 'Keyshops'

    return res

def clean_game_slug(name: str) -> str:
    s = name.lower().replace(":", "").replace("'", "").replace("(", "").replace(")", "").replace(".", "").replace("&", "and")
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-+", "-", s)
    return s

class PriceDatabase:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.settings = self._load_settings()
        self.games: Dict[str, GameItem] = {}
        self._load_or_init_games()
        
    def _load_settings(self) -> MarketSettings:
        if os.path.exists(SETTINGS_PATH):
            try:
                with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return MarketSettings(**data)
            except Exception as e:
                logger.error(f"Error cargando settings: {e}")
        live_price, _ = fetch_live_tf2_key_price()
        settings = MarketSettings(
            tf2_key_steam_price=live_price,
            tf2_key_cash_price=round(live_price * 0.80, 2)
        )
        self._save_settings(settings)
        return settings

    def _save_settings(self, settings: MarketSettings):
        with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)

    def _load_or_init_games(self):
        if os.path.exists(DB_PATH):
            try:
                with open(DB_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item_data in data:
                        game = GameItem(**item_data)
                        self.games[game.id] = game
                logger.info(f"Cargados {len(self.games)} juegos desde base de datos local.")
                self.recalculate_all_offers()
                return
            except Exception as e:
                logger.error(f"Error cargando DB local, regenerando datos: {e}")
        
        initial = get_initial_games()
        for g in initial:
            self.games[g.id] = g
        self.recalculate_all_offers()
        self.save_to_disk()

    def reload_from_disk(self):
        if os.path.exists(DB_PATH):
            try:
                with open(DB_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item_data in data:
                        game = GameItem(**item_data)
                        self.games[game.id] = game
                self.recalculate_all_offers()
            except Exception as e:
                logger.error(f"Error recargando DB: {e}")

    def save_to_disk(self):
        try:
            items = [g.model_dump() for g in self.games.values()]
            with open(DB_PATH, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
            logger.info(f"Guardados {len(items)} juegos en {DB_PATH}")
        except Exception as e:
            logger.error(f"Error guardando DB en disco: {e}")

    def recalculate_game_offer(self, game: GameItem):
        steam_price_key = self.settings.tf2_key_steam_price
        cash_price_key = self.settings.tf2_key_cash_price
        
        game.offer_value_steam_eur = round(game.tf2_keys_offered * steam_price_key, 2)
        game.offer_value_cash_eur = round(game.tf2_keys_offered * cash_price_key, 2)
        # 1. Valor de la oferta en Steam Wallet y Cash real
        game.offer_value_steam_eur = round(game.tf2_keys_offered * self.settings.tf2_key_steam_price, 2)
        game.offer_value_cash_eur = round(game.tf2_keys_offered * self.settings.tf2_key_cash_price, 2)
        
        # 2. Determinar el Precio Suelo Mínimo Positivo de Mercado (Ignorando Free/0.0)
        # Si un juego fue FREE (0.00€), se descarta y se usa el siguiente valor positivo más bajo
        candidates = []
        if game.ggdeals_current_official is not None and game.ggdeals_current_official > 0.05:
            candidates.append((game.ggdeals_current_official, "Current Official"))
        elif game.steam_store_price is not None and game.steam_store_price > 0.05 and not game.is_delisted_steam:
            candidates.append((game.steam_store_price, "Steam Store"))
            
        if game.ggdeals_current_keyshop is not None and game.ggdeals_current_keyshop > 0.05:
            candidates.append((game.ggdeals_current_keyshop, "Current Keyshop"))
        elif game.best_keyshop_price_eur is not None and game.best_keyshop_price_eur > 0.05:
            candidates.append((game.best_keyshop_price_eur, "Best Keyshop"))
            
        if game.ggdeals_historical_official_low is not None and game.ggdeals_historical_official_low > 0.05:
            candidates.append((game.ggdeals_historical_official_low, "Hist. Official Low"))
            
        if game.ggdeals_historical_keyshop_low is not None and game.ggdeals_historical_keyshop_low > 0.05:
            candidates.append((game.ggdeals_historical_keyshop_low, "Hist. Keyshop Low"))

        if candidates:
            # Seleccionar el precio estrictamente más bajo histórico/actual
            candidates.sort(key=lambda x: x[0])
            floor_price, source = candidates[0]
            game.floor_price_eur = round(floor_price, 2)
            game.floor_price_source = source
            
            # Dinero y % que deja de ganar el vendedor respecto al suelo de reventa
            loss_eur = round(floor_price - game.offer_value_cash_eur, 2)
            game.seller_loss_eur = loss_eur
            game.seller_loss_percent = round((loss_eur / floor_price) * 100, 1)
            
            # Mantener compatibilidad con campos de profit
            game.reseller_profit_eur = loss_eur
            game.reseller_profit_percent = game.seller_loss_percent
            
            if game.seller_loss_percent >= 50:
                game.deal_rating = "Gran Pérdida para Vendedor (>50% bajo suelo)"
            elif game.seller_loss_percent >= 25:
                game.deal_rating = "Favorable al Comprador (25-50% bajo suelo)"
            elif game.seller_loss_percent > 0:
                game.deal_rating = "Aceptable / Cerca del Suelo (0-25%)"
            else:
                game.deal_rating = "¡Oferta Superior al Suelo Mínimo!"
        else:
            game.floor_price_eur = None
            game.floor_price_source = None
            game.seller_loss_eur = None
            game.seller_loss_percent = None
            game.reseller_profit_eur = None
            game.reseller_profit_percent = None
            game.deal_rating = "Pendiente de cotización"

    def recalculate_all_offers(self):
        for game in self.games.values():
            self.recalculate_game_offer(game)

    def update_settings(self, new_settings: MarketSettings):
        self.settings = new_settings
        self._save_settings(new_settings)
        self.recalculate_all_offers()
        self.save_to_disk()

    def fetch_single_game_sync(self, game: GameItem):
        # 1. Steam Store API & Players
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
            if details.get("players_24h") is not None:
                game.steam_players_24h = details["players_24h"]
            elif not game.steam_players_24h:
                game.steam_players_24h = fetch_steam_players_count(game.steam_app_id)

        # 2. GG.deals Scraping
        slug = clean_game_slug(game.name)
        url = f"https://gg.deals/game/{slug}/"
        try:
            r = requests.get(url, headers=BROWSER_HEADERS, timeout=8)
            if r.status_code == 200:
                extracted = extract_ggdeals_from_html(r.text)
                if extracted.get("current_official_price") is not None:
                    game.ggdeals_current_official = extracted["current_official_price"]
                if extracted.get("current_keyshop_price") is not None:
                    game.ggdeals_current_keyshop = extracted["current_keyshop_price"]
                    game.best_keyshop_price_eur = extracted["current_keyshop_price"]
                if extracted.get("current_keyshop_discount"):
                    game.ggdeals_current_keyshop_discount = extracted["current_keyshop_discount"]
                if extracted.get("current_best_deal"):
                    game.ggdeals_best_deal = extracted["current_best_deal"]
                if extracted.get("historical_official_low") is not None:
                    game.ggdeals_historical_official_low = extracted["historical_official_low"]
                if extracted.get("historical_official_time"):
                    game.ggdeals_historical_official_time = extracted["historical_official_time"]
                if extracted.get("historical_keyshop_low") is not None:
                    game.ggdeals_historical_keyshop_low = extracted["historical_keyshop_low"]
                if extracted.get("historical_keyshop_time"):
                    game.ggdeals_historical_keyshop_time = extracted["historical_keyshop_time"]
                if extracted.get("is_delisted"):
                    game.is_delisted_steam = True
        except Exception as e:
            logger.debug(f"Error en GGdeals para {game.name}: {e}")

        # Fallbacks razonables
        if not game.best_keyshop_price_eur and game.steam_store_price:
            game.best_keyshop_price_eur = round(max(1.0, game.steam_store_price * 0.40), 2)
        
        self.recalculate_game_offer(game)

    def add_game_from_steam(self, steam_url: str, tf2_keys_offered: float = 1.0, lot_name: str = "xMjalino") -> GameItem:
        """Añade un juego automáticamente extrayendo información de Steam y GG.deals"""
        app_id = extract_app_id_from_url(steam_url)
        if not app_id:
            raise ValueError("No se pudo extraer el AppID de la URL de Steam proporcionada.")
        
        details = fetch_steam_app_details(app_id)
        name = details.get("name") or f"Steam App {app_id}"
        game_id = clean_game_slug(name) or f"steam_{app_id}"
        
        game = GameItem(
            id=game_id,
            name=name,
            tf2_keys_offered=float(tf2_keys_offered),
            steam_app_id=app_id,
            steam_header_image=details.get("header_image") or f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg",
            steam_store_price=details.get("price"),
            steam_is_free=details.get("is_free", False),
            is_delisted_steam=details.get("is_delisted", False),
            delisted_reason=details.get("reason"),
            steam_players_24h=details.get("players_24h"),
            lot_name=lot_name or "xMjalino"
        )
        
        self.fetch_single_game_sync(game)
        self.games[game.id] = game
        self.save_to_disk()
        return game

    async def scan_all_games(self, on_progress=None):
        """Escanea todos los juegos en paralelo con ThreadPoolExecutor y requests independientes"""
        live_key_price, _ = fetch_live_tf2_key_price()
        if live_key_price:
            self.settings.tf2_key_steam_price = live_key_price
            self.settings.tf2_key_cash_price = round(live_key_price * 0.80, 2)
            self._save_settings(self.settings)

        total = len(self.games)
        processed = 0

        def worker(game: GameItem):
            nonlocal processed
            self.fetch_single_game_sync(game)
            processed += 1
            if on_progress:
                on_progress(processed, total)

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=6) as executor:
            tasks = [loop.run_in_executor(executor, worker, g) for g in self.games.values()]
            await asyncio.gather(*tasks)

        self.save_to_disk()

# Instancia singleton
db = PriceDatabase()
