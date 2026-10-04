"""
Herramienta para importar y consolidar el catálogo de Humble Bundle y las ventas de xMjalino.
Actualiza la base de datos SQLite (data/steamtrades.db) y regenera data/games_db.json.
Uso:
    python -m backend.app.tools.import_hb_catalog
"""

import os
import sys
import csv
import json
import re
import sqlite3
import unicodedata
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# Asegurar path raíz
ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.core.config import DATA_DIR
from backend.app.services.steam_service import search_steam_games, fetch_steam_app_details
from backend.app.services.kinguin_service import generate_kinguin_search_url

DB_PATH = DATA_DIR / "steamtrades.db"
JSON_PATH = DATA_DIR / "games_db.json"
HB_CSV_PATH = ROOT_DIR / "HB keys.csv"
XMJALINO_CSV_PATH = ROOT_DIR / "xMjalino.csv"
CACHE_APPS_PATH = DATA_DIR / "cache_steam_apps.json"

def clean_text(s: str) -> str:
    """Normaliza texto eliminando acentos, caracteres de marcas registradas y tipografía especial."""
    if not s:
        return ""
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-').replace('…', '...')
    s = s.replace('®', '').replace('™', '').replace('©', '')
    s = s.replace('(R)', '').replace('(TM)', '').replace('(C)', '')
    s_norm = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s_norm).strip().lower()

