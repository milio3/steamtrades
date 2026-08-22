import requests
from bs4 import BeautifulSoup
from backend.price_service import BROWSER_HEADERS, extract_ggdeals_from_html, db

s = requests.Session()
s.headers.update(BROWSER_HEADERS)

queries = [
    ('Resident Evil Revelations', 'Resident Evil Revelations'),
    ('Warhammer 40,000: Dawn of War III', 'Dawn of War III')
]

for orig_name, query in queries:
    r = s.get(f'https://gg.deals/games/?title={requests.utils.quote(query)}')
    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'html.parser')
        for a in soup.select('a[href*="/game/"]'):
            href = a.get('href')
            if href and href.startswith('/game/') and not href.startswith('/games/'):
                print(f"{orig_name} -> Encontrado: {href}")
                rg = s.get(f"https://gg.deals{href}")
                if rg.status_code == 200:
                    data = extract_ggdeals_from_html(rg.text)
                    game = next((g for g in db.games.values() if g.name == orig_name), None)
                    if game:
                        game.ggdeals_current_official = data.get('current_official_price')
                        game.ggdeals_current_keyshop = data.get('current_keyshop_price')
                        game.best_keyshop_price_eur = data.get('current_keyshop_price')
                        game.ggdeals_current_keyshop_discount = data.get('current_keyshop_discount')
                        game.ggdeals_historical_official_low = data.get('historical_official_low')
                        game.ggdeals_historical_official_time = data.get('historical_official_time')
                        game.ggdeals_historical_keyshop_low = data.get('historical_keyshop_low')
                        game.ggdeals_historical_keyshop_time = data.get('historical_keyshop_time')
                        db.recalculate_game_offer(game)
                        print(f"  Guardado OK: Official={game.ggdeals_current_official} | Keyshop={game.ggdeals_current_keyshop} | HistKeyshop={game.ggdeals_historical_keyshop_low}")
                break

db.save_to_disk()
