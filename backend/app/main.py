from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import FRONTEND_SRC_DIR
from backend.app.db.init_db import init_database
from backend.app.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización automática de SQLite y sembrado de datos
    init_database()
    yield

app = FastAPI(
    title="Steam Trades & Keys Valuation API",
    description="API para la valoración, arbitraje y contraoferta de lotes de claves de Steam en TF2 Keys",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de Healthcheck (según directivas de despliegue)
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

# Incluir Rutas de API REST
app.include_router(router)

# Servir Frontend Estático si existe frontend/src
if FRONTEND_SRC_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_SRC_DIR), name="static")

    @app.get("/", include_in_schema=False)
    def serve_cards_view():
        return FileResponse(FRONTEND_SRC_DIR / "index.html")

    @app.get("/table", include_in_schema=False)
    def serve_table_view():
        return FileResponse(FRONTEND_SRC_DIR / "table.html")