# Diccionario exhaustivo de títulos especiales, packs antiguos de Humble y juegos descatalogados
KNOWN_SPECIAL_APPS = {
    # Descatalogados de coleccionista (F1, GRID, Project CARS, etc.)
    clean_text("F1 2013"): (223670, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("F1 2018"): (737800, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("F1 2019 Anniversary Edition"): (928600, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("F1 2020"): (1080110, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("Project CARS"): (234630, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("Project CARS 2"): (378860, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("GRID Ultimate Edition"): (703840, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("GRID 2 - Bathurst Track Pack"): (255691, True, "DLC Descatalogado de Steam"),
    clean_text("GRID 2 - Spa-Francorchamps Track Pack"): (255690, True, "DLC Descatalogado de Steam"),
    clean_text("Colin McRae Rally"): (287340, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("NBA 2K17"): (385760, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("The Lord of the Rings: War in the North"): (91310, True, "Descatalogado de Steam (Coleccionista)"),
    clean_text("H1Z1"): (433850, True, "Descatalogado de Steam (Z1 Battle Royale)"),
    clean_text("Rocket League"): (252950, True, "Descatalogado de Steam Store (Ahora en Epic)"),
    clean_text("Nosgoth Veteran Pack"): (200110, True, "Descatalogado de Steam"),
    clean_text("Gotham City Impostors: Professional Kit"): (211020, True, "Descatalogado de Steam"),
    clean_text("Hitman 2"): (863550, True, "Descatalogado de Steam (World of Assassination)"),
    clean_text("HITMAN: THE COMPLETE FIRST SEASON"): (236870, True, "Descatalogado de Steam"),

    # Títulos con subtítulos o ediciones especiales
    clean_text("Titan Quest: Anniversary Edition + Titan Quest: Ragnarok DLC"): (475150, False, None),
    clean_text("Raiden V: Director's Cut"): (570050, False, None),
    clean_text("Nongünz"): (633130, False, None),
    clean_text("Endless Space - Collection"): (208140, False, None),
    clean_text("Endless Space 2 - Digital Deluxe Edition"): (392110, False, None),
    clean_text("Frostpunk: The Rifts DLC"): (1125500, False, None),
    clean_text("Pathfinder Kingmaker Explorer Edition"): (640820, False, None),
    clean_text("Borderlands: Game of the Year Edition"): (8980, False, None),
    clean_text("Skullgirls + All Characters + Color Palette Bundle DLC"): (245170, False, None),
    clean_text("The Escapists - Base Game"): (298630, False, None),
    clean_text("The Escapists - Fhurst Peak"): (349350, False, None),
    clean_text("The Escapists DLC: Alcatraz"): (349350, False, None),
    clean_text("Western Press Mk Cans II Character DLC"): (564960, False, None),
    clean_text("Civilization VI - Australia Civilization & Scenario Pack"): (512034, False, None),
    clean_text("Civilization VI - Vikings Scenario Pack"): (512032, False, None),
    clean_text("Rapture Rejects"): (686600, False, None),
    clean_text("Rapture Rejects - Humble Exclusive \"Safari Outfit\" DLC"): (1009180, False, None),
    clean_text("Deus Ex: Human Revolution Director's Cut"): (238010, False, None),
    clean_text("Batman: Arkham Asylum GOTY"): (35140, False, None),
    clean_text("Batman: Arkham City GOTY Edition"): (200260, False, None),
    clean_text("Batman: Arkham Origins DLC"): (209000, False, None),
    clean_text("Swords of Ditto"): (619780, False, None),
    clean_text("Tomb Raider III"): (225320, False, None),
    clean_text("Dandara"): (612390, False, None),
    clean_text("Wuppo"): (400630, False, None),
    clean_text("Hello Neighbor Hide and Seek"): (960420, False, None),
    clean_text("Mordheim City of the Damned"): (276810, False, None),
    clean_text("X-Morph Defense"): (408410, False, None),
    clean_text("Frog Detective"): (963570, False, None),
    clean_text("Frog Detective 2"): (1171880, False, None),
    clean_text("Okhlos"): (400180, False, None),
    clean_text("Jotun"): (323580, False, None),
    clean_text(">observer_"): (514900, False, None),
    clean_text("Darkside Detective"): (368360, False, None),
    clean_text("Just Cause 3 XXL Edition"): (225540, False, None),
    clean_text("Sundered"): (535480, False, None),
    clean_text("Planetary Annihilation TITANS"): (386070, False, None),
    clean_text("Battle Chasers Nightwar"): (451020, False, None),
    clean_text("Death's Gambit"): (356650, False, None),
    clean_text("Banner Saga 2"): (281640, False, None),
    clean_text("Eterium"): (280200, False, None),
    clean_text("Fun with Ragdolls"): (1142500, False, None),
    clean_text("Vampire The Masquerade: Coteries of New York"): (1096410, False, None),
    clean_text("Warhammer 40,000: Space Marine"): (55150, False, None),
    clean_text("Control Standard Edition"): (870780, False, None),
    clean_text("Peaky Blinders: Mastermind"): (1013310, False, None),
    clean_text("S.W.I.N.E. HD Remaster"): (944010, False, None),
    clean_text("Imperator Rome Deluxe Edition"): (859580, False, None),
    clean_text("Override: Mech City Brawl"): (709440, False, None),
    clean_text("Jamestown Deluxe"): (94200, False, None),
    clean_text("Fidel - Dungeon Rescue"): (573170, False, None),
    clean_text("Quake Champions Early Access plus 50 Shards, 100 Platinum, 2000 Favor"): (611500, False, None),
    clean_text("Space Pilgrim Episode 2: Epsilon Indi"): (431710, False, None),
    clean_text("Space Pilgrim Episode 3: Delta Pavonis"): (437110, False, None),
    clean_text("Space Pilgrim Episode 4: Sol"): (446640, False, None),
    clean_text("Galactic Civilizations Ultimate Edition"): (214150, False, None),
    clean_text("Neighbours From Hell Compilation"): (260750, False, None),
    clean_text("Hellblade Senua's Sacrifice (refeature)"): (414340, False, None),
    clean_text("Risen 2: Dark Waters Gold Edition"): (40390, False, None),
    clean_text("Werewolf: The Apocalypse - Heart of the Forest"): (1342620, False, None),
    clean_text("GRIP: Combat Racing Artifex DLC"): (1177650, False, None),
    clean_text("Warhammer: End Times - Vermintide Schluesselschloss DLC"): (437070, False, None),
    clean_text("Warhammer: End Times - Vermintide The Outsider DLC"): (457040, False, None),

    # Juegos no-Steam con ficha en Steam
    clean_text("Tom Clancy's The Division"): (365590, False, None),
    clean_text("Tom Clancy's The Division - Survival"): (433853, False, None),
    clean_text("Assassin's Creed Origins"): (582160, False, None),
    clean_text("Lovecraft's Untold Stories"): (871420, False, None),
    clean_text("Disjunction"): (1179050, False, None),
    clean_text("Seven: Enhanced Edition"): (471010, False, None),
    clean_text("Destiny 2"): (1085660, False, None),
    clean_text("Overgrowth Secret Preorder Forum (SPF) access"): (25000, False, None),
}

# Packs multi-juego combinados de Humble Bundle con ID sintético
HUMBLE_MULTI_PACKS = {
    clean_text("Dead Island GOTY and Saints Row: The Third - The Full DLC Package"): 900001,
    clean_text("Metro 2033, Risen, and Sacred Citadel"): 900002,
    clean_text("Risen 2: Dark Waters, Sacred 2: Gold Edition, Saints Row 2, and Saints Row: The Third"): 900003,
    clean_text("Cities XL Platinum, Blood Bowl: Legendary Edition, Divinity II: Developer's Cut, R.A.W. Realms of Ancient War, Game of Thrones, and Confrontation"): 900004,
    clean_text("Painkiller: Hell & Damnation, ArcaniA, Darksiders II, and SpellForce 2: Faith in Destiny"): 900005,
    clean_text("Supreme Commander, Supreme Commander: Forged Alliance, The Guild 2, and Red Faction: Armageddon"): 900006,
    clean_text("H1Z1 Trickster Crate"): 900007,
    clean_text("Neverwinter Humble Bundle Pack"): 900008,
    clean_text("Android Module"): 900009,
    clean_text("GameMaker Studio Pro"): 900010,
    clean_text("HTML5 Module"): 900011,
    clean_text("iOS Module"): 900012,
    clean_text("Windows UWP Module"): 900013,
    clean_text("Destiny 2 Planet of Peace Exclusive Emblem"): 900014,
    clean_text("ESO Vanity pet: Bristlegut Piglet and 15 days of ESO Plus"): 900015,
    clean_text("The Elder Scrolls: Legends: 2 Card Packs (Skyrim) 1 Event Ticket 100 Gold 100 Souls"): 900016,
    clean_text("2x Overwatch Loot Boxes"): 900017,
    clean_text("Overwatch"): 900018,
    clean_text("Teleglitch: Die More Edition"): 234390,
}


def load_steamcmd_cache() -> Dict[str, int]:
    """Carga el dataset de 165k apps de Steam."""
    if not CACHE_APPS_PATH.exists():
        return {}
    with open(CACHE_APPS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    apps = data.get("applist", {}).get("apps", [])
    cache = {}
    for a in apps:
        k = clean_text(a.get("name", ""))
        if k and k not in cache:
            cache[k] = a["appid"]
    return cache


def parse_float(val: Any, default: float = 0.0) -> float:
    """Convierte cadenas con comas o puntos a float."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return default


def parse_bool(val: Any) -> bool:
    """Parsea valores booleanos flexibles."""
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ['true', '1', 'si', 'sí', 'yes']

def clean_display_title(raw_name: str) -> str:
    """Limpia y da formato legible a los nombres de juegos, resolviendo packs multi-juego y etiquetas HTML."""
    if not raw_name:
        return ""
    s = raw_name.strip()
    # Limpiar etiquetas HTML residuales de Humble Bundle
    s = re.sub(r'<br\s*/?>', ' ', s, flags=re.IGNORECASE)
    # Limpiar caracteres de marcas o decodificación rota
    s = s.replace('\ufffd', '').replace('', '')
    s = s.replace('®', '').replace('™', '').replace('©', '')
    s = re.sub(r'\s+', ' ', s).strip()

    # Nombres amigables y concisos para los packs multi-juego de Humble Bundle
    cl = clean_text(raw_name)
    pack_names = {
        clean_text("Cities XL Platinum, Blood Bowl: Legendary Edition, Divinity II: Developer's Cut, R.A.W. Realms of Ancient War, Game of Thrones, and Confrontation"):
            "[Pack 6-en-1: Focus Home] Cities XL, Blood Bowl, Divinity II, R.A.W., GoT & Confrontation",
        clean_text("Painkiller: Hell & Damnation, ArcaniA, Darksiders II, and SpellForce 2: Faith in Destiny"):
            "[Pack 4-en-1: Nordic Games] Painkiller, ArcaniA, Darksiders II & SpellForce 2",
        clean_text("Supreme Commander, Supreme Commander: Forged Alliance, The Guild 2, and Red Faction: Armageddon"):
            "[Pack 4-en-1: Nordic Games] Supreme Commander 1 & FA, The Guild 2 & Red Faction",
        clean_text("Dead Island GOTY and Saints Row: The Third - The Full DLC Package"):
            "[Pack 2-en-1: Deep Silver] Dead Island GOTY + Saints Row: The Third (Full DLC)",
        clean_text("Metro 2033, Risen, and Sacred Citadel"):
            "[Pack 3-en-1: Deep Silver] Metro 2033, Risen & Sacred Citadel",
        clean_text("Risen 2: Dark Waters, Sacred 2: Gold Edition, Saints Row 2, and Saints Row: The Third"):
            "[Pack 4-en-1: Deep Silver] Risen 2, Sacred 2 Gold, Saints Row 2 & Saints Row 3",
    }
    if cl in pack_names:
        return pack_names[cl]

    return s


def resolve_game_identity(
    game_name: str,
    platform: str,
    existing_db_games: Dict[str, Tuple[int, str, Any]],
    steamcmd_cache: Dict[str, int],
    next_synthetic_id: int
) -> Tuple[int, bool, Optional[str], int]:
    """
    Resuelve el app_id de Steam y el estado de descatalogado (delisted).
    Devuelve (app_id, is_delisted, delisted_reason, next_synthetic_id).
    """
    cl = clean_text(game_name)

    # 1. ¿Existe en la BD existente?
    if cl in existing_db_games:
        old_id, old_name, old_meta = existing_db_games[cl]
        is_del = bool(old_meta.get("is_delisted", False))
        reason = old_meta.get("delisted_reason")
        return old_id, is_del, reason, next_synthetic_id

    # 2. ¿Es un pack multi-clave conocido de Humble?
    if cl in HUMBLE_MULTI_PACKS:
        return HUMBLE_MULTI_PACKS[cl], False, None, next_synthetic_id

    # 3. ¿Es un caso manual o descatalogado conocido?
    if cl in KNOWN_SPECIAL_APPS:
        aid, is_del, reason = KNOWN_SPECIAL_APPS[cl]
        return aid, is_del, reason, next_synthetic_id

    # 4. RPG Maker DLCs con formato HTML
    if "rpg maker" in cl and "dlc" in cl:
        # Asignar AppID del RPG Maker correspondiente o sintético
        return 900050 + (abs(hash(cl)) % 100), False, None, next_synthetic_id

    # 5. Búsqueda exacta en cache de SteamCMD
    if cl in steamcmd_cache:
        return steamcmd_cache[cl], False, None, next_synthetic_id

    # 6. Variantes de limpieza (quitar paréntesis, sufijos de edición, etc.)
    variants = []
    no_par = re.sub(r'\(.*?\)', '', cl).strip()
    if no_par and no_par != cl:
        variants.append(no_par)
    if ' - ' in cl:
        variants.append(cl.split(' - ')[0].strip())
    if ': ' in cl:
        variants.append(cl.split(': ')[0].strip())
    if ' + ' in cl:
        variants.append(cl.split(' + ')[0].strip())

    for v in variants:
        if v in existing_db_games:
            old_id, _, old_meta = existing_db_games[v]
            return old_id, bool(old_meta.get("is_delisted", False)), old_meta.get("delisted_reason"), next_synthetic_id
        if v in KNOWN_SPECIAL_APPS:
            aid, is_del, reason = KNOWN_SPECIAL_APPS[v]
            return aid, is_del, reason, next_synthetic_id
        if v in steamcmd_cache:
            return steamcmd_cache[v], False, None, next_synthetic_id

    # 7. Si es Steam y aún no se encuentra, consultar búsqueda en vivo de Steam Store
    if platform == "STEAM":
        term = variants[0] if variants else game_name
        results = search_steam_games(term, limit=3)
        if results:
            for r in results:
                cand_name = r["name"]
                # Evitar asociar soundtracks o demos si el original no lo es
                if "soundtrack" in cand_name.lower() and "soundtrack" not in game_name.lower():
                    continue
                if "demo" in cand_name.lower() and "demo" not in game_name.lower():
                    continue
                return r["app_id"], False, None, next_synthetic_id

    # 8. Asignar ID sintético si es no-Steam o no encontrado
    syn_id = next_synthetic_id
    next_synthetic_id += 1
    return syn_id, False, "No encontrado en catálogo oficial de Steam", next_synthetic_id


def migrate_database_schema(db_conn: sqlite3.Connection):
    """Recrea las tablas de SQLite para dar soporte a la clave compuesta (app_id, bundle)."""
    cur = db_conn.cursor()

    # Desactivar temporalmente foreign keys durante la migración
    cur.execute("PRAGMA foreign_keys = OFF;")

    # 1. Tabla games
    cur.execute("DROP TABLE IF EXISTS games_new;")
    cur.execute("""
        CREATE TABLE games_new (
            app_id INTEGER NOT NULL,
            bundle VARCHAR(255) NOT NULL DEFAULT '',
            name VARCHAR(255) NOT NULL,
            header_image VARCHAR(500),
            is_delisted BOOLEAN DEFAULT 0,
            delisted_reason VARCHAR(255),
            platform VARCHAR(50) NOT NULL DEFAULT 'STEAM',
            hb_status VARCHAR(100),
            key_url VARCHAR(500),
            steam_price FLOAT,
            steam_players_24h INTEGER,
            ggdeals_official_current FLOAT,
            ggdeals_keyshop_current FLOAT,
            ggdeals_keyshop_discount VARCHAR(20),
            ggdeals_official_hist_low FLOAT,
            ggdeals_official_hist_time VARCHAR(100),
            ggdeals_keyshop_hist_low FLOAT,
            ggdeals_keyshop_hist_time VARCHAR(100),
            best_keyshop_name VARCHAR(100),
            last_synced_at DATETIME,
            PRIMARY KEY (app_id, bundle)
        );
    """)

    # 2. Tabla offers
    cur.execute("DROP TABLE IF EXISTS offers_new;")
    cur.execute("""
        CREATE TABLE offers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            bundle VARCHAR(255) NOT NULL DEFAULT '',
            buyer_name VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            is_reviewed BOOLEAN DEFAULT 0,
            offer_price FLOAT DEFAULT 1.0,
            offer_currency VARCHAR(10) DEFAULT 'TF2',
            counter_price FLOAT DEFAULT 0.0,
            counter_currency VARCHAR(10) DEFAULT 'TF2',
            sold_price FLOAT,
            sold_currency VARCHAR(10) DEFAULT 'TF2',
            sold_note VARCHAR(500),
            issue_note VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id, bundle) REFERENCES games_new(app_id, bundle) ON DELETE CASCADE
        );
    """)

    # 3. Tabla market_prices
    cur.execute("DROP TABLE IF EXISTS market_prices_new;")
    cur.execute("""
        CREATE TABLE market_prices_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            bundle VARCHAR(255) NOT NULL DEFAULT '',
            kinguin_price_eur FLOAT,
            kinguin_url VARCHAR(500),
            kinguin_in_stock BOOLEAN DEFAULT 1,
            ggdeals_keyshop_current FLOAT,
            best_keyshop_name VARCHAR(100),
            ggdeals_keyshop_discount VARCHAR(20),
            ggdeals_official_current FLOAT,
            ggdeals_keyshop_hist_low FLOAT,
            ggdeals_keyshop_hist_time VARCHAR(100),
            ggdeals_official_hist_low FLOAT,
            ggdeals_official_hist_time VARCHAR(100),
            ggdeals_url VARCHAR(500),
            last_scraped_at DATETIME,
            FOREIGN KEY (app_id, bundle) REFERENCES games_new(app_id, bundle) ON DELETE CASCADE,
            UNIQUE (app_id, bundle)
        );
    """)

    # Eliminar tablas antiguas y renombrar las nuevas
    cur.execute("DROP TABLE IF EXISTS offers;")
    cur.execute("DROP TABLE IF EXISTS market_prices;")
    cur.execute("DROP TABLE IF EXISTS games;")

    cur.execute("ALTER TABLE games_new RENAME TO games;")
    cur.execute("ALTER TABLE offers_new RENAME TO offers;")
    cur.execute("ALTER TABLE market_prices_new RENAME TO market_prices;")

    # Índices auxiliares
    cur.execute("CREATE INDEX IF NOT EXISTS ix_games_app_id ON games(app_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_games_bundle ON games(bundle);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_games_name ON games(name);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_offers_app_id ON offers(app_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_offers_status ON offers(status);")

    cur.execute("PRAGMA foreign_keys = ON;")
    db_conn.commit()
    print("Esquema SQLite migrado con éxito a clave compuesta (app_id, bundle).")


def run_full_import():
    """Ejecuta el proceso completo de carga y reconciliación."""
    print("=== INICIANDO IMPORTACIÓN DE HUMBLE BUNDLE Y VENTAS XMJALINO ===")

    # 1. Cargar cache de Steam y datos existentes
    steamcmd_cache = load_steamcmd_cache()
    print(f"Caché de Steam cargada: {len(steamcmd_cache)} juegos.")

    # Cargar metadatos previos de games_db.json.bak si existe
    old_metadata_by_name = {}
    seed_file = DATA_DIR / "games_db.json.bak"
    if not seed_file.exists():
        seed_file = JSON_PATH
    if seed_file.exists():
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                old_list = json.load(f)
                if isinstance(old_list, dict):
                    old_list = list(old_list.values())
                for item in old_list:
                    k = clean_text(item.get("name", ""))
                    if k:
                        old_metadata_by_name[k] = (
                            int(item.get("steam_app_id") or item.get("app_id") or 0),
                            item.get("name"),
                            item
                        )
            print(f"Metadatos previos cargados para {len(old_metadata_by_name)} juegos de la semilla.")
        except Exception as e:
            print(f"Aviso al cargar semilla previa: {e}")

    # 2. Leer CSVs
    if not HB_CSV_PATH.exists():
        raise FileNotFoundError(f"No se encontró {HB_CSV_PATH}")
    if not XMJALINO_CSV_PATH.exists():
        raise FileNotFoundError(f"No se encontró {XMJALINO_CSV_PATH}")

    with open(HB_CSV_PATH, "r", encoding="cp1252") as f:
        hb_records = list(csv.DictReader(f, delimiter=";"))
    print(f"Leídos {len(hb_records)} registros de Humble Bundle.")

    with open(XMJALINO_CSV_PATH, "r", encoding="utf-8-sig") as f:
        xm_records = list(csv.DictReader(f, delimiter=";"))
    print(f"Leídos {len(xm_records)} registros de ventas de xMjalino.")

    # Indexar ventas de xMjalino por nombre limpio y por gift link
    xm_by_name = {}
    xm_by_link = {}
    for r in xm_records:
        gname = r.get("Game", "").strip()
        k_link = r.get("Keys", "").strip()
        cl = clean_text(gname)
        if cl:
            xm_by_name[cl] = r
        if k_link:
            xm_by_link[k_link] = r

    # 3. Preparar conexión SQLite
    db_conn = sqlite3.connect(str(DB_PATH))
    migrate_database_schema(db_conn)
    cur = db_conn.cursor()

    next_synthetic_id = 900100
    games_inserted = 0
    offers_inserted = 0
    market_prices_inserted = 0

    xm_processed_keys = set()
    json_export_list = []

    # 4. Procesar los registros de Humble Bundle
    for row in hb_records:
        raw_name = row.get("Juego", "").strip()
        bundle_name = row.get("Bundle", "").strip() or "Humble Bundle General"
        platform_name = row.get("Plataforma", "STEAM").strip().upper()
        hb_status = row.get("Estado", "Disponible").strip()
        key_url = row.get("Clave/Enlace", "").strip()

        # Resolver AppID
        app_id, is_delisted, delisted_reason, next_synthetic_id = resolve_game_identity(
            raw_name, platform_name, old_metadata_by_name, steamcmd_cache, next_synthetic_id
        )

        # Buscar metadatos previos para imagen y precios si los teníamos
        old_item = old_metadata_by_name.get(clean_text(raw_name), (None, None, {}))[2]

        header_img = old_item.get("steam_header_image")
        if not header_img and app_id < 900000:
            header_img = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg"

        steam_price = old_item.get("steam_store_price")
        players_24h = old_item.get("steam_players_24h")
        gg_off_curr = old_item.get("ggdeals_current_official")
        gg_key_curr = old_item.get("ggdeals_current_keyshop") or old_item.get("best_keyshop_price_eur")
        gg_key_disc = old_item.get("ggdeals_current_keyshop_discount")
        gg_off_low = old_item.get("ggdeals_historical_official_low")
        gg_off_time = old_item.get("ggdeals_historical_official_time")
        gg_key_low = old_item.get("ggdeals_historical_keyshop_low")
        gg_key_time = old_item.get("ggdeals_historical_keyshop_time")
        best_key_shop = old_item.get("best_keyshop_name") or "Keyshops"

        # Comprobar si este juego/clave fue vendido u ofertado a xMjalino
        xm_match = None
        if key_url and key_url in xm_by_link:
            xm_match = xm_by_link[key_url]
            xm_processed_keys.add(key_url)
        elif clean_text(raw_name) in xm_by_name and clean_text(raw_name) not in xm_processed_keys:
            xm_match = xm_by_name[clean_text(raw_name)]
            xm_processed_keys.add(clean_text(raw_name))

        # Determinar oferta según reglas de negocio
        offer_price = 1.0
        offer_curr = "TF2"
        counter_price = 0.0
        counter_curr = "TF2"
        sold_price = None
        sold_curr = "TF2"
        sold_note = None
        issue_note = None
        buyer_name = None
        is_rev = False
        offer_status = "listed"

        if xm_match:
            agree = parse_bool(xm_match.get("Agree"))
            comm = xm_match.get("Comments", "").strip()
            rec_off = parse_float(xm_match.get("Received Offer"), default=1.0)
            cnt_str = xm_match.get("Counter Offer", "").strip()
            cnt_off = parse_float(cnt_str, default=0.0) if cnt_str else None

            buyer_name = "xMjalino"
            offer_price = rec_off
            offer_curr = xm_match.get("Currency", "TF2").strip() or "TF2"

            if agree is True:
                # Regla de usuario:
                # Si Counter Offer vacío y Agree True -> Received Offer
                # Si Counter Offer no en blanco y Agree True -> Counter Offer
                offer_status = "sold"
                is_rev = True
                if cnt_off is not None and cnt_off > 0:
                    sold_price = cnt_off
                    counter_price = max(0.0, cnt_off - rec_off)
                else:
                    sold_price = rec_off
                    counter_price = 0.0
                sold_curr = offer_curr
                sold_note = "Vendido a xMjalino"
            else:
                # Agree es False -> No se vendió
                buyer_name = None
                if "out of stock" in comm.lower():
                    offer_status = "issue"
                    issue_note = "Agotada temporalmente / Out of stock"
                    counter_price = max(0.0, (cnt_off or 0.0) - rec_off) if cnt_off else 0.0
                    is_rev = True
                else:
                    # Regla de usuario: "las rechazadas/pendientes volverían al pool de Listadas con comprador vacío"
                    offer_status = "listed"
                    offer_price = 0.0
                    counter_price = 0.0
                    is_rev = False
        else:
            # No está en xMjalino -> Reglas según Estado de Humble Bundle (sin oferta previa)
            st_lower = hb_status.lower()
            if "disponible" in st_lower:
                offer_status = "listed"
                offer_price = 0.0
                buyer_name = None
            elif "agotada" in st_lower:
                offer_status = "issue"
                issue_note = "Agotada temporalmente en Humble Bundle"
                offer_price = 0.0
                buyer_name = None
            else:
                # Expirada, Revelada, Regalo generado
                # Pasan a archivado
                offer_status = "archived"
                sold_note = f"Archivado ({hb_status})"
                offer_price = 0.0
                is_rev = True

        display_name = clean_display_title(raw_name)

        # Insertar en games
        cur.execute("""
            INSERT OR REPLACE INTO games (
                app_id, bundle, name, header_image, is_delisted, delisted_reason,
                platform, hb_status, key_url, steam_price, steam_players_24h,
                ggdeals_official_current, ggdeals_keyshop_current, ggdeals_keyshop_discount,
                ggdeals_official_hist_low, ggdeals_official_hist_time,
                ggdeals_keyshop_hist_low, ggdeals_keyshop_hist_time,
                best_keyshop_name, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, display_name, header_img, 1 if is_delisted else 0, delisted_reason,
            platform_name, hb_status, key_url, steam_price, players_24h,
            gg_off_curr, gg_key_curr, gg_key_disc, gg_off_low, gg_off_time,
            gg_key_low, gg_key_time, best_key_shop, datetime.utcnow()
        ))
        games_inserted += 1

        # Insertar en offers
        cur.execute("""
            INSERT INTO offers (
                app_id, bundle, buyer_name, status, is_reviewed, offer_price,
                offer_currency, counter_price, counter_currency, sold_price,
                sold_currency, sold_note, issue_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, buyer_name, offer_status, 1 if is_rev else 0,
            offer_price, offer_curr, counter_price, counter_curr, sold_price,
            sold_curr, sold_note, issue_note
        ))
        offer_id = cur.lastrowid
        offers_inserted += 1

        # Insertar en market_prices
        k_url = old_item.get("links", {}).get("kinguin") if isinstance(old_item.get("links"), dict) else None
        if not k_url and app_id < 900000:
            k_url = generate_kinguin_search_url(raw_name)

        cur.execute("""
            INSERT OR REPLACE INTO market_prices (
                app_id, bundle, kinguin_price_eur, kinguin_url, kinguin_in_stock,
                ggdeals_keyshop_current, best_keyshop_name, ggdeals_keyshop_discount,
                ggdeals_official_current, ggdeals_keyshop_hist_low, ggdeals_keyshop_hist_time,
                ggdeals_official_hist_low, ggdeals_official_hist_time, ggdeals_url, last_scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, old_item.get("kinguin_price_eur"), k_url, 1,
            gg_key_curr, best_key_shop, gg_key_disc, gg_off_curr,
            gg_key_low, gg_key_time, gg_off_low, gg_off_time,
            old_item.get("links", {}).get("ggdeals") if isinstance(old_item.get("links"), dict) else None,
            datetime.utcnow()
        ))
        market_prices_inserted += 1

        # Agregar a exportación JSON
        json_export_list.append({
            "id": offer_id,
            "steam_app_id": app_id,
            "app_id": app_id,
            "name": display_name,
            "bundle": bundle_name,
            "platform": platform_name,
            "hb_status": hb_status,
            "key_url": key_url,
            "buyer_name": buyer_name,
            "status": offer_status,
            "is_reviewed": is_rev,
            "is_sold": (offer_status == "sold"),
            "tf2_keys_offered": offer_price,
            "offer_price": offer_price,
            "offer_currency": offer_curr,
            "counter_increase_tf2": counter_price,
            "counter_price": counter_price,
            "counter_currency": counter_curr,
            "sold_price": sold_price,
            "sold_currency": sold_curr,
            "sold_note": sold_note,
            "issue_note": issue_note,
            "steam_header_image": header_img,
            "is_delisted_steam": is_delisted,
            "delisted_reason": delisted_reason,
            "steam_store_price": steam_price,
            "steam_players_24h": players_24h,
            "ggdeals_current_official": gg_off_curr,
            "ggdeals_current_keyshop": gg_key_curr,
            "ggdeals_current_keyshop_discount": gg_key_disc,
            "ggdeals_historical_official_low": gg_off_low,
            "ggdeals_historical_official_time": gg_off_time,
            "ggdeals_historical_keyshop_low": gg_key_low,
            "ggdeals_historical_keyshop_time": gg_key_time,
            "best_keyshop_price_eur": gg_key_curr,
            "best_keyshop_name": best_key_shop
        })

    # 5. Comprobar si hubo registros de xMjalino que no estaban en Humble Bundle (ej. Portal 2)
    for r in xm_records:
        gname = r.get("Game", "").strip()
        cl = clean_text(gname)
        k_link = r.get("Keys", "").strip()
        if (k_link and k_link in xm_processed_keys) or (cl in xm_processed_keys):
            continue

        # Juego como Portal 2 que no vino en el CSV de HB
        app_id, is_del, reason, next_synthetic_id = resolve_game_identity(
            gname, "STEAM", old_metadata_by_name, steamcmd_cache, next_synthetic_id
        )
        bundle_name = "Venta Directa / xMjalino"
        platform_name = "STEAM"
        hb_status = "No disponible"
        comm = r.get("Comments", "").strip()
        agree = parse_bool(r.get("Agree"))
        rec_off = parse_float(r.get("Received Offer"), default=1.0)
        cnt_str = r.get("Counter Offer", "").strip()
        cnt_off = parse_float(cnt_str, default=0.0) if cnt_str else None

        buyer_name = "xMjalino"
        offer_price = rec_off
        offer_curr = r.get("Currency", "TF2").strip() or "TF2"

        if agree is True:
            offer_status = "sold"
            is_rev = True
            sold_price = cnt_off if (cnt_off is not None and cnt_off > 0) else rec_off
            counter_price = max(0.0, (cnt_off or 0.0) - rec_off)
            sold_curr = offer_curr
            sold_note = "Vendido a xMjalino"
            issue_note = None
        else:
            buyer_name = None
            if "out of stock" in comm.lower():
                offer_status = "issue"
                issue_note = "Agotada temporalmente / Out of stock"
                is_rev = True
                counter_price = 0.0
                sold_price = None
                sold_note = None
            elif comm:
                offer_status = "issue"
                issue_note = comm
                is_rev = True
                counter_price = 0.0
                sold_price = None
                sold_note = None
            else:
                offer_status = "listed"
                counter_price = 0.0
                sold_price = None
                sold_note = None
                is_rev = False
                issue_note = None

        old_item = old_metadata_by_name.get(cl, (None, None, {}))[2]
        header_img = old_item.get("steam_header_image") or f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg"

        display_name = clean_display_title(gname)

        cur.execute("""
            INSERT OR REPLACE INTO games (
                app_id, bundle, name, header_image, is_delisted, delisted_reason,
                platform, hb_status, key_url, steam_price, steam_players_24h,
                best_keyshop_name, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, display_name, header_img, 1 if is_del else 0, reason,
            platform_name, hb_status, k_link, old_item.get("steam_store_price"),
            old_item.get("steam_players_24h"), "Keyshops", datetime.utcnow()
        ))
        games_inserted += 1

        cur.execute("""
            INSERT INTO offers (
                app_id, bundle, buyer_name, status, is_reviewed, offer_price,
                offer_currency, counter_price, counter_currency, sold_price,
                sold_currency, sold_note, issue_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, buyer_name, offer_status, 1 if is_rev else 0,
            offer_price, offer_curr, counter_price, counter_curr, sold_price,
            sold_curr, sold_note, issue_note
        ))
        offer_id = cur.lastrowid
        offers_inserted += 1

        cur.execute("""
            INSERT OR REPLACE INTO market_prices (
                app_id, bundle, kinguin_url, kinguin_in_stock, best_keyshop_name, last_scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?);
        """, (
            app_id, bundle_name, generate_kinguin_search_url(display_name), 1, "Keyshops", datetime.utcnow()
        ))
        market_prices_inserted += 1

        json_export_list.append({
            "id": offer_id,
            "steam_app_id": app_id,
            "app_id": app_id,
            "name": display_name,
            "bundle": bundle_name,
            "platform": platform_name,
            "hb_status": hb_status,
            "key_url": k_link,
            "buyer_name": buyer_name,
            "status": offer_status,
            "is_reviewed": is_rev,
            "is_sold": (offer_status == "sold"),
            "tf2_keys_offered": offer_price,
            "offer_price": offer_price,
            "offer_currency": offer_curr,
            "counter_increase_tf2": counter_price,
            "counter_price": counter_price,
            "counter_currency": counter_curr,
            "sold_price": sold_price,
            "sold_currency": sold_curr,
            "sold_note": sold_note,
            "issue_note": issue_note,
            "steam_header_image": header_img,
            "is_delisted_steam": is_del,
            "delisted_reason": reason
        })

    # Guardar cambios en SQLite
    db_conn.commit()
    db_conn.close()

    # Guardar archivo semilla consolidado data/games_db.json
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(json_export_list, f, indent=2, ensure_ascii=False)

    print("\n=== IMPORTACIÓN FINALIZADA CON ÉXITO ===")
    print(f"Total juegos registrados en 'games': {games_inserted}")
    print(f"Total ofertas registradas en 'offers': {offers_inserted}")
    print(f"Total registros en 'market_prices': {market_prices_inserted}")
    print(f"Archivo semilla actualizado: {JSON_PATH} ({len(json_export_list)} elementos)")

if __name__ == "__main__":
    run_full_import()
