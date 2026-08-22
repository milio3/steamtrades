import json

with open('data/missing_report.json', 'r', encoding='utf-8') as f:
    rep = json.load(f)

print(f"Total juegos faltantes: {len(rep)}\n")
for r in rep:
    print(f"- {r['game']} | Delisted: {r['delisted']} | Faltan: {', '.join(r['missing'])}")
