import json
import os
import urllib.parse
from typing import List, Dict, Any
from backend.models import GameItem, MarketSettings

GAMES_RAW_DATA = [
    {"name": "A Hat in Time", "tf2": 4.5, "app_id": 253230},
    {"name": "Absolver", "tf2": 1.5, "app_id": 473690},
    {"name": "Action Henk", "tf2": 0.25, "app_id": 285820},
    {"name": "Armello", "tf2": 1.5, "app_id": 290340},
    {"name": "Ashes of the Singularity: Escalation", "tf2": 0.5, "app_id": 507490},
    {"name": "Avernum 2: Crystal Souls", "tf2": 0.5, "app_id": 337850},
    {"name": "Beyond Eyes", "tf2": 0.5, "app_id": 356050},
    {"name": "Black the Fall", "tf2": 0.25, "app_id": 508060},
    {"name": "BlazBlue: Chronophantasma Extend", "tf2": 1.0, "app_id": 388750},
    {"name": "Brigador: Up-Armored Edition", "tf2": 0.5, "app_id": 274500},
    {"name": "BROFORCE", "tf2": 0.5, "app_id": 274190},
    {"name": "Darksiders II: Deathinitive Edition", "tf2": 1.0, "app_id": 388410},
    {"name": "Dead Island Definitive Edition", "tf2": 0.5, "app_id": 383150},
    {"name": "Dead Rising 2", "tf2": 1.0, "app_id": 45740},
    {"name": "Dead Rising 4", "tf2": 0.5, "app_id": 543460},
    {"name": "Deponia Doomsday", "tf2": 0.25, "app_id": 421050},
    {"name": "DiRT Rally", "tf2": 1.0, "app_id": 310560, "delisted": True, "delisted_reason": "Retirado de Steam por caducidad de licencias de marcas de coches"},
    {"name": "Dungeons 3", "tf2": 0.5, "app_id": 493900},
    {"name": "The Dwarves", "tf2": 0.5, "app_id": 403970},
    {"name": "Else Heart.Break()", "tf2": 0.25, "app_id": 400110},
    {"name": "Epistory - Typing Chronicles", "tf2": 0.5, "app_id": 398850},
    {"name": "The Escapists 2", "tf2": 0.5, "app_id": 641990},
    {"name": "Fallen Enchantress: Legendary Heroes", "tf2": 0.25, "app_id": 216390},
    {"name": "Finding Paradise", "tf2": 0.25, "app_id": 337340},
    {"name": "Full Metal Furies", "tf2": 0.25, "app_id": 416600},
    {"name": "Galactic Civilizations III", "tf2": 0.5, "app_id": 226860},
    {"name": "Galak-Z", "tf2": 0.25, "app_id": 300580},
    {"name": "Getting Over It with Bennett Foddy", "tf2": 0.5, "app_id": 240720},
    {"name": "Gremlins, Inc.", "tf2": 1.0, "app_id": 369990},
    {"name": "Hard Reset Redux", "tf2": 0.25, "app_id": 407810},
    {"name": "Hidden Folks", "tf2": 0.5, "app_id": 600090},
    {"name": "Hitman 2: Silent Assassin", "tf2": 1.0, "app_id": 6850},
    {"name": "Hollow Knight", "tf2": 2.5, "app_id": 367520},
    {"name": "The Incredible Adventures of Van Helsing: Final Cut", "tf2": 1.0, "app_id": 400170},
    {"name": "Inside", "tf2": 3.0, "app_id": 304430},
    {"name": "Jalopy", "tf2": 0.25, "app_id": 446020},
    {"name": "Kane & Lynch 2: Dog Days", "tf2": 0.5, "app_id": 28000, "delisted": True, "delisted_reason": "No disponible para compra directa en varias regiones de Steam"},
    {"name": "Kerbal Space Program", "tf2": 1.5, "app_id": 220200},
    {"name": "Kholat", "tf2": 0.25, "app_id": 343710},
    {"name": "Kona", "tf2": 0.5, "app_id": 365160},
    {"name": "Last Day of June", "tf2": 0.5, "app_id": 635320},
    {"name": "Legend of Grimrock", "tf2": 1.0, "app_id": 207170},
    {"name": "Life is Strange Complete Season (Episodes 1-5)", "tf2": 1.0, "app_id": 319630},
    {"name": "LIMBO", "tf2": 1.5, "app_id": 48000},
    {"name": "Little Nightmares", "tf2": 1.0, "app_id": 424840},
    {"name": "Lost Castle", "tf2": 0.5, "app_id": 434650},
    {"name": "MINIT", "tf2": 0.25, "app_id": 609490},
    {"name": "Monster Prom", "tf2": 0.25, "app_id": 743450},
    {"name": "Mr. Shifty", "tf2": 0.25, "app_id": 489140},
    {"name": "Mutant Year Zero: Road to Eden", "tf2": 2.5, "app_id": 760060},
    {"name": "Neon Chrome", "tf2": 0.25, "app_id": 356610},
    {"name": "Nex Machina", "tf2": 0.5, "app_id": 404540},
    {"name": "Offworld Trading Company", "tf2": 0.5, "app_id": 271240},
    {"name": "ONE PIECE BURNING BLOOD", "tf2": 0.5, "app_id": 425220, "delisted": True, "delisted_reason": "Retirado de la tienda de Steam por fin de licencias de Bandai Namco"},
    {"name": "One Piece Pirate Warriors 3", "tf2": 0.5, "app_id": 331600},
    {"name": "Orwell: Keeping an Eye On You", "tf2": 0.25, "app_id": 491950},
    {"name": "Overcooked", "tf2": 1.0, "app_id": 448510},
    {"name": "Overgrowth", "tf2": 2.0, "app_id": 25000},
    {"name": "Passpartout: The Starving Artist", "tf2": 1.5, "app_id": 582550},
    {"name": "Pathologic Classic HD", "tf2": 0.5, "app_id": 384110},
    {"name": "Project Highrise", "tf2": 0.5, "app_id": 423580},
    {"name": "Quantum Break", "tf2": 1.0, "app_id": 474960},
    {"name": "Q.U.B.E. 2", "tf2": 0.5, "app_id": 359100},
    {"name": "Rebel Galaxy", "tf2": 0.25, "app_id": 290300},
    {"name": "The Red Solstice", "tf2": 0.5, "app_id": 265590},
    {"name": "Resident Evil 5 Gold Edition", "tf2": 1.0, "app_id": 21690},
    {"name": "Resident Evil Revelations", "tf2": 1.0, "app_id": 222480},
    {"name": "Rise of the Tomb Raider", "tf2": 1.0, "app_id": 391220},
    {"name": "Robot Roller-Derby Disco Dodgeball", "tf2": 0.25, "app_id": 270450},
    {"name": "Rocket League", "tf2": 250.0, "app_id": 252950, "delisted": True, "delisted_reason": "Retirado de Steam en sept. 2020 tras adquisición por Epic Games. Clave de coleccionista."},
    {"name": "RUINER", "tf2": 0.5, "app_id": 464060},
    {"name": "Running with Rifles", "tf2": 1.0, "app_id": 270150},
    {"name": "Seasons After Fall", "tf2": 0.25, "app_id": 366320},
    {"name": "The Sexy Brutale", "tf2": 1.0, "app_id": 552590},
    {"name": "Shadow Tactics: Blades of the Shogun", "tf2": 0.5, "app_id": 418240},
    {"name": "Shadowrun: Hong Kong - Extended Edition", "tf2": 0.5, "app_id": 346940},
    {"name": "Shelter 2", "tf2": 0.5, "app_id": 275100},
    {"name": "Sheltered", "tf2": 0.5, "app_id": 356040},
    {"name": "SimplePlanes", "tf2": 0.5, "app_id": 397340},
    {"name": "Steamworld Heist", "tf2": 0.25, "app_id": 322190},
    {"name": "Steredenn", "tf2": 0.5, "app_id": 347160},
    {"name": "STRAFE: Millennium Edition", "tf2": 0.5, "app_id": 442700},
    {"name": "Stronghold Crusader 2", "tf2": 0.5, "app_id": 232890},
    {"name": "Styx: Master of Shadows", "tf2": 0.25, "app_id": 242640},
    {"name": "Styx: Shards of Darkness", "tf2": 0.5, "app_id": 355790},
    {"name": "Sudden Strike 4", "tf2": 0.5, "app_id": 373930},
    {"name": "Super Rude Bear Resurrection", "tf2": 0.25, "app_id": 384250},
    {"name": "SUPERHOT", "tf2": 0.25, "app_id": 322500},
    {"name": "The Surge", "tf2": 0.5, "app_id": 378540},
    {"name": "Tacoma", "tf2": 0.25, "app_id": 343780},
    {"name": "Tannenberg", "tf2": 0.5, "app_id": 633460},
    {"name": "This is the Police", "tf2": 0.5, "app_id": 443810},
    {"name": "Tiny Echo", "tf2": 0.5, "app_id": 629770},
    {"name": "TIS-100", "tf2": 0.25, "app_id": 370360},
    {"name": "Tomb Raider", "tf2": 0.5, "app_id": 203160},
    {"name": "The Turing Test", "tf2": 1.5, "app_id": 499520},
    {"name": "Uncanny Valley", "tf2": 0.25, "app_id": 359040},
    {"name": "Victor Vran", "tf2": 2.0, "app_id": 345180},
    {"name": "War for the Overworld", "tf2": 1.0, "app_id": 230190},
    {"name": "Wargame: Red Dragon", "tf2": 3.0, "app_id": 251060},
    {"name": "Warhammer 40,000: Dawn of War III", "tf2": 3.5, "app_id": 285190},
    {"name": "Warhammer: End Times - Vermintide", "tf2": 0.25, "app_id": 235540},
    {"name": "Wasted", "tf2": 0.25, "app_id": 395210},
    {"name": "We Were Here Too", "tf2": 0.5, "app_id": 677160},
    {"name": "Yooka-Laylee", "tf2": 0.5, "app_id": 360830},
    {"name": "Zombie Night Terror", "tf2": 0.25, "app_id": 416680}
]

