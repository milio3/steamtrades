import os
from pathlib import Path

# Rutas base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_SRC_DIR = BASE_DIR / "frontend" / "src"

# Configuración de base de datos SQLite
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'steamtrades.db'}")

# Configuración de mercado por defecto
DEFAULT_TF2_STEAM_PRICE = float(os.getenv("DEFAULT_TF2_STEAM_PRICE", "2.02"))
DEFAULT_TF2_CASH_PRICE = float(os.getenv("DEFAULT_TF2_CASH_PRICE", "1.62"))
DEFAULT_STEAM_FEE_PERCENT = float(os.getenv("DEFAULT_STEAM_FEE_PERCENT", "13.03"))

# Headers HTTP para scraping y APIs públicas
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
}
