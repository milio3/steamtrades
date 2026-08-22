import json
from backend.price_service import db

db.reload_from_disk()
games = list(db.games.values())

complete_games = []
missing_games = []

for g in games:
    missing = []
    # Revisar los 4 campos solicitados
    if g.ggdeals_current_official is None and not g.is_delisted_steam:
        missing.append("Current Official Stores")
    if g.ggdeals_current_keyshop is None:
        missing.append("Current Keyshops")
    if g.ggdeals_historical_official_low is None:
        missing.append("Historical Low Official Stores")
    if g.ggdeals_historical_keyshop_low is None:
        missing.append("Historical Low Keyshops")
        
    if missing:
        missing_games.append({
            "name": g.name,
            "delisted": g.is_delisted_steam,
            "missing": missing,
            "current_official": g.ggdeals_current_official,
            "current_keyshop": g.ggdeals_current_keyshop,
            "hist_official": g.ggdeals_historical_official_low,
            "hist_keyshop": g.ggdeals_historical_keyshop_low,
            "offer_tf2": g.tf2_keys_offered,
            "offer_cash": g.offer_value_cash_eur,
            "profit": g.reseller_profit_eur,
            "profit_pct": g.reseller_profit_percent
        })
    else:
        complete_games.append(g.name)

print(f"Total juegos analizados: {len(games)}")
print(f"Juegos con datos 100% completos: {len(complete_games)}")
print(f"Juegos con algún dato pendiente o faltante: {len(missing_games)}\n")

with open("data/final_audit.json", "w", encoding="utf-8") as f:
    json.dump({"complete": complete_games, "missing": missing_games}, f, indent=2, ensure_ascii=False)