def generate_shop_links(name: str, app_id: int) -> Dict[str, str]:
    q_name = urllib.parse.quote_plus(name)
    slug = name.lower().replace(":", "").replace("'", "").replace("(", "").replace(")", "").replace(".", "").replace("&", "and").replace(" - ", " ").replace(" ", "-")
    
    return {
        "ggdeals": f"https://gg.deals/game/{slug}/",
        "ggdeals_search": f"https://gg.deals/games/?title={q_name}",
        "g2a": f"https://www.g2a.com/search?query={q_name}+Steam+Key+Global",
        "kinguin": f"https://www.kinguin.net/listing?active=1&hide_out_of_stock=1&phrase={q_name}&page=0&platform=Steam&region=Global",
        "eneba": f"https://www.eneba.com/store/all?text={q_name}&regions[]=global&types[]=game",
        "steam": f"https://store.steampowered.com/app/{app_id}/" if app_id else f"https://store.steampowered.com/search/?term={q_name}"
    }

def get_initial_games() -> List[GameItem]:
    items = []
    for g in GAMES_RAW_DATA:
        game_id = g["name"].lower().replace(" ", "_").replace(":", "").replace("'", "")
        app_id = g.get("app_id")
        header_img = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg" if app_id else None
        
        is_delisted = g.get("delisted", False)
        delisted_reason = g.get("delisted_reason")
        
        item = GameItem(
            id=game_id,
            name=g["name"],
            tf2_keys_offered=float(g["tf2"]),
            steam_app_id=app_id,
            steam_header_image=header_img,
            is_delisted_steam=is_delisted,
            delisted_reason=delisted_reason,
            links=generate_shop_links(g["name"], app_id)
        )
        items.append(item)
    return items
